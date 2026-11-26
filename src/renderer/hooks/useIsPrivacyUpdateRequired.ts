/**
 * Whether the user must acknowledge the latest privacy policy before continuing.
 *
 * Privacy edition: never. Nothing is collected, so there is no data-collection policy
 * to accept, whatever a profile carried over from an upstream build has stored.
 */
export function useIsPrivacyUpdateRequired(): boolean {
  return false
}
