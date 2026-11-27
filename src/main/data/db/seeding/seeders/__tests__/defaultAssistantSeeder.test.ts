import { setupTestDatabase, withRoot } from '@test-helpers/db'
import { eq } from 'drizzle-orm'
import { app } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assistantTable } from '@data/db/schemas/assistant'
import { messageTable } from '@data/db/schemas/message'
import { topicTable } from '@data/db/schemas/topic'
import { DefaultAssistantSeeder } from '@data/db/seeding/seeders/defaultAssistantSeeder'
import { generateOrderKeyBetween } from '@data/services/utils/orderKey'
import { DEFAULT_ASSISTANT_SETTINGS } from '@shared/data/types/assistant'

describe('DefaultAssistantSeeder', () => {
  const dbh = setupTestDatabase()
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  beforeEach(() => {
    vi.mocked(app.getLocale).mockReturnValue('en-US')
    vi.mocked(app.getPreferredSystemLanguages).mockReturnValue(['en-US'])
  })

  // Privacy edition: no hosted default model exists, so the assistant starts without one.
  it('seeds the default assistant without a model on an empty database', async () => {
    new DefaultAssistantSeeder().run(dbh.db)

    const [assistant] = await dbh.db.select().from(assistantTable).limit(1)

    expect(assistant?.id).toMatch(UUID_V4_PATTERN)
    expect(assistant).toMatchObject({ modelId: null })

    const [topic] = await dbh.db.select().from(topicTable).limit(1)
    expect(topic?.id).toMatch(UUID_V4_PATTERN)
    expect(topic).toMatchObject({
      assistantId: assistant.id,
      activeNodeId: null
    })

    const messages = await dbh.db.select().from(messageTable).where(eq(messageTable.topicId, topic.id))
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      parentId: null,
      role: 'root',
      data: { parts: [] }
    })
  })

  it('uses preferred system languages without calling app.getLocale before Electron is ready', async () => {
    vi.mocked(app.getLocale).mockImplementation(() => {
      throw new Error('app.getLocale cannot be called before ready')
    })
    vi.mocked(app.getPreferredSystemLanguages).mockReturnValue(['zh-CN'])

    expect(() => new DefaultAssistantSeeder().run(dbh.db)).not.toThrow()
  })

  it('falls back to the English default assistant name when preferred system languages are unavailable', async () => {
    vi.mocked(app.getLocale).mockReturnValue('zh-CN')
    vi.mocked(app.getPreferredSystemLanguages).mockImplementation(() => {
      throw new Error('preferred languages unavailable')
    })

    expect(() => new DefaultAssistantSeeder().run(dbh.db)).not.toThrow()
  })

  it('does not seed the default assistant when an active assistant already exists', async () => {
    await dbh.db.insert(assistantTable).values({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Existing Assistant',
      emoji: '🌟',
      settings: DEFAULT_ASSISTANT_SETTINGS,
      orderKey: generateOrderKeyBetween(null, null)
    })

    new DefaultAssistantSeeder().run(dbh.db)

    const rows = await dbh.db.select().from(assistantTable)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('does not seed the default assistant when an active topic already exists', async () => {
    await dbh.db.insert(topicTable).values({
      id: '22222222-2222-4222-8222-222222222222',
      orderKey: generateOrderKeyBetween(null, null)
    })

    new DefaultAssistantSeeder().run(dbh.db)

    const rows = await dbh.db.select().from(assistantTable)
    expect(rows).toHaveLength(0)
  })

  it('does not seed the default assistant when an active message already exists', async () => {
    await dbh.db.insert(topicTable).values({
      id: '33333333-3333-4333-8333-333333333333',
      orderKey: generateOrderKeyBetween(null, null)
    })
    await dbh.db.insert(messageTable).values(
      withRoot('33333333-3333-4333-8333-333333333333', [
        {
          id: '44444444-4444-4444-8444-444444444444',
          parentId: null,
          topicId: '33333333-3333-4333-8333-333333333333',
          role: 'user',
          data: { parts: [] },
          status: 'success'
        }
      ])
    )

    new DefaultAssistantSeeder().run(dbh.db)

    const rows = await dbh.db.select().from(assistantTable)
    expect(rows).toHaveLength(0)
  })
})
