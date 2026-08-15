# City Companion — Development_Roadmap.md

**Purpose:** The master, dependency-ordered build plan for City Companion. Synthesized from `PRD.md`, `TRD.md`, `APP_FLOW.md`, `Backend_Schema.md` (database design), `TRD.md` §5 (backend architecture), `API_Specification.md`, `Frontend_Architecture.md`, and `UI_UX_Brief.md`. No feature, endpoint, or architecture decision here deviates from those documents — this roadmap only sequences the work they already define.

**Legend:** ✅ MVP scope (build now) · 🔵 V2/Future (do not build yet) · `[TBD]` — a decision the source docs left open; pick a default and move on, don't block the phase on it. **🚦 Gate** marks a task that must be done/working before the next phase starts.

---

## How to Read This Roadmap

- Phases are ordered by **dependency**, not by importance — Phase 4 cannot start until Phase 2/3 gates are cleared, regardless of how "core" a feature feels.
- Every task maps to a specific section of an existing doc — cited inline as `(Doc §x)` — so nothing here is invented.
- MVP scope only, per `PRD.md` §12 / `TRD.md` §17: **one city, five categories** (Accommodation, Food, Healthcare, Cafes, Local Essentials). 🔵 items are listed only where relevant so they're not accidentally built early.

---

## Phase 1 — Project Setup

**Goal:** A running skeleton (empty Django + React apps, connected, deployable locally) with no features yet.

1. Initialize Git repo; add `.gitignore`, `README.md`.
2. Backend: create Django project (`config/`), install Django + DRF + `django-cors-headers` + JWT package (`TRD.md` §2, §5.1).
3. Backend: set up `requirements.txt`, `.env` / `.env.example` with the confirmed variable set — `DJANGO_SECRET_KEY, DEBUG, DATABASE_URL, OPENAI_API_KEY, PLACES_API_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, JWT_SECRET` (`TRD.md` §8).
4. Backend: configure SQLite for local dev, PostgreSQL as the prod target (`TRD.md` §2).
5. Backend: create the app skeleton exactly as specified — `apps/{users, conversations, chat, places, saved_places, feedback}` + `services/{ai, places, recommendations, location}` + `common/` + `tests/` (`TRD.md` §5.1). **Do not** create `recommendations`/`locations` as Django apps — they are `services/` modules only (`TRD.md` §5.1, §18.4).
6. Backend: configure `common/responses.py` for the standard API envelope (`API_Specification.md` §1.3) up front, since every endpoint will use it.
7. Frontend: initialize React project per `Frontend_Architecture.md` §10 folder structure (`pages/, components/, context/, lib/, hooks/, routes/, types/, styles/`). Build tool choice is `[TBD]` — pick one (e.g. Vite) and proceed.
8. Frontend: install a server-state cache library (e.g. React Query) and a routing library — decisions flagged `[TBD]` in `Frontend_Architecture.md` §13, pick sensible defaults now so later phases aren't blocked.
9. Confirm frontend ↔ backend local connectivity (CORS configured, a placeholder `GET /api/health/` or similar returns 200).

**🚦 Gate before Phase 2:** Django project runs, migrations apply cleanly (even with zero models), React app runs and can hit a backend endpoint across CORS.

---

## Phase 2 — Database & Backend Foundation

**Goal:** All core models exist and are migrated; no business logic yet.

**Prerequisite:** Phase 1 gate cleared.

1. Implement `User` (custom Django user model) exactly as specified — `id, name, email, password, is_active, created_at` (`Backend_Schema.md` §2.1). **This must be the very first model migrated**, since every other model FKs to it.
2. Implement `UserProfile` (`user, preferred_city, language, budget_preferences, location_preferences`) (`Backend_Schema.md` §2.2).
3. Implement `Conversation` (`id, user, title, city, created_at, updated_at`) (`Backend_Schema.md` §3.1).
4. Implement `Message` (`id, conversation, role, content, response_data (JSON), created_at`) — `response_data` is critical, do not skip it; it's what makes reopening a conversation restore rich cards instead of flat text (`Backend_Schema.md` §3.2).
5. Implement `Place` as a **single generic model** — `name, category, description, address, latitude, longitude, phone, website, rating, price_range, source, verified, last_updated, amenities, opening_hours, images` (`Backend_Schema.md` §5.1). Decide the category-specific attribute approach now (flat nullable columns vs. `attributes` JSONField — `Backend_Schema.md` §5.2 `[TBD]`, defaults to Option B/JSONField) and commit to it before writing any Place-search logic downstream.
   - **Do not** create per-category tables (Hotel, PG, Restaurant, Hospital, ...) — explicitly rejected (`TRD.md` §18.3, `Backend_Schema.md` §11).
6. Implement `SavedPlace` (`user, place, created_at`, unique together) (`Backend_Schema.md` §6.1).
7. Implement `Feedback` (`user, message, place [optional], type, reason, created_at`) (`Backend_Schema.md` §7.1).
8. Skip `City` model for MVP unless a concrete need appears during Phase 5 (Places integration) — it's explicitly optional (`Backend_Schema.md` §5.3, `TRD.md` §19).
9. Register all models in Django Admin (this doubles as the MVP admin panel — `PRD.md` §10, `TRD.md` §17.1).
10. Write model-level tests: field constraints, `user`-scoped FK behavior, `Place.category` choices.

**🚦 Gate before Phase 3:** All migrations run cleanly on a fresh DB; Django Admin can create/edit a `User`, `Conversation`, `Message`, `Place` by hand.

---

## Phase 3 — Authentication & Authorization

**Goal:** Full JWT auth flow working end-to-end (backend + frontend), with per-user data isolation enforced.

**Prerequisite:** Phase 2 gate cleared (needs `User` model).

### Backend
1. Implement JWT issuance/refresh (Django auth + JWT package) (`TRD.md` §8).
2. Implement endpoints exactly as specified in `API_Specification.md` §2:
   - `POST /api/auth/register/`
   - `POST /api/auth/login/`
   - `POST /api/auth/refresh/`
   - `POST /api/auth/logout/`
   - `GET /api/auth/me/`
3. Enforce password hashing via Django's built-in mechanism — never plaintext (`TRD.md` §14).
4. Implement the **per-user data isolation rule** as a reusable permission/query pattern now, before any other endpoint is built: every conversation/message/saved-place/feedback query must filter by `request.user`, returning `404` (not `403`) for another user's resource (`API_Specification.md` §1.2, `TRD.md` §8, §14).
5. Write auth tests: register/login/refresh/logout happy paths, wrong-password rejection, token expiry, cross-user access attempts return 404.

### Frontend
6. Build `AuthContext` (`user, accessToken, isAuthenticated, login(), logout(), refresh()`) (`Frontend_Architecture.md` §5.3, §7).
7. Build `LoginForm` / `SignupForm` with required states: normal, loading, validation error, submit error, success (`Frontend_Architecture.md` §8, `UI_UX_Brief.md` §7).
8. Build `ProtectedRoute` wrapper and wire up route guards (`Frontend_Architecture.md` §7.2).
9. Implement session restore on app load (`GET /api/auth/me/` on mount if a token exists) (`Frontend_Architecture.md` §7.3).
10. Implement token-refresh-on-401 interceptor in the API client (`Frontend_Architecture.md` §6.2).
11. Resolve the `[TBD]` token storage mechanism (httpOnly cookie vs. localStorage) now — this affects every subsequent API call (`Frontend_Architecture.md` §13).

**🚦 Gate before Phase 4:** A user can register, log in, stay logged in across a refresh, log out, and cannot access another test user's data via direct API calls.

---

## Phase 4 — Core Backend APIs

**Goal:** All non-AI, non-chat REST endpoints working — conversations, places, saved places, feedback. This phase deliberately excludes `/api/chat/`, which needs AI/recommendation services (Phase 5) first.

**Prerequisite:** Phase 3 gate cleared.

1. `GET /api/conversations/` — list, scoped to user, grouped-ready ordering (`API_Specification.md` §3.1).
2. `POST /api/conversations/` — create empty conversation (`API_Specification.md` §3.2). Note the `[TBD]` on whether this is actually used by the frontend for "New Chat" or whether `/api/chat/` creates conversations implicitly — implement the endpoint regardless; decide the trigger point in Phase 8.
3. `GET /api/conversations/{id}/` — metadata only (`API_Specification.md` §3.3).
4. `GET /api/conversations/{id}/messages/` — full history including `response_data` (`API_Specification.md` §3.4). **Verify this is `GET`**, not `POST` — earlier drafts were ambiguous; the finalized spec confirms `GET`.
5. `GET /api/places/{id}/` — full place detail, including `is_saved` flag for the current user (`API_Specification.md` §4.4).
6. `POST /api/places/{id}/save/` and `DELETE /api/places/{id}/save/` (`API_Specification.md` §4.1–4.2).
7. `GET /api/saved-places/` — grouped-by-category-ready, with optional `?category=` filter (`API_Specification.md` §4.3).
8. `POST /api/feedback/` — 👍/👎 + fixed reason enum (`API_Specification.md` §4.5).
9. Wire the standard response envelope and error codes (`VALIDATION_ERROR`, `NOT_FOUND`, etc.) consistently across all of the above (`API_Specification.md` §1.3–1.4).
10. Write endpoint tests for each route: happy path, empty state, not-found/cross-user 404, validation errors.
11. **[TBD, flagged not blocking]:** profile-update and conversation/account-deletion endpoints are required product features (`PRD.md` §10.3 Settings, `TRD.md` §14) but have no confirmed contract yet. Add them now as a small extension of this phase (e.g. `PATCH /api/users/profile/`, `DELETE /api/conversations/{id}/`) rather than leaving Settings entirely unbuildable later.

**🚦 Gate before Phase 5:** Every non-chat endpoint is callable via an API client (e.g. Postman) with a real JWT and returns correct, user-scoped data.

---

## Phase 5 — External API/Service Integrations

**Goal:** The AI orchestration layer, the Places data layer, and the Recommendation Engine — the actual "intelligence" of the product — working together behind `/api/chat/`.

**Prerequisite:** Phase 4 gate cleared (needs `Conversation`/`Message`/`Place` CRUD already solid).

### 5.1 Places data layer
1. Implement `services/places/providers.py`: `InternalDatabaseProvider` first (queries the `Place` table) (`TRD.md` §5.1, §12).
2. Select and integrate an external Places/Maps API provider — this is an explicit `[TBD]` in every source doc; choose one now (`TRD.md` §19) and implement `ExternalPlacesProvider` as a second adapter behind the same interface.
3. Implement `services/places/service.py` (`PlaceSearchService`) as the single entry point combining both providers (`TRD.md` §5.1).
4. Implement `services/places/filters.py` — budget, category, distance, food/amenity filters (`TRD.md` §5.1, `APP_FLOW.md` §5).
5. Implement `services/location/distance.py` — server-side lat/long distance calculation (`TRD.md` §11, `APP_FLOW.md` §9).
6. Seed enough verified `Place` data (own DB, admin-entered) for the single MVP city to make search meaningfully testable (`PRD.md` §12.1) — don't wait for the external provider to be fully live to start testing ranking logic.

### 5.2 Recommendation Engine (deterministic — no AI here)
7. Implement `services/recommendations/scoring.py` — factors: budget match, requirement/tag match, distance, rating, availability/data quality (`TRD.md` §10.2). Exact weights are `[TBD]` (two example sets exist) — implement as **configurable**, not hardcoded, and pick one default set to start.
8. Implement `services/recommendations/ranking.py` — sorts scored candidates.
9. Implement priority-reweighting support (e.g. user says "location matters more") — the scoring function must accept a weight override (`TRD.md` §10.3, `APP_FLOW.md` §6).
10. Unit test the scoring/ranking logic directly (no AI involved) with fixed candidate sets — this is the one layer that should be fully deterministic and easy to test in isolation.

### 5.3 AI Service
11. Implement `services/ai/client.py` — raw OpenAI API connection, server-side only key (`TRD.md` §5.1, §9).
12. Implement `services/ai/prompts.py` — system prompt per `TRD.md` §9.3 (role, rules: never invent data, use tools, explain don't rank, ask clarification only when necessary).
13. Implement `services/ai/tools.py` — tool definitions: `search_places`, `get_place_details`, `search_nearby`, `compare_places` (`TRD.md` §9.2). Exact parameter shapes are `[TBD]`; use the shapes proposed in `Backend_Schema.md` §9.5 as the starting contract.
14. Implement `services/ai/schemas.py` + `services/ai/parser.py` — the fixed `content[].type` schema (`text, heading, list, table, link, image, place, recommendation, comparison, map, alert, action`) and output validation (`TRD.md` §9.4, `API_Specification.md` §5.4).
15. Implement `services/ai/service.py` — orchestration: build context (recent messages + conversation summary + location + profile) → call AI → handle tool calls → pass ranked results back to AI for explanation → return validated structured content (`TRD.md` §9.1, §9.3, §9.6).
16. Implement the hallucination-control rule at the service level: the AI is only ever given pre-filtered, already-ranked top-N candidates — never a raw DB dump (`TRD.md` §9.2, §5.1).
17. Conversation summarization mechanism for long threads is `[TBD]` (`TRD.md` §9.6, §19) — implement a simple "recent N messages" window now; treat summarization as an enhancement, not a blocker.

**🚦 Gate before Phase 6:** Given a fixed test message and seeded place data, the full chain (extract requirements → tool call → filter → score/rank → AI explanation → schema-validated structured output) runs end-to-end in isolation (e.g. via a script or test), without the `/api/chat/` endpoint or frontend involved yet.

---

## Phase 6 — Frontend Foundation

**Goal:** The React app shell — layouts, routing, the AI Response Rendering Engine skeleton, and the API client — exists and renders, using mock/static data. Can run in parallel with Phase 5 once Phase 3 is done, since it doesn't depend on the AI layer being complete.

**Prerequisite:** Phase 3 gate cleared (needs working auth). Does **not** strictly require Phase 5, but Phase 8 does.

1. Build `PublicLayout` + `AppLayout` exactly as specified (`Frontend_Architecture.md` §3).
2. Build routing: `/`, `/login`, `/signup`, `/chat`, `/chat/:conversationId`, `/saved`, `/profile`, wrapped correctly by `ProtectedRoute`/public-only guards (`Frontend_Architecture.md` §2, §7.2).
3. Build the landing page static sections: Hero, How It Works, Live Demo Conversation (static/animated mock, not wired to real chat), Feature Strip, Contact, Footer (`UI_UX_Brief.md` §3, `Frontend_Architecture.md` §2).
4. Build the **AI Response Rendering Engine** skeleton first, before any chat feature work:
   - `ComponentRegistry` (`type → component` map) (`Frontend_Architecture.md` §4.1)
   - `ResponseRenderer` (walks `content[]`, dispatches by type)
   - `MarkdownRenderer`, `TableRenderer`, `AlertRenderer` stubs
   - Test it against **hand-written mock `content[]` payloads** matching the schema in `API_Specification.md` §5.4 / `Backend_Schema.md` §9.2 — do not wait for the real backend to validate this renders correctly.
5. Build the `AppHeader`, `Sidebar`/`MobileDrawer`, `ChatEmptyState` with quick-prompt chips (`Frontend_Architecture.md` §4, `UI_UX_Brief.md` §4).
6. Build `Composer` (multiline, auto-expand, Enter/Shift+Enter, disabled state) — mic/attachment as inert placeholders only (`UI_UX_Brief.md` §4.5).
7. Set up the typed API client (`lib/api/*`) with envelope unwrapping and auth header injection, pointed at the already-working Phase 3/4 endpoints (`Frontend_Architecture.md` §6).
8. Set up `ChatContext` state shape (`conversationId, messages, status, location, locationOverride`) (`Frontend_Architecture.md` §5.2).
9. Apply the base dark theme + design tokens — resolve the `[TBD]` color/type/spacing tokens now so every subsequent component is styled consistently (`UI_UX_Brief.md` §2.1, §13).
10. Implement `prefers-reduced-motion` handling and the base animation system split (landing = heavy, chat = subtle) at the shell level (`UI_UX_Brief.md` §2.2–2.3).

**🚦 Gate before Phase 7:** The full app shell is navigable (auth-guarded routes work), the landing page is complete, and the `ResponseRenderer` correctly renders every block type from a hand-crafted mock payload.

---

## Phase 7 — Feature Development

**Goal:** Build out each product feature's UI components fully (still against mock data where the backend isn't wired yet) and, on the backend, finish `/api/chat/` itself. This is the largest phase — split explicitly by backend/frontend.

**Prerequisite:** Phase 5 gate (backend AI/recommendation chain works standalone) and Phase 6 gate (frontend shell + renderer work) both cleared.

### 7.1 Backend — `/api/chat/` endpoint
1. Implement `ChatView → ChatService` orchestration wiring together: auth → save user message → `AIService` → `ToolExecutor` → `PlaceSearchService` → `RecommendationService` → `AIService` (explain) → `ResponseValidator` → save `Message.response_data` → return structured response (`TRD.md` §5.3, `API_Specification.md` §5.2).
2. Implement the exact request/response contract from `API_Specification.md` §5.1.
3. Implement conversation-memory context assembly per call (`API_Specification.md` §5.5).
4. Implement the **fallback behaviors** as first-class logic, not an afterthought:
   - AI unavailable → return DB/API-only results + `alert` block (`API_Specification.md` §5.6, `APP_FLOW.md` §10)
   - No strong match → closest alternatives + actionable suggestion, never a bare empty result (`API_Specification.md` §5.7, `APP_FLOW.md` §10)
   - Malformed AI output → schema retry/fallback, never forwarded as-is (`TRD.md` §9.4)
5. Implement priority-change handling within the same endpoint — no separate route (`API_Specification.md` §5.8).
6. Implement emergency-intent handling: fast-path response, zero-hallucination requirement, verified-source-only data (`PRD.md` §6.4, `APP_FLOW.md` §11).
7. Write integration tests against `/api/chat/` covering: normal recommendation flow, clarification-needed flow, no-results flow, AI-unavailable fallback, priority-change flow, emergency flow (`APP_FLOW.md` §4–11 map directly to test cases).

### 7.2 Frontend — feature components (build against Phase 6's renderer + mock payloads, then real data once 7.1 is ready)
8. `PlaceCard` (generic, category-aware) + `RecommendationCard` (rank badge, "Why this?", trust signals, action buttons) (`UI_UX_Brief.md` §5.4, `Frontend_Architecture.md` §4).
9. `ComparisonTable` rendering (AI-initiated comparisons are MVP; explicit multi-select Compare UI is 🔵 V2 — do not build a Compare-selection UI now) (`APP_FLOW.md` §7, `PRD.md` §6.3 FR12).
10. `ThinkingIndicator` reflecting real backend stages (`UI_UX_Brief.md` §6.1).
11. `PlaceDetailsDrawer` (desktop) / `PlaceDetailsSheet` (mobile) (`UI_UX_Brief.md` §5.7).
12. `PlaceActions` — View Details / Directions / Call / Website / Save, all client-side deep links except Save (`Frontend_Architecture.md` §11.5). Do **not** build an embedded `MapPreview` — MVP uses plain distance + external deep link only (`Frontend_Architecture.md` §4.1 MVP correction, `UI_UX_Brief.md` §8).
13. `MessageActions` (Copy, 👍/👎 with reason enum, hover-revealed) (`UI_UX_Brief.md` §6.4).
14. `FollowUpChips` (Show cheaper / Closer / Compare / More options) (`UI_UX_Brief.md` §4.5, `APP_FLOW.md` §6).
15. Auto-scroll behavior (bottom-anchored vs. "↓ New response") (`UI_UX_Brief.md` §6.3).
16. `SavedPlacesList` grouped by category, reusing `PlaceCard` (`Frontend_Architecture.md` §4, §11.6).
17. `ProfileForm` / `SettingsForm` — coordinate with the Phase 4 profile-update/deletion endpoints (`Frontend_Architecture.md` §11.7).
18. Location capture: geolocation permission prompt, visible editable "📍 Using current location — Change" indicator, manual override (`UI_UX_Brief.md` §8, `APP_FLOW.md` §9).
19. Required states for every component above: Loading, Success, Empty, Error, Disabled, Hover/Active, Mobile — build these alongside the happy path, not after (`Frontend_Architecture.md` §9, `PRD.md` §8.5).

**🚦 Gate before Phase 8:** `/api/chat/` is fully functional standalone (tested via API client), and every feature component renders correctly against realistic mock payloads.

---

## Phase 8 — Frontend–Backend Integration

**Goal:** Replace all mock data with the real API; the app works as one connected system.

**Prerequisite:** Phase 7 gate cleared.

1. Wire `POST /api/chat/` into `ChatWindow`/`ChatContext` — new-conversation flow (`Frontend_Architecture.md` §11.3).
2. Wire existing-conversation load flow — `GET /api/conversations/{id}/` + `GET /api/conversations/{id}/messages/`, hydrate `ChatContext`, confirm stored `response_data` re-renders identically to a live response through the **same** `ResponseRenderer` code path (`Frontend_Architecture.md` §11.4, `APP_FLOW.md` §3, §12). This is a critical correctness check — no divergent rendering logic for history vs. live.
3. Resolve the `[TBD]` new-conversation creation trigger now: decide whether `/chat` pre-creates via `POST /api/conversations/` or relies on `/api/chat/`'s implicit creation, and implement consistently (`API_Specification.md` §3.2, `Frontend_Architecture.md` §13).
4. Wire Save/Unsave, View Details, Feedback, Saved Places list to their real endpoints (`Frontend_Architecture.md` §11.5–11.6).
5. Wire Profile page to real `GET /api/auth/me/` and the Phase 4 profile-update/deletion endpoints.
6. Wire geolocation capture into every `/api/chat/` call per §11.3–11.4 (`Frontend_Architecture.md` §6.4).
7. Confirm the 401 → silent-refresh → retry interceptor works against the real backend under an expired token.
8. Confirm cross-user data isolation from the frontend's perspective too (e.g. a stale/foreign `conversationId` in the URL correctly 404s and is handled gracefully, not crashing the UI).
9. Remove all mock data paths once real integration is confirmed stable.

**🚦 Gate before Phase 9:** Every user flow in `APP_FLOW.md` (§1–§12) can be walked manually end-to-end against the real backend, with no mock data remaining.

---

## Phase 9 — Testing & Bug Fixing

**Goal:** Systematic verification against the documented flows and requirements, not ad-hoc poking.

**Prerequisite:** Phase 8 gate cleared.

1. Run through every flow in `APP_FLOW.md` as a manual test script: Master Flow, Landing→Login→Chat, New Chat & History, Clarification-Needed, Normal Recommendation, Multi-Turn/Priority Change, Comparison, Save/Call/Directions/Website, Location Detection, No-Results/Error/Fallback, Emergency, Returning to Old Conversation (§1–§12).
2. Verify every **required state** (Loading/Success/Empty/Error/Disabled/Hover/Mobile) on every major component, not just chat — landing, auth forms, saved places, profile (`PRD.md` §8.5, `Frontend_Architecture.md` §9).
3. Verify the **non-negotiable rules** explicitly, one by one:
   - AI never bypasses tools to "know" a fact (`TRD.md` §3.3)
   - AI never overrides deterministic ranking (`TRD.md` §3.3, §10.1)
   - No response type outside the fixed schema ever reaches the frontend (`API_Specification.md` §5.4)
   - Every place shown carries source/verified/last-updated where relevant (`Backend_Schema.md` §10)
   - Cross-user data isolation holds on every user-scoped endpoint (`TRD.md` §14)
4. Test fallback paths deliberately (simulate AI service failure, simulate external Places API failure, submit malformed input) and confirm graceful degradation matches `APP_FLOW.md` §10 exactly.
5. Test on real mobile viewport first, then tablet/desktop — mobile-first is a hard requirement, not an afterthought (`PRD.md` §8.4).
6. Accessibility pass: keyboard navigation, focus states, alt text, contrast, screen-reader labels, `prefers-reduced-motion` (`PRD.md` §8.6, `UI_UX_Brief.md` §2.3).
7. Performance pass: lazy loading, skeleton loaders, no unbounded data sent to the AI, long-conversation scroll performance (500+ messages) (`PRD.md` §11).
8. Security pass: confirm no API key ever appears in any frontend bundle, network response, or error message (`TRD.md` §14, `API_Specification.md` §8).
9. Fix bugs found, prioritizing: data isolation/security bugs > core chat flow bugs > secondary feature bugs > polish.

**🚦 Gate before Phase 10:** All `APP_FLOW.md` flows pass manually; no known data-isolation or hallucination-control violations remain open.

---

## Phase 10 — Final Verification & Deployment

**Goal:** Ship the MVP.

**Prerequisite:** Phase 9 gate cleared.

1. Final scope check against `PRD.md` §12.2 MVP checklist — confirm every listed item is actually done; confirm no 🔵 V2/Future item was accidentally built instead of something in scope.
2. Confirm the MVP city/category scope is deliberately limited (one city, five categories) and not silently expanded (`PRD.md` §12.1, `TRD.md` §17.1).
3. Finalize environment configuration for production: `DEBUG=False`, real `ALLOWED_HOSTS`/`CORS_ALLOWED_ORIGINS`, production `DATABASE_URL` (PostgreSQL), all secrets out of version control (`TRD.md` §14, §16).
4. Set up separate hosting for frontend and backend, per the confirmed direction — exact providers are `[TBD]`, choose now (`TRD.md` §16, §19).
5. Docker is optional for MVP — add only if it simplifies this deployment step, not as a prerequisite (`TRD.md` §16).
6. Do **not** set up Redis/Celery for this launch — explicitly deferred (`TRD.md` §16, §18).
7. Run the full manual flow pass (Phase 9 checklist) once more against the deployed environment, not just local.
8. Confirm admin access (Django Admin) works in production for managing `Place` data post-launch (`PRD.md` §10).
9. Document remaining open `[TBD]` items for future iterations (hosting-specific ops, rate limiting, streaming transport, scoring weight tuning, semantic search, City model, etc. — see `TRD.md` §19 for the full list) so they aren't lost.
10. Tag the release.

**🚦 Gate:** MVP is live, reachable, and passes the Phase 9 manual test suite in production.

---

## Explicitly Out of Scope for This Roadmap (🔵 — do not schedule into any phase above)

Per `PRD.md` §12.3/§17.2–17.3 and `TRD.md` §17.2–17.3:
Voice input · explicit multi-select Compare UI · map embedded inside chat · advanced personalization/preference profiles · "New to City" onboarding flow · broader multilingual support beyond Hindi/English/Hinglish · feedback-driven ranking learning loop · advanced admin analytics · full trip planning · multi-day relocation assistance · public transport planning · personalized city profile · community reviews · smart notifications · additional cities/categories · Redis/Celery infra · custom (non-Django-Admin) admin panel · Regenerate/Share message actions · streamed `/api/chat/` delivery (architecture-ready only).

---

## Cross-Phase Dependency Summary

```
1. Project Setup
      ↓
2. Database & Backend Foundation  (needs: 1)
      ↓
3. Authentication & Authorization  (needs: 2 — User model)
      ↓                     ↘
4. Core Backend APIs          6. Frontend Foundation
   (needs: 3)                    (needs: 3 — can run parallel to 4/5)
      ↓                     ↙
5. External API/Service Integrations  (needs: 4)
      ↓                     ↙
7. Feature Development  (needs: 5 backend chain + 6 frontend shell)
      ↓
8. Frontend–Backend Integration  (needs: 7)
      ↓
9. Testing & Bug Fixing  (needs: 8)
      ↓
10. Final Verification & Deployment  (needs: 9)
```

Phase 6 (Frontend Foundation) is the one phase that can genuinely run in parallel with Phases 4–5, since it only needs working auth (Phase 3) — this is the most useful parallelization point for AI-assisted development with limited sequencing overhead.

---

*End of Development_Roadmap.md*
