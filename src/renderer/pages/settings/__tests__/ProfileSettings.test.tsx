import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProfileSettings } from '../ProfileSettings'

vi.mock('@renderer/components/UserProfileEditor', () => ({
  UserProfileEditor: () => <button type="button" aria-label="Avatar editor" />
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

describe('ProfileSettings', () => {
  // Privacy edition: the page is the local profile only; there is no subscription section.
  it('shows profile editing without a subscription section', () => {
    render(<ProfileSettings />)

    expect(screen.getByRole('button', { name: 'Avatar editor' })).toBeInTheDocument()
    expect(screen.queryByText(/subscription/i)).not.toBeInTheDocument()
  })
})
