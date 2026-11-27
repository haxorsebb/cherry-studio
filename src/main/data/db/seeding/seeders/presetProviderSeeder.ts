import { asc, desc, eq, ne } from 'drizzle-orm'

import type { ProtoProviderConfig } from '@cherrystudio/provider-registry'
import { RegistryLoader } from '@cherrystudio/provider-registry/node'
import { userProviderTable } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'
import { generateOrderKeySequenceBetween } from '@data/services/utils/orderKey'
import { resolveRegistryPaths } from '@data/services/utils/registryDataPaths'
import { loggerService } from '@logger'

import type { DbType, ISeeder } from '../../types'

const logger = loggerService.withContext('PresetProviderSeeder')
const SEEDER_REVISION = 1
const LEGACY_INVALID_ORDER_KEY = 'zz'

/**
 * Privacy edition: only presets that talk to a server on the user's own machine or network
 * are seeded, so no cloud provider is ever offered. Filtering here instead of deleting
 * entries from the provider registry keeps that file identical to upstream.
 */
const LOCAL_PRESET_PROVIDER_IDS = new Set([
  'comfyui',
  'gpustack',
  'litellm',
  'lmstudio',
  'new-api',
  'ollama',
  'omlx',
  'rapid-mlx'
])

/**
 * Seed rows are DELTA rows: registry-owned connection config
 * (endpointConfigs, defaultChatEndpoint) is NOT persisted —
 * it resolves from the registry at read time (#17096), so registry updates
 * reach existing installs without reconciliation. Only user-editable
 * scaffolding is seeded: identity and display name. (Upstream also seeded an
 * auth shell for Azure, Vertex and Bedrock; none of them is a local preset.)
 */
function toDbRow(p: ProtoProviderConfig) {
  return {
    providerId: p.id,
    presetProviderId: p.presetProviderId ?? p.id,
    name: p.name,
    authConfig: null
  }
}

export class PresetProviderSeeder implements ISeeder {
  readonly name = 'presetProvider'
  readonly description = 'Insert preset provider configurations'

  private _loader?: RegistryLoader

  private getLoader(): RegistryLoader {
    if (!this._loader) {
      this._loader = new RegistryLoader(resolveRegistryPaths())
    }
    return this._loader
  }

  get version(): string {
    return `${this.getLoader().getProvidersVersion()}:${SEEDER_REVISION}`
  }

  run(db: DbType): void {
    let rawProviders: ProtoProviderConfig[]
    try {
      rawProviders = this.getLoader().loadProviders()
    } catch (error) {
      throw new Error('PresetProviderSeeder: failed to load registry providers', { cause: error })
    }

    const rows = rawProviders.filter((provider) => LOCAL_PRESET_PROVIDER_IDS.has(provider.id)).map(toDbRow)

    db.transaction((tx) => {
      const invalidProviders = tx
        .select({ providerId: userProviderTable.providerId })
        .from(userProviderTable)
        .where(eq(userProviderTable.orderKey, LEGACY_INVALID_ORDER_KEY))
        .orderBy(asc(userProviderTable.providerId))
        .all()

      if (invalidProviders.length > 0) {
        const [lastValidProvider] = tx
          .select({ orderKey: userProviderTable.orderKey })
          .from(userProviderTable)
          .where(ne(userProviderTable.orderKey, LEGACY_INVALID_ORDER_KEY))
          .orderBy(desc(userProviderTable.orderKey))
          .limit(1)
          .all()
        const repairedKeys = generateOrderKeySequenceBetween(
          lastValidProvider?.orderKey ?? null,
          null,
          invalidProviders.length
        )

        invalidProviders.forEach((provider, index) => {
          tx.update(userProviderTable)
            .set({ orderKey: repairedKeys[index] })
            .where(eq(userProviderTable.providerId, provider.providerId))
            .run()
        })
        logger.warn('Repaired legacy provider order keys', { count: invalidProviders.length })
      }

      if (rows.length > 0) {
        providerService.batchUpsertTx(tx, rows)
      }
    })
  }
}
