export type BlockType = 'text' | 'heading' | 'list' | 'table' | 'link' | 'image' | 'place' | 'recommendation' | 'comparison' | 'map' | 'alert' | 'action'
export interface ContentBlock { type: BlockType; content?: string; title?: string; items?: PlaceResult[]; [key: string]: unknown }
export type Block = ContentBlock
export interface BlockResponse { message: { role: 'assistant' }; content: ContentBlock[] }
export interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; response_data: BlockResponse | null; created_at: string }
export interface Conversation { id: string; title: string | null; city: string | null; created_at: string; updated_at: string }
export interface Place { id: string; name: string; category: string; source: string; verified: boolean; last_updated: string }
export interface PlaceResult { place_id: string; name: string; category: string; price_range?: { amount: number; unit: string } | null; rating?: number | null; distance_km?: number | null; match_score?: number; rank?: number; reason?: string; tags?: string[]; actions?: string[]; source: string; verified: boolean; last_updated: string }
export interface ApiErrorData { code: string; message: string }
export interface ApiEnvelope<T> { success: boolean; data: T | null; error: ApiErrorData | null }

