import { Context } from '@deepseek-ai/cordis'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import { expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

it('serves bundled skills through the loopback catalog and preview routes', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 })
    await ctx.plugin(SkillRegistry)
    await ctx.plugin(plugin)
    const base = `http://127.0.0.1:${ctx.webServer.port}/api/cqai-research`

    const catalog = await fetch(`${base}/catalog`)
    expect(catalog.status).toBe(200)
    const body = await catalog.json() as { ok: boolean; panel: string; catalog: { installedCount: number; available: boolean; skills: unknown[] } }
    expect(body.ok).toBe(true)
    expect(body.panel).toBe('cqai-research')
    expect(body.catalog.skills).toHaveLength(4)
    expect(body.catalog.available).toBe(true)
    expect(body.catalog.installedCount).toBe(4)

    const unknown = await fetch(`${base}/skill?name=not-a-real-skill`)
    expect(unknown.status).toBe(404)
    expect((await unknown.json()).ok).toBe(false)

    const known = await fetch(`${base}/skill?name=academic-paper`)
    expect(known.status).toBe(200)
    expect(await known.json()).toMatchObject({ ok: true, name: 'academic-paper', source: 'bundled', truncated: false })
  } finally {
    await ctx.fiber.dispose()
  }
}, 30000)
