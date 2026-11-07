# TRMNL Family Calendar

Three [TRMNL](https://usetrmnl.com) e-ink views of one shared family Google Calendar, with weather and air quality. They run as three private plugins in one playlist on a **TRMNL X** (1872 x 1404, 4-bit grayscale).

| Plugin | What it shows |
|---|---|
| **Calendar + Weather (X)** | The week as an hour-by-hour time grid (7 AM to 10 PM), with hourly temperature and rain behind each day |
| **Week Agenda (X)** | The current week, Sunday to Saturday, as easy-to-read event lists in a 4 x 2 grid, plus a weather tile for today |
| **Month at a Glance (X)** | Today's date, holidays, and weather on top, then five weeks as a month grid |

## Screenshots

These mockups use made-up events and names. Each one is a full TRMNL X screen (1872 x 1404).

**Calendar + Weather (X)**

![Calendar + Weather view: a week as an hour-by-hour grid with weather](docs/screenshots/calendar-weather.png)

**Week Agenda (X)**

![Week Agenda view: the week as event lists in a 4 x 2 grid, with a weather tile](docs/screenshots/week-agenda.png)

**Month at a Glance (X)**

![Month at a Glance view: five weeks as a month grid, with today's weather on top](docs/screenshots/month-at-a-glance.png)

This project is a fork of [guplem/trmnl-cal-weather](https://github.com/guplem/trmnl-cal-weather). That project built the time-grid view, the Apps Script middleware, and the test and build setup. This fork adapts them for the TRMNL X and a family calendar, and adds the two other views.

## Features

**In all three views**

- **Calendar bar patterns.** Six plugin form fields in [`src/form_fields.yml`](src/form_fields.yml) assign a grayscale bar pattern to each calendar name or iOS calendar color (`Pink`, `Red`, `Orange`, `Brown`, `Green`, `Blue`, `Purple`, `Yellow`, or hex code). Each field accepts comma-separated entries, or `Key=Label` to set the legend label.

  | Form field (`src/form_fields.yml`) | Pattern | Example |
  |---|---|---|
  | `cal_solid_black` | Solid black bar (`bar 1`) | `Pink=Primary` |
  | `cal_solid_gray` | Solid gray bar (`bar 0`) | `Red=Birthdays` |
  | `cal_diag_stripes` | Black diagonal stripes (`bar 4`) | `Orange=D&D` |
  | `cal_horiz_stripes` | Black horizontal stripes (`bar 7`) | `Blue=Work` |
  | `cal_outlined` | White outlined bar (`bar 2`) | `Brown=Meals` |
  | `cal_inverted` | White text on solid black (`bar 10`, also listed under today's date in Month view) | `Green=Holidays` |
  | Unmapped calendar | Gray horizontal stripes (`Other`, `bar 5`), or auto-assigned when all six fields are blank | |

- **12-hour times**, Fahrenheit, mph, and the US air quality index (AQI)
- **Earlier days and finished events in dark gray**, so they stay readable on e-ink
- **Fits the TRMNL X screen.** The views also work on the 800 x 480 TRMNL OG.

**Calendar + Weather (X)**

- Events at their real time slots, with overlapping events side by side
- A fixed 7 AM to 10 PM range that grows to fit an earlier or later event
- The current half hour highlighted; weekends shaded
- Sunrise, sunset, UV index, wind and gusts, and AQI in the legend; the AQI number gets darker as air quality gets worse

**Week Agenda (X)**

- Sunday to Saturday (or Monday to Sunday), with today outlined in black
- Each event shows its start time, end time, title, and location; all-day titles wrap up to 2 lines and timed titles wrap up to 3 lines
- A busy day ends with "+ N more" instead of a cut-off row
- Optional weekly day notes at the bottom of set days (`day_notes` form field, e.g. `Monday=Trash & recycling, Wednesday=Compost`)

**Month at a Glance (X)**

- Five weeks from the start of the current week
- Multi-day events (trips, school closures) drawn as one bar across their days
- Long event names wrap when the day has room
- Today's holidays listed under the date

## How it works

```
TRMNL Companion for iOS app
    pushes iPhone calendars to your native TRMNL Calendar plugin (Data Provider: iPhone App)
              |
TRMNL polls three URLs directly (about every 15 min)
    |
    +--> usetrmnl.com/api/plugin_settings/{{ calendar_plugin_id }}/data   calendar events
    +--> api.open-meteo.com/v1/forecast                                   weather (Fahrenheit, mph)
    +--> air-quality-api.open-meteo.com/v1/air-quality                    air quality (US AQI)
              |
    Three Liquid templates (one per plugin), all reading the same data:
        src/full.liquid     Calendar + Weather
        src/agenda.liquid   Week Agenda
        src/month.liquid    Month at a Glance
```

All three plugins use the same form fields ([`src/form_fields.yml`](src/form_fields.yml)) and the same three polling URLs ([`src/settings.yml`](src/settings.yml)).

If you do not use the iOS app, you can deploy the optional Google Apps Script middleware in **[MIDDLEWARE_SETUP.md](MIDDLEWARE_SETUP.md)** instead.

## Setup

Plan on about 20 minutes. You do not need a server or any coding.

> **Do you use Claude Code?** Open this repo and ask Claude to "set up the family calendar". The `setup-family-calendar` skill asks about your household (calendars, patterns, location, chores), customizes the code, and walks you through every step below.

### What you need

- **A TRMNL device and account.** Private plugins need the TRMNL Developer add-on or a BYOD (bring your own device) license. If you do not have either, turn on **Developer perks** in your TRMNL account settings.
- **Your personal TRMNL API key.** Copy it from [trmnl.com/account](https://trmnl.com/account) (starts with `user_...`). The private plugin uses this key to read your native TRMNL Calendar plugin data.
- **The TRMNL Companion for iOS app** on an iPhone or iPad that holds your calendars. (To read Google Calendar without the iOS app, see **[MIDDLEWARE_SETUP.md](MIDDLEWARE_SETUP.md)** for the optional Google Apps Script alternative.)
- **Your latitude, longitude, and time zone**, for the weather. Find your coordinates at [open-meteo.com](https://open-meteo.com/en/docs). Open-Meteo is free and needs no account.

### Step 1: Set up the native TRMNL Calendar plugin

1. In TRMNL, open your native **Calendar** plugin (or add one under **Plugins > Calendar**).
2. Set **Data Provider** to **iPhone App** and save.
3. Open the **TRMNL Companion for iOS** app, sign in, and select the calendars that you want on the display.
4. Copy the numeric `plugin_setting_id` from the browser URL when you edit the Calendar plugin: `usetrmnl.com/plugin_settings/12345/edit`.

### Step 2: Create the three private plugins

For each plugin, go to **Plugins > Private Plugin > Add new**, then:

1. Give the plugin a name, for example `Calendar + Weather (X)`.
2. Set **Strategy** to `Polling` and **Polling Verb** to `GET`.
3. Paste the form fields from [`src/form_fields.yml`](src/form_fields.yml) into the plugin's custom fields.
4. Add the three polling URLs from [`src/settings.yml`](src/settings.yml), one per line:

   ```
   https://usetrmnl.com/api/plugin_settings/{{ calendar_plugin_id }}/data
   https://api.open-meteo.com/v1/forecast?latitude={{ latitude }}&longitude={{ longitude }}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max&hourly=temperature_2m,precipitation_probability&%63urrent=temperature_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone={{ timezone }}&forecast_days=7
   https://air-quality-api.open-meteo.com/v1/air-quality?latitude={{ latitude }}&longitude={{ longitude }}&%63urrent=us_aqi&timezone={{ timezone }}
   ```

5. Add the polling header from [`src/settings.yml`](src/settings.yml):

   ```
   authorization=bearer {{ trmnl_api_key }}
   ```

6. Save, open **Edit Markup** (Full view), and paste the whole matching file:

   | Plugin | Paste this file |
   |---|---|
   | Calendar + Weather (X) | [`src/full.liquid`](src/full.liquid) |
   | Week Agenda (X) | [`src/agenda.liquid`](src/agenda.liquid) |
   | Month at a Glance (X) | [`src/month.liquid`](src/month.liquid) |

### Step 3: Fill in the plugin form fields

In the plugin settings page, fill in the custom form fields:

1. Enter your **TRMNL API Key** (`trmnl_api_key`) and **Calendar Plugin ID** (`calendar_plugin_id`).
2. Enter your **Latitude**, **Longitude**, and **Timezone**.
3. Assign your calendar names to the six bar-pattern fields (`cal_solid_black`, `cal_solid_gray`, `cal_diag_stripes`, `cal_horiz_stripes`, `cal_outlined`, `cal_inverted`). Separate multiple calendars in one field with commas. Write `Calendar Name=Label` (for example `US Holidays=Holidays`) to show a shorter name in the legend.
4. Save, click **Force Refresh**, and add the plugin to your playlist. TRMNL sometimes adds a new plugin to the playlist by itself; remove any duplicate.

### Optional: Google Apps Script middleware

If you do not use the iOS app, or if you want the middleware's trigger-warmed cache and 35-day Google Calendar window, follow **[MIDDLEWARE_SETUP.md](MIDDLEWARE_SETUP.md)** to deploy `src/middleware/calendar_weather_proxy.gs` on your Google account.

## Customization

- **Location:** change **Latitude**, **Longitude**, and **Timezone** in the plugin form fields (or `lat`, `lon`, and `tz` in the middleware URLs). Find coordinates at [open-meteo.com](https://open-meteo.com/en/docs).
- **Calendar patterns:** edit the six calendar pattern fields (`cal_solid_black` through `cal_inverted`) in the plugin settings, or edit `STYLE_SLOTS` in [`src/lib/eventColors.js`](src/lib/eventColors.js) and rebuild.
- **Ignore events:** fill the **Ignored phrases** plugin setting with comma-separated, case-insensitive patterns, for example `^Work$`.
- **Declined events:** the optional middleware hides declined events by default. Set `CONFIG.hideDeclinedEvents` to `false` to show them.
- **Hours on the time grid:** change the `7*60, 22*60` range passed to `gridRange` in `src/full.liquid.template`.

## Development

The shared logic lives once in `src/lib/`, each part with unit tests. A build step inlines it into the four generated files that you paste into TRMNL and Apps Script: `src/full.liquid`, `src/agenda.liquid`, `src/month.liquid`, and `src/middleware/calendar_weather_proxy.gs`. Never edit those four by hand.

With [Bun](https://bun.sh):

```bash
bun run build   # regenerate the four files after editing src/lib or a *.template
bun test .      # run all tests, including a check that the generated files are current
```

After a build, paste the regenerated file into the matching TRMNL markup editor. After editing the Apps Script, deploy it as a **New version** (Deploy > Manage deployments > edit) so the `/exec` URL keeps working.

## Troubleshooting

- **Only part of the calendar shows on the TRMNL X:** use the current templates. The X renderer draws the page at 1040 x 780, then resizes it to 1872 x 1404 before the capture, and the templates re-fit on that resize.
- **New events do not appear:** the middleware cache refreshes every 15 minutes. Run `refreshUpstreamCaches` in the Apps Script editor to refresh it now, then **Force Refresh** the plugin.
- **Later weeks are empty in the month view:** check that `CONFIG.daysAhead` is `35` in the deployed script.

More debugging steps are in **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**.

## Credits

The time-grid view, the middleware, and the build and test setup come from [guplem/trmnl-cal-weather](https://github.com/guplem/trmnl-cal-weather). Weather and air quality data come from [Open-Meteo](https://open-meteo.com).
