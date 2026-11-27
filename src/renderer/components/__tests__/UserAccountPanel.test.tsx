import { MockUsePreferenceUtils } from '@test-mocks/renderer/usePreference'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type PropsWithChildren, type ReactElement, useState } from 'react'
import { SWRConfig } from 'swr'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@renderer/i18n/resolver'
import type {
  CherryCloudAccountPlans,
  CherryCloudAccountReceipt,
  CherryCloudStatus
} from '@shared/ipc/schemas/cherryCloud'

import { UserAccountPanel } from '../UserAccountPanel'

vi.unmock('@cherrystudio/ui')

const request = vi.mocked(window.api.ipcApi.request)
let session: Pick<CherryCloudStatus, 'phase' | 'accountId' | 'displayName'>
let plans: CherryCloudAccountPlans

let revision = 0
function receiptFor(status = session, value?: CherryCloudAccountPlans): CherryCloudAccountReceipt {
  const nextRevision = ++revision
  return {
    status: { ...status, scopeId: status.accountId ?? status.phase, revision: nextRevision },
    reason: 'initial',
    account: { freshness: 'unknown', error: null },
    models: { freshness: 'unknown', error: null },
    plans: value ? { freshness: 'fresh', value, observedRevision: nextRevision } : { freshness: 'unknown', error: null }
  }
}
function publishReceipt(receipt: CherryCloudAccountReceipt) {
  vi.mocked(window.api.ipcApi.on)
    .mock.calls.filter(([event]) => event === 'cherry_cloud.account_changed')
    .forEach(([, listener]) => listener(receipt))
}

let swrCache = new Map()

function SWRWrapper({ children }: PropsWithChildren) {
  return <SWRConfig value={{ provider: () => swrCache, dedupingInterval: 0 }}>{children}</SWRConfig>
}

function renderAccount(ui: ReactElement) {
  return render(ui, { wrapper: SWRWrapper })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function paidPlans(name: string): CherryCloudAccountPlans {
  return {
    ...plans,
    entitlements: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        source: 'stripe',
        plan: {
          id: '22222222-2222-4222-8222-222222222222',
          display_name: name,
          is_free: false,
          default_for_new_accounts: false,
          quota_pool_count: 1,
          model_count: 1,
          purchase_available: true
        },
        state: 'active',
        starts_at: '2026-09-01T00:00:00Z',
        quota_pools: [
          {
            allocation_id: '55555555-5555-4555-8555-555555555555',
            display_name: 'Plan quota',
            measurement_kind: 'requests',
            model_ids: ['test-model'],
            windows: [
              {
                window_type: 'rolling',
                duration_seconds: 604800,
                limit_units: 100,
                used_units: 21,
                active_reserved_units: 0,
                remaining_units: 79
              }
            ]
          }
        ]
      }
    ]
  }
}

beforeEach(async () => {
  swrCache = new Map()
  vi.clearAllMocks()
  MockUsePreferenceUtils.resetMocks()
  MockUsePreferenceUtils.setPreferenceValue('app.user.name', '')
  vi.stubGlobal('__APP_EDITION__', 'global')
  vi.stubEnv('DEV', true)
  await i18n.changeLanguage('zh-CN')

  session = { phase: 'signed-in', accountId: 'account-1', displayName: 'c***@cherry-ai.com' }
  plans = { measured_at: '2026-09-23T00:00:00Z', entitlements: [], available_plans: [] }
  request.mockImplementation(async (route) => {
    if (route === 'cherry_cloud.status.get') return { ok: true, data: receiptFor().status }
    if (route === 'cherry_cloud.account.get') return { ok: true, data: receiptFor() }
    if (route === 'cherry_cloud.account_origin.get') return { ok: true, data: 'https://cloud-dev.cherryai.com' }
    if (route === 'cherry_cloud.account.refresh')
      return { ok: true, data: { outcome: 'refreshed', receipt: receiptFor(session, plans) } }
    if (route === 'cherry_cloud.account_portal.open') return { ok: true, data: { outcome: 'opened' } }
    if (route === 'cherry_cloud.login.start') {
      session = { phase: 'authorizing', accountId: null, displayName: null }
      publishReceipt(receiptFor())
      return new Promise(() => undefined)
    }
    return { ok: true, data: undefined }
  })
})

afterEach(() => vi.unstubAllEnvs())

describe('UserAccountPanel', () => {
  // Privacy edition contract: Cherry Cloud is offline, so the menu offers neither a
  // subscription entry nor a cloud sign-in, whatever the account state is.
  it.each(['signed-in', 'signed-out'] as const)('offers no subscription or cloud sign-in while %s', async (phase) => {
    session = { ...session, phase }
    renderAccount(<UserAccountPanel />)

    await screen.findByRole('button', { name: '用户名' })
    expect(screen.queryByText('订阅')).not.toBeInTheDocument()
    expect(screen.queryByText('用量')).not.toBeInTheDocument()
    expect(request).not.toHaveBeenCalledWith('cherry_cloud.login.start')
    expect(screen.queryByRole('button', { name: /登录/ })).not.toBeInTheDocument()
  })

  it('uses the account entry label when the signed-in account has no display name', async () => {
    session = { ...session, displayName: null }
    renderAccount(<UserAccountPanel />)

    expect(await screen.findByText('已登录')).toBeVisible()
    expect(within(screen.getByRole('button', { name: '用户名' })).getByText('个人信息')).toBeVisible()
  })

  it('prefers the local nickname and shows the cloud identity separately', async () => {
    MockUsePreferenceUtils.setPreferenceValue('app.user.name', 'Local nickname')
    renderAccount(<UserAccountPanel />)

    await screen.findByText(session.displayName!)
    const header = screen.getByRole('button', { name: '用户名' })
    expect(within(header).getByText('Local nickname')).toBeVisible()
    expect(within(header).getByText(session.displayName!)).toBeVisible()
  })

  it('places help below appearance and keeps settings as the last menu action', () => {
    renderAccount(
      <UserAccountPanel>
        <button type="button">帮助</button>
      </UserAccountPanel>
    )
    const appearance = screen.getByRole('button', { name: '外观' })
    const help = screen.getByRole('button', { name: '帮助' })
    const settings = screen.getByRole('button', { name: '设置' })

    expect(screen.getAllByRole('button').filter((button) => [appearance, help, settings].includes(button))).toEqual([
      appearance,
      help,
      settings
    ])
  })

  it('closes the entire account menu after selecting an appearance mode', async () => {
    function AccountMenu() {
      const [open, setOpen] = useState(true)
      return open ? (
        <UserAccountPanel onRequestClose={() => setOpen(false)} />
      ) : (
        <button type="button">Open account menu</button>
      )
    }
    const user = userEvent.setup()
    renderAccount(<AccountMenu />)

    await user.hover(screen.getByRole('button', { name: '外观' }))
    await user.click(await screen.findByRole('button', { name: '浅色', pressed: false }))

    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '用户名' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '外观' })).not.toBeInTheDocument()
  })

  it('shows the signed-in email without a name prompt in the global account menu', async () => {
    renderAccount(<UserAccountPanel />)

    expect(await screen.findByText('c***@cherry-ai.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '用户名' })).toHaveTextContent('c***@cherry-ai.com')
    expect(within(screen.getByRole('button', { name: '用户名' })).getByText('个人信息')).toBeVisible()
    expect(screen.getAllByText('c***@cherry-ai.com')).toHaveLength(1)
    expect(screen.queryByText('输入您的姓名')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument()
  })

  it('drops a previous account plan and ignores an obsolete receipt', async () => {
    plans = paidPlans('Old Plan')
    renderAccount(<UserAccountPanel />)
    await screen.findByText('Old Plan')
    const old = receiptFor(session, plans)
    session = { ...session, accountId: 'account-2' }
    const unknown = receiptFor()
    const pending = deferred<{ ok: true; data: unknown }>()
    request.mockImplementation(() => pending.promise)
    act(() => publishReceipt(unknown))
    expect(screen.queryByText('Old Plan')).not.toBeInTheDocument()
    act(() => publishReceipt(old))
    expect(screen.queryByText('Old Plan')).not.toBeInTheDocument()
    act(() => publishReceipt(receiptFor(session, paidPlans('New Plan'))))
    expect(await screen.findByText('New Plan')).toBeVisible()
    await act(async () => pending.resolve({ ok: true, data: { outcome: 'superseded', status: unknown.status } }))
  })
})
