import type { Session } from 'electron'
import { app } from 'electron'

// What Chromium picked for each session (the OS locale), kept so enabling can restore it.
const chromiumDefaultLanguages = new WeakMap<Session, string[]>()

/**
 * Stop Chromium from fetching spell-check dictionaries nobody asked for.
 *
 * Every new session starts with the OS locale as its spell-check language, and on Windows
 * and Linux Chromium downloads that dictionary from Google's servers right away, even
 * while spell check is switched off. Clearing the languages in the same tick the session
 * is created cancels that download. Call this before the first session exists.
 */
export function deferSpellCheckDictionaries(): void {
  app.on('session-created', (created) => {
    chromiumDefaultLanguages.set(created, created.getSpellCheckerLanguages())
    created.setSpellCheckerLanguages([])
  })
}

/**
 * Switch spell check on or off for one session. Switching it on is the only point where
 * a dictionary may be downloaded: for `languages`, or for Chromium's default when empty.
 */
export function applySpellCheck(target: Session, enabled: boolean, languages: readonly string[] = []): void {
  target.setSpellCheckerEnabled(enabled)
  if (!enabled) return
  const wanted = languages.length > 0 ? [...languages] : (chromiumDefaultLanguages.get(target) ?? [])
  if (wanted.length > 0) target.setSpellCheckerLanguages(wanted)
}
