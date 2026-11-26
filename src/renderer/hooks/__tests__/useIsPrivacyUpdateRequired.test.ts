import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useIsPrivacyUpdateRequired } from '../useIsPrivacyUpdateRequired'

describe('useIsPrivacyUpdateRequired', () => {
  beforeEach(() => {
    MockUsePreferenceUtils.resetMocks()
  })

  // Privacy edition contract: a profile from an upstream build (data collection on, an older
  // policy acknowledged) must not be asked to accept a data-collection policy here.
  it('never requires acknowledging a policy, even for a profile from an upstream build', () => {
    MockUsePreferenceUtils.setMultiplePreferenceValues({
      'app.privacy.data_collection.enabled': true,
      'app.privacy.policy_version': 'previous'
    })

    expect(renderHook(() => useIsPrivacyUpdateRequired()).result.current).toBe(false)
  })
})
