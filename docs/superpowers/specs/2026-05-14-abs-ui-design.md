# abs-ui Design Specification

**Date:** 2026-05-14  
**Status:** Approved — ready for implementation planning

---

## 1. Overview

`abs-ui` is a standalone modern web client for the [Audiobookshelf](https://github.com/advplyr/audiobookshelf) server. It connects to an existing ABS instance via its public REST API and Socket.io, replacing the built-in web UI entirely — both the listener-facing features and the full admin panel.

The visual design faithfully replicates [Absorb](https://github.com/pounat/absorb), a Flutter mobile app built on Material3. Every feature — including admin panel, podcast management, e-book reader, stats, and upload — uses this same design language. There are no "admin-plain" or "utility-plain" pages. The design is consistent throughout.

### Out of scope

- Modifying the Audiobookshelf server itself.
- Any server-side rendering; this is a fully static SPA.

---

## 2. Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) | Modern reactive, strong ecosystem |
| Build | Vite 5 | Fast HMR, first-class Vue support |
| UI library | Vuetify 3 (Material3) | Matches Absorb's M3 foundation |
| PWA | `vite-plugin-pwa` | Service worker + web app manifest |
| Cover colour | `color-thief` | Web equivalent of Flutter `palette_generator` |
| State | Pinia | Lightweight, Vue 3-native |
| Router | Vue Router 4 | |
| HTTP | Axios | REST calls to ABS API |
| Realtime | Socket.io-client | ABS server events |
| E-book (EPUB) | epub.js | EPUB rendering |
| E-book (PDF) | pdf.js | PDF rendering |
| Deployment | Docker — nginx serving static build | Single container, configurable base URL |

### ABS API base

All requests: `{ABS_HOST}/api`. Auth via JWT in Pinia + `localStorage`. Passed as `Authorization: Bearer <token>`.

---

## 3. Design System

This section defines the visual language. **It applies to every screen in the app without exception** — library grids, admin tables, settings forms, upload screens, e-book reader controls, stats dashboards. If a screen has content, it uses these rules.

### Surfaces

Base: `#0E0E0E`. Five M3 tonal levels:

| Level | Hex | Use |
|---|---|---|
| 0 | `#000000` | Deepest shadows |
| 1 | `#080808` | Input backgrounds |
| 2 | `#0E0E0E` | Page background |
| 3 | `#111111` | Cards, sheets |
| 4 | `#141414` | Elevated cards, table rows |

### Dynamic accent

Extracted from cover art per item:

```
cover <img> loads → color-thief.getColor(imgEl, quality=5)
→ [r, g, b] → convert to HSL
→ boost saturation to min 40%, clamp lightness 45–65%
→ set CSS --accent on the card/sheet scope
→ all accent elements use var(--accent)
```

Fallback when no cover is available (admin pages, upload screen, etc.): `#d4a017` (warm amber, consistent with Absorb's default palette).

### Typography

System UI stack: `system-ui, -apple-system, sans-serif`.

| Role | Size | Weight |
|---|---|---|
| Screen title | 18px | 700 |
| Sheet/card title | 13–15px | 700 |
| Body / meta | 10–12px | 400–500 |
| Chips | 8.5–9px | 400 |
| Table cells | 12–13px | 400 |
| Form labels | 11px | 500 |

### Interactive elements

- **Primary buttons:** accent fill, `border-radius: 12px`, `padding: 11px`, weight 700 label.
- **Secondary buttons:** `rgba(255,255,255,0.06)` bg + `rgba(255,255,255,0.08)` 1px border, `border-radius: 10px`.
- **Destructive actions:** `#ef4444` (red) label on secondary button style, never filled.
- **Chips/pills:** `rgba(255,255,255,0.06)` bg + `rgba(255,255,255,0.07)` border, `border-radius: 20px`, 8.5px text.
- **Icon buttons:** transparent bg, icon at 50–70% white opacity; accent on active state.
- **Toggle switches:** accent track when on, `rgba(255,255,255,0.15)` when off.

### Form inputs

- Background: `rgba(255,255,255,0.05)`, border: `rgba(255,255,255,0.08)` 1px, `border-radius: 8px`.
- Focus: border becomes accent colour, subtle accent glow.
- Label: 11px, `rgba(255,255,255,0.5)`.
- Text: `rgba(255,255,255,0.9)`.

### Glass / blur

- Bottom nav bar: `rgba(14,14,14,0.75)` + `backdrop-filter: blur(20px)`
- Search overlay: `backdrop-filter: blur(20px)`
- Player card pillarbox: `backdrop-filter: blur(24px)` on the blurred bg layer
- Any overlay/drawer on mobile: `rgba(0,0,0,0.6)` scrim behind

### Tables (admin / sessions / logs)

- Row background: alternating `#111` / `#141414` (subtle, not stark zebra striping).
- Row hover: `rgba(255,255,255,0.03)`.
- Dividers: `rgba(255,255,255,0.05)` — no visible grid lines.
- Column headers: 10px, 600 weight, `rgba(255,255,255,0.4)`, uppercase.
- Status badges: same pill style as chips — green/amber/red on dark tint.

### Bottom sheets

Used for all detail views, editors, and action lists throughout the app (not just Book Detail). Common rules:

- `border-radius: 24px 24px 0 0`, `border-top: 1px solid rgba(255,255,255,0.08)`.
- Drag handle: 40×4px, `rgba(255,255,255,0.25)`, centred, 10px top margin.
- Background: `#111` with optional cover bleed layer where cover art is available.
- Scrollable content inside, `scrollbar-width: none`.

### Section headers (list screens)

`icon + label + › arrow` pattern. Icon and arrow at `rgba(255,255,255,0.3)`, label at `rgba(255,255,255,0.7)`, 12px, 600 weight. Tappable → full list view.

### Empty states

Centred icon (40px, `rgba(255,255,255,0.15)`) + short message (`rgba(255,255,255,0.4)`) + optional CTA button. No illustrations, no colour backgrounds.

### Toast notifications

Floating pill at bottom of screen (above nav bar). Dark `#1e1e1e` bg + 1px `rgba(255,255,255,0.1)` border. Accent left border strip for success, red for error.

---

## 4. App Shell

### Mobile (< 768px)

- **Bottom navigation bar** — fixed, 5 tabs: Home, Library, Player, Search, Settings.
  - `background: rgba(14,14,14,0.75); backdrop-filter: blur(20px)`
  - Active tab: accent icon + label. Inactive: `rgba(255,255,255,0.4)`.
  - Player tab: animated 5-bar wave icon when audio is playing.
- **Scroll-to-hide** on Home and Library tabs: hide nav on scroll-down (>40px), reveal on scroll-up.
- **Safe area inset**: `padding-bottom: env(safe-area-inset-bottom)`.

### Tablet (768px – 1279px)

- **Navigation rail** — left-side, ~72px wide, icons + short labels.

### Desktop (≥ 1280px)

- **Navigation drawer** — ~200px wide, full labels + section groupings.
- Mini-player pinned to the bottom of the drawer.

---

## 5. Screens

### 5.1 Login

- Full-screen, `#0E0E0E` background.
- ABS server URL input + username/password fields. Form inputs follow Section 3 style.
- "Sign in" primary button in accent fill.
- On success: store JWT + user in Pinia → redirect to Home.

### 5.2 Home

**Sections (vertical scroll):**

1. **Continue Listening** — horizontal scroll row of portrait cards. Source: `GET /api/me/items-in-progress`.
2. **Recently Added** — horizontal scroll row.
3. **Discover** — horizontal scroll row (library shuffle).
4. **Stats hint bar** — compact inline callout: total hours listened, link to Stats screen.

**Portrait card anatomy:**
- Square cover image, `aspect-ratio: 1:1`, `object-fit: cover`.
- 3px accent progress bar at bottom edge.
- Title below (12px, 700, 2-line clamp).
- Tap → Book/Podcast Detail sheet.

**Section headers:** icon + label + `›` arrow. Tap → full list view.

**Desktop:** sidebar drawer (200px) + mini-player at drawer bottom. Wider card rows.

### 5.3 Library

**Default view:** Responsive grid of portrait covers.
- Columns: `Math.floor(containerWidth / 130)` clamped 3–10.
- Cell: cover + title (2-line) + author (1-line).

**Search:** Floating search bar. Tap → full-screen overlay, `backdrop-filter: blur(20px)`. Live results. Result types each use their own card style (book, series, author, narrator, tag, genre).

**Sort / filter row:** Horizontal chips — Sort, Filter, View toggle (grid / list / series / authors / narrators).

**Series view:** Stacked-covers card (up to 3 covers, offset), series name, book count.

**Authors / Narrators view:** Portrait cards with person photo placeholder; name below.

**List view:** Row with small cover thumbnail, title + author + duration.

**Long-press on any card** → enters Batch Select mode (see 5.15).

### 5.4 Player

**Card carousel:**
- Cards at 92% viewport width, adjacent peek ~4% each side.
- `scroll-snap-type: x mandatory`.
- Each card:
  - **Bleed background:** `<img>` at full card size + `filter: blur(24px) brightness(0.7) saturate(1.3)`, `position: absolute`, `object-fit: cover`.
  - **Gradient scrim:** `rgba(0,0,0,0.25) → rgba(0,0,0,0.55) → rgba(0,0,0,0.80)`.
  - **Cover image:** centred square, `box-shadow`.
  - **3.5px accent strip** at left edge.
  - **Chapter title** below cover.
- Skip buttons: icon-only, fully transparent, 70% opacity white.
- Play/pause: solid white circle (`rgba(255,255,255,0.93)`), accent glow shadow.
- Grid row icons (sleep timer, speed, queue): `rgba(255,255,255,0.06)` bg + `rgba(255,255,255,0.08)` 1px border.

**Dual progress bars:** chapter (thin, accent) + book overall (thick, semi-transparent accent). Both draggable.

**Transport controls:** 30s back · play/pause · 30s forward. Icon-only, transparent.

### 5.5 Book Detail Sheet

Bottom sheet over current screen.

**Sheet behaviour:** Initial 85%, max 95%, touch/mouse draggable via Vue composable.

**Background / bleed:** Absolute layer `top:0`, `height:55%`, `filter:blur(28px)` gradient from extracted accent. Gradient scrim `rgba(0,0,0,0.15) → rgba(0,0,0,0.6) → rgba(17,17,17,1)`. Behind drag handle.

**Content (top to bottom):**

1. Drag handle — 40×4px, `rgba(255,255,255,0.25)`.
2. Cover — 240×240px centred, on blurred-cover pillarbox bg. Tap → zoomable lightbox.
3. Title — centred, 15px, 700.
4. Author links — accent + underline, tappable → Author Detail sheet. Expand if > 3.
5. Narrator links — tappable → Narrator Books sheet.
6. Audible rating row — stars + score. Async load, always reserves space (skeleton).
7. Progress bar — hidden if progress = 0 or finished.
8. Primary button (Absorb) — 4 states: Absorb / Absorbing (wave) / Absorb Again / Ebook Only (disabled).
9. Secondary row: Download (3 states) · Fully Absorb / Fully Absorbed · `···` More.
10. Metadata chips: Year · Duration · Chapters · Codec · Bitrate · File size · Publisher · Genre(s) · Date started · Date finished (conditional).
11. Series rows — one per series, tappable → Series sheet.
12. About — 6-line clamp, "Show more" inline.
13. Chapters (N) — expandable list, current highlighted in accent.
14. Bookmarks (N) — expandable list: HH:MM:SS · title · note (2-line).

**More sheet:** action list: Add/Remove Absorbing · Playlist · Collection · View Ebook · Share · Reset Progress · Lookup Metadata · Clear Override · Goodreads · Edit Metadata (admin) · Server Path (admin).

### 5.6 Podcast Detail Sheet

Same bottom sheet structure as Book Detail, adapted for podcasts.

**Differences from Book Detail:**
- Cover is podcast artwork (may be rectangular — `object-fit: cover` on square container).
- No "Absorb" primary button — replaced by "Subscribe / Unsubscribe" toggle (accent when subscribed).
- No progress bar or Audible rating.
- Episodes section replaces Chapters: each row shows episode title + publish date + duration + download/play state.
- Episode row actions: play, download, mark as played, add to queue.
- "Add New Podcast" sheet: search bar (title or RSS URL) → results list → confirm subscription → library selector.

### 5.7 Series / Author / Narrator Detail Sheets

Secondary bottom sheets (or full-page on desktop). Portrait card grid of items belonging to the entity. Same card, grid, accent rules.

### 5.8 Search

Bottom nav Search tab. Full-screen. Prominent search input (accent focus border). Recent searches as chips. Live results grouped by type: Books, Podcasts, Series, Authors, Narrators, Tags, Genres — each group uses its own card style.

### 5.9 Collections

**Collections list:** Portrait grid of collection cards. Cover: collage of up to 4 item covers (2×2 grid). Name below, item count sub-label.

**Collection detail (bottom sheet or full page):** Same portrait card grid filtered to collection items. Accent derived from first item's cover. Header: collection name + description + item count + Edit button.

**Create/Edit collection sheet:** Name input + description textarea + cover options (auto-collage or custom upload). Same form input style. Save button = accent primary.

### 5.10 Playlists

**Playlists list:** Same portrait grid as collections. Cover: collage, or single cover if only one item.

**Playlist detail:** Numbered list view (not grid) — items can be individual chapters or full items. Each row: number · cover thumbnail · title · duration. Drag handles to reorder (desktop + long-press mobile). Accent derived from first item.

**Create/Edit playlist sheet:** Name + description. Add item via search-in-sheet.

### 5.11 Stats & Analytics

Accessible from Home hint bar or Settings.

**Library stats screen:**
- Daily listening chart — vertical bar chart, bars in accent colour (`#d4a017` fallback), dark grid lines.
- Listening heatmap — GitHub-style grid, accent-tinted squares.
- Genre breakdown — horizontal bar chart.
- Total time, total books finished, average daily listening.
- All chart backgrounds: `#111`, no white space.

**Year in Review:**
- Full-screen swipeable cards (CSS scroll-snap), one stat per card.
- Each card: `#0E0E0E` bg, large accent number, supporting label.
- Matches Spotify Wrapped aesthetic but in our dark palette.

**Per-user stats in Settings** — compact summary card: total hours, books finished, current streak.

### 5.12 E-book Reader

Full-screen reader accessed from "View Ebook" in More sheet.

**Layout:**
- Background: `#0E0E0E` (dark default).
- Text: `rgba(255,255,255,0.85)`.
- Tap centre → overlay controls fade in (auto-hide after 3s).

**Overlay controls (top bar):**
- Back arrow · title (truncated) · Settings icon · Table of Contents icon.
- `rgba(14,14,14,0.85)` bg, `backdrop-filter: blur(12px)`.

**Overlay controls (bottom bar):**
- Chapter progress bar (accent).
- Page / location indicator.

**Reader Settings sheet** (bottom sheet):
- Font size slider (accent track).
- Line height slider.
- Theme toggle: Dark / Sepia / White — rendered as 3 small preview pills.

**Format support:**
- EPUB: epub.js, rendered in sandboxed `<div>`.
- PDF: pdf.js, canvas rendering, dark-mode CSS invert on white PDFs.
- MOBI: ABS server converts to EPUB; receive as EPUB.

### 5.13 Batch Operations

Triggered by long-press on any library card.

**Batch select mode:**
- Cards get an accent-tinted checkmark overlay when selected.
- Deselect all: tap outside or press X.
- Selection count shown in top bar.

**Batch action bar:**
- Rises from bottom, same glass style as nav bar.
- Actions: Match Metadata · Edit · Mark Finished · Download · Add to Collection · Add to Playlist.
- Confirmation sheet before destructive/slow operations showing item count.

### 5.14 File Upload

Accessible from Library screen (+ button) or Admin → Libraries.

**Upload screen:**
- Full-screen or large bottom sheet.
- Drag-and-drop zone: dashed `rgba(255,255,255,0.08)` border, `border-radius: 16px`, centred cloud-upload icon + label.
- Library selector chip row at top.
- **File cards** (after selection): cover placeholder · filename · size · upload progress bar (accent fill) · status chip (Queued / Uploading / Done / Error). Card style: `#141414` bg, `#1e1e1e` border.
- Cancel/retry per file.

### 5.15 Metadata Editor

Opened from Book Detail → More → Edit Metadata (admin) or Metadata Lookup.

**6-tab bottom sheet (full-screen on mobile):**

Tabs use accent underline for active, `rgba(255,255,255,0.4)` for inactive. Tab bar: `#111` bg.

1. **Details** — form fields: Title, Subtitle, Author(s), Narrator(s), Publisher, Genres (multi-select chip input), Tags, Description (rich text).
2. **Cover** — current cover preview (240px) + "Search covers" button → cover search results grid + "Upload" button.
3. **Files** — table of audio/ebook files with metadata: filename, codec, bitrate, duration. Edit icons per row.
4. **Chapters** — chapter list with reorder handles, inline title editing, add/delete. Timeline scrubber to set chapter start positions.
5. **Match** — search ABS metadata providers (Audible, Google Books, etc.) → results as cards (cover + title + author + source badge). Tap to preview → "Apply" button.
6. **Tools** — list of utility actions: Embed chapters in audio file · Clear cover · Reset to server metadata · Quick match. Each is a secondary button with a description label below.

**Save / Cancel:** Sticky footer row inside the sheet.

### 5.16 Chapter & Track Management

Available standalone via Audiobook → Chapters (admin/owner) or within Metadata Editor tab 4.

**Chapter list:** rows with drag handle · chapter number · title (editable inline) · start time · duration. Accent highlight on currently-playing chapter.

**Track list:** rows with file icon · filename · codec · bitrate · duration · embedded chapter count.

Editing chapter times: tap time chip → time picker (HH:MM:SS.ms) bottom sheet.

### 5.17 Public Sharing

**Share sheet** (from More → Share):
- Toggle: Public / Private.
- Copy link button (accent, copies to clipboard, brief toast confirmation).
- Expiry date picker (optional).
- Password protection toggle + input (optional).

**Public view (`/share/_slug`):**
- No auth required.
- Same player UI as the main Player screen but stripped of library navigation.
- Same dark palette, same cover bleed card.
- ABS branding replaced with `abs-ui` logo.

### 5.18 Download Queue (Podcasts)

Accessed from Library → Podcast library or bottom nav Library section.

**Screen:** list of queued/in-progress/completed downloads.

Rows: cover thumbnail · episode title · podcast name · progress bar (accent) · status chip · cancel button.

Group by status: Downloading, Queued, Completed (collapsible).

### 5.19 Settings (full)

Sectioned list screen. Section headers follow design system rules. Each section is visually separated by a subtle divider.

**Account:**
- Avatar (tap to upload), username, email.
- Change password (bottom sheet form).
- Logout (destructive label).

**Listening Sessions:**
- Compact list: date · device · duration · item title.
- Tap → session detail sheet: full timeline, seek positions.

**E-reader Devices:**
- List of registered e-reader devices (Kindle/Kobo).
- Add device: name + device type selector.
- Remove device: swipe-to-delete or long-press.

**API Keys:**
- List of personal API keys: name · created · last used.
- Create new: name input → generated key display (copy prompt).
- Revoke: destructive confirmation.

**Appearance:**
- Theme: System / Dark / Light (3-option toggle).
- Cover size preference.
- Language selector.

**Playback:**
- Default speed (slider, accent track, 0.5×–3×).
- Sleep timer default duration.
- Skip-back / skip-forward intervals.
- Auto-rewind on resume duration.

**Server:**
- ABS server URL (editable).
- Connection status indicator (green/red chip).
- Force reconnect button.

**About:**
- App version.
- ABS server version + changelog link.
- Open source licenses.

### 5.20 Admin Panel

Accessible via Settings → Admin Panel. Requires `isAdminOrUp` role. Exposed under `/admin` route prefix.

**Navigation:** On mobile, Admin has its own nav drawer (secondary sheet from Settings). On desktop, Admin sections appear in the main sidebar under a collapsible "Admin" group.

All admin screens use the same design language — dark tables, form inputs, section headers, chips. No light/white admin aesthetic.

#### 5.20.1 Libraries

- List of libraries: cover collage · name · type chip (audiobooks / podcasts / mixed) · item count · last scan time.
- Create / Edit library: bottom sheet form — name, type, folders (folder browser), scanner settings, cover & metadata provider settings.
- Per-library actions: Scan · Force Scan · Empty Trash · Tools.
- Schedule scan: cron expression builder (bottom sheet).

#### 5.20.2 Users

- Table: avatar · username · role chip (admin/user/guest) · online indicator · last seen.
- Create / Edit user: bottom sheet form — username, password, role, library permissions, download permissions.
- Per-user: View Sessions (listening history), Manage Permissions.

#### 5.20.3 Sessions

- All listening sessions across all users.
- Table: user · item · started · duration · device · IP.
- Filter by user, library, date range.
- Tap row → session detail sheet.

#### 5.20.4 API Keys

- All API keys across server.
- Table: name · user · created · last used · active toggle.
- Create, revoke.

#### 5.20.5 Server Settings

- General: server name, cover aspect ratio, log level.
- Scanner: concurrency, file watching toggle.
- Metadata: preferred providers, language.
- Storage: backup path, covers path.
- All fields follow form input style.

#### 5.20.6 Backups

- List of backups: date · size · type chip (auto/manual).
- Create backup button (accent primary).
- Schedule: cron expression builder.
- Per-backup: Restore (with confirmation), Download, Delete.

#### 5.20.7 Logs

- Live log tail: dark monospace text (`font-family: monospace`, 12px, `rgba(255,255,255,0.7)`), `#080808` bg.
- Log level chips as colour-coded: DEBUG (grey) / INFO (accent) / WARN (amber) / ERROR (red).
- Auto-scroll toggle. Filter by log level.

#### 5.20.8 Notifications

- List of notification configs: name · trigger · channel chip (webhook/email) · active toggle.
- Create/Edit notification: bottom sheet — trigger selector, webhook URL or email, test button.

#### 5.20.9 Email

- SMTP form: host, port, user, password (masked), from address, TLS toggle.
- Send test email button.

#### 5.20.10 Authentication

- Auth method toggles: local / OIDC / Google / custom.
- OIDC config form: client ID, secret, discovery URL, redirect URI.
- Active sessions table.

#### 5.20.11 Metadata Utils

Three sub-sections:

- **Genres:** list + inline add/rename/merge/delete. Merge: select multiple → merge-to bottom sheet.
- **Tags:** same pattern as Genres.
- **Custom Metadata Providers:** list of custom provider configs (name, URL, API key). Create/Edit/Delete in bottom sheet.

#### 5.20.12 RSS Feeds

- List of open RSS feeds: item title · feed URL · open/closed chip · created date.
- Open/Close toggle per feed.
- Copy feed URL (toast confirmation).
- Feed detail sheet: metadata, recent items.

#### 5.20.13 Changelog

- Scrollable list of ABS server release notes, fetched from `/api/server-settings` (or static bundled).
- Grouped by version. Accent-highlighted "New" chip on latest.

---

## 6. API Layer

### ABS REST (key endpoints)

Base: `{ABS_HOST}/api`

| Purpose | Endpoint |
|---|---|
| Login | `POST /login` |
| Library list | `GET /libraries` |
| Library items | `GET /libraries/{id}/items` |
| Item detail | `GET /items/{id}?expanded=1&include=rssfeed` |
| User progress | `GET /me/progress/{id}` |
| Items in progress | `GET /me/items-in-progress` |
| Update progress | `PATCH /me/progress/{id}` |
| Download | `GET /items/{id}/download` |
| Cover | `GET /items/{id}/cover` |
| Bookmarks | `GET /me/bookmarks` / `POST/DELETE /me/bookmarks` |
| Collections | `GET/POST /collections`, `PATCH/DELETE /collections/{id}` |
| Playlists | `GET/POST /playlists`, `PATCH/DELETE /playlists/{id}` |
| Series | `GET /libraries/{id}/series` |
| Authors | `GET /libraries/{id}/authors` |
| Narrators | `GET /libraries/{id}/narrators` |
| Search | `GET /libraries/{id}/search?q=` |
| Audible metadata | `GET /search/covers`, `GET /search/books` |
| Stats — user | `GET /me/stats` |
| Stats — library | `GET /libraries/{id}/stats` |
| Year in review | `GET /me/listening-stats` |
| Sessions | `GET /me/listening-sessions` |
| Upload | `POST /upload` (multipart) |
| Podcasts — episodes | `GET /items/{id}/episodes` |
| Podcast download queue | `GET /podcasts/download-queue` |
| Share | `POST /share`, `GET /share/{slug}` |
| API keys | `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/{id}` |
| Admin: users | `GET/POST/PATCH/DELETE /users` |
| Admin: backups | `GET /backups`, `POST /backups`, `POST /backups/{id}/restore` |
| Admin: logs | `GET /logs` |
| Admin: server settings | `GET/PATCH /settings` |
| Admin: notifications | `GET/POST/PATCH/DELETE /notifications` |
| Admin: RSS feeds | `GET /feeds`, `POST /feeds/{id}/open`, `POST /feeds/{id}/close` |
| Admin: sessions | `GET /users/online`, `GET /sessions` |
| Metadata update | `PATCH /items/{id}/media` |
| Metadata match | `GET /items/{id}/matched-books` |
| Chapters update | `POST /items/{id}/chapters` |
| E-book file | `GET /items/{id}/ebook` |

All responses cached in Pinia stores. Cache invalidated by Socket.io events.

### Socket.io events

- `item_updated` — re-fetch item detail if open.
- `user_stream_progress_update` — update progress in store.
- `library_scan_complete` — refresh library store.
- `user_online` / `user_offline` — admin Users panel.
- `podcast_episode_download_progress` — update download queue.
- `task_started` / `task_finished` — show task progress toast.

### Error handling

- 401 → clear token, redirect to Login.
- Network error → toast notification.
- 404 → "Not found" empty state.

---

## 7. Colour Extraction

```
cover <img> element loads
  ↓
color-thief.getColor(imgEl, quality=5) → [r, g, b]
  ↓
convert to HSL
boost saturation to min 40%, clamp lightness 45–65%
  ↓
set CSS --accent on parent card/sheet scope
  ↓
all accent-coloured elements use var(--accent)
```

Fallback (no cover, admin pages, upload screen): `#d4a017`.

---

## 8. PWA

- `vite-plugin-pwa`, `generateSW` strategy.
- Workbox precaches all static assets; runtime caches covers (StaleWhileRevalidate, 500 limit).
- Manifest: `display: standalone`, `theme_color: #0E0E0E`, `background_color: #0E0E0E`.
- `start_url: /` (configurable for sub-path deploys).

---

## 9. Deployment

### Docker

```
nginx:alpine
COPY dist/ → /usr/share/nginx/html
nginx: try_files $uri /index.html
EXPOSE 80
```

ABS server URL configured via runtime `/config.json` mounted into the container — avoids baking env vars into the static build.

### Sub-path support

`VITE_BASE_URL` env var sets Vite `base` for e.g. `/abs-ui/` deploys.

---

## 10. Book Detail Fidelity Gaps (vs Absorb)

Implementation concerns — visual language is already correct.

| Priority | Gap |
|---|---|
| High | Cover 240px centred with BlurPaddedCover bg (not full-width) |
| High | Title centre-aligned |
| High | Primary button 4-state reactivity + Absorbing wave animation |
| High | Download 3-state with % fill animation |
| High | Audible rating row (async, skeleton reserve) |
| High | More sheet with 10 conditional actions |
| Medium | Author/narrator tappable links + sub-sheets |
| Medium | Draggable sheet 85%→95% |
| Medium | Date Finished chip (conditional) |
| Medium | Multiple series rows |
| Medium | About as line-clamp + "Show more" (not full toggle) |
| Medium | Bookmark note field (2-line) |
| Medium | Cover lightbox on tap |
| Low | Reset Progress (destructive + confirmation) |
| Low | Metadata lookup panel |
| Low | Goodreads link (user-pref gated) |
| Low | Playlist action moved to More sheet |

---

## 11. File / Directory Structure

```
src/
  api/
    index.ts          # Axios instance, interceptors
    auth.ts
    library.ts
    items.ts
    player.ts
    podcasts.ts
    collections.ts
    playlists.ts
    stats.ts
    upload.ts
    share.ts
    admin/
      users.ts
      backups.ts
      sessions.ts
      settings.ts
      notifications.ts
      feeds.ts
  stores/
    auth.ts
    library.ts
    player.ts
    progress.ts
    podcasts.ts
    collections.ts
    playlists.ts
    stats.ts
    tasks.ts
    admin.ts
  composables/
    useColorThief.ts
    useDraggableSheet.ts
    useScrollHide.ts
    useBatchSelect.ts
    usePlayer.ts
    useSleepTimer.ts
  components/
    shell/             # AppShell, BottomNav, SideNav, AdminNav, MiniPlayer
    cards/             # PortraitCard, PlayerCard, CollectionCard, EpisodeCard
    sheets/            # BookDetailSheet, PodcastDetailSheet, MoreSheet, SeriesSheet, AuthorSheet
    player/            # PlayerControls, ProgressBar, Carousel, SpeedControl
    library/           # LibraryGrid, SearchOverlay, SortChips, BatchActionBar
    metadata/          # MetadataEditor, ChapterEditor, TrackList, CoverSearch
    ebook/             # EpubReader, PdfReader, ReaderControls, ReaderSettings
    stats/             # ListeningChart, Heatmap, YearInReview, StatsCard
    upload/            # UploadZone, FileCard
    common/            # MetadataChips, SeriesRow, Lightbox, Toast, EmptyState, ConfirmSheet
    admin/             # LibrariesTable, UsersTable, SessionsTable, BackupsTable, LogViewer
  views/
    LoginView.vue
    HomeView.vue
    LibraryView.vue
    PlayerView.vue
    SearchView.vue
    StatsView.vue
    CollectionsView.vue
    PlaylistsView.vue
    UploadView.vue
    ShareView.vue
    SettingsView.vue
    admin/
      AdminLayout.vue
      LibrariesView.vue
      UsersView.vue
      SessionsView.vue
      ApiKeysView.vue
      ServerView.vue
      BackupsView.vue
      LogsView.vue
      NotificationsView.vue
      EmailView.vue
      AuthView.vue
      MetadataUtilsView.vue
      RssFeedsView.vue
      ChangelogView.vue
  router/
    index.ts
    guards.ts          # Auth guard, admin guard
  plugins/
    vuetify.ts
    pwa.ts
  assets/
public/
  config.json          # Runtime: { "absHost": "https://your-abs-server.com" }
```
