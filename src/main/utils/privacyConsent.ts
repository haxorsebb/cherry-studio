/**
 * Whether the user consented to data collection.
 * Every uploader (analytics, crash reporting) must gate on this one predicate.
 *
 * Privacy edition: never consented, whatever the stored preferences say. This keeps
 * both uploaders off without touching either of them.
 */
export const isDataCollectionConsented: (enabled: boolean, policyVersion: string) => boolean = () => false
