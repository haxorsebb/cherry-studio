// Privacy edition: the region is fixed instead of geolocating the user's public IP,
// so no lookup service ever sees it.
const FIXED_COUNTRY = 'DE'

type RegionAnswer<T> = (signal?: AbortSignal) => Promise<T>

/**
 * Reports the user's country. Upstream detected it from the egress IP; this
 * edition always answers with a fixed country, which also selects the global
 * (non-China) download mirrors everywhere.
 */
class RegionService {
  // Typed with upstream's optional AbortSignal, so existing callers compile unchanged.
  readonly getCountry: RegionAnswer<string> = async () => FIXED_COUNTRY
  readonly detectIsInChina: RegionAnswer<boolean> = async () => false
  readonly isInChina: RegionAnswer<boolean> = async () => false
}

export const regionService = new RegionService()
