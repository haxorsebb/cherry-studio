import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type * as assistantCatalog from '@renderer/hooks/useAssistantCatalogPresets'
import { Route as MarketplaceRoute } from '@renderer/routes/app/marketplace'

// Records whether the page ever asks the skill marketplace hook to load its remote catalog.
const marketplaceState = vi.hoisted(() => ({ activations: [] as boolean[] }))

vi.mock('@cherrystudio/ui', async (importOriginal) => importOriginal())
vi.mock('@renderer/hooks/useAgentCatalogPresets', () => ({
  useAgentCatalogPresets: () => ({ items: [], isLoading: false })
}))
vi.mock('@renderer/hooks/useAssistantCatalogPresets', async (importOriginal) => ({
  ...(await importOriginal<typeof assistantCatalog>()),
  useAssistantCatalogPresets: () => ({ presets: [], isLoading: false })
}))
vi.mock('@renderer/hooks/useBuiltinMcpCatalog', () => ({
  useBuiltinMcpCatalog: () => ({ presets: [], mcpServers: [], adding: new Set(), isLoading: false })
}))
vi.mock('../useMarketplace', () => ({
  useMarketplace: (_sourceId: string | null, active: boolean) => {
    marketplaceState.activations.push(active)
    return {
      catalog: { data: [] },
      installed: { loading: false },
      installedCount: () => 0,
      mutating: new Set(),
      failures: {},
      skipped: 0
    }
  }
}))

beforeEach(async () => {
  await i18next.changeLanguage('en-us')
  marketplaceState.activations = []
  vi.stubGlobal('scrollTo', vi.fn())
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Privacy edition contract: the page offers only bundled catalogs, even when a link
// asks for the third-party MCP directories, and never loads the remote skill catalog.
it('offers only bundled catalogs and never activates the remote skill catalog', async () => {
  const root = createRootRoute()
  const marketplace = createRoute({
    getParentRoute: () => root,
    path: '/app/marketplace',
    validateSearch: MarketplaceRoute.options.validateSearch,
    component: MarketplaceRoute.options.component
  })
  const router = createRouter({
    routeTree: root.addChildren([marketplace]),
    history: createMemoryHistory({ initialEntries: ['/app/marketplace?mcpView=sources'] })
  })
  await router.load()
  render(<RouterProvider router={router} />)
  const navigation = within(await screen.findByRole('navigation'))

  expect(navigation.getByRole('button', { name: /MCP/ })).toBeVisible()
  expect(navigation.queryByRole('button', { name: /^Skill / })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'More sources' })).not.toBeInTheDocument()
  expect(marketplaceState.activations).not.toContain(true)
})
