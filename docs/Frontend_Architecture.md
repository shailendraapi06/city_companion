# City Companion — Frontend_Architecture.md

**Purpose:** Practical, implementation-ready frontend architecture for the React app. Derived from `PRD.md`, `TRD.md` §4, `UI_UX_Brief.md`, and `APP_FLOW.md`. No new pages, components, or behavior are introduced beyond what those documents establish.

**Legend:** ✅ Confirmed · 🟡 Proposed (reasonable default, not locked) · 🔵 Future/V2 · `[TBD]` unresolved

---

## 1. Architecture Principle

The chat is not a message-string renderer — it is an **AI Response Rendering Engine**: every AI reply arrives as a typed block list and is rendered via a **component registry**, not one text blob. ✅ This single decision shapes the component structure, state management, and API integration below. Everything else in the frontend exists in service of it.

---

## 2. Pages & Routes

| Route | Page | Auth | Notes |
|---|---|---|---|
| `/` | Landing | Public | Hero, How it works, live demo conversation, feature strip, contact, footer. ✅ |
| `/login` | Login | Public only (redirect to `/chat` if already authenticated) | ✅ |
| `/signup` | Signup | Public only | ✅ |
| `/chat` | Chat (empty state) | Protected | Default post-login/CTA destination. ✅ |
| `/chat/:conversationId` | Chat (existing conversation) | Protected | Loads history + `response_data`, restores rich blocks. ✅ |
| `/saved` | Saved Places | Protected | Grouped by category. ✅ |
| `/profile` | Profile & Settings | Protected | Name/email, preferences, logout, delete conversations/account. ✅ |

Not part of MVP routing 🔵: a dedicated onboarding route (`/onboarding` — "New to City" flow), a standalone Compare page (comparison renders inline as a chat block, not a separate route), a full-screen embedded map route (chat-embedded map is V2; MVP uses external map deep links per `UI_UX_Brief.md` §8).

`/chat` vs `/chat/:conversationId` is a routing convenience 🟡 — not explicitly specified in source docs, but consistent with "New Chat" vs "select a past conversation" both being described as loading into the same chat shell (`APP_FLOW.md` §3).

---

## 3. Layouts

Two layout shells, matching the "two sides of the app" split in `TRD.md` §4.1: ✅

### 3.1 `PublicLayout`
Used by `/`, `/login`, `/signup`.
```
PublicLayout
 ├── PublicNav (Logo · How It Works · Contact · Login/Sign Up)
 └── <page content>
```
Minimal nav only — no sprawling links. ✅

### 3.2 `AppLayout`
Used by `/chat`, `/chat/:conversationId`, `/saved`, `/profile`.
```
AppLayout
 ├── AppHeader (Logo · current city/location indicator · New Chat · Profile)
 ├── Sidebar (desktop) / Drawer (mobile)
 │     ├── + New Chat
 │     ├── Conversation list (Today / Yesterday / Older)
 │     ├── Saved Places link
 │     └── Profile/Settings link
 └── <page content — Chat / Saved / Profile>
```
Desktop: sidebar always visible alongside content. Mobile: sidebar collapses to a drawer; place details use a bottom sheet instead of a drawer panel. ✅ (`UI_UX_Brief.md` §4.1, §5.7)

No third layout is needed for details/compare — those render **inside** the chat layout as a Drawer (desktop) or BottomSheet (mobile) overlay, never a route change, to preserve chat context. ✅

---

## 4. Component Structure

Organized by responsibility, matching `TRD.md`'s component inventory — listed here for frontend build reference, not re-invented:

```
components/
├── layout/
│   ├── PublicLayout, PublicNav
│   ├── AppLayout, AppHeader, Sidebar, MobileDrawer, Footer
│
├── landing/
│   ├── Hero, HowItWorks, LiveDemoConversation, FeatureStrip, ContactSection
│
├── auth/
│   ├── LoginForm, SignupForm
│
├── chat/
│   ├── ChatWindow            # orchestrates message list + composer for one conversation
│   ├── ChatEmptyState        # "What can I help you find?" + quick-prompt chips
│   ├── MessageList           # virtualization-aware list, auto-scroll logic
│   ├── UserMessage
│   ├── AIMessage              # hosts the rendered block sequence for one assistant message
│   ├── MessageActions         # Copy · 👍/👎 (hover-revealed)
│   ├── ThinkingIndicator      # reflects real backend stages, never fake progress
│   ├── FollowUpChips          # "Show cheaper" / "Closer" / "Compare" — dynamic per response
│   └── Composer                # multiline input, send, mic (🔵 disabled placeholder)
│
├── renderer/                  # the AI Response Rendering Engine
│   ├── ResponseRenderer        # walks content[] and dispatches by `type`
│   ├── ComponentRegistry       # type → component map (single source of truth, extensible)
│   ├── MarkdownRenderer        # text/heading/list/blockquote/code/link/image
│   ├── TableRenderer
│   └── AlertRenderer           # info/success/warning/error
│
├── places/
│   ├── PlaceCard                # generic, category-aware — not one component per category ✅
│   ├── RecommendationCard       # PlaceCard + rank badge + "Why this?" + match/trust signals
│   ├── ComparisonTable
│   ├── PlaceDetailsDrawer       # desktop
│   ├── PlaceDetailsSheet        # mobile
│   └── PlaceActions             # View Details · Directions · Call · Website · Save
│
├── saved/
│   └── SavedPlacesList          # grouped by category, reuses PlaceCard
│
├── profile/
│   └── ProfileForm, SettingsForm
│
└── common/
    ├── Button, Modal, Drawer, BottomSheet, Tooltip
    ├── Skeleton, EmptyState, ErrorState
    └── ProtectedRoute
```

### 4.1 The registry is the extensibility point ✅
```
ComponentRegistry = {
  text: MarkdownRenderer,
  heading: MarkdownRenderer,
  list: MarkdownRenderer,
  table: TableRenderer,
  link: MarkdownRenderer,
  image: MarkdownRenderer,
  place: PlaceCard,
  recommendation: RecommendationCard,
  comparison: ComparisonTable,
  map: MapPreview,        // 🔵 V2 — registry slot reserved, not wired up in MVP
  alert: AlertRenderer,
  action: PlaceActions,
}
```
A new block type is added by adding one component + one registry entry — never by branching the chat UI itself. ✅ (`TRD.md` §4.5)

**MVP correction:** `map` is listed in the registry only as a forward-looking extensibility slot. Per `UI_UX_Brief.md` §8 and `TRD.md` §11, MVP does **not** render an inline map block at all — distance is shown as a plain value on the card, and "View on Map"/"Directions" is a plain external deep link handled by `PlaceActions` (client-side `tel:`/maps-URL open, no rendering component). A dedicated `MapPreview` component and the backend actually emitting `type: "map"` blocks are both 🔵 Version 2 work — do not build `MapPreview` for MVP.

**[REJECTED]**: any renderer path that uses `dangerouslySetInnerHTML` on AI output.

---

## 5. State Management

No specific state library was named in source docs — this section proposes the minimal split that matches the documented data shape. 🟡

### 5.1 Server state — API-backed, cached, revalidated
Use a query/cache library (e.g. React Query/TanStack Query) 🟡 for anything that comes from the API:
- Auth session (`GET /api/auth/me/`)
- Conversation list (`GET /api/conversations/`)
- Conversation detail + messages (`GET /api/conversations/{id}/`, messages)
- Saved places (`GET /api/saved-places/`)
- Place details (`GET /api/places/{id}/`)

Rationale: these are exactly the "Loading / Success / Empty / Error" surfaces the PRD/UI brief require per component (§7 below) — a query cache gives that for free instead of hand-rolled fetch state per component.

### 5.2 Chat/session state — local to the active conversation
A dedicated `ChatProvider`/store (React Context + reducer, or a lightweight store) 🟡 holding:
```
{
  conversationId: string | null,
  messages: Message[],            // includes response_data blocks for assistant messages
  status: 'idle' | 'sending' | 'streaming' | 'error',   // streaming = V2-ready, unused until V2
  location: { lat, lng } | null,
  locationOverride: string | null,  // manual city/location override
}
```
This maps directly to the conversation-memory requirement (`PRD.md` FR3) — the frontend does not resend history; it only tracks it locally for rendering and sends `conversation_id` + the new `message` to `/api/chat/`. ✅

### 5.3 Global app state — auth + UI chrome
```
AuthContext: { user, accessToken, isAuthenticated, login(), logout(), refresh() }
UIContext:   { sidebarOpen, activeDrawer/sheet, reduceMotion }
```
Kept intentionally small — no global state for place data or recommendations, since those are conversation-scoped (§5.2) or server-cached (§5.1). 🟡

### 5.4 Explicitly not needed for MVP
Global Redux-style store for every domain, offline sync, optimistic caching beyond simple save/unsave — none of this was discussed and would over-engineer a project this scoped. 🟡

---

## 6. API Integration

All requests go through a single typed API client — the frontend **never** calls OpenAI or the Places provider directly (server-side-only keys, per `TRD.md` §14). ✅

```
lib/api/
├── client.ts        # axios/fetch wrapper: base URL, auth header injection, envelope unwrapping
├── auth.ts           # register, login, refresh, logout, me
├── conversations.ts  # list, create(optional — see note), get, getMessages
├── chat.ts            # sendMessage(conversationId, message, location)
├── places.ts           # getPlace, save, unsave
├── savedPlaces.ts
└── feedback.ts          # submit
```

### 6.1 Response envelope handling ✅
Every response follows `{ success, data, error }` (`API_Specification.md` §1.3). The client unwraps `data` on success and throws a typed `ApiError` (using `error.code`/`error.message`) on failure, so components consume plain data/errors, not the envelope.

### 6.2 Auth header injection ✅
`client.ts` attaches `Authorization: Bearer <access_token>` from `AuthContext` to every request except `auth/register`, `auth/login`, `auth/refresh`. On a `401`, attempt one silent refresh via `POST /api/auth/refresh/`; if that fails, clear session and redirect to `/login`.

### 6.3 `/api/chat/` — the central integration point ✅
```ts
sendMessage({
  conversation_id: string | null,
  message: string,
  location?: { lat: number, lng: number }
}) → { conversation_id, message: { id, role }, content: Block[] }
```
- On success: append the returned `content` blocks as a new assistant `Message` in chat state (§5.2), and adopt `conversation_id` if this was a new conversation.
- Frontend is architecture-ready for the streamed event variant (`message_start` / `text` / `recommendation` / `message_end`) but MVP uses the single blocking JSON response — no streaming client code is required to ship MVP. ✅ / 🔵 (`TRD.md` §4.7)

### 6.4 Location capture ✅
On chat mount, request geolocation permission once; on grant, attach `{ lat, lng }` to subsequent `/api/chat/` calls until the user sets a manual override. Never re-prompt every turn. (`APP_FLOW.md` §9)

---

## 7. Authentication & Protected Routes

### 7.1 Auth flow ✅
```
Signup/Login form → POST /api/auth/register/ or /login/
  → store { access_token, refresh_token } (e.g. httpOnly-cookie or secure storage 🟡 — mechanism [TBD], not specified in source docs)
  → set AuthContext.user
  → redirect to /chat
```

### 7.2 `ProtectedRoute` ✅
Wraps `/chat`, `/chat/:id`, `/saved`, `/profile`. If `AuthContext.isAuthenticated` is false, redirect to `/login` (optionally preserving the intended destination). Public-only routes (`/login`, `/signup`) redirect *to* `/chat` if already authenticated.

### 7.3 Session restore ✅
On app load, if a stored token exists, call `GET /api/auth/me/` to hydrate `AuthContext` before rendering protected routes; show a lightweight loading state during this check.

### 7.4 Logout ✅
Calls `POST /api/auth/logout/`, clears local session, redirects to `/`.

Whether a returning logged-in visitor lands on `/` or is auto-redirected straight to `/chat` is explicitly **[TBD]** per `TRD.md` §4.2 — implement whichever is simplest first (e.g., always land on `/`, let the user click through) and revisit.

---

## 8. Forms & Validation

Only two real forms exist in MVP scope — this is deliberately not a form-heavy product. ✅

| Form | Fields | Validation |
|---|---|---|
| Signup | name, email, password | required fields; valid email format; password minimum length — exact rule `[TBD]`, not specified in source docs |
| Login | email, password | required fields |
| Feedback reason (inline, not a page) | type (👍/👎) + optional reason enum | reason is a fixed enum: `too_expensive · too_far · not_available · wrong_information · other` — no free text required |
| Profile/Settings | name, preferred city, language, notifications toggle | minimal; no complex validation discussed |

Chat message input is **not** a form in the traditional sense — it's the Composer, validated only for non-empty content before enabling Send. ✅

Each form must implement the same states as everything else in this app (§9): normal, loading ("Signing in…"), inline validation error, submit error (e.g., "Incorrect email or password"), success. ✅ (`TRD.md` §4.3)

---

## 9. Loading, Error & Empty States

Every component/page must define all of: **Loading · Success · Empty · Error · Disabled · Hover/Active · Mobile.** ✅ Not just the happy path — this is called out repeatedly across PRD/TRD/UI brief as a completion criterion.

| Situation | Required behavior |
|---|---|
| AI response pending | `ThinkingIndicator` reflecting real backend stages if available (Understanding → Finding → Ranking); never fabricated fake steps. ✅ |
| No results for a search | Never a bare "No results found" — show closest alternatives + an actionable suggestion (e.g., budget delta). ✅ |
| AI service unavailable | Backend already falls back to raw DB results (see `APP_FLOW.md` §10); frontend renders those results plus the AI-unavailable notice — not a hard error screen. ✅ |
| Network/unhandled error | Generic `ErrorState`: "Something went wrong" + **Try Again** / **Start New Chat** — never expose raw technical error text. ✅ |
| Conversation list / saved places empty | Friendly `EmptyState` ("No conversations yet." / prompt to start saving places), not a blank screen. 🟡 (pattern implied, exact copy not specified) |
| Long conversation (500+ messages) | Message list must not render everything at once; preserve scroll position; show "↓ New response" / jump-to-latest instead of forced scroll when the user isn't at the bottom. ✅ |
| Form validation | Inline field-level errors before submit attempt where feasible; submit-level error banner for server-rejected submissions (e.g. wrong credentials). ✅ |

`Skeleton` loading components are used for conversation list, saved places, and place details while server state is fetching — matches the "skeleton loaders" performance requirement in `PRD.md` §11.

---

## 10. Frontend Folder Structure

```
frontend/
├── public/
├── src/
│   ├── pages/
│   │   ├── Landing/
│   │   ├── Login/
│   │   ├── Signup/
│   │   ├── Chat/                # handles both /chat and /chat/:conversationId
│   │   ├── SavedPlaces/
│   │   └── Profile/
│   │
│   ├── components/               # see §4 breakdown (layout, landing, auth, chat, renderer, places, saved, profile, common)
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ChatContext.tsx
│   │   └── UIContext.tsx
│   │
│   ├── lib/
│   │   ├── api/                  # see §6
│   │   └── registry/
│   │       └── componentRegistry.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useConversation.ts
│   │   ├── useSendMessage.ts
│   │   ├── useSavedPlaces.ts
│   │   └── useGeolocation.ts
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── types/                    # Block, Message, Conversation, Place, PlaceResult, ApiEnvelope, etc.
│   │
│   ├── styles/                   # design tokens [TBD values — see UI_UX_Brief §13], global theme
│   │
│   └── App.tsx, main.tsx
│
├── package.json
└── vite.config.ts / next.config.js   # exact build tool not specified in source docs — [TBD]
```

This mirrors the backend's separation of concerns: `components/renderer` and `lib/registry` are the frontend's equivalent of the backend's response-schema contract — they must stay in sync with `Backend_Schema.md` §9's `content[].type` list. ✅

---

## 11. Page-to-API Flow

### 11.1 Landing (`/`)
No API calls — fully static/marketing content. ✅

### 11.2 Login / Signup
```
Submit form → POST /api/auth/login/ or /register/
  → on success: store tokens, GET /api/auth/me/ (or use inline response), navigate to /chat
  → on failure: show inline error, do not navigate
```

### 11.3 Chat — new conversation (`/chat`)
```
Mount → request geolocation (optional) → render ChatEmptyState
User sends message → POST /api/chat/  { conversation_id: null, message, location? }
  → response includes conversation_id → update route to /chat/:conversationId
  → append assistant message (content blocks) to ChatContext
  → ResponseRenderer walks content[] → renders via ComponentRegistry
```

### 11.4 Chat — existing conversation (`/chat/:conversationId`)
```
Mount → GET /api/conversations/{id}/           (metadata)
      → GET /api/conversations/{id}/messages/  (history incl. response_data)
  → hydrate ChatContext.messages
  → each assistant message's stored response_data re-rendered via the same
     ResponseRenderer/ComponentRegistry used for live responses — no divergent code path ✅
User sends follow-up → POST /api/chat/  { conversation_id, message }  → same as §11.3 append flow
```

### 11.5 Recommendation card actions
```
Save     → POST /api/places/{id}/save/     → optimistically mark card as saved
Unsave   → DELETE /api/places/{id}/save/
View Details → GET /api/places/{id}/  → open Drawer/BottomSheet with full data
Call / Directions / Website → client-side only (tel:/maps deep link/external URL) — no API call ✅
👍/👎    → POST /api/feedback/  { message_id, place_id?, type, reason? }
```

### 11.6 Saved Places (`/saved`)
```
Mount → GET /api/saved-places/  (optionally ?category=)
  → render grouped list reusing PlaceCard
Unsave from this page → DELETE /api/places/{id}/save/ → remove from local list
```

### 11.7 Profile (`/profile`)
```
Mount → GET /api/auth/me/ (already in AuthContext; refetch on demand if stale)
Update preferences → [TBD — no dedicated profile-update endpoint specified in API_Specification.md;
                       needs to be added, e.g. PATCH /api/auth/me/ or /api/users/profile/]
Delete conversation → [TBD — endpoint not specified; needs e.g. DELETE /api/conversations/{id}/]
Logout → POST /api/auth/logout/ → clear session → redirect to /
```

---

## 12. Cross-Cutting Rules (carried from PRD/TRD, restated as frontend obligations)

- Frontend never talks to OpenAI or the Places API directly — only to the Django REST API. ✅
- Frontend renders **only** the fixed, extensible `content[].type` set — never arbitrary AI-provided HTML/CSS. ✅
- Every card/response must surface trust signals (source/verified/last-updated, staleness disclaimer) when present in the API response — this is a rendering obligation, not just a data one. ✅
- Mobile-first: build and test the mobile layout first; desktop (sidebar + optional side panel) is the enhancement, not the baseline. ✅
- Respect `prefers-reduced-motion` globally; keep chat-surface animation subtle regardless of how animated the landing page is. ✅

---

## 13. Open Frontend Questions `[TBD]`

Not resolved in source conversations — flag before/during build:
- Server-state library choice (React Query vs SWR vs custom) — only the *need* for cached server state is implied, not a specific library.
- Token storage mechanism (httpOnly cookie vs localStorage) for the JWT access/refresh pair.
- Build tooling (Vite vs Next.js vs CRA) — not specified.
- Design tokens: color palette, type scale, spacing system (see `UI_UX_Brief.md` §13).
- Exact conversation-list creation trigger: does `/chat` (new) pre-create a `Conversation` row via `POST /api/conversations/`, or does the first `POST /api/chat/` implicitly create it? (`APP_FLOW.md` §3)
- Profile-update and conversation/account-deletion endpoints are referenced as required features but have no confirmed API contract yet — coordinate with `API_Specification.md` before building the Profile page's write actions.

---

*End of Frontend_Architecture.md*
