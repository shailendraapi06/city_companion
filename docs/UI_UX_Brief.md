# City Companion — UI/UX Brief.md

**Purpose:** A concise, implementation-oriented design brief for how City Companion should look, feel, and behave. Derived from `PRD.md` §8 (UI/UX Requirements) and `TRD.md` §3 (Frontend Structure) — no new visual direction or components introduced beyond what those documents establish.

**Legend:** ✅ Confirmed · 🟡 Proposed (design direction, not fully locked) · 🔵 Future/Version 2 · `[TBD]` unresolved, decide during implementation

---

## 1. Design Principle

City Companion is not a listing/dashboard website — it's a **conversational product**. The single most important UI decision underlying this brief:

> The chat is not a "message string renderer." It is an **AI Response Rendering Engine** — every AI reply is parsed into structured blocks (text, cards, tables, alerts, maps, actions) and rendered as real UI, not one long paragraph. ✅

Everything below exists to serve that principle: a calm, dark, purposeful interface that gets out of the way of the conversation, and rich components that make recommendations scannable and actionable at a glance.

---

## 2. Visual Language

### 2.1 Theme ✅
- **Dark by default.** Not pure `#000000` everywhere — use deep black / charcoal / dark gradients, subtle glass surfaces, soft borders, and atmospheric glow. Flat pure-black + neon is explicitly rejected as looking like a "cheap AI template."
- Accent gradients, subtle particles, and glow are allowed but must stay **purposeful**, not decorative noise.
- Exact color tokens, type scale, and spacing system: `[TBD]` — not specified in source conversations. Recommend defining a small design-token set (background layers, one accent gradient, semantic colors for info/success/warning/error) before building components.

### 2.2 Animation intensity — differs by surface ✅

| Surface | Animation level | Examples |
|---|---|---|
| Landing page | Heavy, allowed | Animated background, floating particles, glowing gradients, smooth text reveal, magnetic CTA |
| Chat page | Subtle only | Message fade/slide-in, AI thinking indicator, card entrance, hover states, map transitions |
| Buttons/cards | Micro-interaction only | Hover, slight scale, glow on primary CTA |

**Rule:** excessive animation inside the chat irritates rather than delights — keep chat-surface motion restrained. ✅ A single, shared animation system should drive all of this rather than ad-hoc per-component animation. 🟡

### 2.3 Accessibility ✅
Required, not optional, despite the animation-heavy direction:
- Keyboard navigation, visible focus states, semantic buttons/roles
- Alt text on images, sufficient color contrast
- Screen-reader labels
- Respect OS "Reduce Motion" setting — animation must degrade gracefully when this is on

---

## 3. Landing Page

### 3.1 Purpose ✅
The landing page's only job is to get a visitor to understand the product in seconds and click through to chat. It is a convincer, **not** the product. Recommended effort allocation: ~20% landing / 70% chat / 10% supporting pages. 🟡

### 3.2 Structure (kept intentionally compact) ✅
1. **Hero** — headline + subtext + primary CTA ("Start Exploring")
2. **How it works** — 3–4 short steps (Tell us → We understand → We find → You decide)
3. **Live example conversation** — an animated/static demo chat exchange shown directly on the page (considered the single most effective section for instant comprehension)
4. **Small feature strip** — e.g., *Budget-aware · Location-aware · Personalized · Actionable* (not a large feature grid)
5. **Minimal contact section** — no separate Contact page
6. **Minimal footer**

### 3.3 Navigation ✅
Keep it to: `Home · How It Works · Contact · Login/Sign Up`.
Explicitly avoid a large nav (no About/Services/Features/Blog/Resources/FAQ/Team/Gallery) — this is a product landing page, not a corporate site.

---

## 4. Chat Application Shell

### 4.1 Layout ✅

**Desktop:**
```
┌─────────────────────────────────────────┐
│ Header: Logo · City/Location · New Chat · Profile │
├────────────┬──────────────────────────────┤
│  Sidebar    │        Chat Area             │
│  (history,  │  (messages + rich blocks)    │
│  saved,     │                               │
│  profile)   ├──────────────────────────────┤
│             │       Message Composer       │
└────────────┴──────────────────────────────┘
```

**Mobile:** Sidebar collapses to a drawer; details open as a bottom sheet; map (when embedded, 🔵) opens full-screen. Mobile-first is a stated priority since the target user is likely out in a new city on their phone, actively using location. ✅

### 4.2 Header ✅
Minimal: logo, current city/location indicator, "New Chat," Profile. No clutter.

### 4.3 Sidebar / History ✅
- `+ New Chat`
- Conversations grouped: Today / Yesterday / Older
- Conversation titles should be auto-summarized (e.g., "PG near Kanpur college"), not the raw first message 🟡
- Saved Places, Profile/Settings at the bottom

### 4.4 Empty State ✅
Center message: **"What can I help you find?"** with subtext, plus quick-prompt chips (e.g., *🏠 Find a place to stay · 🍽 Find affordable food · 🏥 Find a nearby hospital*). Chips **pre-fill** the input — they never force a selection; free typing is always available.

### 4.5 Composer ✅
- Multiline, auto-expanding
- Enter to send, Shift+Enter for newline
- Voice input button — placeholder now, 🔵 functional later
- Attachment button — future-ready placeholder, 🔵
- Contextual quick-action chips after an AI response (e.g., *Show cheaper · Closer · Compare · More options*) 🟡

---

## 5. AI Message & Response Rendering

### 5.1 Core requirement ✅
Every AI response is a sequence of typed blocks, each mapped to a specific component via a **component registry** (not one giant text bubble):

`text/markdown · heading · list · table · link · image · blockquote · code block · alert (info/success/warning/error) · place/recommendation card · comparison table · map · action buttons`

New categories in the future (e.g., "transport") should only require a new component + registry entry — never a rewrite of the chat UI. ✅

### 5.2 Explicitly rejected rendering approach ❌
AI-generated raw HTML rendered via `dangerouslySetInnerHTML` — rejected for XSS risk, uncontrolled UI, and maintainability. Correct approach: sanitized Markdown parsing + structured JSON → React components (Hybrid Renderer).

### 5.3 Message layout ✅
- AI content column should be readable width — not full screen width.
- Visual hierarchy inside a response: heading → short intro text → ranked cards → optional comparison table → closing recommendation/explanation text → any warning/alert.

### 5.4 Recommendation card — anatomy ✅
Each card should show, at minimum:
- Rank position (e.g., `#1 Best Match`, `#2`, `#3` — avoid over-using medal emojis on every card)
- Price, rating, distance
- **"Why this?"** — a short checklist explaining the match (within budget / near destination / food available / highly rated)
- Data trust signals where relevant: source / last updated / verified — with a caveat like "⚠️ Price may have changed — confirm before booking" when data isn't fresh
- Action buttons: **View Details · Directions · Call · Website (if available) · Save**

A generic `PlaceCard` (category-aware) is the recommended pattern over a bespoke component per category. 🟡

### 5.5 Comparison table ✅
When the AI or user requests a comparison, render an aligned table (Price / Distance / Food / Rating rows) rather than restating it in prose, followed by a short natural-language pick with reasoning.

### 5.6 Long result sets ✅
Show a limited top set (e.g., top 5) with a **"Show more"** expansion rather than flooding the chat with everything at once.

### 5.7 Details view ✅
"View Details" opens a **drawer (desktop)** or **bottom sheet (mobile)** — not a full page navigation — to preserve chat context.

---

## 6. Conversational States & Feedback

### 6.1 AI "thinking" state ✅
Avoid a generic "typing…" — show what's actually happening if backend stages are available (e.g., "Understanding your request → Finding nearby options → Ranking the best matches"), but never fabricate fake progress steps that don't reflect real backend stages.

### 6.2 Streaming ✅ (target) / 🔵 timing
Text should ideally stream progressively rather than arrive as one blocking string, and the renderer must tolerate **incomplete** structured content mid-stream, finalizing formatting once complete. Transport/timing `[TBD]` per TRD — not required to complete MVP flows.

### 6.3 Auto-scroll behavior ✅
Auto-scroll only when the user is already at the bottom of the chat; otherwise show a **"↓ New response"** affordance instead of yanking their scroll position.

### 6.4 Feedback controls ✅
Minimal footer on AI messages: 👍 / 👎 (with an optional reason: too expensive / too far / not available / wrong info / other), Copy. **Regenerate 🔵 Future.** Controls can be hover-revealed to avoid clutter.

---

## 7. Required UI States (per component)

Every relevant component/page must define all of the following — not just the happy path: ✅

```
Loading · Success · Empty · Error · Disabled · Hover/Active · Mobile
```

Specific examples called out in source material:
- **No results:** never a bare "No results found" — show closest alternatives + an actionable suggestion (e.g., "increasing your budget by ₹500 unlocks better options").
- **Generic error:** "Something went wrong" with **Try Again** / **Start New Chat** — never expose technical error detail to the user.
- **AI unavailable:** system still returns basic database results with a message that AI is temporarily unavailable, rather than a hard failure.

---

## 8. Location UI ✅

- Location capture happens via permission request, not by asking "Where are you?" on every turn.
- Always show a visible, editable indicator: **"📍 Using current location — Change."**
- Manual city/location override always takes precedence once set (supports cross-city queries, e.g., searching Lucknow while physically in Kanpur).
- Result cards show a distance value + "View on Map"/"Directions" action. **MVP uses external map/directions deep links; a fully embedded interactive map panel inside chat is 🔵 Version 2.**

---

## 9. Emergency UI ✅

When an emergency intent is detected, skip normal conversational pacing: surface nearest hospitals/emergency contacts immediately, with Directions/Call/Share Location actions and a clear disclaimer to contact local emergency services. No decorative animation or lengthy explanation in this flow — clarity and speed over polish.

---

## 10. Profile, Saved Places & Settings

### 10.1 Profile ✅
Minimal: name, email, location preference, links to Saved Places and Chat History, Preferences, Logout. No unnecessary social-profile-style page.

### 10.2 Saved Places ✅
Grouped by category (Accommodation / Food / Hotels / …), each showing the same card pattern used in chat results.

### 10.3 Settings ✅
Kept small: theme (dark is default, so may be optional), language, location permission, notifications, delete conversations, delete account.

---

## 11. Interaction Patterns to Avoid ❌

Explicitly called out as things **not** to do:
- 10+ navigation links / huge footer
- Generic dashboard-style layout for the chat page
- Chat bubbles used everywhere indiscriminately (structured blocks should replace plain bubbles for rich content)
- Excessive neon or excessive animation, especially inside chat
- Huge sign-up/profile forms
- AI response rendered as one giant text block
- Fixed/rigid response templates that can't accommodate new block types
- AI-generated raw HTML
- Fake/generic loading states not tied to real backend progress
- Overloaded cards (20 buttons on one card)
- Unnecessary extra pages

---

## 12. Component Inventory (for design/build reference)

Grouped as referenced in TRD §3.2 — listed here for design handoff, not re-specified architecturally:

```
Layout:    AppShell, Navbar, Sidebar, MobileNav, Footer
Chat:      ChatWindow, ChatHeader, ChatMessages, Message,
           UserMessage, AIMessage, MessageActions, Composer
Renderer:  MarkdownRenderer, TableRenderer, CodeRenderer,
           LinkRenderer, ImageRenderer, AlertRenderer, ComponentRenderer
Places:    PlaceCard (generic/category-aware), PlaceDetails,
           RecommendationCard, ComparisonTable
Common:    Button, Modal, Drawer, BottomSheet, Tooltip,
           Skeleton, EmptyState, ErrorState, LoadingState
```

---

## 13. Open Design Questions `[TBD]`

Not resolved in source conversations — flag for a design decision before/during build:
- Concrete color palette, typography scale, spacing/grid tokens
- Exact icon set / illustration style
- Precise animation timing/easing values
- Exact visual treatment of the computed match score (e.g. percentage, badge, or "Why this?" presentation) [TBD]; the underlying computed match score is part of the MVP and must never be fabricated
- Final composer affordances beyond text (attachment file types, voice UI details)

---

*End of UI/UX Brief.md*
