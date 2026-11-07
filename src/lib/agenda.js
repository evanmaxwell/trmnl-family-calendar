// Pure helpers for the 3-day agenda list view. This module is the single
// source; the build step (build.mjs, `bun run build`) inlines it into the
// generated `src/agenda.liquid`. Never edit that generated copy. See
// src/AGENTS.md and adr/0006-extracted-testable-helpers-with-inline-copies.md.

import { toMin } from './eventLayout.js';

/**
 * Add whole days to an ISO date. Uses UTC math on purpose: local-time Date
 * math shifts a date by one day on renderers west of UTC.
 * @param {string} iso - "YYYY-MM-DD"
 * @param {number} n - days to add (may be negative)
 * @returns {string} "YYYY-MM-DD"
 */
export function addDays(iso, n) {
  var p = iso.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

/**
 * First day of the week that contains `iso`.
 * @param {string} iso - "YYYY-MM-DD"
 * @param {number} firstDay - 0 = Sunday, 1 = Monday
 * @returns {string} "YYYY-MM-DD"
 */
export function weekStart(iso, firstDay) {
  var p = iso.split('-');
  var dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  return addDays(iso, -((dow - (firstDay || 0) + 7) % 7));
}

/**
 * Easy-to-read 12-hour clock: "7:00 PM", "9:30 AM".
 * @param {number} m - minutes since midnight (1440 counts as midnight)
 * @returns {string}
 */
export function fmtClock(m) {
  var t = ((m % 1440) + 1440) % 1440;
  var h24 = Math.floor(t / 60), mm = t % 60;
  var h = h24 % 12; if (h === 0) h = 12;
  return h + ':' + (mm < 10 ? '0' : '') + mm + (h24 >= 12 ? ' PM' : ' AM');
}

/**
 * Group events into `count` consecutive days starting at `today`. Each day
 * holds its all-day events and its timed events sorted by start time, with
 * `sm`/`em` in minutes. An end on a later day is clamped to midnight (1440).
 * @param {Array<Object>} events - flat event array from the middleware
 * @param {string} today - "YYYY-MM-DD" in the calendar's time zone
 * @param {number} count - number of days
 * @returns {Array<Object>} date, allDay, and timed for each day
 */
export function agendaDays(events, today, count) {
  var days = [], byDate = {};
  for (var i = 0; i < count; i++) {
    var date = addDays(today, i);
    var day = { date: date, allDay: [], timed: [] };
    days.push(day); byDate[date] = day;
  }
  for (var j = 0; j < events.length; j++) {
    var ev = events[j];
    if (ev.all_day) {
      var sd = (ev.start_full || ev.start || '').substring(0, 10);
      var ed = (ev.end_full || ev.end || '').substring(0, 10) || addDays(sd, 1);
      if (!sd) continue;
      for (var d = sd; d < ed; d = addDays(d, 1)) { if (byDate[d]) byDate[d].allDay.push(ev); }
    } else {
      var dk = (ev.date_time || ev.start_full || '').substring(0, 10);
      if (!byDate[dk]) continue;
      var sm = toMin(ev.start, ev.start_full || ev.date_time);
      if (sm < 0) continue;
      var endDay = (ev.end_full || '').substring(0, 10);
      var em = endDay && endDay > dk ? 1440 : toMin(ev.end, ev.end_full);
      if (em <= sm) em = sm + 60;
      byDate[dk].timed.push({ ev: ev, sm: sm, em: em });
    }
  }
  for (var k = 0; k < days.length; k++) days[k].timed.sort(function (a, b) { return a.sm - b.sm || a.em - b.em; });
  return days;
}

/**
 * Compile a `day_notes` form field string into a weekday-to-note map (`0` =
 * Sunday through `6` = Saturday). Accepts comma-, semicolon-, or newline-
 * separated `Day=Note` or `Day: Note` entries with full or short weekday names.
 * Double braces are avoided in JSDoc because this file is inlined into Liquid.
 * @param {string|null|undefined} raw
 * @returns {Object} map of weekday number (0..6) to note string
 */
export function compileDayNotes(raw) {
  var out = {};
  if (!raw) return out;
  var dayMap = {
    sun: 0, sunday: 0, '0': 0,
    mon: 1, monday: 1, '1': 1,
    tue: 2, tues: 2, tuesday: 2, '2': 2,
    wed: 3, weds: 3, wednesday: 3, '3': 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4, '4': 4,
    fri: 5, friday: 5, '5': 5,
    sat: 6, saturday: 6, '6': 6
  };
  var parts = String(raw).split(/(?:[\r\n;]+|\s*,\s*(?=(?:sun|mon|tue|wed|thu|fri|sat|[0-6])[a-z]*\s*[:=]))/i);
  for (var i = 0; i < parts.length; i++) {
    var m = /^([a-z0-9]+)\s*[:=]\s*(.+)$/i.exec(parts[i].trim());
    if (!m) continue;
    var dow = dayMap[m[1].toLowerCase()];
    var note = m[2].trim();
    if (dow !== undefined && note) {
      out[dow] = out[dow] ? out[dow] + ' · ' + note : note;
    }
  }
  return out;
}
