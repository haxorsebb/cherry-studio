import type { NetworkEndpoint } from './types'

/**
 * Privacy edition: empty. Upstream listed its update, model catalog, cloud and diagnostics
 * hosts here; those features are off, so System Doctor has no vendor host left to probe.
 */
export function builtinEndpoints(): Promise<readonly NetworkEndpoint[]> {
  return Promise.resolve([])
}
