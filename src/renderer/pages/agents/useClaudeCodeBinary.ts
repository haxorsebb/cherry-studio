import { useCallback, useEffect, useRef, useState } from 'react'

import { loggerService } from '@logger'
import { ipcApi } from '@renderer/ipc'
import type { ClaudeCodeBinaryStatus } from '@shared/ai/claudeCodeBinary'

const logger = loggerService.withContext('useClaudeCodeBinary')

type BinaryRoute = 'ai.claude_code.binary.status' | 'ai.claude_code.binary.ensure' | 'ai.claude_code.binary.retry'

export function useClaudeCodeBinary(enabled: boolean) {
  const [status, setStatus] = useState<ClaudeCodeBinaryStatus>()
  const revision = useRef({ value: 0 })
  const request = useCallback(async (route: BinaryRoute) => {
    const started = revision.current.value
    try {
      const next = await ipcApi.request(route)
      if (revision.current.value === started) setStatus(next)
    } catch (error) {
      logger.warn('Failed to request Claude Code installation', { error })
      if (revision.current.value === started) {
        setStatus({ version: '', phase: 'error', receivedBytes: 0, error: 'installation' })
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const tracker = revision.current
    const unsubscribe = ipcApi.on('ai.claude_code.binary.changed', (next) => {
      tracker.value++
      setStatus(next)
    })
    // Privacy edition: only read the status here. Installing downloads the runtime from the
    // npm registry, so it waits for the user's explicit click on "Download".
    void request('ai.claude_code.binary.status')
    return () => {
      tracker.value++
      unsubscribe()
    }
  }, [enabled, request])

  return {
    status,
    blocked: enabled && status?.phase !== 'ready',
    download: () => void request('ai.claude_code.binary.ensure'),
    retry: () => void request('ai.claude_code.binary.retry')
  }
}
