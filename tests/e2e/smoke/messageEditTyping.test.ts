import { createUniqueModelId } from '../../../src/shared/data/types/model'
import { expect, test } from './fixtures/electron.fixture'

test('typing immediately after editing an assistant message preserves every character', async ({
  mainWindow: page
}) => {
  const original = 'Original reply for issue 23288.'
  await page.evaluate(async () => {
    await window.api.preference.setMultiple({
      'app.language': 'en-US',
      'app.onboarding.provider_setup.status': 'skipped',
      'app.privacy.policy_version': '20260820'
    })
  })
  // Privacy edition: there is no hosted default model, and Send stays disabled without one.
  const providerId = `edit-typing-${Date.now()}`
  const modelId = 'edit-typing-model'
  const seeded = await page.evaluate(
    async ({ text, providerId, modelId, uniqueModelId }) => {
      const setup = [
        {
          method: 'POST' as const,
          path: '/providers',
          body: {
            providerId,
            name: 'Edit typing',
            defaultChatEndpoint: 'openai-chat-completions',
            endpointConfigs: { 'openai-chat-completions': { baseUrl: 'http://127.0.0.1:9' } }
          }
        },
        { method: 'PATCH' as const, path: `/providers/${providerId}`, body: { isEnabled: true } },
        {
          method: 'POST' as const,
          path: '/models',
          body: [{ providerId, modelId, endpointTypes: ['openai-chat-completions'] }]
        }
      ]
      for (const request of setup) {
        const response = await window.api.dataApi.request({ id: crypto.randomUUID(), ...request })
        if (response.error) throw new Error(response.error.message)
      }
      const assistant = await window.api.dataApi.request({
        id: crypto.randomUUID(),
        method: 'POST',
        path: '/assistants',
        body: { name: 'Edit typing', modelId: uniqueModelId }
      })
      if (assistant.error) throw new Error(assistant.error.message)
      const topic = await window.api.dataApi.request({
        id: crypto.randomUUID(),
        method: 'POST',
        path: '/topics',
        body: { name: 'Edit typing', assistantId: (assistant.data as { id: string }).id }
      })
      if (topic.error) throw new Error(topic.error.message)
      const id = (topic.data as { id: string }).id
      const reply = await window.api.dataApi.request({
        id: crypto.randomUUID(),
        method: 'POST',
        path: `/topics/${id}/messages`,
        body: {
          role: 'assistant',
          status: 'success',
          data: {
            parts: [
              { type: 'reasoning', text: 'Reasoning for the reply.' },
              { type: 'text', text }
            ]
          }
        }
      })
      if (reply.error) throw new Error(reply.error.message)
      return { topicId: id, messageId: (reply.data as { id: string }).id }
    },
    { text: original, providerId, modelId, uniqueModelId: createUniqueModelId(providerId, modelId) }
  )
  await page.reload()
  await page.waitForSelector('#root')
  await page.evaluate(
    (id) => window.api.ipcApi.request('navigation.open_route_in_main', { path: `/app/chat?topicId=${id}` }),
    seeded.topicId
  )
  await page.bringToFront()
  const editor = page
    .locator('[data-ui~="part:composer-input"] [contenteditable="true"]')
    .filter({ visible: true })
    .first()
  await expect(editor).toBeVisible()
  const message = page.locator('[data-ui~="chat.message"]').filter({ hasText: original }).first()
  await expect(message).toBeVisible()
  await message.hover()
  await message.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
  await page.locator(':focus').pressSequentially('QQQ 111', { delay: 25 })
  const firstText = `${original}QQQ 111`
  await expect.poll(async () => await editor.textContent()).toBe(firstText)
  await expect(editor).toBeEditable()
  expect(
    await editor.evaluate((element) => {
      const selection = window.getSelection()
      if (!selection?.isCollapsed || !selection.anchorNode || !element.contains(selection.anchorNode)) return false
      const afterCaret = document.createRange()
      afterCaret.setStart(selection.anchorNode, selection.anchorOffset)
      afterCaret.setEnd(element, element.childNodes.length)
      return afterCaret.toString().length === 0 && element.contains(document.activeElement)
    })
  ).toBe(true)
  const marker = '  mark-23288  9087  '
  await page.locator(':focus').pressSequentially(marker, { delay: 25 })
  const expected = firstText + marker
  await expect.poll(async () => await editor.textContent()).toBe(expected)
  const send = page
    .locator('[data-ui~="chat.composer"]')
    .filter({ visible: true })
    .first()
    .getByRole('button', { name: 'Send', exact: true })
  await expect(send, 'The edit save path is the shared Send control').toHaveAttribute('aria-disabled', 'false')
  await send.click()
  await expect
    .poll(async () => {
      const response = await page.evaluate(
        (id) => window.api.dataApi.request({ id: crypto.randomUUID(), method: 'GET', path: `/messages/${id}` }),
        seeded.messageId
      )
      const parts = (response.data as { data: { parts: Array<{ type: string; text?: string }> } }).data.parts
      return parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('')
    })
    .toBe(expected)
  await expect(page.getByRole('button', { name: 'Cancel editing', exact: true })).toHaveCount(0)
})
