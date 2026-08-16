# City Companion — Technical Requirements & Design Document (TRD)

*Compiled from prior project conversations. Source of truth for development.*

---

## Document Conventions

Every requirement below is tagged so nothing gets built on a guess:

- **[CONFIRMED]** — explicitly decided in the conversations, consistently repeated.
- **[PROPOSED]** — suggested as a good approach but not locked; safe default, can be revisited.
- **[FUTURE / V2+]** — explicitly deferred to a later phase.
- **[REJECTED]** — explicitly warned against; do not build this way.
- **[TBD]** — not addressed in the conversations; needs a decision before/while building.

Where two conversations gave conflicting details (e.g. exact scoring weights, app structure), this document follows the **latest conversation's decision** and flags the earlier version as superseded.

---

## 1. Project Understanding (Summary)

**City Companion** is a personal/student project: an AI-powered "personal city companion" — not a directory/search website. The core principle, repeated across every conversation:

> *"User doesn't search the city — user tells the system a problem, in natural language, and the system finds and explains the best real-world options."*

Core interaction loop **[CONFIRMED]**: **Tell → Understand → Compare → Recommend → Act**

The chat interface *is* the product (not a supporting feature and not a dashboard). A separate marketing/landing page exists only to get the user into the chat. The system helps with real local needs — accommodation (PG/hostel/hotel), food, healthcare, cafes, and local essentials — filtered by budget, location, and user-specific priorities, then explained and ranked, with direct actions (call, directions, save, compare) rather than a plain list.

Architecturally, the project separates four concerns that must never collapse into one:
- **Experience** (React frontend, chat-first, dark themed, mobile-first)
- **Intelligence** (LLM for understanding/reasoning/explaining — *not* for storing facts)
- **Data** (own DB + external Places/Maps APIs — the actual source of truth for real-world facts)
- **Action** (call / directions / booking link / save / compare)

Backend is Django + DRF acting as an **orchestrator**, not an "AI wrapper" — it owns auth, conversation storage, tool execution, deterministic ranking, and response formatting; the AI model only understands intent and explains results.

---

## 2. Technology Stack **[CONFIRMED, with noted TBDs]**

| Layer | Technology | Status |
|---|---|---|
| Frontend | React | Confirmed |
| Backend | Django | Confirmed |
| API layer | Django REST Framework | Confirmed |
| Database (dev) | SQLite | Confirmed (dev only) |
| Database (prod) | PostgreSQL | Confirmed |
| AI | OpenAI API (model not pinned) | Confirmed provider; exact model = TBD |
| Maps/Places data | External Places/Maps API | Confirmed as a category; specific provider = TBD |
| Authentication | JWT (Django auth underneath) | Confirmed |
| Cache | Redis | Future — not for MVP |
| Background jobs | Celery | Future — not for MVP |
| Media storage | Cloudinary | Only if/when media upload is needed |
| Admin | Django Admin (built-in) | Confirmed for MVP; custom React admin = future |
| Deployment | Frontend and backend hosted separately | Confirmed direction; provider = TBD |
| Containerization | Docker | Not mandatory for MVP; local venv + Postgres is fine to start |

---

## 3. System Architecture

### 3.1 Four-layer conceptual model **[CONFIRMED]**

```
CITY COMPANION
      │
┌─────┴─────┐
EXPERIENCE   INTELLIGENCE
(React UI,   (AI understanding,
 chat,       recommendation
 maps,       reasoning,
 voice-      personalization,
 future)     conversation memory)
      │
   DATA LAYER
(Places / Hotels / PG / Food /
 Hospitals / Services / Sources)
      │
   ACTION LAYER
(Call / Directions / Website /
 Booking / Save / Compare)
```

### 3.2 High-level request flow **[CONFIRMED]**

```
React (Chat UI)
   ↓ HTTPS/REST
Django REST API
   ↓
Auth + Conversation service
   ↓
AI Service (understand intent, decide tool calls)
   ↓
Tool Layer → Place Search Service → (own DB + External Places API)
   ↓
Recommendation Engine (deterministic filtering + scoring)
   ↓
AI Service again (explain results in natural language)
   ↓
Response Validator (schema check)
   ↓
Django → structured JSON (MVP) / streamed events (V2)
   ↓
React → AI Response Rendering Engine → rich UI components
```

### 3.3 Golden architectural rules **[CONFIRMED — do not violate]**

- **LLM ≠ Data source.** The model never invents place existence, price, or availability. Real facts come only from the own database or external Places/Maps APIs.
- **AI does not talk to the database directly.** It requests via defined tools; Django executes them.
- **Ranking is deterministic, not AI-decided.** A separate Recommendation Engine scores and orders results; the AI's job is to *explain* the ranking, not invent it.
- **Frontend renders only from a fixed set of supported response types** (text, table, card, comparison, map, alert, etc.) — the AI selects/combines these, it does not generate arbitrary HTML/CSS.

---

## 4. Frontend Architecture

### 4.1 Two sides of the app **[CONFIRMED]**

```
PUBLIC SIDE                 APP SIDE
Landing Page                Chat Interface
How It Works                Chat History (Sidebar)
Contact                     Saved Places
Login / Signup              Profile / Settings
```

### 4.2 Landing page **[CONFIRMED]**

Purpose: get the visitor to understand the product in 5–10 seconds and click into chat. **Not** a corporate multi-page site.

- Hero: full-screen dark animated background (deep black/charcoal gradients, subtle particles/glow — **not** pure `#000000` with neon, which was explicitly flagged as looking cheap **[REJECTED style]**).
- Heading pattern: problem → solution framing (e.g. "New city? Just tell us what you need.").
- Primary CTA: **Start Exploring →**
- Sections, kept minimal: Hero → How it works (3–4 steps: Tell us / We understand / We find / You decide) → animated example conversation demo (fake chat showing the product in action — flagged as *very important* for instant comprehension) → small feature strip (Budget-aware · Location-aware · Personalized · Actionable) → Contact → minimal footer.
- Navigation limited to: `Home / How It Works / Contact` + `Login / Sign Up` **[CONFIRMED — do not add Services/Blog/Team/Gallery/FAQ, etc.]**
- Heavy animation is allowed here (unlike the chat page).
- On click, user goes to the Chat app; the chatbot itself is **not** embedded in the landing page **[CONFIRMED]**. Returning logged-in users may skip straight to chat (exact behavior = TBD/product decision).

### 4.3 Authentication UI **[CONFIRMED, minimal]**

Simple Login / Signup forms, same dark theme, with explicit UI states required: normal, loading ("Signing in..."), error, validation, success.

### 4.4 Chat application shell **[CONFIRMED]**

```
Header (logo, current city, New Chat, Profile)
Sidebar (New Chat, grouped conversation history, Saved Places, Profile/Settings)
Chat Area (messages)
Composer (multiline input, voice icon placeholder, send)
```

- Desktop: sidebar + chat (+ optional map/details panel).
- Mobile: sidebar becomes a drawer, details become a bottom sheet, map goes full-screen. **Mobile-first is a hard requirement** — this product is used by people navigating a new city, on their phones.
- Sidebar conversation titles should be short, human, auto-summarized (not the raw first message) **[PROPOSED]**.
- Chat empty state: "What can I help you find?" with tappable-but-optional quick prompt chips (Find a place to stay / Find affordable food / Find a nearby hospital / etc.) — chips **fill** the input, they must not force a menu-driven flow **[CONFIRMED]**.

### 4.5 The core frontend decision: AI Response Rendering Engine **[CONFIRMED — most important frontend architecture decision]**

> Do **not** build the chat as a "message string renderer." Build it as a **Hybrid AI Response Rendering Engine**: conversational text goes through a Markdown renderer; anything structured (places, comparisons, maps, warnings) goes through a **component registry** keyed by a `type` field.

```
AI structured response
   ↓
type: "text" | "table" | "recommendation" | "comparison" | "map" | "alert" | "place" | ...
   ↓
Component Registry
   ↓
Matching React component (MarkdownRenderer / RecommendationCard / ComparisonTable / MapBlock / AlertBlock ...)
```

Adding a new content type later (e.g. `transport`) means adding one component + one registry entry — not rewriting the chat.

**[REJECTED]**: rendering AI output via `dangerouslySetInnerHTML` / letting the AI emit raw HTML. Explicitly called out as an XSS and maintainability risk.

Markdown support required: headings, bold/italic/strikethrough, ordered/unordered/nested lists, links, blockquotes, tables (responsive, horizontal-scroll on mobile), code blocks with copy button, images with lightbox.

Rich components required for MVP: **PlaceCard family** (generic `PlaceCard` with category-aware fields rather than one component per category **[CONFIRMED simplification]**), **RecommendationCard** (rank badge, match reason, actions), **ComparisonTable**, **AlertCard** (info/success/warning/error states), **Map preview block** with "Open Map" expansion.

Message-level features: `Why this?` explainability expandable block **[CONFIRMED — required]**, action buttons (View Details / Directions / Call / Website / Save), Copy, and — **[V2/Future]** Regenerate, Like/Dislike with structured reasons, Share.

### 4.6 Required states **[CONFIRMED — applies to every component, not just happy path]**

`Loading / Success / Empty / Error / Disabled / Hover / Active / Mobile` — the project is only "done" per component when all of these are designed, not just the ideal case.

- "No results" must never be a dead end: system should surface closest alternatives and actionable suggestions (e.g. "raising your budget by ₹500 unlocks better options") **[CONFIRMED product behavior]**.
- AI "thinking" indicator should reflect **real backend stages** if available (Understanding → Finding → Comparing → Ranking); fabricating fake progress steps is explicitly discouraged **[REJECTED]**.

### 4.7 Streaming **[MVP architecture-ready; actual delivery V2, mechanism TBD]**

Frontend must be architected to render partial/streamed AI responses (ChatGPT-style), including safely handling incomplete Markdown mid-stream and structured event chunks (e.g. `message_start` → `text` chunks → `recommendation` block → `text` → `message_end`). **The MVP must be streaming-ready at the architecture level, but actual streamed response delivery is deferred to V2.** Exact transport (SSE vs WebSocket) is **[TBD]**; conceptually only the event-stream pattern was specified.

### 4.8 Explicit anti-patterns for frontend **[REJECTED]**

Too many nav links; huge footer; dashboard-style generic UI; chat bubbles for everything (loses rich content); excessive neon/pure black; excessive animation especially inside the chat page (landing page can be animation-heavy, chat page should be subtle — message fade/slide, card entrance, hover only); huge forms; AI response as one giant text blob; fixed non-extensible response templates; AI-generated raw HTML; fake loading progress; overloaded cards with too many buttons; unnecessary extra pages.

Accessibility is required, not optional: keyboard navigation, focus states, semantic buttons, alt text, contrast, screen-reader labels, and respecting `prefers-reduced-motion`.

---

## 5. Backend Architecture (Django)

### 5.1 Final app structure **[CONFIRMED — supersedes earlier, more granular version]**

An earlier pass proposed separate Django apps for `recommendations` and `locations`. The final decision (later conversation) is to **keep the MVP lean**: only genuinely stateful/CRUD domains get their own Django app; pure logic lives in a `services/` layer.

```
backend/
├── manage.py
├── requirements.txt, .env, .env.example, .gitignore, README.md
├── config/                  # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── apps/
│   ├── users/                # auth, profile
│   ├── conversations/        # Conversation, Message models + CRUD
│   ├── chat/                 # the /api/chat/ endpoint — orchestration entrypoint
│   ├── places/                # Place model + CRUD/admin
│   ├── saved_places/          # user's saved places
│   └── feedback/              # 👍/👎 + reason
├── services/
│   ├── ai/
│   │   ├── client.py          # raw connection to OpenAI API
│   │   ├── service.py         # orchestration: context prep, call, tool handling
│   │   ├── prompts.py         # system prompt(s), kept out of views.py
│   │   ├── tools.py           # tool/function definitions the AI can call
│   │   ├── schemas.py         # expected structured-response schema
│   │   └── parser.py          # validates/normalizes AI output
│   ├── places/
│   │   ├── service.py         # PlaceSearchService — the single entry point
│   │   ├── providers.py       # adapters: InternalDatabaseProvider, ExternalPlacesProvider, ...
│   │   └── filters.py
│   ├── recommendations/
│   │   ├── service.py
│   │   ├── scoring.py
│   │   └── ranking.py
│   └── location/
│       ├── service.py
│       └── distance.py
├── common/
│   ├── exceptions.py
│   ├── responses.py           # standardized API response envelope
│   ├── validators.py
│   └── constants.py
└── tests/
```

`conversations` (data/history CRUD) is deliberately kept separate from `chat` (live AI processing / the actual `/api/chat/` orchestration) **[CONFIRMED distinction]**.

### 5.2 Why `Place` is one generic model, not one-table-per-category **[CONFIRMED]**

Rather than `Hotel`, `PG`, `Restaurant`, `Hospital` as separate tables, MVP uses a single `Place` model with a `category` field plus structured/flexible attributes for category-specific facts (amenities, food availability, etc.). This keeps the recommendation engine simple and avoids maintaining N near-identical tables. **[REJECTED]**: building 10 separate category tables at MVP stage.

### 5.3 Business logic lives in `services/`, not in `views.py` **[CONFIRMED]**

```
ChatView → ChatService → ConversationService → AIService → ToolExecutor
→ PlaceSearchService → RecommendationService → AIService (explain)
→ ResponseFormatter → ChatView → JSON/stream to React
```

---

## 6. Database Design

### 6.1 Core models **[CONFIRMED]**

**User** (custom Django user model)
```
id, name, email, password (hashed by Django), is_active, created_at
```

**UserProfile** (optional, minimal — avoid collecting unnecessary personal data)
```
user (FK), preferred_city, language, budget_preferences, location_preferences
```

**Conversation**
```
id, user (FK), title, city, created_at, updated_at
```

**Message**
```
id, conversation (FK), role [user|assistant|system], content,
response_data (JSON — stores the structured AI response for that message),
created_at
```
`response_data` is explicitly called out as important: it preserves the rich structured response so reopening an old conversation can re-render the same cards/tables, not just plain text.

**Place**
```
id, name, category, description, address, latitude, longitude, phone,
website, rating, price_range, source, verified, last_updated,
amenities, opening_hours, images
```
`category` values (confirmed set for MVP): `hotel, pg, hostel, restaurant, cafe, hospital, pharmacy, local_essential`; extensible later to `transport, station, coworking`, etc. `local_essential` is the backend category used for the MVP Local essentials product category.

**SavedPlace**
```
user (FK), place (FK), created_at
```

**Feedback**
```
user (FK), message (FK), place (FK, optional), type [👍|👎], reason, created_at
```
Reason is a short enum-like set (e.g. Too expensive / Too far / Not available / Wrong information / Other) surfaced in the UI, not free text only.

**City** — **[OPTIONAL / TBD]**: only needed if the external Places provider doesn't already give sufficient city-level structure. Do not build it in MVP unless a concrete need appears.

### 6.2 Relationships **[CONFIRMED]**

```
User ──< Conversation ──< Message
User ──< SavedPlace >── Place
User ──< Feedback >── Message / Place
Place ── category, source, verification metadata
```

### 6.3 Data-quality metadata **[CONFIRMED — required on every Place]**

Every place record must carry `source`, `last_updated`, and `verified` so the AI/UI can honestly caveat freshness ("⚠️ Prices may have changed. Confirm before booking.") rather than asserting facts with false confidence.

---

## 7. API Structure **[CONFIRMED — exact route names may shift, but endpoint set is settled]**

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/

GET    /api/conversations/
POST   /api/conversations/
GET    /api/conversations/{id}/
GET    /api/conversations/{id}/messages/

POST   /api/chat/                     # the central orchestration endpoint

GET    /api/places/{id}/

POST   /api/places/{id}/save/
DELETE /api/places/{id}/save/
GET    /api/saved-places/

POST   /api/feedback/
```

`/api/chat/` request/response contract:
```json
// request
{ "conversation_id": "123", "message": "Kanpur mein 6000 ke andar PG chahiye" }

// response (conceptual)
{
  "message": { "role": "assistant" },
  "content": [
    { "type": "text", "content": "I found 3 hotels..." },
    { "type": "recommendation", "items": [ ... ] },
    { "type": "text", "content": "My recommendation..." }
  ]
}
```

Standardized API envelope **[PROPOSED; canonical source: Backend_Schema §9.6]**:
```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "INVALID_REQUEST", "message": "..." } }
```

---

## 8. Authentication & Authorization **[CONFIRMED]**

- JWT-based auth between React and Django (Django's built-in auth/password hashing underneath).
- All AI/external API keys live server-side only, in `.env` — **never** shipped to or called from the frontend. React never calls OpenAI/Places APIs directly.
- Every conversation-scoped query must verify `conversation.user == request.user` — explicitly called out as a basic-but-critical check to prevent cross-user data leakage.
- Env vars (conceptual): `DJANGO_SECRET_KEY, DEBUG, DATABASE_URL, OPENAI_API_KEY, PLACES_API_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, JWT_SECRET`.

---

## 9. AI Integration

### 9.1 Role of the AI model **[CONFIRMED]**

The model's job, and only its job:
1. **Understand** — parse free-form (incl. Hinglish/Hindi) user text into structured requirements (city, category, budget, food, priority, etc.).
2. **Decide** — choose which tool(s) to call for real data.
3. **Reason** — given already-filtered, already-ranked real data, help surface the best fit.
4. **Explain** — turn the ranked results into a natural-language, structured response.

The model is explicitly **not** the data source and does not own final ranking authority.

### 9.2 Tool calling **[CONFIRMED pattern; exact tool set PROPOSED]**

Conceptual tool set: `search_places`, `get_place_details`, `search_nearby`, `compare_places` (and category-flavored intents like hospital/food are expected to route through `search_places` with a category filter, per the generic-Place-model decision — exact final tool signatures are **[TBD]**). **For MVP, `compare_places` may be used for AI-initiated comparisons when the conversation naturally requires comparison; the explicit user-controlled multi-select Compare UI is V2.**

```
AI decides: "I need accommodation search"
   → search_places(category="pg", city="Kanpur", max_budget=6000)
   → Django executes against own DB + external provider
   → filtered, ranked top-N results returned to the AI
```

The AI is never given a raw dump of the database — only pre-filtered top candidates (explicitly for cost, latency, context size, and hallucination-risk reasons).

### 9.3 Prompt architecture **[CONFIRMED]**

```
System prompt: role + rules (understand requirement, ask clarification only when
necessary, use tools for real-world facts, never invent places/prices/availability,
prefer verified data, always explain recommendations, only return supported
structured response types)
+ dynamic context: user profile, current location, conversation summary, recent messages
+ current user message
```

### 9.4 Response contract / schema **[CONFIRMED — fixed, extensible set]**

Supported types: `text, heading, list, table, link, image, place, recommendation, comparison, map, alert, action`. Backend validates AI output against this schema before it reaches the frontend; malformed output triggers retry/fallback rather than being passed through **[CONFIRMED]**.

### 9.5 Grounding / anti-hallucination rules **[CONFIRMED — non-negotiable]**

- AI must never assert a price/availability/place that isn't in the data it was given.
- Responses about real facts should be explicitly framed as coming from "the available data" and should carry freshness caveats when appropriate.
- If AI service is unavailable, backend should still fall back to plain database/API search results with a clear disclaimer, rather than failing the whole request.

### 9.6 Conversation memory **[CONFIRMED requirement; summarization mechanism PROPOSED/TBD]**

Multi-turn slot-filling is required (e.g. city → budget → food → location preference accumulate without re-asking). For long conversations, use recent-messages + a running summary rather than sending full history every time — exact summarization implementation is **[TBD]**.

### 9.7 Semantic/vector search **[FUTURE — not MVP]**

Mentioned as a possible later enhancement (e.g. matching "shaant jagah" to "quiet/peaceful/study-friendly"), explicitly **not required for MVP** — simple DB filtering + external Places search is sufficient to start.

---

## 10. Recommendation Engine

### 10.1 Principle **[CONFIRMED]**

> "Best" ≠ highest rating. "Best" = best fit for *this* user's stated budget/location/requirements. Ranking must be a deterministic, explainable score — not left to free-form AI judgment.

### 10.2 Scoring **[PROPOSED — illustrative weights only, must be configurable]**

Two slightly different example weight sets appear across the conversations:
- Set A: Budget 30% · Requirement match 25% · Distance 20% · Rating 15% · Availability 10%
- Set B: Budget 30% · Distance 25% · Requirements 25% · Rating 10% · Data quality 10%

Neither is stated as final — **treat exact weights as [TBD]**, but the *factors themselves* (budget fit, distance, requirement/tag match, rating, availability/data quality) are confirmed as the right inputs, and the weighting must be adjustable rather than hardcoded.

### 10.3 Priority-aware re-ranking **[CONFIRMED]**

If the user states a priority mid-conversation (e.g. "location matters more than price"), the backend should reweight scoring accordingly and the AI should acknowledge the change in its explanation ("I prioritized nearby options because you said location matters more").

### 10.4 Explainability **[CONFIRMED — required UI/data feature]**

Every recommendation must carry a "why" — a short structured breakdown of which of the user's stated requirements it satisfies — surfaced via the "Why this?" component, not just an AI-invented sentence.

---

## 11. Location & Maps Architecture

- Browser geolocation (with permission) is used for "near me" queries; manual city/location override is required (e.g. "I'm in Kanpur but looking in Lucknow") **[CONFIRMED]**.
- Distance is computed server-side from lat/long for ranking and display (e.g. "1.2 km away") **[CONFIRMED]**.
- Nearby/real-world place data comes from an external Places/Maps API — specific provider not named in the conversations **[TBD]**.
- Map is treated as **one more response component type**, not a separate page: inline `MapPreview` inside the chat response, expandable to a full map view; desktop can show chat+map side by side, mobile uses a full-screen map on demand **[PROPOSED, V2 for actual chat-embedded map — MVP may launch with just distance shown + "Open Map" external link]**.

---

## 12. Data Source Strategy **[CONFIRMED]**

Five potential sources were discussed, each with a distinct role:

1. **Own database** — admin-entered, verified, fast, controlled. Primary source for MVP.
2. **External Places API** — for live/broad nearby-place coverage. Required for MVP scope but provider unspecified **[TBD]**.
3. **Specialized APIs** (hotel/booking, transport, weather) — **[FUTURE]**, not needed to launch.
4. **Admin-entered data** — via Django Admin, with a verification flag.
5. **Web/scraped data** — explicitly **[FUTURE/deferred]**, and only ever with tracked `source/timestamp/confidence` metadata if implemented — not a blind scrape.

Golden rule repeated throughout: reliable data is the single biggest risk to this product; a beautiful UI cannot compensate for wrong prices/availability.

---

## 13. End-to-End Data Flow Example **[CONFIRMED reference flow]**

```
User: "Main Kanpur mein naya student hoon. Mujhe college ke paas
       ₹6000/month ke andar food ke saath PG chahiye."

1. React → POST /api/chat/
2. Django: authenticate → load/create conversation → save user message
3. AI: extract requirements
     city=Kanpur, category=PG, budget<=6000/month, food=required,
     priority=near college
4. AI issues tool call: search_places(category="pg", city="Kanpur",
     max_budget=6000, food_required=true)
5. Django: query own DB + external Places provider
6. Filtering: PG, price<=6000, food available, reasonably near college
7. Recommendation Engine: score + rank candidates
8. Top-N results (e.g. 3) passed back to AI
9. AI: generate structured explanation
     ("PG C is the strongest match — 700m from college, food included...")
10. Response Validator checks schema
11. Django saves assistant Message (with response_data) and returns
     structured JSON (or stream) to React
12. React: AI Response Rendering Engine → RecommendationCards + text
13. User: View Details / Directions / Call / Save
```

---

## 14. Security Requirements **[CONFIRMED]**

- Server-side-only API keys; never exposed to or called from the frontend.
- JWT auth on all protected endpoints; per-user data isolation enforced at the query level (conversation/place-save/feedback ownership checks).
- Django's built-in password hashing; no plaintext storage.
- Input validation on all endpoints; AI *output* also schema-validated before being trusted downstream.
- Standard `.env`-based secret management; secrets excluded from version control.
- Logging should capture operational data (latency, tool calls, failures) without unnecessarily persisting full sensitive conversation content.
- User-facing data controls: ability to delete conversations / delete account (listed under Settings) **[CONFIRMED as required setting, implementation TBD]**.
- Rate limiting — **[FUTURE]**, mentioned as a v2/production concern, not detailed.

---

## 15. Error Handling & Fallbacks **[CONFIRMED]**

| Failure | Required behavior |
|---|---|
| AI service unavailable | Fall back to raw DB/API search results with a clear "AI is temporarily unavailable, but here are matching places" message — never a hard failure. |
| External Places API down | Fallback chain: primary external source → own DB → cached data (caching itself is a later optimization). |
| AI returns malformed/off-schema output | Validate against schema; retry or fall back; never forward malformed data to the frontend. |
| No matching results | Never a bare "No results found" — surface closest alternatives and actionable suggestions (e.g., budget increase impact). |
| Any API/network error | Frontend shows a generic, non-technical error state with "Try Again" / "Start New Chat" — internal errors are never exposed to the user. |

Every frontend component must define its own Loading / Empty / Error states, not just its happy path (repeated as a completion criterion).

---

## 16. Deployment Considerations

- **[CONFIRMED]** Frontend and backend deployed/hosted separately.
- **[CONFIRMED]** Docker is not required to start; local Python venv + PostgreSQL is sufficient for a single-developer MVP. Docker can be introduced later for deployment consistency.
- **[FUTURE]** Redis (caching, rate limiting, streaming infra) and Celery (background jobs: scheduled data refresh, place verification, cleanup, analytics processing, emails) — explicitly *not* needed until real scale/need appears; do not build them speculatively.
- **[TBD]** Actual hosting providers, CI/CD pipeline, and domain/infra setup were not discussed in any conversation.

---

## 17. Scope: MVP vs Later

### 17.1 MVP — Version 1 **[CONFIRMED "Must Have" list]**

- Animated landing page (minimal nav)
- Login / Signup
- Chat-first interface with natural-language input (Hindi/Hinglish/English)
- Location detection + manual override
- Budget understanding
- Intent/category detection (accommodation, food, healthcare, cafes, local essentials; Local essentials maps to the `local_essential` backend category)
- Places search (own DB + external Places API)
- Recommendation ranking with explicit reasons
- Structured AI responses rendered as dynamic cards (not plain text)
- Action buttons: Call / Directions / Website-booking link where available
- Conversation history
- Save places
- Feedback (👍/👎 + reason)
- Mobile-responsive UI
- Loading/"AI thinking" states
- Error/fallback handling
- Basic Django-admin-based data management

Limited scope deliberately: **one strong city (or a small set), and 5 starting categories** — Accommodation, Food, Healthcare, Cafes, Local essentials — rather than "every city, every service" at launch **[CONFIRMED — explicit MVP-control decision]**.

### 17.2 Version 2 **[FUTURE, explicitly listed as next-tier]**

Voice input; Compare-places UI; Map embedded inside chat; advanced/personalized ranking preferences; "New to City" onboarding flow; improved multilingual support; recommendation feedback used to actually improve ranking (learning loop); advanced admin analytics (most-requested categories, common queries, no-result rate).

### 17.3 Future / Long-term **[FUTURE, low priority — do not build now]**

Full multi-day trip/relocation planning; public transport planning; personalized city profile; community reviews; smart notifications; expansion to more cities/categories; more advanced agentic workflows; Redis/Celery infra; vector/embedding semantic search; web-scraped data source; custom (non-Django-admin) admin panel; Share-response and Regenerate-response chat features.

---

## 18. Explicitly Rejected Approaches

Collected here for quick reference — do **not** build these, even if they seem like reasonable shortcuts:

1. Rendering AI output as raw HTML via `dangerouslySetInnerHTML`.
2. Letting the AI model own final result ranking (must be a deterministic scoring engine; AI only explains).
3. A separate database table per place category (Hotel, Restaurant, Hospital, ...) at MVP stage — use one generic `Place` model.
4. Making `recommendations` and `locations` full Django apps at MVP stage — keep them as `services/` modules.
5. Treating the backend as "just an OpenAI API wrapper" — Django must own auth, conversation state, tool execution, ranking, and validation, with AI as one component among several.
6. A landing page with many nav links / large footer / dashboard-style layout / "About, Services, Blog, Team, Gallery, FAQ" sprawl.
7. Pure `#000000` UI with heavy neon effects — reads as a cheap AI-template look.
8. Heavy animation inside the chat page itself (fine on the landing page, not in chat).
9. Fabricated/fake "AI thinking" progress steps that don't reflect real backend stages.
10. Launching with every city and every service category at once.
11. Blind web scraping as a data source without source/timestamp/confidence tracking.

---

## 19. Open Questions / TBD Before or During Build

- Exact external Places/Maps API provider (referred to generically throughout; never named).
  - **RESOLVED for MVP (documented Fix 6):** `ExternalPlacesProvider` uses OpenStreetMap / **Nominatim's free search API**, which requires **no API key**. `PLACES_API_KEY` is therefore intentionally unused and has been removed from `.env.example` as dead config. The key was reserved in Phase 1 for a commercial Places/Maps provider; it will be reintroduced and read in `services/places/providers.py` only if/when such a provider replaces Nominatim.
- Exact OpenAI model to use, and exact tool/function-calling schema implementation.
- Streaming transport mechanism: Server-Sent Events vs WebSocket vs chunked HTTP.
- Final recommendation scoring weights (two example sets exist — needs one config-driven decision).
- Whether a `City` model is needed, or the external provider's data is sufficient.
- Conversation summarization mechanism for long chat histories.
- Rate limiting thresholds/strategy.
- Hosting providers and CI/CD pipeline.
- Exact account-deletion / conversation-deletion implementation details.

---

*End of document.*
