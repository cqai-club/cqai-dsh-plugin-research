import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { FileSystemSkillProvider } from '@deepseek-ai/dsh-skill-filesystem'
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { registerBundledSkills } from '../src/bundled-skills.ts'

const BUNDLED_ROOT = fileURLToPath(new URL('../assets/academic-research-skills/', import.meta.url))
const SKILL_NAMES = ['deep-research', 'academic-paper', 'academic-paper-reviewer', 'academic-pipeline']

it('loads all four packaged skill bodies with working relative shared resources', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin({ inject: ['skills'], apply: registerBundledSkills })
    const summaries = await ctx.skills.list()
    expect(summaries.map(skill => skill.name).sort()).toEqual([...SKILL_NAMES].sort())

    const sharedReferences = new Set<string>()
    for (const name of SKILL_NAMES) {
      const directory = join(BUNDLED_ROOT, name)
      const instructionPath = join(directory, 'SKILL.md')
      const raw = await readFile(instructionPath, 'utf8')
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim()
      const skill = await ctx.skills.get(name)

      expect(skill).toBeDefined()
      expect(skill).toMatchObject({
        name,
        source: 'bundled',
        invocation: { modelInvocable: true, userInvocable: true },
        path: await realpath(instructionPath),
        resourceBase: { kind: 'directory', path: directory },
      })
      expect(skill?.description.trim().length).toBeGreaterThan(0)
      expect(skill?.content).toBe(body)
      expect(isAbsolute(skill!.path!)).toBe(true)
      const resourceBase = skill!.resourceBase!
      expect(resourceBase.kind).toBe('directory')
      if (resourceBase.kind !== 'directory') throw new Error(`Missing directory resource base for ${name}`)
      expect(isAbsolute(resourceBase.path)).toBe(true)

      for (const reference of body.match(/\.\.\/shared\/[\w./-]+/g) ?? []) {
        const target = resolve(resourceBase.path, reference)
        sharedReferences.add(target)
        expect((await stat(target)).isFile(), `${name}: ${reference}`).toBe(true)
        expect((await readFile(target, 'utf8')).trim().length, reference).toBeGreaterThan(0)
      }
    }
    expect(sharedReferences.size).toBeGreaterThan(0)

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
    for (const name of SKILL_NAMES) expect(await ctx.skills.get(name)).toBeUndefined()
  } finally {
    await ctx.fiber.dispose()
  }
})

it.each(['before', 'after'] as const)('keeps user skills registered %s bundled skills when the package is disposed', async (userOrder) => {
  const ctx = new Context()
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'cqai-research-user-skill-'))
  try {
    const dshHome = join(fixtureRoot, 'dsh')
    const userDirectory = join(dshHome, 'skills', 'deep-research')
    const userContent = "# My research notes\n\nPreserve the user's research workflow."
    await mkdir(userDirectory, { recursive: true })
    await writeFile(join(userDirectory, 'SKILL.md'), [
      '---',
      'name: deep-research',
      'description: User-maintained research workflow',
      '---',
      userContent,
    ].join('\n'))

    await ctx.plugin(SkillRegistry)
    const mountUser = () => ctx.plugin({
      inject: ['skills'],
      apply(ctx: Context) {
        return ctx.skills.registerProvider(control => new FileSystemSkillProvider(ctx, control, {
          providerName: 'test-user-filesystem',
          dshHome,
          agentsHome: join(fixtureRoot, 'agents'),
          bundledSkillDir: join(fixtureRoot, 'unused-bundled'),
          watch: false,
        }))
      },
    })
    const initialUser = userOrder === 'before' ? await mountUser() : undefined
    const bundled = await ctx.plugin({ inject: ['skills'], apply: registerBundledSkills })
    // Populate the catalog before a later provider registration to exercise cache invalidation.
    expect(await ctx.skills.list()).toHaveLength(4)
    const user = initialUser ?? await mountUser()

    expect((await ctx.skills.list()).map(skill => skill.name).sort()).toEqual([...SKILL_NAMES].sort())
    expect(await ctx.skills.get('deep-research')).toMatchObject({
      source: 'user-dsh',
      path: await realpath(join(userDirectory, 'SKILL.md')),
      resourceBase: { kind: 'directory', path: userDirectory },
      content: userContent,
    })
    for (const name of SKILL_NAMES.filter(name => name !== 'deep-research')) {
      expect((await ctx.skills.get(name))?.source).toBe('bundled')
    }

    await bundled.dispose()
    expect(await ctx.skills.list()).toMatchObject([{ name: 'deep-research', source: 'user-dsh' }])
    expect((await ctx.skills.get('deep-research'))?.content).toBe(userContent)
    for (const name of SKILL_NAMES.filter(name => name !== 'deep-research')) {
      expect(await ctx.skills.get(name)).toBeUndefined()
    }
    expect(await readFile(join(userDirectory, 'SKILL.md'), 'utf8')).toContain(userContent)

    await user.dispose()
    expect(await ctx.skills.list()).toEqual([])
  } finally {
    await ctx.fiber.dispose()
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})
