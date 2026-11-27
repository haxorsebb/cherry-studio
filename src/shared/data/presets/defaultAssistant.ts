import { DEFAULT_ASSISTANT_SETTINGS } from '@shared/data/types/assistant'

export const DEFAULT_ASSISTANT_NAME = 'Cherie' as const
export const DEFAULT_ASSISTANT_EMOJI = '😀' as const
export const DEFAULT_ASSISTANT_PROMPT = '' as const

export function getDefaultAssistantNameForLocale(locale?: string | null): string {
  return locale?.toLowerCase().startsWith('zh') ? 'Cherry 助手' : DEFAULT_ASSISTANT_NAME
}

export const DEFAULT_ASSISTANT_SEED = {
  name: DEFAULT_ASSISTANT_NAME,
  emoji: DEFAULT_ASSISTANT_EMOJI,
  prompt: DEFAULT_ASSISTANT_PROMPT,
  description: '',
  // Privacy edition: no hosted default model; the user picks one from their own provider.
  modelId: null,
  settings: DEFAULT_ASSISTANT_SETTINGS
} as const
