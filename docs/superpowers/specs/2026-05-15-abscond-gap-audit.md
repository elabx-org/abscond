# Abscond Feature Gap Audit

> **Reference:** ABS official UI + Absorb app (pounat/absorb) for design language.
> All new work must follow established Abscond patterns: `#0e0e0e`/`#111` backgrounds, `#d4a017` amber accent, `rgba(255,255,255,0.05–0.1)` borders, 12–24px border-radius, bottom sheets with drag handles, shimmer skeletons, pull-to-refresh.

---

## What Is Already Fully Implemented

| Area | State |
|---|---|
| Libraries (admin) | ✅ create, edit, scan, delete, RSS podcast add, check episodes, real-time scan progress |
| Users (admin) | ✅ list, create, edit permissions, reset password, delete |
| Backups (admin) | ✅ list, create, restore, delete |
| Upload (admin) | ✅ drop-zone, library picker, progress |
| Logs (admin) | ✅ view + refresh, level-coloured output |
| HomeView | ✅ Continue Listening + Recently Added shelves |
| LibraryView | ✅ responsive grid, sort/filter |
| BrowseView | ✅ series, authors, narrators, collections |
| StatsView | ✅ hero stat, period cards, activity grid, 30-day bar chart, year heatmap, top items, session history |
| BookmarksView | ✅ |
| CollectionsView | ✅ |
| PlaylistsView | ✅ |
| UpcomingReleasesView | ✅ |
| CarModeView | ✅ |
| PodcastEpisodesView | ✅ |
| SearchView | ✅ |
| PlayerView | ✅ sleep timer, equalizer, speed, chapter skip |
| SettingsView | ✅ collapsible sections, sleep timer prefs, Goodreads toggle, appearance |
| NotesSheet | ✅ markdown notes, export |
| MatchSheet | ✅ provider search, candidate grid, apply |

---

## Gap 1 — Admin Overview Dashboard

**Priority: High**

### What is missing
AdminLayout.vue defaults to the Libraries tab; there is no stats/actions overview page. Absorb's `admin_screen.dart` provides this as the landing: server version, user counts, quick-action buttons.

### ABS API
- `GET /api/server/info` → `{ version, buildNumber }`
- `GET /api/users` (already used) → total + filter `isOnline`
- `GET /api/libraries` → count
- `GET /api/backups` → last backup date

### Design (Abscond pattern)
Add a new **Overview** tab (icon `mdi-view-dashboard-outline`) as the first admin tab and default redirect. Content:

```
┌──────────────────────────────────────────────────┐
│ Server v2.x.x              [Purge Cache] [Scan All]│
│ ─────────────────────────────────────────────────  │
│  👤 12 users   🟢 3 online   📚 3 libraries        │
│  💾 Last backup: May 14, 2026                      │
└──────────────────────────────────────────────────┘
```

Four stat pills in a 2×2 grid (same `accent-card` pattern as StatsView), followed by two action buttons: **Purge Cache** (`POST /api/cache/purge`) and **Scan All Libraries** (iterate `scanLibrary()` for each). Both show a spinner while in progress.

**Files:**
- Create: `src/views/admin/OverviewView.vue`
- Modify: `src/views/admin/AdminLayout.vue` — add Overview tab, change default redirect

---

## Gap 2 — Server Settings: Missing Options

**Priority: High**

### What is missing
`ServerSettingsView.vue` only exposes 5 settings. The ABS `/api/settings` endpoint returns many more. Missing:

| Setting key | Label | Control |
|---|---|---|
| `scannerCoverProvider` | Cover search provider | `<select>`: audible, itunes, openlibrary, googlebooks, audibookshelf |
| `scannerScanAllFileTypes` | Scan all file types | Toggle |
| `numBackupsToKeep` | Backups to keep | Number input (1–10) |
| `backupSchedule` | Auto-backup schedule | Select: Off / Daily / Weekly |
| `loggerDailyLogsToKeep` | Daily log retention (days) | Number input |
| `loggerScannerLogsToKeep` | Scanner log retention | Number input |
| `bookshelfView` | Default library view | Select: BookGrid / ListView |
| `authTokenAge` | Session token age | Select: 1d / 7d / 30d / 1y |

### ABS API
`PATCH /api/settings` with `{ settings: { ... } }` — already wired via `updateServerSettings()`.
`GET /api/settings` — already wired.

### Design
Extend `ServerSettingsView.vue` with additional `settings-group` blocks using existing toggle/select patterns. Keep the existing Save button behaviour.

**Files:**
- Modify: `src/views/admin/ServerSettingsView.vue`
- Modify: `src/api/admin/index.ts` — add the new fields to `ServerSettings` interface

---

## Gap 3 — Notifications Admin Tab

**Priority: Medium**

### What is missing
ABS has webhook/apprise notification support. No tab exists in Abscond for configuring it.

### ABS API
- `GET /api/notificationSettings` → `{ appriseType, appriseApiUrl, notifications: [...] }`
- `PATCH /api/notificationSettings` → update apprise URL
- `GET /api/notifications` → list configured notification events
- `PATCH /api/notifications/:id` → toggle enabled on an event
- `GET /api/notifications/:id/test` → fire a test notification

### Design
New **Notifications** tab (`mdi-bell-outline`). Two sections:

**Apprise settings card** — text input for Apprise API URL + Save button.

**Events list** — each notification event as a toggle row (icon `mdi-bell-ring-outline`, label = event name, sublabel = description, right = toggle pill). Below each row, show last-sent timestamp. A "Test" chip button next to the toggle fires a test.

Follow `perm-row` / `toggle` pattern from UsersView.

**Files:**
- Create: `src/views/admin/NotificationsView.vue`
- Create: `src/api/admin/notifications.ts`
- Modify: `src/views/admin/AdminLayout.vue` — add Notifications tab
- Modify: `src/router/index.ts` — add route `admin/notifications`

---

## Gap 4 — Metadata Providers Admin Tab

**Priority: Medium**

### What is missing
No way for admins to configure which metadata providers are active or their priority order. The MatchSheet hardcodes providers in the search flow, but server-side defaults are not configurable.

### ABS API
- `GET /api/settings` includes `metadataFileFormat` and `scannerCoverProvider`
- Providers are implicit in book matching; Abscond can manage the "default provider" shown in MatchSheet via this setting

### Design
Rather than a full drag-to-reorder panel (complex), add a **Metadata** sub-section inside Server Settings (Gap 2) with:
- `scannerCoverProvider` select (already in Gap 2)
- A "Default match provider" select matching what MatchSheet shows (audible, google, openlibrary, itunes)

This avoids a full new tab while solving the primary use case.

**Files:** Same as Gap 2.

---

## Gap 5 — User Detail View

**Priority: Medium**

### What is missing
Clicking a user in UsersView only opens an edit-permissions sheet. Absorb's `_UserDetailScreen` shows:
- Per-user listening stats (total time, books finished)
- Full paginated session history with device info and book covers
- "Jump to session" action

### ABS API
- `GET /api/users/:id` → user object with `mediaProgress` array
- `GET /api/users/:id/listening-sessions` → paginated sessions

### Design
Replace the "edit" icon tap with navigating to a new `admin/users/:id` route that shows a full-screen user detail page. Layout:

1. **Header card**: Avatar initial (large), username, type badge, last-seen
2. **Stats row**: total listening time, books finished (from `mediaProgress`)  
3. **Sessions section**: Infinite-scroll list matching StatsView session rows (cover thumbnail, title, date, duration)
4. **Edit button** in top-right: opens the existing permissions sheet

Follow `session-row` styles from StatsView; reuse `coverUrl()` for thumbnails.

**Files:**
- Create: `src/views/admin/UserDetailView.vue`
- Modify: `src/views/admin/UsersView.vue` — change edit icon to navigation
- Modify: `src/router/index.ts` — add `admin/users/:id`
- Modify: `src/api/admin/index.ts` — add `getUserSessions()` function

---

## Gap 6 — Podcast Episode Management (Admin)

**Priority: Medium**

### What is missing
LibrariesView can add podcasts via RSS and check all episodes at once, but there is no per-podcast management screen. Absorb's `_PodcastDetailScreen` has three tabs:
1. **Downloaded** — queued + downloaded episodes with delete
2. **Feed** — feed episodes with multi-select download
3. **Settings** — auto-download toggle, check-new schedule, feed URL

### ABS API
- `GET /api/items/:id?expanded=1&include=progress` → podcast with episodes array
- `GET /api/podcasts/:id/checknew` → check for new episodes
- `POST /api/podcasts/:id/download-episodes` → queue episode download
- `DELETE /api/podcasts/:podcastId/episodes/:episodeId?hard=0` → delete episode

### Design
When the user taps on a podcast name row in LibrariesView, navigate to a new `admin/podcast/:id` route. Layout:

Two-tab header (`Downloaded` / `Feed`) with Abscond's subnav-tab style.

- **Downloaded tab**: list of downloaded episodes (title, duration, file size), swipe-to-delete or tap trash icon
- **Feed tab**: list of feed episodes (title, publish date, duration) with per-episode Download button; shows loading spinner while queuing
- **Settings card** below the tabs: auto-download toggle, "Check for new" button, feed URL (monospace, tap-to-copy)

Follow `episode-row` styles from PodcastEpisodesView.

**Files:**
- Create: `src/views/admin/PodcastDetailView.vue`
- Modify: `src/views/admin/LibrariesView.vue` — add click handler on podcast item name → navigate
- Modify: `src/router/index.ts` — add `admin/podcast/:id`
- Modify: `src/api/admin/index.ts` — add `downloadEpisode()`, `deleteEpisode()`

---

## Gap 7 — Downloads Management View

**Priority: Low**

### What is missing
`src/api/downloads.ts` exists with `getDownloads()`, `deleteDownload()`, and `getDirectDownloadUrl()` but there is no UI. No route. The SettingsView "Data" section mentions local data but there is no downloads list.

This is a PWA limitation: `downloads.ts` probably refers to ABS's server-side download queue (items the server has downloaded from podcast feeds), not client-side cached audio.

### ABS API
- `GET /api/downloads` — list pending download queue entries

### Design
Add a **Downloads** section inside SettingsView (after the existing sections) visible to admins:
- List of active/pending downloads pulled from `/api/downloads`
- Each row: cover (small), title, progress bar, cancel button
- "Refresh" button to re-fetch

This keeps it lightweight rather than adding another top-level view.

**Files:**
- Modify: `src/views/SettingsView.vue` — add Downloads section (admin-only, inside collapsible)
- No new files needed (api already exists)

---

## Gap 8 — Admin Server Stats in Settings (Quick Win)

**Priority: Low**

### What is missing
The Settings → More section has an "About" link that currently shows version from SettingsStore. It doesn't show ABS server stats (version, build number, node version, etc.).

### ABS API
- `GET /api/server/info` (or `GET /api/ping`) → `{ version, buildNumber }`

### Design
Inside SettingsView's existing "Abscond" collapsible section, add server info rows:

```
Server version    v2.x.x
Build number      #123
```

Pulled on mount, displayed as `info-row` pairs.

**Files:**
- Modify: `src/views/SettingsView.vue`
- No new API file (call `api.get('/server/info')` inline)

---

## Design Language Reference

All new components must match:

| Token | Value |
|---|---|
| Page background | `#0e0e0e` |
| Card background | `#111` or `rgba(255,255,255,0.04)` |
| Card border | `1px solid rgba(255,255,255,0.06)` |
| Accent (amber) | `#d4a017` |
| Accent bg tint | `rgba(212,160,23,0.12)` |
| Destructive | `#c0392b` / `#ef4444` |
| Text primary | `rgba(255,255,255,0.9)` |
| Text secondary | `rgba(255,255,255,0.4–0.6)` |
| Border radius (card) | `12px` |
| Border radius (sheet) | `24px 24px 0 0` |
| Toggle ON | `background: #d4a017` |
| Toggle OFF | `background: rgba(255,255,255,0.12)` |
| Skeleton shimmer | `linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)` |
| Sheet z-index stack | SeriesDetail 300 < BookDetail 350 < BookActions 450 < Match 1000 |

New admin views must use `.admin-content { padding: 16px 12px 60px }` inherited from AdminLayout.
Bottom-sheet forms use `.create-content { padding: 8px 20px 40px }`.
Section labels: `font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.4)`.

---

## Implementation Priority Order

| # | Gap | Effort | Value |
|---|---|---|---|
| 1 | Gap 2: Server Settings expansion | Small | High |
| 2 | Gap 1: Admin Overview Dashboard | Medium | High |
| 3 | Gap 5: User Detail View | Medium | Medium |
| 4 | Gap 6: Podcast Episode Management | Medium | Medium |
| 5 | Gap 3: Notifications tab | Medium | Medium |
| 6 | Gap 4: Metadata Providers (via Gap 2) | Small | Medium |
| 7 | Gap 8: Server stats in Settings | Small | Low |
| 8 | Gap 7: Downloads section in Settings | Small | Low |
