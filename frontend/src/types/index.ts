export type BlockType =
  | 'text'
  | 'heading'
  | 'list'
  | 'table'
  | 'link'
  | 'image'
  | 'place'
  | 'recommendation'
  | 'comparison'
  | 'map'
  | 'alert'
  | 'action'

export type AlertLevel = 'info' | 'success' | 'warning' | 'error'

export interface PriceRange {
  amount: number
  unit: string
}

/*
 * Per-factor match scoring emitted by the backend's Recommendation Engine
 * (Backend_Schema.md §9.3 PlaceResult.score_breakdown). Each value is that
 * factor's score contribution (0 → its weight). The "Why this?" checklist on
 * RecommendationCard is driven from this real per-factor data — never invented
 * client-side.
 */
export interface ScoreBreakdown {
  budget?: number
  requirement?: number
  distance?: number
  rating?: number
  quality?: number
}

export interface PlaceResult {
  place_id: string
  name: string
  category?: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  price_range?: PriceRange | null
  rating?: number | null
  distance_km?: number | null
  match_score?: number
  rank?: number
  reason?: string
  amenities?: string[] | null
  score_breakdown?: ScoreBreakdown | null
  phone?: string | null
  website?: string | null
  tags?: string[]
  actions?: string[]
  source?: string
  verified?: boolean
  last_updated?: string | null
  [key: string]: unknown
}

/*
 * The fixed, extensible `content[].type` contract (Backend_Schema.md §9.2 /
 * API_Specification.md §5.4). Every member keeps an index signature so the
 * schema can grow (new fields / future block types) without breaking the
 * renderer or the registry. The `map` type is a reserved registry slot only —
 * it is intentionally NOT wired to a component in MVP
 * (Frontend_Architecture.md §4.1 MVP correction).
 */
export interface TextBlock {
  type: 'text'
  content?: string
  [key: string]: unknown
}

export interface HeadingBlock {
  type: 'heading'
  content?: string
  level?: number
  [key: string]: unknown
}

export interface ListBlock {
  type: 'list'
  content?: string
  items?: string[]
  ordered?: boolean
  [key: string]: unknown
}

export interface TableBlock {
  type: 'table'
  title?: string
  headers?: string[]
  rows?: (string | number)[][]
  [key: string]: unknown
}

export interface LinkBlock {
  type: 'link'
  content?: string
  href?: string
  [key: string]: unknown
}

export interface ImageBlock {
  type: 'image'
  content?: string
  url?: string
  alt?: string
  [key: string]: unknown
}

export interface PlaceBlock {
  type: 'place'
  place?: PlaceResult | null
  items?: PlaceResult[] | null
  [key: string]: unknown
}

export interface RecommendationItem {
  place: PlaceResult
  rank?: number
  reason?: string
  [key: string]: unknown
}

/**
 * Recommendation items come in two shapes:
 *  - legacy nested `{place, rank, reason}` (pre-7C mock payloads), and
 *  - flat `PlaceResult[]` where the engine embeds `rank`/`reason`/`score_breakdown`
 *    directly on the item (real backend shape, Backend_Schema.md §9.3).
 * `normalizeRecommendationItems` in lib/blockUtils.ts normalizes both.
 */
export interface RecommendationBlock {
  type: 'recommendation'
  items?: (RecommendationItem | PlaceResult)[]
  summary?: string
  [key: string]: unknown
}

/**
 * Comparison block. Two shapes are supported:
 *  - backend `{headers, rows}` (Backend_Schema.md §9.2), and
 *  - legacy `{items: PlaceResult[]}` which the component derives aligned
 *    Price / Distance / Food / Rating rows from, matching UI_UX_Brief §5.5.
 * A natural-language pick is rendered from `explanation`, falling back to
 * `summary` / `pick` — always the engine's own words, never fabricated.
 */
export interface ComparisonBlock {
  type: 'comparison'
  title?: string
  headers?: string[]
  rows?: (string | number)[][]
  items?: PlaceResult[]
  explanation?: string
  summary?: string
  [key: string]: unknown
}

export interface MapBlock {
  type: 'map'
  [key: string]: unknown
}

export interface AlertBlock {
  type: 'alert'
  level?: AlertLevel
  title?: string
  content?: string
  [key: string]: unknown
}

export interface ActionBlock {
  type: 'action'
  /** Legacy string-list of action labels (pre-7C mock payloads). */
  actions?: string[]
  /** Payload-driven action (backend `action` block, Backend_Schema.md §9.2). */
  label?: string
  action_type?: string
  payload?: Record<string, unknown> | null
  content?: string
  [key: string]: unknown
}

export type ContentBlock =
  | TextBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | LinkBlock
  | ImageBlock
  | PlaceBlock
  | RecommendationBlock
  | ComparisonBlock
  | MapBlock
  | AlertBlock
  | ActionBlock

export type Block = ContentBlock

export interface BlockResponse {
  message: { role: 'assistant' }
  content: ContentBlock[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  response_data: BlockResponse | null
  created_at: string
}

export interface Conversation {
  id: string
  title: string | null
  city: string | null
  created_at: string
  updated_at: string
}

export interface Place {
  id: string
  name: string
  category: string
  source: string
  verified: boolean
  last_updated: string
}

export interface ApiErrorData {
  code: string
  message: string
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: ApiErrorData | null
}

export interface UserProfile {
  preferred_city: string | null
  language: string | null
}

export interface User {
  id: string
  name: string
  email: string
  profile?: UserProfile | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface AuthData {
  user: User
  access_token: string
  refresh_token: string
}

export interface RefreshTokenData {
  access_token: string
}

/* ---------------------------------------------------------------------------
 * Server-side DTOs (Frontend_Architecture.md §6 — typed API client).
 * Shapes mirror the Django REST serializers / API_Specification.md exactly.
 * ------------------------------------------------------------------------- */

/** Standard pagination envelope used by list endpoints. */
export interface Paginated<T> {
  results: T[]
  count: number
  page: number
  page_size: number
  total_pages: number
}

/** Message history payload from GET /api/conversations/{id}/messages/. */
export interface ConversationMessagesData {
  results: Message[]
}

/** Place summary nested inside GET /api/saved-places/ (SavedPlaceListSerializer). */
export interface SavedPlaceSummary {
  id: string
  name: string
  category: string
  price_range: PriceRange | null
  rating: number | null
}

export interface SavedPlace {
  saved_id: string
  place: SavedPlaceSummary
  created_at: string
}

/** Full place detail from GET /api/places/{id}/ (PlaceDetailSerializer). */
export interface PlaceDetail {
  id: string
  name: string
  category: string
  description: string | null
  address: string | null
  latitude: string | number
  longitude: string | number
  phone: string | null
  website: string | null
  rating: number | null
  price_range: PriceRange | null
  amenities: string[] | null
  opening_hours: Record<string, unknown> | null
  images: string[] | null
  source: string
  verified: boolean
  last_updated: string
  is_saved: boolean
}

/** Response from POST /api/places/{id}/save/. */
export interface SavePlaceResult {
  id: string
  place_id: string
  created_at: string
}

export type FeedbackType = 'up' | 'down'

export type FeedbackReason =
  | 'too_expensive'
  | 'too_far'
  | 'not_available'
  | 'wrong_information'
  | 'other'

export interface FeedbackPayload {
  message_id: string
  place_id?: string | null
  type: FeedbackType
  reason?: FeedbackReason | null
}

/** Response from POST /api/feedback/ (FeedbackDetailSerializer). */
export interface FeedbackResult {
  id: string
  message_id: string
  place_id: string | null
  type: FeedbackType
  reason: FeedbackReason | null
  created_at: string
}

/* ---------------------------------------------------------------------------
 * Chat session state (Frontend_Architecture.md §5.2).
 * ------------------------------------------------------------------------- */

export type ChatStatus = 'idle' | 'sending' | 'streaming' | 'error'

export interface ChatLocation {
  lat: number
  lng: number
}
