/**
 * Regression tests for PresetProviderSeeder.run — insert-only behavior.
 *
 * Regression: An earlier implementation called db.insert() unconditionally and
 * used onConflictDoUpdate, overwriting user customizations (renamed providers,
 * custom API keys, etc.) on every app start. The fix filters out already-present
 * provider IDs and only inserts genuinely new rows.
 */

import { setupTestDatabase } from '@test-helpers/db'
import { describe, expect, it, vi } from 'vitest'

import { RegistryLoader } from '@cherrystudio/provider-registry/node'
import { appStateTable } from '@data/db/schemas/appState'
import { userProviderTable } from '@data/db/schemas/userProvider'
import { PresetProviderSeeder } from '@data/db/seeding/seeders/presetProviderSeeder'
import { SeedRunner } from '@data/db/seeding/SeedRunner'
import { generateOrderKeyBetween, generateOrderKeySequence } from '@data/services/utils/orderKey'

// Fake registry providers — two local presets ('ollama', 'lmstudio') and two cloud ones.
vi.mock('@cherrystudio/provider-registry/node', () => {
  class RegistryLoader {
    loadProviders() {
      return [
        { id: 'ollama', name: 'Ollama', endpointConfigs: {}, defaultChatEndpoint: null },
        { id: 'openai', name: 'OpenAI', endpointConfigs: {}, defaultChatEndpoint: null },
        { id: 'lmstudio', name: 'LM Studio', endpointConfigs: {}, defaultChatEndpoint: null },
        { id: 'azure-openai', name: 'Azure OpenAI', endpointConfigs: {}, defaultChatEndpoint: null }
      ]
    }
    getProvidersVersion() {
      return 'test-version'
    }
    loadModels() {
      return []
    }
    loadProviderModels() {
      return []
    }
  }
  return { RegistryLoader }
})

describe('PresetProviderSeeder.run — insert-only behavior', () => {
  const dbh = setupTestDatabase()

  // Privacy edition contract: cloud presets in the registry never reach the database.
  it('seeds the local presets and skips every cloud preset', async () => {
    const seed = new PresetProviderSeeder()
    seed.run(dbh.db)

    const rows = await dbh.db.select().from(userProviderTable)
    expect(rows.map((row) => row.providerId).sort()).toEqual(['lmstudio', 'ollama'])
  })

  it('should NOT re-insert ollama when it already exists in DB', async () => {
    await dbh.db
      .insert(userProviderTable)
      .values({ providerId: 'ollama', name: 'User-renamed Ollama', orderKey: generateOrderKeyBetween(null, null) })

    const seed = new PresetProviderSeeder()
    seed.run(dbh.db)

    const rows = await dbh.db.select().from(userProviderTable)
    const ollama = rows.find((r) => r.providerId === 'ollama')
    // User customization must be preserved
    expect(ollama?.name).toBe('User-renamed Ollama')
  })

  it('repairs a legacy provider order key before appending preset providers', async () => {
    await dbh.db.insert(userProviderTable).values([
      { providerId: 'existing', name: 'Existing', orderKey: generateOrderKeyBetween(null, null) },
      { providerId: 'legacy-b', name: 'Legacy B', orderKey: 'zz' },
      { providerId: 'legacy-a', name: 'Legacy A', orderKey: 'zz' }
    ])

    await dbh.db.insert(appStateTable).values({
      key: 'seed:presetProvider',
      value: { version: 'test-version' }
    })

    const seed = new PresetProviderSeeder()
    new SeedRunner(dbh.db).runAll([seed])

    const rows = await dbh.db.select().from(userProviderTable)
    expect(rows.map((row) => row.providerId)).toContain('ollama')
    const legacyRows = rows.filter((row) => row.providerId.startsWith('legacy-'))
    expect(legacyRows).toHaveLength(2)
    expect([...legacyRows].sort((a, b) => a.providerId.localeCompare(b.providerId)).map((row) => row.name)).toEqual([
      'Legacy A',
      'Legacy B'
    ])
    for (const legacy of legacyRows) {
      expect(legacy.orderKey).not.toBe('zz')
      expect(() => generateOrderKeyBetween(legacy.orderKey, null)).not.toThrow()
    }

    const ordered = [...rows].sort((a, b) => a.orderKey.localeCompare(b.orderKey))
    expect(ordered.map((row) => row.providerId).slice(0, 3)).toEqual(['existing', 'legacy-a', 'legacy-b'])
  })

  it('repairs legacy provider order keys even when the registry is empty', async () => {
    await dbh.db.insert(userProviderTable).values({ providerId: 'legacy', name: 'Legacy', orderKey: 'zz' })
    vi.spyOn(RegistryLoader.prototype, 'loadProviders').mockReturnValueOnce([])

    const seed = new PresetProviderSeeder()
    new SeedRunner(dbh.db).runAll([seed])

    const [legacy] = await dbh.db.select().from(userProviderTable)
    expect(legacy.orderKey).not.toBe('zz')
    expect(() => generateOrderKeyBetween(legacy.orderKey, null)).not.toThrow()
  })

  it('never seeds endpointConfigs — registry connection config resolves at read time', async () => {
    const seed = new PresetProviderSeeder()
    seed.run(dbh.db)

    const rows = await dbh.db.select().from(userProviderTable)
    // No row freezes a registry connection snapshot (#17096).
    expect(rows.every((r) => r.endpointConfigs === null)).toBe(true)
  })

  it('should not insert anything when all seedable providers already exist', async () => {
    const [ollamaKey, lmstudioKey] = generateOrderKeySequence(2)
    await dbh.db.insert(userProviderTable).values([
      { providerId: 'ollama', name: 'Ollama', orderKey: ollamaKey },
      { providerId: 'lmstudio', name: 'LM Studio', orderKey: lmstudioKey }
    ])
    const before = await dbh.db.select().from(userProviderTable)

    const seed = new PresetProviderSeeder()
    seed.run(dbh.db)

    const after = await dbh.db.select().from(userProviderTable)
    expect(after).toHaveLength(before.length)
  })
})
