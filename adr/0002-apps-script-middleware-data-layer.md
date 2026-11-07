# Default direct poll configuration with optional cache-warmed Google Apps Script middleware

## Context

TRMNL polls a plugin's data URLs to refresh the display. Two calendar data paths exist, and they have different trade-offs:

- **TRMNL Companion for iOS app (`iPhone App` data provider).** The companion app pushes calendar events from the phone (Apple Calendar, iCloud, and Google accounts synced to iOS) straight to TRMNL's Calendar plugin `/data` endpoint. This path requires no external script or server.
- **Native TRMNL Google Calendar sync in a playlist.** When the TRMNL Calendar plugin uses its native Google Calendar sync instead of the iOS app, two fixed TRMNL limits break direct polling:
  - **Playlist pause.** TRMNL pauses a native plugin's data sync while the plugin sits hidden in a playlist. The `/data` endpoint then serves frozen calendar events, even though the UI tooltip reports that sync is active.
  - **30s poll timeout.** TRMNL enforces a fixed 30-second timeout across all polling URLs as a unit. Open-Meteo occasionally takes 10 to 25 seconds. A live Google Calendar build reads every calendar and checks each event's RSVP status, which takes about 15 seconds and can exceed 30 seconds. One slow URL degrades the whole plugin.

## Decision

Configure `src/settings.yml` and `src/form_fields.yml` to poll TRMNL's Calendar plugin `/data` endpoint (fed by the TRMNL Companion for iOS app) plus direct Open-Meteo URLs by default. Keep the cache-warmed Google Apps Script web app (`src/middleware/calendar_weather_proxy.gs`) as an optional alternative for Google Calendar playlist sync.

- **Default direct mode (`src/settings.yml`, `src/form_fields.yml`):**
  - `IDX_0` polls `https://usetrmnl.com/api/plugin_settings/{{ calendar_plugin_id }}/data` with header `authorization=bearer {{ trmnl_api_key }}`. The user sets the TRMNL Calendar plugin's Data Provider to **iPhone App** in the TRMNL Companion for iOS app.
  - `IDX_1` and `IDX_2` poll the Open-Meteo forecast and air quality APIs directly.
- **Optional middleware mode (`src/middleware/calendar_weather_proxy.gs`):**
  - One Google Apps Script web app serves all three data sources at `?src=cal|weather|aqi` on the owner's Google account (free, no server).
  - The script reads Google Calendars directly with `CalendarApp`. This bypasses the native TRMNL Google Calendar plugin so the playlist pause cannot freeze events.
  - The script answers TRMNL immediately from `CacheService`. A time-driven trigger (`refreshUpstreamCaches`, every 15 minutes) rebuilds the calendar payload and warms the Open-Meteo caches, so a poll never waits on a live upstream. If an upstream is slow or down, the script serves the last good cached copy (`cacheMaxAgeSeconds` = 21600, the 6-hour `CacheService` maximum).
  - If a `CacheService` write fails (usually when a calendar payload exceeds the 100 KB value limit), the `?src=cal` response includes `data.cache_write_error` (the error text) so the template can display a diagnostic.
- **Shared data contract:** The middleware `?src=cal` response matches the shape of TRMNL's Calendar `/data` endpoint. In iOS Companion app payloads, `calname` holds per-event iCalendar UIDs and `background_color` holds the iOS calendar hex color, so `resolveCalendarName` and `styleForCalendar` resolve display names and bar styles from either calendar names (`calendar_names`) or `background_color`.

**Rejected alternative:** Native TRMNL Google Calendar sync in a playlist without the iOS Companion app or the Apps Script middleware. Rejected because the playlist pause freezes calendar data and the 30-second timeout trips on slow upstream responses.

## Consequences

**Positive:**

- Default installs need no Google Apps Script deployment: users connect the TRMNL Companion for iOS app, enter `trmnl_api_key` and `calendar_plugin_id`, and poll Open-Meteo directly.
- Users who rely on direct Google Calendar sync in a playlist can still deploy `src/middleware/calendar_weather_proxy.gs` to get instant cached responses and avoid the playlist pause.
- One template codebase supports both setups because both return the same calendar JSON shape.

**Trade-offs and follow-up:**

- Direct mode depends on the TRMNL Companion for iOS app to keep the TRMNL Calendar plugin's `/data` endpoint fresh, and its live Open-Meteo calls share TRMNL's 30-second poll timeout.
- Middleware users must deploy and maintain the Apps Script project, and must deploy a new version whenever they edit the script (the `/exec` URL serves old code otherwise; see `src/middleware/AGENTS.md`).
- The middleware runs on Google Apps Script and cannot be imported by `bun test`. `src/lib/middleware.js` holds its pure helpers for unit tests (ADR 0006), and live deployments verify its Google-service calls.
