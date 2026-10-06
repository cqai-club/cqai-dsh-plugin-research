// Reproduce the checked-in runtime snapshot from an existing upstream checkout.
// This script never fetches the network or executes upstream code.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const revision = '6ab4b03bf70a118a1b3ee7f3263ed9f19031061b'
const repository = 'https://github.com/Imbad0202/academic-research-skills'
const checkout = resolve(process.argv[2] ?? '')
assert.ok(process.argv[2], 'Usage: node scripts/vendor-upstream.mjs /path/to/upstream-checkout')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = join(root, 'assets/academic-research-skills')
assert.ok(!existsSync(destination), 'Remove the previous snapshot explicitly before importing another')
const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { maxBuffer: 64 * 1024 * 1024 })
assert.equal(git('rev-parse', `${revision}^{commit}`).toString().trim(), revision)
const directories = new Set([
  'deep-research', 'academic-paper', 'academic-paper-reviewer', 'academic-pipeline',
  'shared', 'scripts', 'agents', 'docs', 'commands', 'hooks', 'sr-screener',
  'examples', 'audits', '.claude-plugin', 'evals',
])
const files = []
for (const record of git('ls-tree', '-r', '-z', revision).toString().split('\0').filter(Boolean)) {
  const [metadata, path] = record.split('\t')
  const [mode, type] = metadata.split(' ')
  if (path.includes('/') && !directories.has(path.split('/')[0])) continue
  // Alias symlinks and development-only dotfiles are not runtime resources.
  if (type !== 'blob' || mode === '120000' || (!path.includes('/') && path.startsWith('.') && path !== '.command-invariants.toml')) continue
  assert.ok(path.split('/').every(segment => segment && segment !== '..' && segment !== '.'))
  const body = git('show', `${revision}:${path}`)
  const target = join(destination, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, body, { mode: mode === '100755' ? 0o755 : 0o644 })
  files.push({ path, size: body.length, sha256: createHash('sha256').update(body).digest('hex') })
}
files.sort((a, b) => a.path.localeCompare(b.path))
writeFileSync(join(root, 'assets/academic-research-skills.manifest.json'), `${JSON.stringify({
  repository, revision, version: '3.23.0', license: 'CC-BY-NC-4.0', author: 'Cheng-I Wu',
  directories: [...directories],
  omitted: ['.git', '.github', '.claude', 'skills (symlink aliases)', 'tests', 'tools', 'pi', 'plugin-evals*'],
  modifications: 'Selected runtime directories and root documentation; retained files are unmodified.',
  files,
}, null, 2)}\n`)
console.log(`Vendored ${files.length} unmodified files at ${revision}; ${files.reduce((sum, file) => sum + file.size, 0)} bytes`)
