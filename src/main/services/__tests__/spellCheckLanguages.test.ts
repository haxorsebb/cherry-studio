import type { Session } from 'electron'
import { app } from 'electron'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  return { app: new EventEmitter() }
})

import { applySpellCheck, deferSpellCheckDictionaries } from '../spellCheckLanguages'

/** A session as Chromium hands it out: the OS locale preselected and the checker on. */
function createSession(osLocale = 'de') {
  const state = { enabled: true, languages: [osLocale] }
  const session = {
    getSpellCheckerLanguages: () => [...state.languages],
    setSpellCheckerLanguages: (languages: string[]) => {
      state.languages = [...languages]
    },
    setSpellCheckerEnabled: (enabled: boolean) => {
      state.enabled = enabled
    }
  } as unknown as Session
  app.emit('session-created', session)
  return { session, state }
}

// Privacy edition contract: a session only has spell-check languages (and so only makes
// Chromium download a dictionary from Google) after the user switched spell check on.
describe('spell check dictionaries', () => {
  beforeAll(() => deferSpellCheckDictionaries())

  it('leaves a new session without languages, so there is no dictionary to download', () => {
    const { state } = createSession()

    expect(state.languages).toEqual([])
  })

  it('keeps a session without languages while spell check is off', () => {
    const { session, state } = createSession()

    applySpellCheck(session, false, ['fr'])

    expect(state).toEqual({ enabled: false, languages: [] })
  })

  it('loads the languages the user chose once spell check is on', () => {
    const { session, state } = createSession()

    applySpellCheck(session, true, ['fr', 'en-US'])

    expect(state).toEqual({ enabled: true, languages: ['fr', 'en-US'] })
  })

  it('falls back to the language Chromium preselected when the user chose none', () => {
    const { session, state } = createSession('pt-BR')

    applySpellCheck(session, true)

    expect(state).toEqual({ enabled: true, languages: ['pt-BR'] })
  })
})
