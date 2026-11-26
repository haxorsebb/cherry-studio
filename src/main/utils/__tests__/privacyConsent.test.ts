import { describe, expect, it } from 'vitest'

import { LATEST_PRIVACY_POLICY_VERSION } from '@shared/utils/constants'

import { isDataCollectionConsented } from '../privacyConsent'

// Privacy edition contract: analytics and crash reporting both ask this one gate, so it must
// stay closed whatever a profile carried over from an upstream build has stored.
describe('isDataCollectionConsented', () => {
  it('stays closed for a profile that opted in under the current policy', () => {
    expect(isDataCollectionConsented(true, LATEST_PRIVACY_POLICY_VERSION)).toBe(false)
  })
})
