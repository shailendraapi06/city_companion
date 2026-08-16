import type { ComponentType } from 'react'
import { AlertRenderer } from '../../components/renderer/AlertRenderer'
import { MarkdownRenderer } from '../../components/renderer/MarkdownRenderer'
import { TableRenderer } from '../../components/renderer/TableRenderer'
import { ComparisonTable } from '../../components/places/ComparisonTable'
import { PlaceActions } from '../../components/places/PlaceActions'
import { PlaceCard } from '../../components/places/PlaceCard'
import { RecommendationCard } from '../../components/places/RecommendationCard'
import type { Block, BlockType } from '../../types'

export type BlockComponent = ComponentType<{ block: Block }>

/*
 * ComponentRegistry (Frontend_Architecture.md §4.1).
 *
 * Maps every supported content block type (Backend_Schema.md §9.2) to its
 * renderer. Blocks arrive inside `content[]` (API_Specification.md §5.1) and
 * are dispatched in order by ResponseRenderer.
 *
 * NOTE — MVP correction: `map` is intentionally NOT registered. Its registry
 * slot is reserved (so `componentRegistry.map` stays undefined and the block
 * renders nothing) but the real MapPreview integration is deferred to a
 * dedicated later phase. Everything else is wired now.
 *
 * `place`, `recommendation`, `comparison` and `action` render *placeholder*
 * cards (Phase 6C) — their full designs ship with the Phase 7 feature work.
 */
export const componentRegistry: Partial<Record<BlockType, BlockComponent>> = {
  text: MarkdownRenderer,
  heading: MarkdownRenderer,
  list: MarkdownRenderer,
  table: TableRenderer,
  link: MarkdownRenderer,
  image: MarkdownRenderer,
  place: PlaceCard,
  recommendation: RecommendationCard,
  comparison: ComparisonTable,
  action: PlaceActions,
  alert: AlertRenderer,
}
