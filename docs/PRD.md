# City Companion — Product Requirements Document (PRD)

**Status legend used throughout this document:**
- ✅ **Confirmed** — explicitly decided in the source conversations
- 🟡 **Proposed** — suggested and generally accepted, but not fully locked
- 🔵 **Future** — explicitly deferred to a later version
- ❌ **Rejected** — explicitly ruled out
- ⬜ **TBD** — not addressed in the conversations; needs a decision before/during build

---

## 1. Product Overview & Vision

**City Companion** is an AI-powered personal city companion. It is not a directory/listing website — it is a conversational system where a user describes a real-life need (a place to stay, food, healthcare, an emergency, etc.) in natural language, and the system understands the requirement, searches real data, ranks options against the user's actual constraints, explains *why* an option is best, and lets the user act immediately (call, get directions, visit a website).

**Core product principle (✅):**
> "User ko information search nahi karni hai; user ko apni problem batani hai, aur system ko us problem ka practical solution dena hai."
> (The user shouldn't have to search for information — they state their problem, and the system provides a practical solution.)

**Product positioning (✅):** Do not market this as "an AI chatbot." Position it as *"Your personal guide to any city"* / *"Don't search the city. Just tell City Companion what you need."* AI is backend technology; the product is the outcome (a decision made easy).

**Interaction model (✅):** `Tell → Understand → Compare → Recommend → Act`
1. **Tell** — user states the problem in free-form natural language (any language/mix).
2. **Understand** — system extracts city, location, purpose, budget, preferences, urgency, requirements.
3. **Compare** — system searches and compares available real options.
4. **Recommend** — system ranks and explains the best options.
5. **Act** — user can immediately call, get directions, open a booking/website link, save, or compare — without leaving the chat.

---

## 2. Problem Statement

New arrivals in a city (students, workers, travelers, families, or people in emergencies) face **information overload** and **decision fatigue**. Existing tools (Maps, listing sites, generic search) hand back long lists of unranked, unexplained options and force the user to do all filtering, comparison, and decision-making themselves — with no memory of what they already said and no personalized reasoning about tradeoffs (e.g., "cheaper but far" vs "slightly pricier but close").

City Companion's differentiator (✅): **"Best" is not the highest-rated option — "Best" is the option that best fits *this* user's specific budget, location, and priorities.**

---

## 3. Target Users (✅, inferred personas — AI infers silently, no explicit mode-switch UI required)

| Persona | Primary Needs |
|---|---|
| 🎓 Student | PG/hostel, mess/food, affordable stay near college, transport |
| 👷 Worker/Employee | Room/PG, transport, food, local services |
| 🧳 Traveler | Hotel, food, attractions, transport |
| 👨‍👩‍👧 Family | Hotel, hospital, food, safe locations |
| 🚨 Emergency user | Hospital, police, ambulance, emergency services |

The system should **not** force explicit persona selection via a menu — intent/persona should be inferred from the natural-language message (✅). The first-time "New to City" onboarding flow is deferred to Version 2 (🔵; see §9).

---

## 4. Goals

1. Replace generic search with **conversational, requirement-driven recommendations**.
2. Provide **ranked, explained** results instead of raw unranked lists.
3. Let users **act immediately** on a recommendation (call/directions/website/save/compare) inside the chat.
4. Maintain **conversation memory** so users are never asked to repeat information already given.
5. Be **honest about data quality** — never confidently fabricate prices/availability (trust layer).
6. Ship a **focused MVP** (limited city/category scope) before expanding (✅ explicit strategy, see §12).

---

## 5. Core Features

### 5.1 Confirmed for MVP (✅)
- Natural language, chat-first interface (any category — accommodation, food, healthcare, cafes, local essentials).
- Intent detection (what category of need this is) without a manual category menu.
- Requirement extraction (city, location, budget, food, distance priority, urgency, etc.) from free text.
- Conversational clarification **only when necessary** — the system should make a reasonable assumption and state it (e.g., "I'm assuming ₹5,000/month for accommodation. You can change this.") rather than over-asking.
- Location detection (with permission) + manual city/location override ("I'm in Kanpur but searching in Lucknow").
- Real data search (own database + external places source — not LLM-invented data).
- Filtering against extracted requirements.
- **Ranking** via a deterministic recommendation/scoring engine (not left to the AI alone).
- AI-generated **natural-language explanation** of why each option was ranked where it was ("Why this?").
- Structured, rich AI responses (not plain text) — recommendation cards, comparison tables, alerts, maps, etc.
- Action layer on every recommendation: **View Details, Directions, Call, Website/Booking link, Save**.
- Conversation memory within a chat (no repeated questions).
- Conversation history (list of past chats, auto-titled).
- Saved Places ("❤️ Save").
- Feedback loop: 👍/👎 with reason ("Too expensive," "Too far," "Not available," "Wrong information," "Other").
- "Not found" handling that offers closest alternatives and actionable suggestions (e.g., "increasing budget by ₹500 unlocks better options") instead of a dead-end "No results."
- Emergency mode: fast-path to nearest hospitals/emergency services, directions, call, share location, with a clear disclaimer to contact local emergency services directly. **Zero tolerance for hallucination in emergency responses.**
- Hindi / English / Hinglish understanding and matching-language response.
- Mobile-first responsive UI.
- Basic admin panel for data management (see §10).
- Loading/"AI thinking" states, error states, empty states.

### 5.2 Version 2 / Near-future (🔵)
- Voice input.
- Explicit "Compare" feature (select 2–3 places → comparison table + a pick with reasoning).
- Map embedded inside the chat panel (not just external map links).
- Advanced saved preferences / personalization profile.
- Full multilingual support beyond Hindi/English/Hinglish.
- Recommendation-quality learning from feedback data.
- Advanced admin analytics (most-requested categories, common queries, no-result-rate).
- Streaming AI responses (also listed as an MVP-adjacent architectural requirement — see TRD).

### 5.3 Future / Long-term (🔵)
- Full trip planning.
- Multi-day relocation assistance.
- Public transport planning.
- Personalized "city profile."
- Community reviews.
- Smart notifications.
- Support for more cities/categories.
- More advanced agentic workflows.

### 5.4 Explicitly Rejected / Avoided (❌)
- A plain directory/listing website with search/filter UI as the primary product.
- AI generating raw HTML/CSS/arbitrary UI (uncontrolled rendering) — ❌ security/maintainability risk.
- AI treated as the live data source for prices/availability (LLM ≠ data source).
- AI having 100% authority over ranking (must be a deterministic engine + AI explanation).
- A cluttered navigation bar (10+ links), heavy corporate "About/Services/Features/Blog/Team/Gallery" page sprawl.
- Sorting/recommending purely by star rating regardless of user budget/fit.
- Fake/simulated progress or loading stages not reflecting real backend state.
- Launching with "every city + every service" simultaneously (too broad for MVP).

---

## 6. Functional Requirements

### 6.1 Conversational Understanding
- FR1: System must parse free-form, mixed-language (Hindi/English/Hinglish) text into structured requirements (category, city, location/landmark, budget, food, distance priority, urgency, other preferences).
- FR2: System must apply reasonable default assumptions when information is missing, and state the assumption to the user, rather than blocking with mandatory clarification questions.
- FR3: System must retain context across a conversation (city, budget, food requirement, priorities) so the user is never asked to repeat previously given information.
- FR4: System must support mid-conversation requirement changes (e.g., "actually, location matters more than price now") and re-rank accordingly.

### 6.2 Search & Recommendation
- FR5: System must search real place data (internal DB and/or external places source) filtered by extracted requirements — never invent places, prices, or availability.
- FR6: System must score/rank candidate results using a defined weighted formula (e.g., budget match, requirement match, distance, rating, availability/data quality — see TRD §Recommendation Engine).
- FR7: System must present a ranked list (best first) with a clear "why recommended" explanation per item.
- FR8: When no strong match exists, system must present the closest alternatives and, where useful, a concrete suggestion (e.g., budget adjustment) rather than a bare "no results" message.
- FR9: User must be able to request re-ranking by stating a changed priority (e.g., "budget over distance").

### 6.3 Result Presentation & Actions
- FR10: Each recommended place must support action buttons: View Details, Directions, Call, Website/Booking (if available), Save.
- FR11: User must be able to view full place details (amenities, reviews if available, contact) without leaving the current chat flow (drawer/bottom-sheet pattern).
- FR12: User must be able to compare 2–3 selected places in a comparison table with a system-picked recommendation and reasoning (🔵 V2 for explicit "Compare" UI; comparison table rendering itself is MVP-capable as a response type).
- FR13: System must show a data trust indicator (source, last-updated, verified/unverified) and a price/availability disclaimer where data may be stale.

### 6.4 Emergency Handling
- FR14: A message indicating an emergency (e.g., accident, medical emergency) must trigger an immediate, minimal-friction emergency response: nearest hospitals, emergency numbers, directions, call, share-location — without unrelated conversational preamble.
- FR15: Emergency responses must never hallucinate facility details; must include a disclaimer to contact local emergency services directly.

### 6.5 Personalization & History
- FR16: Logged-in users must have persistent conversation history, auto-titled by content (not raw first message).
- FR17: Logged-in users must be able to save/unsave places and view them grouped (e.g., by category).
- FR18: Logged-in users must be able to give 👍/👎 feedback with an optional reason on any recommendation.
- FR19: A user must never be able to access another user's conversations or saved data (data isolation).

### 6.6 Onboarding & Empty States
- FR20: New/first-time visitors see a landing page explaining the product in one screen (hero + "how it works" + a demo conversation).
- FR21: **Version 2 (🔵):** First-time "New to City" onboarding may ask "what brings you here?" (Study/Work/Travel/Moving) with a mandatory **Skip & Chat** option.
- FR22: A new chat with no messages shows a prompt ("What can I help you find?") with example quick-prompt chips that pre-fill (not force) the input.

---

## 7. User Flows / Stories

### 7.1 Primary flow — Accommodation search
> As a new student in a city, I want to describe my budget and proximity needs in plain language, so I get ranked PG/hostel options with a clear recommendation and can act (call/directions) immediately.

1. User opens Chat (first time: via landing page CTA "Start Exploring").
2. User types (in Hindi/English/Hinglish): "I need a PG near my college under ₹6,000, food included."
3. System shows a lightweight "thinking" indicator reflecting real backend stages (e.g., understanding → finding → ranking).
4. System returns: ranked recommendation cards (image, price, rating, distance, tags, "why recommended," match indication), followed by a short natural-language pick-of-the-litter recommendation.
5. User taps "Directions" on the #1 result, or asks a follow-up ("show cheaper options") via a suggested-action chip.
6. User saves a result for later.
7. Conversation is auto-saved to history with a generated title (e.g., "PG near college").

### 7.2 Emergency flow
1. User types: "Mera accident ho gaya hai." ("I've had an accident.")
2. System immediately (no small talk) shows: nearest hospitals, emergency numbers, directions, call, share-location, and the emergency-services disclaimer.

### 7.3 Budget-not-met flow
1. User asks for something under a budget that yields no strong match.
2. System explains it couldn't find a strong match at that budget, shows closest alternatives with their price delta, and suggests the budget increase that unlocks better options.

### 7.4 Priority-change flow
1. After receiving results, user says "location is more important than price."
2. System re-ranks and explicitly states the recommendations were updated based on the new priority.

### 7.5 Returning user flow
1. Logged-in user opens the app; sees sidebar with recent conversations, Saved Places, Profile.
2. User resumes an old conversation; prior structured responses render again (rich cards preserved, not just raw text).

---

## 8. UI/UX Requirements

### 8.1 Overall Design Principles (✅)
- **Chat page is the main product** (not a dashboard). Recommended effort split: ~20% landing page, ~70% chat experience, ~10% supporting pages.
- Dark theme by default — but **not flat pure black**: use deep black/charcoal, dark gradients, subtle glass surfaces, soft borders, atmospheric glow. Avoid "cheap AI template" look from overuse of neon/pure black.
- Landing page: high, cinematic animation is acceptable (animated background, particles, glow, smooth text reveal, magnetic CTA).
- Chat page: animation must be **subtle/purposeful** (message fade/slide-in, thinking indicator, card entrance, hover states) — not distracting, since it's used repeatedly.
- Navigation kept minimal: Home / How It Works / Contact / Login-Signup on the public site; Logo / New Chat / History / Profile inside the app. No sprawling nav (About/Services/Blog/FAQ/Team/Gallery explicitly avoided).
- Contact is a small section on the landing page, not a separate page.

### 8.2 Landing Page Structure (✅)
1. Hero — one strong headline (e.g., "New city? Just tell us what you need.") + CTA "Start Exploring →".
2. How it works — 3–4 simple steps (Tell → We find → You decide).
3. Live demo — an animated example conversation showing the actual product experience (critical for instant comprehension).
4. Small feature strip (e.g., Budget-aware · Location-aware · Personalized · Action-ready) — not a large feature-card grid.
5. Small contact section.
6. Minimal footer.

### 8.3 Chat Application Structure (✅)
- Header: logo, current city/location indicator, New Chat, Profile — minimal.
- Sidebar (desktop) / drawer (mobile): New Chat, grouped conversation history (Today/Yesterday/Older), Saved Places, Profile/Settings link.
- Empty state: "What can I help you find?" + optional quick-prompt chips that populate (not force) the input.
- Message area: user messages right-aligned; AI messages rendered via the rich response system (not a plain bubble) — supports headings, lists, tables, cards, quotes, alerts, images, links, maps, comparisons.
- AI responses show visual hierarchy (headings/sections), not one giant paragraph.
- Composer: multiline, auto-expanding input; Enter to send, Shift+Enter for newline; mic icon (🔵 V2 voice input); attachment icon reserved for future use; disabled/loading states handled.
- Suggested follow-up action chips appear dynamically based on the AI's last response (e.g., "Show cheaper," "Closer to station," "Compare").
- Message footer actions: Copy, 👍/👎 (can be hover-revealed to reduce clutter). Regenerate is 🔵 Version 2.
- Auto-scroll only when the user is already at the bottom; otherwise show a "↓ New response" affordance instead of forcibly scrolling.
- Place details open in a right-side drawer (desktop) or bottom sheet (mobile) — not a full page navigation, to preserve chat context.
- Long conversations must not render all messages at once (windowing/virtualization consideration) and should preserve scroll position.

### 8.4 Mobile-First Requirement (✅)
Design and build for mobile first, since the target user is typically new to a city, on their phone, possibly traveling, and needs location services. Desktop layout is a secondary enhancement (e.g., an optional Chat | Map side-by-side panel).

### 8.5 States Every Component Must Define (✅)
Loading, Success, Empty, Error, Disabled, Hover, Active, Mobile — "happy path only" design is explicitly considered incomplete.

### 8.6 Accessibility (✅)
Keyboard navigation, proper focus states, semantic buttons, alt text, sufficient contrast, screen-reader labels, and respecting the OS "reduce motion" setting — especially important given the animation-heavy design direction.

---

## 9. AI / Location-Based Features

- **Requirement extraction from free text**, including budget interpreted contextually (per-month for PG, per-night for hotel, per-day for food) with clarification only when genuinely ambiguous (✅).
- **Conversational memory** across a session so context accumulates instead of resetting per message (✅).
- **Priority-aware re-ranking** — user can state that one factor (price/distance/rating) matters more, and the system adjusts weighting and explains the change (✅).
- **Location awareness**: use device location (with permission) as default context; allow explicit override to another city/area; never require the user to manually state their location every time once granted (✅).
- **"Why this?" explanation** for every top recommendation, grounded only in the actual filtered data, not invented reasoning (✅).
- **Trust/anti-hallucination requirement**: AI must not confidently state unverified prices/availability; must flag when data may be stale and encourage confirmation before booking (✅ — treated as a MUST HAVE, not optional polish).
- **Structured (non-hallucinated) response types**: the AI chooses from a fixed set of supported content/component types (text, table, card, comparison, map, alert, action) rather than freely generating arbitrary UI (✅).
- **Emergency-mode intent detection** with zero tolerance for hallucinated facility data (✅).
- Voice input (🔵 V2) and the first-time "New to City" onboarding "what brings you here?" flow (🔵 V2, with mandatory skip).

---

## 10. Admin Requirements

**MVP admin capability (✅):**
- Manage Places data: add/edit/verify places, categories, city coverage.
- Manage users (basic, via Django Admin initially).
- View user feedback (👍/👎 + reasons).
- View conversations (for debugging/data quality, subject to privacy considerations — see NFRs).

**Version-2+ admin capability (🔵):**
- Custom (non-Django-Admin) admin dashboard.
- AI monitoring: failed searches, low-quality/low-confidence recommendations, frequently-requested-but-unavailable places.
- Analytics: most-requested categories/cities, common query patterns, no-result rate, average response time — explicitly valuable for identifying data gaps (e.g., "35% of users ask for PGs but 60% of PG searches return no result").
- Content management for city guides / help info / emergency info.

**Tooling for MVP admin (✅):** Django's built-in admin is explicitly acceptable and recommended for the MVP; a custom React admin UI is deferred.

---

## 11. Non-Functional Requirements

| Category | Requirement | Status |
|---|---|---|
| **Data honesty** | Never present fabricated prices/availability as fact; always show source/verification/last-updated where relevant | ✅ |
| **Performance** | Avoid heavy backgrounds/videos, excessive particles, unnecessary DOM animation; use lazy loading, optimized images, skeleton loaders, code splitting | ✅ |
| **Reliability** | Every screen/component must define loading, empty, and error states; graceful fallback if AI or external data source is unavailable (fall back to raw DB search + a message explaining AI is temporarily unavailable) | ✅ |
| **Scalability of conversation** | Long chats (e.g., 500+ messages) must not degrade UI performance; scroll position preserved; "jump to latest" affordance | ✅ |
| **Security & Privacy** | Auth required for personal data; strict data isolation between users; no API keys ever exposed client-side; location permission handled explicitly | ✅ |
| **Accessibility** | See §8.6 | ✅ |
| **Responsiveness** | Mobile-first; must work across mobile/tablet/desktop breakpoints | ✅ |
| **Localization** | Hindi/English/Hinglish understanding and response, MVP; broader multilingual is future | ✅ / 🔵 |
| **Cost control** | Avoid sending unbounded data (e.g., entire place database) to the AI; pre-filter to a small relevant candidate set before AI ranking/explanation | ✅ |
| **Uptime/SLAs** | Not discussed | ⬜ TBD |
| **Data retention policy** | Not discussed in detail beyond "user data deletion option" being listed as a security minimum | ⬜ TBD (deletion capability ✅ required; retention period TBD) |

---

## 12. MVP Scope vs Future Scope

### 12.1 Explicit MVP Strategy (✅)
> "Version 1 mein har possible city aur har possible service mat implement karo." — Do not implement every city/every service in v1.

- **City scope for MVP:** limited to one strong city for testing (⬜ TBD which specific city — conversations reference Kanpur only as an illustrative example, not a confirmed launch city).
- **Category scope for MVP (✅):**
  1. 🏠 Accommodation (PG/hostel/hotel)
  2. 🍽 Food
  3. 🏥 Healthcare
  4. ☕ Cafes
  5. 📍 Local essentials

### 12.2 MVP ("Must Have — Version 1") Feature Checklist (✅)
- Animated landing page
- Login/signup
- Chat-first interface, natural language input
- Location detection
- Budget understanding
- Intent detection
- Places search
- Recommendation ranking + reason ("why this")
- Structured AI responses / dynamic cards
- Call, Directions, Website/booking link actions
- Conversation history
- Save places
- Feedback (👍/👎)
- Mobile-responsive UI
- Loading/"AI thinking" states
- Error/fallback handling
- Basic admin/data management

### 12.3 Version 2 (🔵)
Voice input · Compare places (explicit UI) · Map inside chat · Advanced preferences · Personalized ranking weighting · City onboarding flow · Broader multilingual support · Feedback-driven ranking improvement · Advanced analytics.

### 12.4 Future / Long-Term (🔵)
Full trip planning · Multi-day relocation assistance · Public transport planning · Personalized city profile · Community reviews · Smart notifications · Additional cities/categories · Advanced agentic workflows.

---

## 13. Open Questions / TBD

- ⬜ Which specific city (or cities) will be the actual MVP launch scope?
- ⬜ Data retention period for conversations/messages.
- ⬜ SLA/uptime targets.
- ⬜ Monetization model (not discussed in any conversation — assume none for this personal project unless decided otherwise).
- ⬜ Exact wording/branding/name finalization beyond "City Companion" (used consistently, treated as confirmed working name).
