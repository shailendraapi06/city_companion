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

export interface PlaceResult {
  place_id: string
  name: string
  category: string
  price_range?: { amount: number; unit: string } | null
  rating?: number | null
  distance_km?: number | null
  match_score?: number
  rank?: number
  reason?: string
  tags?: string[]
  actions?: string[]
  source: string
  verified: boolean
  last_updated: string
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
  [key: string]: unknown
}

export interface RecommendationItem {
  place: PlaceResult
  rank?: number
  reason?: string
  [key: string]: unknown
}

export interface RecommendationBlock {
  type: 'recommendation'
  items?: RecommendationItem[]
  [key: string]: unknown
}

export interface ComparisonBlock {
  type: 'comparison'
  items?: PlaceResult[]
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
  actions?: string[]
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
