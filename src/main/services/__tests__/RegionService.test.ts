import { describe, expect, it, vi } from 'vitest'

const { netFetchMock } = vi.hoisted(() => ({ netFetchMock: vi.fn() }))

vi.mock('electron', () => ({
  net: { fetch: netFetchMock }
}))

import { regionService } from '../RegionService'

// Guards the privacy-edition contract: the region is fixed and the user's public IP is never
// sent to a geolocation service. Re-merging upstream's detection would fail these tests.
describe('RegionService', () => {
  it('reports the fixed country without any network request', async () => {
    await expect(regionService.getCountry()).resolves.toBe('DE')
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('never reports China, so global download mirrors are used', async () => {
    await expect(regionService.isInChina()).resolves.toBe(false)
    await expect(regionService.detectIsInChina()).resolves.toBe(false)
    expect(netFetchMock).not.toHaveBeenCalled()
  })
})
