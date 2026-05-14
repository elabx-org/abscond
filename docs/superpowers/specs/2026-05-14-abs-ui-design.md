# abs-ui Design Specification

**Date:** 2026-05-14  
**Status:** Approved — ready for implementation planning

---

## 1. Overview

`abs-ui` is a standalone modern web client for the [Audiobookshelf](https://github.com/advplyr/audiobookshelf) server. It replaces the built-in web UI entirely — both the listener-facing features and the full admin panel — by connecting to an existing ABS instance via its public REST API and Socket.io.

The visual design faithfully replicates [Absorb](https://github.com/pounat/absorb), a Flutter mobile app built on Material3. The goal is to bring that same aesthetic — dark-first surfaces, dynamic cover-derived accent colours, glass/blur effects — to the web, with responsive support from mobile through desktop.

### Out of scope

- Modifying the Audiobookshelf server itself.
- Any server-side rendering; this is a fully static SPA.

---

## 2. Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) | Modern reactive, strong ecosystem |
| Build | Vite 5 | Fast HMR, first-class Vue support |
| UI library | Vuetify 3 (Material3) | Matches Absorb's M3 foundation; provides bottom-sheet, nav, cards |
| PWA | `vite-plugin-pwa` | Service worker + web app manifest |
| Cover colour | `color-thief` or `node-vibrant` | Web equivalent of Flutter `palette_generator` |
| State | Pinia | Lightweight, Vue 3-native |
| Router | Vue Router 4 | |
| HTTP | Axios | REST calls to ABS API |
| Realtime | Socket.io-client | ABS server events (progress, library scan) |
| Deployment | Docker — nginx serving static build | Single container, user-configurable base URL |

### ABS API base

All requests proxy through the ABS server: `{ABS_HOST}/api`. Auth via JWT stored in Pinia and `localStorage`. Token is passed as `Authorization: Bearer <token>` on all requests.

---

## 3. Design System

### Colours

Base surface: `#0E0E0E`. Five M3 tonal levels: `#000000`, `#080808`, `#0E0E0E`, `#111111`, `#141414`.

**Dynamic accent** — extracted per item from cover art:
1. Run `color-thief`/`node-vibrant` on the cover `<img>` after load.
2. Prefer vibrant → dominant → first dominant colour.
3. Expose as CSS variable `--accent` on the card/sheet scope.
4. All interactive elements (primary button, progress fills, tappable links, selected states) use `--accent`.

### Typography

System UI stack: `system-ui, -apple-system, sans-serif`. No custom font — matches Absorb's system font approach.

| Role | Size | Weight |
|---|---|---|
| Screen title | 18px | 700 |
| Card title | 13–15px | 700 |
| Body / meta | 10–12px | 400–500 |
| Chips | 8.5–9px | 400 |

### Glass / blur

- Bottom nav bar (mobile): `background: rgba(14,14,14,0.75)` + `backdrop-filter: blur(20px)`
- Library search overlay: `backdrop-filter: blur(20px)`
- Cover pillarbox fill (player card): `backdrop-filter: blur(24px)`

Cover bleed on sheets/cards is **pre-rendered** (the cover image itself blurred as a background layer, not real-time backdrop-filter) — this matches how Absorb handles it.

### Iconography

Use SF Symbols–style icons where available via Material Symbols, fall back to emoji for prototype. Accent colour on active/selected states.

---

## 4. App Shell

### Mobile (< 768px)

- **Bottom navigation bar** — fixed, 5 tabs: Home, Library, Player, Search, Settings.
  - `position: fixed; bottom: 0; width: 100%`
  - `background: rgba(14,14,14,0.75); backdrop-filter: blur(20px)`
  - Active tab: accent colour icon + label.
  - Player tab: animated 5-bar wave icon when audio is playing.
- **Scroll-to-hide behaviour** on Home and Library tabs: hide nav on scroll-down (>40px), reveal on scroll-up.
- **Safe area inset** padding on iOS: `padding-bottom: env(safe-area-inset-bottom)`.

### Tablet (768px – 1279px)

- **Navigation rail** — left-side, ~72px wide, icons + short labels.
- Content fills remaining width.

### Desktop (≥ 1280px)

- **Navigation drawer** — ~200px wide, full labels + section groupings.
- Mini-player pinned to the bottom of the drawer.

### Page transitions

Horizontal slide on route changes (Vue Router `<transition>`).

---

## 5. Screens

### 5.1 Login

- Full-screen dark background.
- ABS server URL input + username/password fields.
- "Sign in" button in accent colour.
- On success: stores JWT and user object in Pinia, redirects to Home.
- No OAuth; ABS uses username/password only (or token for API key mode).

### 5.2 Home

**Sections (vertical scroll):**

1. **Continue Listening** — horizontal scroll row of portrait cards (square cover + progress bar + title). Sourced from `/api/me/items-in-progress`.
2. **Recently Added** — horizontal scroll row, same portrait card format.
3. **Discover (library shuffle)** — horizontal scroll row.
4. **Your Stats hint bar** — compact inline callout showing total hours listened.

**Portrait card anatomy:**
- Square cover image (aspect-ratio 1:1), `object-fit: cover`
- 3px accent progress bar at bottom of cover
- Title below (12px, 2-line clamp)
- On tap → Book Detail sheet

**Section headers:** icon + label + `›` arrow (taps to full list view).

**Desktop layout:** sidebar drawer (200px) with mini-player; content in remaining area; wider grid for card rows.

### 5.3 Library

**Default view:** Responsive grid of portrait covers.
- Columns: `Math.floor(containerWidth / 130)` clamped to 3–10.
- Each cell: cover + title (2-line clamp) + author (1-line clamp).

**Search:** Floating search bar — tapping expands a full-screen overlay with `backdrop-filter: blur(20px)` background. Results update live as user types.

**Sort / filter row:** Horizontal chips below search bar — Sort, Filter, View toggle (grid/list/series). These call `/api/libraries/{id}/items` with the relevant query params.

**Series view:** Stacked-covers card (up to 3 covers offset, count badge), series name, book count.

**List view:** Title + author + duration rows, cover thumbnail on left.

### 5.4 Player

The full-screen now-playing view.

**Card carousel:**
- Cards sized at 92% viewport width; adjacent cards peek ~4% on each side.
- CSS `scroll-snap-type: x mandatory` for swipe-to-skip.
- Each card:
  - **Background:** cover image rendered at full card size + `filter: blur(24px) brightness(0.7) saturate(1.3)` — this is the cover "bleed". Applied via `<img>` + `object-fit: cover` in an absolutely-positioned background layer.
  - **Gradient scrim:** `linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.80) 100%)` layered on top.
  - **Cover image:** centred square cover floats on top, `box-shadow`.
  - **3.5px accent strip** at the left edge.
  - **Chapter title** below cover.
- Skip buttons (< >) are icon-only, fully transparent background, 70% opacity white.
- Play/pause: solid white circle (`rgba(255,255,255,0.93)`), accent colour glow shadow.
- Sleep timer, speed, queue icons in a grid row — `rgba(255,255,255,0.06)` bg + `rgba(255,255,255,0.08)` 1px border, fully square/rounded.

**Dual progress bars:**
- Thin bar: chapter progress (accent colour).
- Thick bar: book overall progress (semi-transparent accent).
- Draggable scrubber on both.

**Bottom transport controls:** `|<<` 30s back · `|>` play/pause · `>>|` 30s forward. All icon-only transparent.

### 5.5 Book Detail Sheet

Presented as a **bottom sheet** over the current screen (Home or Library).

**Sheet behaviour:**
- Initial height: 85% of viewport.
- Fully draggable (up to 95%).
- Implement with a Vue composable wrapping touch events and CSS transform.

**Background / bleed:**
- A layer inside the sheet (`position: absolute; top: 0; left: 0; right: 0; height: 55%`) holds a `filter: blur(28px)` gradient derived from the cover's extracted accent.
- A gradient scrim (`rgba(0,0,0,0.15) → rgba(0,0,0,0.6) → rgba(17,17,17,1)`) fades the bleed into the dark sheet background.
- This layer sits behind everything, including the drag handle.

**Content (top to bottom):**

1. **Drag handle** — 40×4px, centred, `rgba(255,255,255,0.25)`.
2. **Cover** — 240×240px square, centred, on a blurred-cover pillarbox background. Tap opens a zoomable lightbox.
3. **Title** — centred, `headlineSmall` weight 700.
4. **Author links** — accent + underline, tappable → Author Detail sheet. Expand if > 3 authors.
5. **Narrator links** — tappable → Narrator Books sheet.
6. **Audible rating row** — star icons + numeric score. Loads async from ABS Audible proxy. Always reserves space (skeleton while loading).
7. **Progress bar** — 4px bar + "X.X% complete" text. Hidden if progress = 0 or item is finished.
8. **Primary button — Absorb** — full-width, accent fill. 4 reactive states:
   - `Absorb` (default)
   - `Absorbing` (wave animation — same 5-bar as nav Player tab)
   - `Absorb Again` (after finish)
   - `Ebook Only` (disabled, when audio track absent)
9. **Secondary button row:**
   - **Download** — 3 states: not downloaded / downloading (progress % fill) / saved (green). Hidden for ebook-only items.
   - **Fully Absorb / Fully Absorbed** — toggle with confirmation dialog. Green when active.
   - **`···` More** — opens More sheet (see below).
10. **Metadata chips** (wrap row, same pill style):
    - Year · Duration · Chapter count · Codec · Bitrate · File size · Publisher · Genre(s) · Date started · Date finished (conditional on `finishedAt`)
11. **Series rows** — one per series the book belongs to. Tappable → Series Books sheet.
12. **About / Description** — HTML-rendered, 6-line clamp, "Show more" inline link (not a full toggle).
13. **Chapters (N)** — expandable. Row: chapter number · title · duration. Current chapter highlighted in accent.
14. **Bookmarks (N)** — expandable. Row: HH:MM:SS · title · note (2-line, grey).

**More sheet (··· button):**
Bottom sheet with a scrollable action list. Conditional items:

| Action | Condition |
|---|---|
| Add / Remove from Absorbing | always |
| Add to Playlist | always |
| Add to Collection | always |
| View Ebook | if ebook file present |
| Reset Progress | if progress > 0 or finished |
| Lookup Metadata | always |
| Clear Metadata Override | if override exists |
| Open on Goodreads | if user pref enabled |
| Edit Metadata | admin role only |
| Server File Path (copyable) | admin role only |

### 5.6 Series / Author / Narrator Detail Sheets

Secondary bottom sheets. Show a scrollable grid of books belonging to the series/author/narrator. Same portrait card format as Home rows.

### 5.7 Search

Accessible from the bottom nav Search tab. Full-screen with a prominent search input, recent searches, and live results across libraries (books, podcasts, series, authors).

### 5.8 Settings

Sectioned list screen:

- **Account** — avatar, username, change password, logout.
- **Appearance** — theme (system / dark / light), cover size preference.
- **Playback** — default speed, sleep timer defaults.
- **Server** — ABS server URL (editable), connection status indicator.
- **About** — app version, ABS server version.

### 5.9 Admin Panel

Full admin functionality matching the existing ABS web UI. Accessible only to users with `isAdminOrUp` role. Exposed under a dedicated `/admin` route group (not in bottom nav; accessible from Settings → Admin Panel).

Admin sections mirror ABS's existing panel: Libraries, Users, Logs, Server, Backups, Notifications, OPDS. Implemented as standard list/form pages — no special design treatment needed beyond the consistent dark palette.

---

## 6. API Layer

### ABS REST

Base: `{ABS_HOST}/api`

Key endpoints used:

| Purpose | Endpoint |
|---|---|
| Login | `POST /login` |
| Library list | `GET /libraries` |
| Library items (paginated, filterable, sortable) | `GET /libraries/{id}/items` |
| Item detail | `GET /items/{id}?expanded=1&include=rssfeed` |
| User progress | `GET /me/progress/{id}` |
| Batch progress | `GET /me/items-in-progress` |
| Update progress | `PATCH /me/progress/{id}` |
| Download | `GET /items/{id}/download` |
| Cover | `GET /items/{id}/cover` |
| Bookmarks | `GET /me/bookmarks` / `POST /me/bookmarks` |
| Collections | `GET /collections` |
| Playlists | `GET /playlists` |
| Audible metadata proxy | `GET /search/covers` / `/search/books` |
| Series | `GET /libraries/{id}/series` |
| Authors | `GET /libraries/{id}/authors` |
| Admin: users | `GET /users` / `POST /users` etc. |

All responses cached in Pinia stores. Cache invalidated on Socket.io events.

### Socket.io

Connect to ABS server root with the JWT token as auth. Key events:

- `item_updated` — re-fetch item detail if currently open.
- `user_stream_progress_update` — update progress in store and UI.
- `library_scan_complete` — refresh library store.
- `user_online` / `user_offline` — show in admin Users panel.

### Error handling

- 401 → clear token, redirect to Login.
- Network error → toast notification.
- 404 on item → show "Not found" empty state in sheet.

---

## 7. Colour Extraction

```
cover <img> element loads
  ↓
color-thief.getColor(imgEl, quality=5)
  ↓ returns [r, g, b]
  ↓
convert to HSL, boost saturation to min 40%, clamp lightness 45–65%
  ↓
set CSS --accent on the parent card/sheet scope
  ↓
all accent-coloured elements (button bg, progress fill, chip borders, links) use var(--accent)
```

Fallback if extraction fails: `#d4a017` (amber — consistent with Absorb's default warm palette).

---

## 8. PWA

- `vite-plugin-pwa` with `generateSW` strategy.
- Workbox precaches all static assets; runtime caches cover images (StaleWhileRevalidate, 500-image limit).
- `manifest.json`: `display: standalone`, `theme_color: #0E0E0E`, `background_color: #0E0E0E`, square icon set.
- `start_url` set to `/` (configurable for sub-path deploys).

---

## 9. Deployment

### Docker

```
nginx:alpine base image
COPY dist/ → /usr/share/nginx/html
nginx config: try_files $uri /index.html (SPA fallback)
EXPOSE 80
```

Single `docker run` or Compose service. ABS server URL configured via a runtime `/config.json` file mounted into the container, loaded on app start (avoids baking env vars into the static build).

### Sub-path support

Vite `base` config accepts an env var (`VITE_BASE_URL`) so the app can be served at e.g. `/abs-ui/`.

---

## 10. Known Gaps vs Absorb (Book Detail)

Captured from the fidelity audit. All are implementation concerns — the visual language is correct.

| Priority | Gap | Notes |
|---|---|---|
| High | Cover 240px centred (not full-width) | BlurPaddedCover bg behind it |
| High | Title centre-aligned | M3 headlineSmall |
| High | Primary button 4-state reactivity | Absorbing wave animation |
| High | Download 3-state with % fill | |
| High | Audible rating row | Always reserves space, async load |
| High | More sheet with 10 conditional actions | |
| Medium | Author/narrator tappable links | Open sub-sheets |
| Medium | Draggable sheet (85% → 95%) | Touch + mouse drag |
| Medium | Date Finished chip | Conditional on `finishedAt` |
| Medium | Multiple series rows | Loop over `metadata.series` array |
| Medium | About as line-clamp + "Show more" | Not a full toggle collapse |
| Medium | Bookmark note field | 2-line below title |
| Medium | Cover lightbox on tap | Zoomable viewer |
| Low | Reset Progress destructive action | In More sheet, confirmation dialog |
| Low | Metadata lookup panel | In More sheet |
| Low | Goodreads link | In More sheet, user-pref gated |
| Low | Playlist action moved to More sheet | Remove from primary secondary row |

---

## 11. File / Directory Structure (proposed)

```
src/
  api/           # Axios instance + endpoint functions
  stores/        # Pinia stores (auth, library, player, progress)
  composables/   # useColorThief, useDraggableSheet, useScrollHide
  components/
    shell/       # AppShell, BottomNav, SideNav, MiniPlayer
    cards/       # PortraitCard, PlayerCard
    sheets/      # BookDetailSheet, MoreSheet, SeriesSheet
    player/      # PlayerControls, ProgressBar, Carousel
    library/     # LibraryGrid, SearchOverlay, SortChips
    common/      # MetadataChips, SeriesRow, ChapterList
  views/         # Route-level components (Home, Library, Player, Search, Settings, Admin/*)
  router/
  plugins/       # Vuetify config, PWA
  assets/
public/
  config.json    # Runtime ABS server URL (mounted by Docker)
```
