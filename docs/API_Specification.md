# City Companion — API Specification

*Derived from the project conversations. Covers every endpoint discussed, request/response shapes, auth rules, the streaming contract, and error format. Uses the same tagging convention as the TRD/Backend Schema.*

---

## 0. Conventions

- **[CONFIRMED]** — endpoint/behavior explicitly discussed.
- **[PROPOSED]** — a reasonable REST implementation of a confirmed concept (exact status codes, pagination, query params) that wasn't spelled out in the conversations.
- **[FUTURE]** — discussed only as a later-phase idea; not part of MVP.
- **[TBD]** — referenced but never resolved.

Base path for all endpoints: `/api/` **[CONFIRMED]**. Exact API versioning (e.g. `/api/v1/`) was not discussed — **[TBD]**, `/api/` used throughout below.

---

## 1. Global Rules

### 1.1 Authentication **[CONFIRMED]**

- JWT-based auth (Django auth underneath).
- Every endpoint except `auth/register`, `auth/login`, `auth/refresh` requires a valid access token:
  `Authorization: Bearer <access_token>`
- All AI/external-provider API keys stay server-side; the frontend never calls OpenAI or the Places provider directly — it only ever talks to this Django API. **[CONFIRMED security rule]**

### 1.2 Ownership / isolation **[CONFIRMED]**

Every query scoped to a user (conversations, messages, saved places, feedback) must verify the record belongs to `request.user`. A request for another user's conversation/resource must return `404` (not `403`, to avoid confirming the resource exists) — **[PROPOSED convention, not explicitly stated]**.

### 1.3 Standard response envelope **[PROPOSED — canonical API response envelope; Backend_Schema §9.6 is the canonical schema reference]**

```json
// success
{ "success": true, "data": { }, "error": null }

// failure
{ "success": false, "data": null, "error": { "code": "INVALID_REQUEST", "message": "Human-readable message" } }
```

### 1.4 Standard error codes **[PROPOSED — not enumerated in conversations, inferred from discussed failure modes]**

| Code | HTTP status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad/missing request fields |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `NOT_FOUND` | 404 | Resource missing or not owned by user |
| `AI_UNAVAILABLE` | 503 | AI service failed — backend should still attempt a DB/API-only fallback rather than returning this where possible (see §5.6) |
| `PROVIDER_ERROR` | 502 | External Places/Maps API failed |
| `RATE_LIMITED` | 429 | **[FUTURE]** rate limiting not detailed in conversations |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### 1.5 Pagination **[PROPOSED — not specified in conversations]**

List endpoints (`conversations`, `saved-places`) should support simple offset/limit or cursor pagination once lists grow. Not detailed in the source conversations — pick one convention (`?page=&page_size=` is the Django-idiomatic default) before building.

---

## 2. Authentication Endpoints

All confirmed as a set in the conversations; individual request/response bodies were not spelled out field-by-field, so those are **[PROPOSED]** based on the confirmed `User` model (name, email, password).

### 2.1 `POST /api/auth/register/` **[CONFIRMED endpoint]**

Register a new user.

**Auth:** none

**Request**
```json
{ "name": "string", "email": "string", "password": "string" }
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "access_token": "string",
    "refresh_token": "string"
  },
  "error": null
}
```

**Errors:** `400 VALIDATION_ERROR` (invalid email, weak password, email already registered).

---

### 2.2 `POST /api/auth/login/` **[CONFIRMED endpoint]**

**Auth:** none

**Request**
```json
{ "email": "string", "password": "string" }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "access_token": "string",
    "refresh_token": "string"
  },
  "error": null
}
```

**Errors:** `401 UNAUTHORIZED` — "Incorrect email or password" (frontend error state was explicitly discussed: *"Incorrect email or password"*).

---

### 2.3 `POST /api/auth/refresh/` **[CONFIRMED endpoint]**

**Auth:** none (uses refresh token)

**Request**
```json
{ "refresh_token": "string" }
```

**Response `200`**
```json
{ "success": true, "data": { "access_token": "string" }, "error": null }
```

**Errors:** `401 UNAUTHORIZED` — expired/invalid refresh token.

---

### 2.4 `POST /api/auth/logout/` **[CONFIRMED endpoint]**

**Auth:** required

**Request:** `{ "refresh_token": "string" }` — server-side token blacklisting **IS** used: the supplied refresh token is added to the SimpleJWT blacklist (outstanding/blacklisted tables) and any subsequent use of it fails with `401`. *(Decision made; previously `[TBD]`.)*

**Response `200`**
```json
{ "success": true, "data": null, "error": null }
```

---

### 2.5 `GET /api/auth/me/` **[CONFIRMED endpoint]**

Returns the current authenticated user (used e.g. to populate the profile page / restore session on app load).

**Auth:** required

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "profile": {
      "preferred_city": "string|null",
      "language": "string|null"
    }
  },
  "error": null
}
```

---

## 3. Conversation Endpoints

`conversations` is the pure history/CRUD layer — deliberately separate from `chat`, which handles live AI processing. **[CONFIRMED distinction]**

### 3.1 `GET /api/conversations/` **[CONFIRMED endpoint]**

List the current user's conversations, most recent first — backs the sidebar's "Today / Yesterday / Older" grouping.

**Auth:** required

**Query params [PROPOSED]:** `?page=&page_size=`, optionally `?search=` **[FUTURE — "search conversations" was listed as a future-proofing feature]**

**Response `200`**
```json
{
  "success": true,
  "data": {
    "results": [
      { "id": "uuid", "title": "PG near Kanpur college", "city": "Kanpur",
        "created_at": "iso8601", "updated_at": "iso8601" }
    ],
    "count": 12
  },
  "error": null
}
```

---

### 3.2 `POST /api/conversations/` **[CONFIRMED endpoint]**

Create a new (empty) conversation — used by "New Chat".

**Auth:** required

**Request `[PROPOSED]`**
```json
{ "city": "string|null" }
```

**Response `201`**
```json
{
  "success": true,
  "data": { "id": "uuid", "title": null, "city": "Kanpur", "created_at": "iso8601", "updated_at": "iso8601" },
  "error": null
}
```

> Note: a conversation can also be implicitly created by `POST /api/chat/` when no `conversation_id` is supplied — see §5.1. Whether the frontend always pre-creates via this endpoint, or lets `/api/chat/` create it on first message, is **[TBD]** — both are consistent with the conversations, which describe "New Chat" opening an empty state, not necessarily a pre-created row.

---

### 3.3 `GET /api/conversations/{id}/` **[CONFIRMED endpoint]**

Fetch conversation metadata only (used when a sidebar item is opened). Message history is retrieved separately via `GET /api/conversations/{id}/messages/`.

**Auth:** required (must belong to `request.user`, else `404`)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "PG near Kanpur college",
    "city": "Kanpur",
    "created_at": "iso8601",
    "updated_at": "iso8601"
  },
  "error": null
}
```

---

### 3.4 `GET /api/conversations/{id}/messages/` **[CONFIRMED endpoint]**

Fetch the message history for a conversation, including stored `response_data` needed to restore rich cards/tables.

**Auth:** required

**Response `200`** (message history)
```json
{
  "success": true,
  "data": {
    "results": [
      { "id": "uuid", "role": "user", "content": "Kanpur mein PG chahiye", "response_data": null, "created_at": "iso8601" },
      { "id": "uuid", "role": "assistant", "content": "Sure — I found several options...", "response_data": { "...": "see §6 schema" }, "created_at": "iso8601" }
    ]
  },
  "error": null
}
```


---

## 4. Saved Places & Feedback Endpoints

### 4.1 `POST /api/places/{id}/save/` **[CONFIRMED endpoint]**

Save (❤️) a place for the current user.

**Auth:** required

**Request:** *(empty body)*

**Response `201`**
```json
{ "success": true, "data": { "id": "uuid", "place_id": "uuid", "created_at": "iso8601" }, "error": null }
```

**Errors:** `409` **[PROPOSED]** if already saved — or the endpoint can be idempotent and just return the existing save; not specified in conversations **[TBD]**.

---

### 4.2 `DELETE /api/places/{id}/save/` **[CONFIRMED endpoint]**

Unsave a place.

**Auth:** required

**Response `204`** *(no body)*

---

### 4.3 `GET /api/saved-places/` **[CONFIRMED endpoint]**

List the current user's saved places — backs the "My Saved Places" profile section, which the conversations describe as grouped by category (Accommodation / Food / Hotels, etc.).

**Auth:** required

**Query params `[PROPOSED]`:** `?category=pg` (optional filter, matching the described grouped UI)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "results": [
      { "saved_id": "uuid", "place": { "id": "uuid", "name": "PG C", "category": "pg",
        "price_range": { "amount": 6000, "unit": "month" }, "rating": 4.5, "distance_km": 0.7 }, "created_at": "iso8601" }
    ]
  },
  "error": null
}
```

---

### 4.4 `GET /api/places/{id}/` **[CONFIRMED endpoint]**

Fetch full details for a single place — backs the "View Details" drawer/bottom-sheet.

**Auth:** required

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "PG C",
    "category": "pg",
    "description": "string|null",
    "address": "string",
    "latitude": 26.4520,
    "longitude": 80.3380,
    "phone": "string|null",
    "website": "string|null",
    "rating": 4.5,
    "price_range": { "amount": 6000, "unit": "month" },
    "amenities": ["wifi", "food", "ac"],
    "opening_hours": { "...": "..." },
    "images": ["https://..."],
    "source": "internal",
    "verified": true,
    "last_updated": "iso8601",
    "is_saved": true
  },
  "error": null
}
```

**Errors:** `404 NOT_FOUND` if the place doesn't exist.

---

### 4.5 `POST /api/feedback/` **[CONFIRMED endpoint]**

Submit 👍/👎 feedback on an AI response, optionally tied to a specific place.

**Auth:** required

**Request**
```json
{
  "message_id": "uuid",
  "place_id": "uuid|null",
  "type": "up|down",
  "reason": "too_expensive|too_far|not_available|wrong_information|other|null"
}
```

**Response `201`**
```json
{ "success": true, "data": { "id": "uuid", "created_at": "iso8601" }, "error": null }
```

---

## 5. Chat Endpoint — the central API **[CONFIRMED — most important endpoint in the project]**

### 5.1 `POST /api/chat/`

Send a user message and get back the AI's structured, ranked response. This single endpoint drives the entire product loop (Tell → Understand → Compare → Recommend → Act).

**Auth:** required

**Request**
```json
{
  "conversation_id": "uuid|null",
  "message": "Kanpur mein 6000 ke andar PG chahiye",
  "location": { "lat": 26.4499, "lng": 80.3319 }
}
```
- `conversation_id`: `null`/omitted starts a new conversation **[TBD — see §3.2 note on who creates the row]**.
- `location`: optional; only sent if the browser has granted geolocation permission. **[PROPOSED shape]**, confirmed as a concept ("current location" passed with permission, manual override otherwise).

**Response `200` (non-streaming form)** **[CONFIRMED shape]**
```json
{
  "success": true,
  "data": {
    "conversation_id": "uuid",
    "message": { "id": "uuid", "role": "assistant" },
    "content": [
      { "type": "text", "content": "Sure — I found several options that match your budget." },
      { "type": "recommendation", "items": [ /* see Backend_Schema.md §9.3 PlaceResult[] */ ] },
      { "type": "text", "content": "My recommendation: PG C, because it's closest to your college and includes food." },
      { "type": "alert", "level": "warning", "content": "Prices may have changed. Confirm before booking." }
    ]
  },
  "error": null
}
```

**Errors:**
- `400 VALIDATION_ERROR` — empty message.
- `503 AI_UNAVAILABLE` — only if the DB/API-only fallback (§5.6) also fails to produce anything useful; otherwise the backend should degrade gracefully rather than error.
- `502 PROVIDER_ERROR` — external Places API failed and no cached/own-DB fallback available.

---

### 5.2 Backend processing chain behind this endpoint **[CONFIRMED]**

```
ChatView → ChatService → ConversationService → AIService
  → ToolExecutor → PlaceSearchService (own DB + external Places API)
  → RecommendationService (deterministic scoring/ranking)
  → AIService (explain results in natural language)
  → ResponseValidator (schema check against §6)
  → save Message.response_data
  → return JSON / stream to React
```

### 5.3 Streaming variant **[MVP architecture-ready; actual delivery V2; transport TBD]**

For a ChatGPT-style experience, `/api/chat/` is designed to support a streamed response in V2 instead of (or in addition to) the single JSON blob above. The architecture should remain streaming-ready in MVP. The conversations describe this as a **structured event stream**, not raw token streaming, so that rich blocks (cards/tables) can arrive mid-response:

```
event: message_start
data: { "conversation_id": "uuid", "message_id": "uuid" }

event: text
data: { "delta": "Sure — I found..." }

event: recommendation
data: { "items": [ /* PlaceResult[] */ ] }

event: text
data: { "delta": "My recommendation is..." }

event: message_end
data: { "message_id": "uuid" }
```

- Exact transport (Server-Sent Events vs WebSocket vs chunked HTTP) — **[TBD]**, not specified.
- Frontend must tolerate partial/incomplete Markdown mid-stream and only finalize formatting once a block/message completes. **[CONFIRMED frontend requirement]**
- Whether streaming is a separate endpoint (e.g. `POST /api/chat/stream/`) or content negotiation on the same `/api/chat/` route — **[TBD]**.

### 5.4 Supported `content[].type` values **[CONFIRMED fixed, extensible set]**

`text`, `heading`, `list`, `table`, `link`, `image`, `place`, `recommendation`, `comparison`, `map`, `alert`, `action`. Full shape reference: see `Backend_Schema.md` §9. New types are added by extension, not by breaking this contract.

### 5.5 Conversation memory across calls **[CONFIRMED]**

The backend attaches conversation context to every `/api/chat/` call internally (recent messages + a running summary for long threads); the frontend does not need to resend prior messages — it only sends the new `message` plus `conversation_id`.

### 5.6 Fallback behavior **[CONFIRMED — required, not optional]**

If the AI call fails but place search/ranking still succeeds, `/api/chat/` should still return `200` with a `content` array containing the raw ranked results plus an `alert` block explaining that AI explanation is temporarily unavailable — rather than surfacing a `503` to the user. A hard `503 AI_UNAVAILABLE` should only occur if **both** AI and data retrieval fail.

### 5.7 "No results" behavior **[CONFIRMED product rule, expressed in the API shape]**

When no strong match exists, `/api/chat/` still returns `200` with `content` containing:
```json
{ "type": "text", "content": "I couldn't find a strong match under ₹3,000." },
{ "type": "recommendation", "title": "Closest alternatives", "items": [ /* nearby-budget results */ ] },
{ "type": "text", "content": "Increasing your budget by ₹500 gives you significantly better options." }
```
Never a bare empty result / "no results found" with nothing actionable.

### 5.8 Priority change mid-conversation **[CONFIRMED behavior, same endpoint]**

A follow-up message like "Price se zyada location important hai" is just another `POST /api/chat/` call — no separate endpoint. The backend re-extracts requirements, reweights the Recommendation Engine, and the AI response should acknowledge the change (e.g. *"I prioritized nearby options because you said location matters more"*).

---

## 6. AI Response Content Schema (reference)

Full JSON shapes for each `content[].type` (recommendation items, comparison tables, map blocks, alerts) and the tool-call payloads the AI issues internally (`search_places`, `get_place_details`, `search_nearby`, `compare_places`) are documented in **`Backend_Schema.md`, §9** — not duplicated here to avoid drift between the two documents. `/api/chat/` is the only public-facing endpoint that surfaces these shapes to the frontend.

---

## 7. Endpoints Discussed but Not Yet Specified in Detail **[TBD]**

These were referenced conceptually in the conversations but never given a route/shape — flagged so they aren't silently forgotten:

- **City/location list** — for manual city selection (if a `City` model is built; see `Backend_Schema.md` §5.3). No route was proposed.
- **Comparison endpoint** — explicit user-controlled multi-select Compare UI is 🔵 Version 2 and does not require a separate MVP endpoint. In MVP, AI-initiated comparison uses `POST /api/chat/` and the internal `compare_places` tool. A dedicated `POST /api/places/compare/` endpoint may be added later if needed.
- **Search-within-conversation-history** — mentioned as a future-proofing UI element (`🔍 Search conversations`); no backend route defined. **[FUTURE]**
- **Account/data deletion** — "Delete conversations", "Delete account" are listed as required Settings features, but no endpoint (`DELETE /api/conversations/{id}/`, `DELETE /api/auth/me/`, etc.) was explicitly specified. **[TBD — needs at least `DELETE /api/conversations/{id}/`]**
- **Regenerate response** — ChatGPT-style `↻ Regenerate` button was discussed as a frontend feature; no backend contract given. **[FUTURE]**
- **Share conversation** — mentioned as a future feature; no endpoint defined. **[FUTURE]**
- **Admin/analytics endpoints** — the admin panel is described as Django-Admin-based for MVP (not a separate REST-consumed panel), so no `/api/admin/...` routes were specified. A future custom React admin panel would need its own API surface. **[FUTURE]**

---

## 8. Security Notes Specific to the API Layer **[CONFIRMED]**

- Never expose `OPENAI_API_KEY` / `PLACES_API_KEY` in any response body, error message, or client-visible config.
- Rate limiting on `/api/chat/` in particular — discussed as a production concern but not detailed. **[FUTURE / TBD]**
- CORS: only the deployed frontend origin(s) should be allowed — `CORS_ALLOWED_ORIGINS` env var referenced in the backend conversation.
- Input validation on every write endpoint; AI-generated `content` is also schema-validated server-side before being persisted or returned (§5.2, ResponseValidator step) — malformed AI output must never reach the client as-is.

---

*End of document.*
