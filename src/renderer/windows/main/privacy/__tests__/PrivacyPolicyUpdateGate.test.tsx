import '@testing-library/jest-dom/vitest'
import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('@renderer/services/toast', () => ({
  toast: { error: vi.fn() }
}))

vi.mock('../PrivacyPolicyDialog', () => ({
  PrivacyPolicyDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="full-policy" /> : null)
}))

import { PrivacyPolicyUpdateGate } from '../PrivacyPolicyUpdateGate'

describe('PrivacyPolicyUpdateGate', () => {
  beforeEach(() => {
    MockUsePreferenceUtils.resetMocks()
  })

  // Privacy edition contract: nothing is collected, so a profile carried over from an upstream
  // build (data collection on, no current policy acknowledged) is never asked for consent.
  it('stays closed for a profile that has not acknowledged the upstream policy', () => {
    MockUsePreferenceUtils.setPreferenceValue('app.privacy.policy_version', '')
    MockUsePreferenceUtils.setPreferenceValue('app.privacy.data_collection.enabled', true)

    render(<PrivacyPolicyUpdateGate />)

    expect(screen.queryByRole('heading', { name: 'privacy_policy_update.title' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('full-policy')).not.toBeInTheDocument()
  })
})
