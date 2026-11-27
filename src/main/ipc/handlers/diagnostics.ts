import { diagnosticBundleService } from '@main/services/diagnostics'
import type { diagnosticsRequestSchemas } from '@shared/ipc/schemas/diagnostics'
import type { IpcHandlersFor } from '@shared/ipc/types'

// Privacy edition: diagnostics never leave the machine. The three routes that would send an
// archive to the vendor, or ask it about one, refuse every call; export still saves a local ZIP.
const refuseVendorContact = (): Promise<never> =>
  Promise.reject(new Error('Sending diagnostics is disabled in the privacy edition'))

export const diagnosticsHandlers: IpcHandlersFor<typeof diagnosticsRequestSchemas> = {
  'diagnostics.bundle.inspect': async ({ range }) => diagnosticBundleService.inspect(range),
  'diagnostics.bundle.export': async (input, { senderId }) => diagnosticBundleService.exportBundle(input, senderId),
  'diagnostics.bundle.upload': refuseVendorContact,
  'diagnostics.bundle.retry_upload': refuseVendorContact,
  'diagnostics.report.refresh': refuseVendorContact,
  'diagnostics.bundle.save_upload': async (input, { senderId }) =>
    diagnosticBundleService.saveUploadBundle(input, senderId),
  'diagnostics.bundle.discard_upload': async (input) => diagnosticBundleService.discardUpload(input)
}
