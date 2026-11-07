// Pure calendar-to-pattern mapping. This module is the single source; the
// build step (build.mjs, `bun run build`) inlines it into the generated
// `src/full.liquid`, `src/agenda.liquid`, and `src/month.liquid`.
// `styleForCalendar` takes the compiled styles as a parameter so it stays pure;
// the build emits it as `styleForCalendarPure` plus a wrapper
// `styleForCalendar(calName, rawCalName, bgColor)` that binds the template's
// CALENDAR_STYLES. Never edit the generated copies. See src/AGENTS.md and
// adr/0006-extracted-testable-helpers-with-inline-copies.md.

/**
 * Form-field pattern slots in legend order. Each slot maps one plugin form
 * field key to a 2-bit grayscale bar pattern (ADR 0004). `invert` draws the
 * event as white text on black (holidays) instead of a patterned bar.
 */
export var STYLE_SLOTS = [
  { key: 'cal_solid_black', bar: 1, invert: false },
  { key: 'cal_solid_gray', bar: 0, invert: false },
  { key: 'cal_diag_stripes', bar: 4, invert: false },
  { key: 'cal_horiz_stripes', bar: 7, invert: false },
  { key: 'cal_outlined', bar: 2, invert: false },
  { key: 'cal_inverted', bar: 10, invert: true }
];

/**
 * True when `str` is an event UID rather than a human calendar name. The TRMNL
 * Companion for iOS app populates `calname` with the event's iCalendar UID
 * (a UUID or long hex digest) and sends the calendar's color in
 * `background_color`.
 * @param {string|undefined|null} str
 * @returns {boolean}
 */
export function isEventUid(str) {
  if (!str) return false;
  var s = String(str).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ||
         /^[0-9a-f]{24,}(_[0-9]+)?$/i.test(s);
}

/**
 * Map a 6-digit hex color (from `background_color` in the TRMNL Companion for
 * iOS app payload) to a friendly color name: Pink, Orange, Brown, Yellow,
 * Green, Blue, Purple, Red, or Gray. Returns '' when `hex` is not a valid
 * 6-digit hex color.
 * @param {string|undefined|null} hex - e.g. "#FF12D9"
 * @returns {string}
 */
export function colorNameForHex(hex) {
  if (!hex) return '';
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return '';
  var n = parseInt(m[1], 16);
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 25) return 'Gray';
  var h;
  if (max === r) h = ((g - b) / d) * 60 + (g < b ? 360 : 0);
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  var s = max === 0 ? 0 : d / max;
  if (h >= 15 && h < 45) return (s < 0.55 || max < 200) ? 'Brown' : 'Orange';
  if (h >= 45 && h < 70) return 'Yellow';
  if (h >= 70 && h < 165) return 'Green';
  if (h >= 165 && h < 255) return 'Blue';
  if (h >= 255 && h < 290) return 'Purple';
  if (h >= 290 && h < 345) return 'Pink';
  return 'Red';
}

/**
 * Resolve an event's calendar display name. Uses `calFriendlyNames` when mapped
 * (middleware email -> name), keeps `rawCalName` when it is a real calendar
 * name, and falls back to the friendly color name of `bgColor` when `rawCalName`
 * is a per-event UID from the TRMNL Companion for iOS app.
 * @param {string|undefined} rawCalName - `ev.calname` or `ev.calendar_name`
 * @param {string|undefined} bgColor - `ev.background_color`
 * @param {Object|null|undefined} calFriendlyNames - email-to-name map
 * @returns {string}
 */
export function resolveCalendarName(rawCalName, bgColor, calFriendlyNames) {
  var raw = rawCalName ? String(rawCalName).trim() : '';
  if (raw && calFriendlyNames && calFriendlyNames[raw]) return calFriendlyNames[raw];
  if (raw && !isEventUid(raw)) return raw;
  if (bgColor) return colorNameForHex(bgColor) || String(bgColor).trim();
  return '';
}

/**
 * Compile the six calendar-style form fields into a legend list and a
 * case-insensitive calendar-name/color lookup map. Each field accepts one or
 * more comma-separated calendar names, iOS calendar color names (Pink, Orange,
 * Green, Red, Brown, Blue, Purple, Yellow), or hex codes, with optional
 * `Calendar=Short Label` syntax to show a custom name in the legend.
 * Double braces are avoided in JSDoc because this file is inlined into Liquid.
 * @param {Object|null|undefined} fields - map of form field keynames to raw strings
 * @returns {Object} object holding ordered list and byCalName map
 */
export function compileCalendarStyles(fields) {
  var ordered = [], byCalName = {};
  if (!fields || typeof fields !== 'object') return { ordered: ordered, byCalName: byCalName };
  for (var i = 0; i < STYLE_SLOTS.length; i++) {
    var slot = STYLE_SLOTS[i];
    var raw = fields[slot.key];
    if (!raw) continue;
    var parts = String(raw).split(',');
    for (var j = 0; j < parts.length; j++) {
      var token = parts[j].trim();
      if (!token) continue;
      var eq = token.indexOf('=');
      var calName = eq >= 0 ? token.substring(0, eq).trim() : token;
      var label = eq >= 0 ? (token.substring(eq + 1).trim() || calName) : calName;
      if (!calName) continue;
      var entry = { name: label, bar: slot.bar, invert: !!slot.invert };
      var key = calName.toLowerCase();
      byCalName[key] = entry;
      byCalName[label.toLowerCase()] = entry;
      if (key === 'magenta') byCalName['pink'] = entry;
      if (key === 'pink') byCalName['magenta'] = entry;
      if (key === 'grey') byCalName['gray'] = entry;
      if (key === 'gray') byCalName['grey'] = entry;
      if (/^#[0-9a-f]{6}$/.test(key)) byCalName[key.substring(1)] = entry;
      if (/^[0-9a-f]{6}$/.test(key)) byCalName['#' + key] = entry;
      var exists = false;
      for (var k = 0; k < ordered.length; k++) {
        if (ordered[k].name === entry.name && ordered[k].bar === entry.bar && ordered[k].invert === entry.invert) {
          exists = true;
          break;
        }
      }
      if (!exists) ordered.push(entry);
    }
  }
  return { ordered: ordered, byCalName: byCalName };
}

/**
 * Style entry for a calendar name or iOS `background_color`, or null when the
 * calendar is not mapped in the form fields. Checks the resolved display name
 * first, then `rawCalName`, then `bgColor` (both hex and friendly color name).
 * Double braces are avoided in JSDoc because this file is inlined into Liquid.
 * @param {string|undefined} calName - resolved display name of the calendar
 * @param {string|undefined} rawCalName - raw `calname` from the event payload
 * @param {Object|null|undefined} calendarStyles - compiled by compileCalendarStyles
 * @param {string|undefined} [bgColor] - `background_color` hex from the iOS app
 * @returns {Object|null} name, bar, invert, or null
 */
export function styleForCalendar(calName, rawCalName, calendarStyles, bgColor) {
  if (!calendarStyles || !calendarStyles.byCalName) return null;
  var map = calendarStyles.byCalName;
  if (calName) {
    var hit = map[String(calName).trim().toLowerCase()];
    if (hit) return hit;
  }
  if (rawCalName && !isEventUid(rawCalName)) {
    var rawHit = map[String(rawCalName).trim().toLowerCase()];
    if (rawHit) return rawHit;
  }
  if (bgColor) {
    var bgKey = String(bgColor).trim().toLowerCase();
    if (map[bgKey]) return map[bgKey];
    var cName = colorNameForHex(bgColor);
    if (cName && map[cName.toLowerCase()]) return map[cName.toLowerCase()];
  }
  if (rawCalName) {
    var uidHit = map[String(rawCalName).trim().toLowerCase()];
    if (uidHit) return uidHit;
  }
  return null;
}
