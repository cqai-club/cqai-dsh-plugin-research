import assert from 'node:assert/strict'
import { readFileSync, lstatSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire, Module } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
assert.ok(args.length === 2 || args.length === 3, 'Usage: npm run configure:portal -- --portal-dir /absolute/path/to/cqai-club-portal [--apply]')
assert.equal(args[0], '--portal-dir')
assert.ok(isAbsolute(args[1]), 'The portal directory must be an absolute path')
if (args.length === 3) assert.equal(args[2], '--apply')
const apply = args[2] === '--apply'
const portalDir = resolve(args[1])
const portalRequire = createRequire(resolve(portalDir, 'package.json'))
assert.equal(portalRequire('./package.json').name, 'cqai-club-portal', 'Unexpected project')

// Use the portal's current validator and data mapper, without loading its app
// server, authentication configuration, or any remote service.
const ts = portalRequire('typescript')
const schemaPath = resolve(portalDir, 'lib/plugin-market.ts')
const compiled = ts.transpileModule(readFileSync(schemaPath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const schemaModule = new Module(schemaPath)
schemaModule.filename = schemaPath
schemaModule.paths = Module._nodeModulePaths(dirname(schemaPath))
schemaModule._compile(compiled, schemaPath)
const { pluginInputSchema, pluginDbData } = schemaModule.exports
const input = pluginInputSchema.parse(JSON.parse(readFileSync(resolve(root, 'market/cqai-club-plugin.json'), 'utf8')))
const data = pluginDbData(input)

// Only operate on an existing local SQLite preview DB from .env.local.
const prismaDir = resolve(portalDir, 'prisma')
const prismaSchema = readFileSync(resolve(prismaDir, 'schema.prisma'), 'utf8')
assert.match(prismaSchema, /datasource\s+db\s*\{[^}]*provider\s*=\s*"sqlite"/u)
const env = portalRequire('dotenv').parse(readFileSync(resolve(portalDir, '.env.local'), 'utf8'))
assert.ok(env.DATABASE_URL?.startsWith('file:'), 'Only a local file: database is supported')
const dbValue = env.DATABASE_URL.slice(5)
assert.ok(!dbValue.startsWith('//') && !dbValue.includes('?') && !dbValue.includes('#'), 'Unexpected local database URL')
const dbPath = resolve(prismaDir, dbValue)
const stat = lstatSync(dbPath)
assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'An existing regular SQLite database is required')
const { PrismaClient } = portalRequire('@prisma/client')
const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } })

try {
  assert.ok(prisma.plugin, 'The generated portal Prisma client lacks Plugin; regenerate it before importing')
  const existing = await prisma.plugin.findUnique({ where: { packageName: input.packageName } })
  if (existing) {
    const changed = Object.entries(data).some(([key, value]) => existing[key] !== value)
    if (changed && apply) {
      assert.equal(existing.status, 'draft', 'Only an unpublished draft may be updated by this local helper')
      assert.equal(existing.publishedAt, null, 'Previously published entries must be managed in the portal UI')
      const updated = await prisma.plugin.update({
        where: { id: existing.id, status: 'draft', publishedAt: null },
        data,
      })
      console.log(JSON.stringify({ action: 'updated', database: dbPath, id: updated.id, packageName: updated.packageName, status: updated.status, publishedAt: updated.publishedAt }, null, 2))
    } else {
      console.log(JSON.stringify({ action: changed ? 'preview-update' : 'unchanged', database: dbPath, id: existing.id, packageName: existing.packageName, status: existing.status }, null, 2))
    }
  } else if (!apply) {
    console.log(JSON.stringify({ action: 'preview', database: dbPath, packageName: input.packageName, displayName: input.displayName, status: 'draft' }, null, 2))
  } else {
    const record = await prisma.$transaction(async tx => {
      const created = await tx.plugin.create({ data: { ...data, status: 'draft', publishedAt: null } })
      const saved = await tx.plugin.findUniqueOrThrow({ where: { id: created.id } })
      assert.equal(saved.status, 'draft')
      assert.equal(saved.publishedAt, null)
      assert.equal(saved.packageName, input.packageName)
      return saved
    })
    console.log(JSON.stringify({ action: 'created', database: dbPath, id: record.id, packageName: record.packageName, displayName: record.displayName, status: record.status, publishedAt: record.publishedAt }, null, 2))
  }
} finally {
  await prisma.$disconnect()
}
