import type { ISeeder } from '../types'
import { AgentSessionContextSeeder } from './seeders/AgentSessionContextSeeder'
import { AgentSessionMessageTreeSeeder } from './seeders/AgentSessionMessageTreeSeeder'
import { BrowserCapabilityUpgradeSeeder } from './seeders/browserCapabilityUpgradeSeeder'
import { BuiltinMcpServerSeeder } from './seeders/builtinMcpServerSeeder'
import { CherryAssistantInstructionsUpgradeSeeder } from './seeders/CherryAssistantInstructionsUpgradeSeeder'
import { CherryAssistantSeeder } from './seeders/cherryAssistantSeeder'
import { CherrySupportSeeder } from './seeders/cherrySupportSeeder'
import { ConversationListSortSeeder } from './seeders/conversationListSortSeeder'
import { DefaultAssistantSeeder } from './seeders/defaultAssistantSeeder'
import { KnowledgeBaseOrderSeeder } from './seeders/knowledgeBaseOrderSeeder'
import { LegacyFileCleanupPolicySeeder } from './seeders/legacyFileCleanupPolicySeeder'
import { LocalDefaultProviderSeeder } from './seeders/localDefaultProviderSeeder'
import { LocalModelSeeder } from './seeders/LocalModelSeeder'
import { LongTextPastePreferenceUpgradeSeeder } from './seeders/longTextPastePreferenceUpgradeSeeder'
import { MessageNavigationUpgradeSeeder } from './seeders/MessageNavigationUpgradeSeeder'
import { MiniAppSeeder } from './seeders/miniAppSeeder'
import { PoeChatEndpointUpgradeSeeder } from './seeders/PoeChatEndpointUpgradeSeeder'
import { PreferenceSeeder } from './seeders/preferenceSeeder'
import { PresetProviderSeeder } from './seeders/presetProviderSeeder'
import { RetiredAgentRuntimeSeeder } from './seeders/RetiredAgentRuntimeSeeder'
import { ScheduledTasksShortcutSeeder } from './seeders/scheduledTasksShortcutSeeder'
import { SelectionActionItemsUpgradeSeeder } from './seeders/selectionActionItemsUpgradeSeeder'
import { SidebarShortcutMigrationSeeder } from './seeders/sidebarShortcutMigrationSeeder'
import { TranslateLanguageSeeder } from './seeders/translateLanguageSeeder'
import { WebSearchPreferenceUpgradeSeeder } from './seeders/WebSearchPreferenceUpgradeSeeder'

/**
 * All seeders in execution order.
 *
 * Privacy edition: LocalDefaultProviderSeeder takes the place of upstream's
 * CherryAiDefaultModelSeeder, so no hosted provider, model or default-model
 * preference is ever seeded.
 *
 * To add a new seeder: create an ISeeder class, add it to this array.
 * No changes to DbService needed.
 */
export const seeders: ISeeder[] = [
  new RetiredAgentRuntimeSeeder(),
  new AgentSessionContextSeeder(),
  new AgentSessionMessageTreeSeeder(),
  new KnowledgeBaseOrderSeeder(),
  new BrowserCapabilityUpgradeSeeder(),
  new LegacyFileCleanupPolicySeeder(),
  new PresetProviderSeeder(),
  new PoeChatEndpointUpgradeSeeder(),
  new LocalDefaultProviderSeeder(),
  new CherryAssistantSeeder(),
  new CherryAssistantInstructionsUpgradeSeeder(),
  new CherrySupportSeeder(),
  new DefaultAssistantSeeder(),
  new LongTextPastePreferenceUpgradeSeeder(),
  new WebSearchPreferenceUpgradeSeeder(),
  new SidebarShortcutMigrationSeeder(),
  new ScheduledTasksShortcutSeeder(),
  new SelectionActionItemsUpgradeSeeder(),
  new MessageNavigationUpgradeSeeder(),
  new ConversationListSortSeeder(),
  new PreferenceSeeder(),
  new TranslateLanguageSeeder(),
  new LocalModelSeeder(),
  new MiniAppSeeder(),
  new BuiltinMcpServerSeeder()
]
