import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ netFetch: vi.fn() }))

vi.mock('@application', async () => {
  const { mockApplicationFactory } = await import('@test-mocks/main/application')
  return mockApplicationFactory()
})

vi.mock('@main/utils/appEdition', () => ({
  getAppEdition: () => 'global'
}))

vi.mock('electron', () => ({
  app: { getVersion: () => '2.1.0', isPackaged: false },
  net: { fetch: mocks.netFetch },
  shell: { openExternal: vi.fn() }
}))

import { CherryCloudService } from '../CherryCloudService'

// Privacy edition contract: Cherry Cloud is offline. Upstream's tests of the account,
// subscription and model-sync requests were removed together with that network access;
// this guards against a merge that quietly restores it.
describe('CherryCloudService', () => {
  it('rejects a request without ever reaching the network', async () => {
    const service = new CherryCloudService()

    await expect(service.getPublicPlans()).rejects.toThrow('Cherry Cloud is disabled')
    expect(mocks.netFetch).not.toHaveBeenCalled()
  })
})
