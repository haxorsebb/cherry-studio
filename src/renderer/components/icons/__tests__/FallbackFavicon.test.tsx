import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FallbackFavicon from '../FallbackFavicon'

const fetchMock = vi.hoisted(() => vi.fn())

// Each test uses its own hostname so the favicon service's shared cache cannot leak across tests.
beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// `alt=""` makes the icon decorative, so it has no `img` role — query the element instead.
const findFaviconImage = async (container: HTMLElement, hostname: string) => {
  await waitFor(() => expect(container.querySelector('img')).toBeInTheDocument())
  const image = container.querySelector('img') as HTMLImageElement
  await waitFor(() => expect(image.getAttribute('src')).toContain(hostname))
  return image
}

describe('FallbackFavicon', () => {
  it.each([true, false])(
    'cancels stalled shared probes at the deadline (consumer remains: %s)',
    async (keepConsumer) => {
      vi.useFakeTimers()
      const signals: AbortSignal[] = []
      fetchMock.mockImplementation(
        (_url: string, { signal }: { signal: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            signals.push(signal)
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
          })
      )
      const hostname = `stalled-${keepConsumer}.example`
      const first = render(<FallbackFavicon hostname={hostname} alt="" />)
      const second = render(<FallbackFavicon hostname={hostname} alt="" />)

      first.unmount()
      expect(signals).toHaveLength(1)
      expect(signals.every((signal) => !signal.aborted)).toBe(true)
      if (!keepConsumer) second.unmount()

      await act(() => vi.advanceTimersByTimeAsync(2000))

      expect(signals.every((signal) => signal.aborted)).toBe(true)
      if (keepConsumer) {
        expect(second.container.querySelector('img')).toHaveAttribute('src', `https://${hostname}/favicon.ico`)
        second.unmount()
      }
    }
  )

  it('probes once per hostname and shares the result between mounts', async () => {
    const hostname = 'shared-probe.example'
    const { container } = render(
      <>
        <FallbackFavicon hostname={hostname} alt="" />
        <FallbackFavicon hostname={hostname} alt="" />
      </>
    )

    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2))

    // One candidate source, one HEAD probe — not one probe per mounted icon.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const sources = [...container.querySelectorAll('img')].map((image) => image.getAttribute('src'))
    expect(sources[0]).toBe(sources[1])
  })

  it('persists the resolved source so a later session skips probing', async () => {
    const hostname = 'persisted.example'
    const first = render(<FallbackFavicon hostname={hostname} alt="" />)
    const image = await findFaviconImage(first.container, hostname)
    const resolvedSrc = image.getAttribute('src')
    first.unmount()

    // A fresh module registry has empty in-memory caches — only the stored entry can short-circuit.
    vi.resetModules()
    const { default: FreshFallbackFavicon } = await import('../FallbackFavicon')
    fetchMock.mockClear()

    const second = render(<FreshFallbackFavicon hostname={hostname} alt="" />)

    await waitFor(() => expect(second.container.querySelector('img')).toHaveAttribute('src', resolvedSrc as string))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renders the provided fallback when the image fails to load', async () => {
    const hostname = 'broken-image.example'
    const { container } = render(
      <FallbackFavicon hostname={hostname} alt="" fallback={<svg data-testid="fallback-glyph" />} />
    )

    const image = await findFaviconImage(container, hostname)
    fireEvent.error(image)

    await waitFor(() => expect(container.querySelector('[data-testid="fallback-glyph"]')).toBeInTheDocument())
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  // Privacy edition contract: the linked site is the only host ever asked for its icon, also
  // after that icon failed to load. Upstream then turned to third-party favicon services.
  it('asks no other host after the site icon fails', async () => {
    const hostname = 'stale-cache.example'
    const first = render(<FallbackFavicon hostname={hostname} alt="" />)
    const image = await findFaviconImage(first.container, hostname)
    fireEvent.error(image)
    first.unmount()

    const second = render(<FallbackFavicon hostname={hostname} alt="" />)
    const retriedImage = await findFaviconImage(second.container, hostname)

    const probedHosts = fetchMock.mock.calls.map(([url]) => new URL(url as string).hostname)
    expect(new Set([...probedHosts, new URL(retriedImage.src).hostname])).toEqual(new Set([hostname]))
  })

  it('falls back to the hostname initial when the icon cannot load', async () => {
    const hostname = 'initial.example'
    const { container } = render(<FallbackFavicon hostname={hostname} alt="" />)

    const image = await findFaviconImage(container, hostname)
    fireEvent.error(image)

    await waitFor(() => expect(container).toHaveTextContent('I'))
  })
})
