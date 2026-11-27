import { ENDPOINT_TYPE } from '@cherrystudio/provider-registry'
import type { InsertUserProviderRow } from '@data/db/schemas/userProvider'
import { providerService } from '@data/services/ProviderService'

import type { DbType, ISeeder } from '../../types'
import { hashObject } from '../hashObject'

/**
 * Privacy edition: the pre-configured provider is an OpenAI-compatible server on this
 * machine, replacing upstream's hosted CherryAI default. No model is seeded, because the
 * available models depend on what that server offers.
 */
const LOCAL_DEFAULT_PROVIDER: Omit<InsertUserProviderRow, 'orderKey'> = {
  providerId: 'local-openai',
  // No preset: a plain custom provider the user can edit or delete like their own.
  presetProviderId: null,
  name: 'Local',
  endpointConfigs: {
    [ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS]: { baseUrl: 'http://127.0.0.1:9000' }
  },
  defaultChatEndpoint: ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS,
  authConfig: null,
  providerSettings: null,
  isEnabled: true
}

export class LocalDefaultProviderSeeder implements ISeeder {
  readonly name = 'localDefaultProvider'
  readonly description = 'Insert the pre-configured local OpenAI-compatible provider'
  readonly version = hashObject(LOCAL_DEFAULT_PROVIDER)

  run(db: DbType): void {
    db.transaction((tx) => providerService.batchUpsertTx(tx, [LOCAL_DEFAULT_PROVIDER]))
  }
}
