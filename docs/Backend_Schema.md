# City Companion — Backend Schema

*Derived from the project conversations. Covers the relational database schema, JSON data contracts (AI response format, tool-call payloads), and how they connect. Field-name/purpose decisions are marked **[CONFIRMED]**; exact Django field types/constraints were not explicitly specified in the conversations, so they are given as **[PROPOSED]** sensible defaults — adjust freely, they are not locked decisions.*

---

## 0. Conventions Used in This Document

- **[CONFIRMED]** — the field/entity/relationship itself was explicitly discussed.
- **[PROPOSED]** — a reasonable Django/Postgres implementation of a confirmed concept (type, null/blank, index) that wasn't spelled out in the conversations.
- **[FUTURE]** — model/field discussed only as a later-phase idea; do not build in MVP.
- **[TBD]** — referenced but never resolved; needs a decision.
- `snake_case` field names are used per Django convention; the conversations used a mix of casual naming, normalized here.

---

## 1. Entity Overview

```
User
 ├── UserProfile            (1:1)
 ├── Conversation           (1:N)
 │      └── Message         (1:N)
 ├── SavedPlace              (1:N)  ──> Place
 └── Feedback                (1:N)  ──> Message, Place

Place
 ├── category                (choice field, not a separate table — CONFIRMED simplification)
 └── source / verified / last_updated  (data-quality metadata on every row)

City                          [OPTIONAL / TBD — not required for MVP]
```

Core rule carried from the conversations: **one generic `Place` table**, not one table per category (Hotel/PG/Restaurant/Hospital/...). Category-specific facts live as structured/flexible attributes on the same row rather than in separate normalized tables — explicitly chosen to keep the Recommendation Engine simple. **[CONFIRMED, REJECTED alternative: per-category tables]**

---

## 2. `users` app

### 2.1 `User` **[CONFIRMED — custom Django user model]**

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | UUID / BigAutoField | PK | [PROPOSED type — conversations only said `id`] |
| `name` | CharField(150) | not null | [CONFIRMED field] |
| `email` | EmailField | unique, not null | [CONFIRMED field] used as login identifier |
| `password` | Django hashed password | not null | Django's built-in hashing — **never** store plaintext **[CONFIRMED security rule]** |
| `is_active` | BooleanField | default=True | [CONFIRMED field] |
| `created_at` | DateTimeField | auto_now_add | [CONFIRMED field] |

No other user fields were discussed (no phone number, no avatar, etc.) — keep the user table minimal per the "don't collect unnecessary personal information" rule. **[CONFIRMED]**

### 2.2 `UserProfile` **[CONFIRMED, optional at MVP]**

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `user` | OneToOneField → User | not null, on_delete=CASCADE | |
| `preferred_city` | CharField(100) | nullable | [CONFIRMED field] |
| `language` | CharField(20) | nullable, default TBD | [CONFIRMED field]; values discussed: Hindi / English / Hinglish / regional (future) |
| `budget_preferences` | JSONField | nullable | [CONFIRMED concept] — structure not specified **[TBD]** |
| `location_preferences` | JSONField | nullable | [CONFIRMED concept] — structure not specified **[TBD]** |

> Explicit caution from the conversations: don't over-collect personal data here — this is preference context for personalization, not a full profile system.

---

## 3. `conversations` app

Deliberately separate from the `chat` app: `conversations` is pure data/history storage; `chat` is the live orchestration endpoint. **[CONFIRMED distinction]**

### 3.1 `Conversation`

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | UUID / BigAutoField | PK | |
| `user` | ForeignKey → User | not null, on_delete=CASCADE | Every query on this table must filter by `user == request.user` **[CONFIRMED security rule]** |
| `title` | CharField(255) | nullable → backfilled | [CONFIRMED field]. Should be a short auto-generated summary (e.g. "PG near Kanpur college"), not the raw first message — generation logic **[PROPOSED — frontend may generate temporarily, backend/AI can refine later]** |
| `city` | CharField(100) | nullable | [CONFIRMED field] |
| `created_at` | DateTimeField | auto_now_add | |
| `updated_at` | DateTimeField | auto_now | |

Index: `[PROPOSED]` composite index on `(user, updated_at)` for the sidebar's "recent conversations" query — not explicitly stated but implied by the sidebar's "Today / Yesterday / Older" grouping requirement.

### 3.2 `Message`

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | UUID / BigAutoField | PK | |
| `conversation` | ForeignKey → Conversation | not null, on_delete=CASCADE | |
| `role` | CharField, choices | not null | Values **[CONFIRMED]**: `user`, `assistant`, `system` |
| `content` | TextField | not null | Plain text/markdown content of the message |
| `response_data` | JSONField | nullable | **[CONFIRMED — important field]**. Stores the full structured AI response (see §6) so reopening a conversation re-renders the same rich cards/tables, not just plain text. Only populated for `role="assistant"` messages. |
| `created_at` | DateTimeField | auto_now_add | |

---

## 4. `chat` app

No persistent models of its own **[CONFIRMED]** — it's the orchestration endpoint (`/api/chat/`) that reads/writes `Conversation`/`Message` and calls the `services/ai`, `services/places`, `services/recommendations` layers. See TRD §5.3 for the internal call chain if cross-referencing.

---

## 5. `places` app

### 5.1 `Place` **[CONFIRMED — single generic model]**

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | UUID / BigAutoField | PK | |
| `name` | CharField(255) | not null | |
| `category` | CharField, choices | not null, indexed | **[CONFIRMED values]**: `hotel`, `pg`, `hostel`, `restaurant`, `cafe`, `hospital`, `pharmacy`, `local_essential`. **[FUTURE additions]**: `transport`, `station`, `coworking`, `service` |
| `description` | TextField | nullable | |
| `address` | CharField(500) | nullable | |
| `latitude` | DecimalField(9,6) / FloatField | not null | [PROPOSED precision] used for distance calc |
| `longitude` | DecimalField(9,6) / FloatField | not null | |
| `phone` | CharField(20) | nullable | |
| `website` | URLField | nullable | |
| `rating` | DecimalField(2,1) / FloatField | nullable | e.g. 4.4 |
| `price_range` | JSONField | nullable | [CONFIRMED concept]. Uses a consistent nested shape such as `{ "amount": 6000, "unit": "month" }` to support per-night/per-month/per-day pricing. |
| `source` | CharField, choices | not null | **[CONFIRMED — data-quality field]**. e.g. `internal`, `external_places_api`, `admin_entered` |
| `verified` | BooleanField | default=False | **[CONFIRMED — data-quality field]** |
| `last_updated` | DateTimeField | auto_now | **[CONFIRMED — data-quality field]**, drives "prices may have changed" disclaimers |
| `amenities` | JSONField / ArrayField | nullable | e.g. `["wifi", "food", "ac", "laundry"]` |
| `opening_hours` | JSONField | nullable | |
| `images` | JSONField / ArrayField(URLField) | nullable | list of image URLs |

Index: `[PROPOSED]` on `(category, city)` and a geo index (e.g. Postgres `earthdistance`/`PostGIS` or simple lat/long range filtering) for nearby-search performance — not discussed in conversations, added as a practical necessity for the "nearby" queries that are explicitly required.

### 5.2 Category-specific attributes — open design question **[TBD]**

The conversations confirm that category-specific facts should **not** become separate tables, but leave the exact mechanism unresolved. Two options were implied without a final pick:

- **Option A (flat, simple):** put everything on `Place` as optional/nullable fields (`monthly_price`, `price_per_night`, `food_available`, `cuisine`, `emergency_available`, ...). Simple but the table gets wide.
- **Option B (structured):** a single `attributes` `JSONField` on `Place` holding category-specific key/values, validated per-category at the service layer.

**[PROPOSED default for MVP]**: Option B (`attributes JSONField`), since it best matches the "don't multiply tables" instruction while still being queryable in Postgres via JSON operators. Confirm before building if flat columns are preferred instead.

### 5.3 `City` — **[OPTIONAL / TBD]**

Only build if the external Places provider doesn't already give sufficient city-level structure.

| Field | Type (proposed) | Notes |
|---|---|---|
| `id` | AutoField | PK |
| `name` | CharField(100) | |
| `state` | CharField(100) | |
| `country` | CharField(100) | |
| `latitude` / `longitude` | Float | |
| `active` | BooleanField | for limiting MVP to specific cities — matches the "limited cities to start" MVP rule |

---

## 6. `saved_places` app

### 6.1 `SavedPlace` **[CONFIRMED]**

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `user` | ForeignKey → User | not null, on_delete=CASCADE | |
| `place` | ForeignKey → Place | not null, on_delete=CASCADE | |
| `created_at` | DateTimeField | auto_now_add | |

Constraint: `[PROPOSED]` unique_together `(user, place)` — prevents duplicate saves; not explicitly stated but implied by the ❤️ toggle UX.

---

## 7. `feedback` app

### 7.1 `Feedback` **[CONFIRMED]**

| Field | Type (proposed) | Constraints | Notes |
|---|---|---|---|
| `id` | AutoField | PK | |
| `user` | ForeignKey → User | not null, on_delete=CASCADE | |
| `message` | ForeignKey → Message | not null, on_delete=CASCADE | which AI response this feedback is about |
| `place` | ForeignKey → Place | nullable, on_delete=SET_NULL | if feedback is about a specific recommended place |
| `type` | CharField, choices | not null | **[CONFIRMED values]**: `up` (👍), `down` (👎) |
| `reason` | CharField, choices | nullable | **[CONFIRMED values]**: `too_expensive`, `too_far`, `not_available`, `wrong_information`, `other` |
| `created_at` | DateTimeField | auto_now_add | |

---

## 8. Full Relationship Diagram **[CONFIRMED shape]**

```
User
 │
 ├──1:1──> UserProfile
 │
 ├──1:N──> Conversation
 │            │
 │            └──1:N──> Message ──(optional)──> response_data (JSON, see §9)
 │
 ├──1:N──> SavedPlace ──N:1──> Place
 │
 └──1:N──> Feedback ──N:1──> Message
                     └──N:1──> Place (optional)

Place
 ├── category (enum, not FK)
 └── source / verified / last_updated (data-quality metadata)
```

---

## 9. JSON Data Contracts (not relational tables, but part of the backend schema)

These are the structured payload "schemas" the backend and AI must agree on — they live in `services/ai/schemas.py` and are validated by `services/ai/parser.py` before being persisted into `Message.response_data` or returned via the API. **[CONFIRMED requirement for a fixed, extensible contract]**

### 9.1 Chat response envelope

```json
{
  "message": { "role": "assistant" },
  "content": [
    { "type": "text", "content": "..." },
    { "type": "recommendation", "items": [ /* PlaceResult[] */ ] },
    { "type": "text", "content": "..." }
  ]
}
```

### 9.2 Supported `content[].type` values **[CONFIRMED — fixed, extensible set]**

| type | Purpose | Renders as |
|---|---|---|
| `text` | Markdown-formatted conversational text | MarkdownRenderer |
| `heading` | Section header | Markdown heading |
| `list` | Bullet/numbered list | List component |
| `table` | Tabular data | Responsive table |
| `link` | External link/CTA | Styled link/button |
| `image` | Image with alt text | Image + lightbox |
| `place` | Single place reference | PlaceCard |
| `recommendation` | Ranked set of places | RecommendationCard[] with rank + match reason |
| `comparison` | Side-by-side comparison | ComparisonTable |
| `map` | Location/route preview | MVP: lightweight/static preview + external map/directions deep link; V2: embedded interactive map |
| `alert` | Info/success/warning/error notice | AlertCard |
| `action` | Actionable button (Call/Directions/Save/etc.) | Action button row |

New types (e.g. `transport` in the future) are added by extending this table + adding one frontend component — not by redesigning the contract. **[CONFIRMED extensibility rule]**

### 9.3 `PlaceResult` item shape (inside `recommendation`/`place`/`comparison` blocks) **[PROPOSED — assembled from repeated example fields across conversations]**

```json
{
  "place_id": "uuid",
  "name": "PG C",
  "category": "pg",
  "price_range": { "amount": 6000, "unit": "month" },
  "rating": 4.5,
  "distance_km": 0.7,
  "match_score": 92,
  "rank": 1,
  "reason": "Closest to your college and includes food.",
  "tags": ["food", "wifi", "student-friendly"],
  "actions": ["view_details", "directions", "call", "website", "save"],
  "source": "internal",
  "verified": true,
  "last_updated": "2026-08-14"
}
```

`match_score`/`rank` come from the Recommendation Engine (deterministic) and are confirmed MVP fields, not from the AI. `reason` is generated by the AI **from** the score breakdown, not invented independently. **[CONFIRMED separation of concerns]**

### 9.4 Extracted-requirements shape (internal — AI understanding step, not returned to frontend) **[PROPOSED, based on repeated worked examples]**

```json
{
  "city": "Kanpur",
  "category": "pg",
  "budget": { "amount": 6000, "period": "month" },
  "food_required": true,
  "location_preference": "near college",
  "priority": ["budget", "distance", "food"]
}
```

### 9.5 Tool-call payloads (AI → backend) **[PROPOSED shape — tool names confirmed conceptually, exact params TBD]**

```json
// search_places
{
  "category": "pg",
  "city": "Kanpur",
  "near": "Kanpur Central",       // optional
  "max_price": 6000,
  "food_required": true,
  "lat": 26.4499, "lng": 80.3319   // optional, for geo-radius search
}

// get_place_details
{ "place_id": "uuid" }

// search_nearby
{ "lat": 26.4499, "lng": 80.3319, "category": "restaurant", "radius_m": 2000 }

// compare_places
{ "place_ids": ["uuid1", "uuid2", "uuid3"] }
```

Confirmed tool names from the conversations: `search_places`, `get_place_details`, `search_nearby`, `compare_places` (plus category-flavored intents like hospital/food routing through `search_places` with a category filter, consistent with the single-`Place`-model decision). Exact final parameter set is **[TBD]**.

### 9.6 Standard API response envelope **[PROPOSED — canonical schema for the API response envelope]**

```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "INVALID_REQUEST", "message": "..." } }
```

---

## 10. Data-Quality / Grounding Fields — cross-cutting rule **[CONFIRMED]**

Every `Place` row and every `PlaceResult` surfaced to the AI or frontend must carry `source`, `verified`, and `last_updated` so the system can honestly caveat freshness rather than assert stale facts with confidence. This is the backend-schema expression of the "LLM ≠ Data source" architectural rule from the TRD.

---

## 11. Explicitly Deferred Schema (do not build in MVP) **[FUTURE]**

- Per-category tables (`Hotel`, `Restaurant`, `Hospital`, ...) — rejected in favor of the generic `Place` model.
- Separate `recommendations`/`locations` Django apps with their own models — kept as stateless `services/` logic, no dedicated tables.
- Vector/embedding storage for semantic place search.
- `DataSource` / `Verification` as standalone tables (mentioned only as a future possibility) — for now, `source`/`verified`/`last_updated` columns on `Place` are sufficient.
- Conversation summary storage as a distinct field/table (needed eventually for long-conversation context management) — mechanism **[TBD]**, not scoped yet.

---

## 12. Open Schema Questions (need a decision before/while building)

- Flat columns vs `attributes JSONField` for category-specific `Place` facts (§5.2).
- Exact structure of `UserProfile.budget_preferences` / `location_preferences`.
- Whether `City` gets its own table or is left to the external Places provider.
- Final tool-call parameter names/types for `search_places` etc.
- Geo-indexing approach for "nearby" queries (PostGIS vs simpler lat/long range + Haversine in application code).
- Where/how conversation summaries for long chats get persisted.

---

*End of document.*
