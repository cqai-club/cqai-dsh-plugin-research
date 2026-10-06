/** Package-owned academic skill providers; no writes to user skill directories. */
import type { Context } from '@deepseek-ai/cordis'
import { FileSystemSkillProvider } from '@deepseek-ai/dsh-skill-filesystem'
import type { SkillProviderObservation } from '@deepseek-ai/dsh-skill'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { RESEARCH_SKILLS } from './catalog.ts'

const PROVIDER_NAME = 'cqai-research-bundled'
const ASSET_ROOT = fileURLToPath(new URL('../assets/academic-research-skills/', import.meta.url))

/** Register only our four entrypoints, retaining the upstream resource topology. */
export function registerBundledSkills(ctx: Context): () => void {
  return ctx.skills.registerProvider((control) => {
    const readers = new Map(RESEARCH_SKILLS.map(({ name }) => [name,
      new FileSystemSkillProvider(ctx, control, {
        providerName: PROVIDER_NAME,
        includeDefaultRoots: false,
        bundledSkillDir: join(ASSET_ROOT, name),
        watch: false,
      }),
    ]))
    return {
      name: PROVIDER_NAME,
      async list(options) {
        const observations = await Promise.all([...readers].map(async ([name, reader]) => {
          const result = await reader.list(options)
          const observation: SkillProviderObservation = Array.isArray(result)
            ? { candidates: result, complete: true }
            : result as SkillProviderObservation
          return {
            candidates: observation.candidates.filter(candidate => candidate.name === name),
            complete: observation.complete,
          }
        }))
        return {
          candidates: observations.flatMap(observation => observation.candidates),
          complete: observations.every(observation => observation.complete),
        }
      },
      async get(candidate, options) {
        return readers.get(candidate.name)?.get(candidate, options)
      },
    }
  })
}
