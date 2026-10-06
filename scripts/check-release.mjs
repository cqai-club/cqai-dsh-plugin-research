import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const pkg = readJson('package.json')
const plugin = readJson('dsh.plugin.json')
const market = readJson('market/cqai-club-plugin.json')

assert.equal(pkg.name, 'cqai-dsh-plugin-research')
assert.match(pkg.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u)
assert.equal(plugin.id, pkg.name)
assert.equal(plugin.version, pkg.version)
assert.equal(pkg.private === true, false)
assert.equal(pkg.publishConfig?.access, 'public')
assert.equal(pkg.publishConfig?.registry, 'https://registry.npmjs.org/')
assert.equal(plugin.engines?.dsh, pkg.peerDependencies['@deepseek-ai/dsh-host-webserver'])
assert.equal(market.packageName, pkg.name)
assert.equal(pkg.repository?.type, 'git')
assert.equal(pkg.repository?.directory, undefined, 'A standalone repository must not declare a monorepo directory')
const repositoryUrl = pkg.repository.url.replace(/^git\+/u, '').replace(/\.git$/u, '')
assert.equal(repositoryUrl, 'https://github.com/cqai-club/cqai-dsh-plugin-research')
assert.equal(market.repositoryUrl, repositoryUrl)
assert.equal(market.homepageUrl, repositoryUrl)

const patch = pkg.dsh?.bundle?.patch
assert.equal(typeof patch, 'string')
assert.match(patch, /^\.\/[a-zA-Z0-9._/-]+$/u)
assert.ok(patch.slice(2).split('/').every(segment => segment && segment !== '.' && segment !== '..'))

// Inspect the actual npm allowlist without executing another build or publishing.
assert.ok(process.env.npm_execpath, 'Run this check with npm run check:release')
const packed = spawnSync(process.execPath, [
  process.env.npm_execpath, 'pack', '--dry-run', '--ignore-scripts', '--json',
], { cwd: root, encoding: 'utf8' })
assert.equal(packed.error, undefined, packed.error?.message)
assert.equal(packed.status, 0, packed.stderr || packed.stdout)
const [tarball] = JSON.parse(packed.stdout)
const files = new Set(tarball.files.map(file => file.path))
const required = new Set(['package.json', 'dsh.plugin.json', 'README.md', '安装说明.md', 'LICENSE', patch])
for (const target of [pkg.main, pkg.types, plugin.main, plugin.client?.main]) {
  if (target) required.add(target)
}
function exportTargets(value) {
  if (typeof value === 'string') required.add(value)
  else if (Array.isArray(value)) value.forEach(exportTargets)
  else if (value && typeof value === 'object') Object.values(value).forEach(exportTargets)
}
exportTargets(pkg.exports)
for (const target of required) {
  const path = target.replace(/^\.\//u, '')
  assert.ok(existsSync(resolve(root, path)), `Declared file is missing: ${target}`)
  assert.ok(files.has(path), `Declared file is absent from npm package: ${target}`)
}
assert.ok(!files.has('market/cqai-club-plugin.json'), 'Portal metadata must stay outside the runtime package')
assert.ok(![...files].some(path => /(^|\/)node_modules\/|(^|\/)\.env(?:\.|$)|(^|\/)\.npmrc$/u.test(path)), 'Private development files must stay outside the package')
console.log(`Release check OK: ${pkg.name}@${pkg.version}, ${files.size} packaged files`)
