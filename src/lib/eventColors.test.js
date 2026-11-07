import { describe, expect, test } from 'bun:test';
import { STYLE_SLOTS, colorNameForHex, compileCalendarStyles, isEventUid, resolveCalendarName, styleForCalendar } from './eventColors.js';

describe('STYLE_SLOTS', () => {
  test('defines the six visual pattern slots in legend order with distinct bars', () => {
    expect(STYLE_SLOTS).toEqual([
      { key: 'cal_solid_black', bar: 1, invert: false },
      { key: 'cal_solid_gray', bar: 0, invert: false },
      { key: 'cal_diag_stripes', bar: 4, invert: false },
      { key: 'cal_horiz_stripes', bar: 7, invert: false },
      { key: 'cal_outlined', bar: 2, invert: false },
      { key: 'cal_inverted', bar: 10, invert: true }
    ]);
    const bars = STYLE_SLOTS.map((s) => s.bar);
    expect(new Set(bars).size).toBe(bars.length);
  });
});

describe('compileCalendarStyles', () => {
  test('returns an empty ordered list and map when all fields are blank or missing', () => {
    expect(compileCalendarStyles({})).toEqual({ ordered: [], byCalName: {} });
    expect(compileCalendarStyles(null)).toEqual({ ordered: [], byCalName: {} });
    expect(compileCalendarStyles({ cal_solid_black: '   ,  ' })).toEqual({ ordered: [], byCalName: {} });
  });

  test('compiles configured form fields in slot order', () => {
    const styles = compileCalendarStyles({
      cal_solid_black: 'Family',
      cal_solid_gray: 'Lindy',
      cal_diag_stripes: 'Adam',
      cal_horiz_stripes: 'Julian',
      cal_outlined: 'Birthdays',
      cal_inverted: 'Holidays'
    });
    expect(styles.ordered).toEqual([
      { name: 'Family', bar: 1, invert: false },
      { name: 'Lindy', bar: 0, invert: false },
      { name: 'Adam', bar: 4, invert: false },
      { name: 'Julian', bar: 7, invert: false },
      { name: 'Birthdays', bar: 2, invert: false },
      { name: 'Holidays', bar: 10, invert: true }
    ]);
  });

  test('supports Calendar Name=Short Label aliasing and comma-separated calendars', () => {
    const styles = compileCalendarStyles({
      cal_solid_black: 'Family Calendar=Family',
      cal_inverted: 'US Holidays=Holidays, Religious Holidays=Holidays'
    });
    expect(styles.ordered).toEqual([
      { name: 'Family', bar: 1, invert: false },
      { name: 'Holidays', bar: 10, invert: true }
    ]);
    expect(styleForCalendar('Family Calendar', '', styles)).toEqual({ name: 'Family', bar: 1, invert: false });
    expect(styleForCalendar('Family', '', styles)).toEqual({ name: 'Family', bar: 1, invert: false });
    expect(styleForCalendar('US Holidays', '', styles)).toEqual({ name: 'Holidays', bar: 10, invert: true });
    expect(styleForCalendar('Religious Holidays', '', styles)).toEqual({ name: 'Holidays', bar: 10, invert: true });
  });
});

describe('styleForCalendar', () => {
  const styles = compileCalendarStyles({
    cal_solid_black: 'Family',
    cal_solid_gray: 'Alex=Alex',
    cal_outlined: 'Birthdays',
    cal_inverted: 'US Holidays=Holidays'
  });

  test('matches calendar names case-insensitively', () => {
    expect(styleForCalendar('family', '', styles)).toEqual({ name: 'Family', bar: 1, invert: false });
    expect(styleForCalendar('FAMILY', '', styles)).toEqual({ name: 'Family', bar: 1, invert: false });
    expect(styleForCalendar('us holidays', '', styles)).toEqual({ name: 'Holidays', bar: 10, invert: true });
  });

  test('falls back to rawCalName when the resolved display name does not match', () => {
    const emailStyles = compileCalendarStyles({
      cal_solid_black: 'family@group.calendar.google.com=Family'
    });
    expect(styleForCalendar('Shared Calendar', 'family@group.calendar.google.com', emailStyles)).toEqual({
      name: 'Family',
      bar: 1,
      invert: false
    });
  });

  test('returns null for unmapped or empty calendars', () => {
    expect(styleForCalendar('', '', styles)).toBeNull();
    expect(styleForCalendar(undefined, undefined, styles)).toBeNull();
    expect(styleForCalendar('Work', 'work@company.com', styles)).toBeNull();
    expect(styleForCalendar('Family', '', null)).toBeNull();
  });

  test('matches iOS Companion app calendars by color name or hex when calname is a UUID', () => {
    const iosStyles = compileCalendarStyles({
      cal_solid_black: 'Pink=Primary',
      cal_solid_gray: 'Red=Birthdays',
      cal_diag_stripes: 'Orange=D&D',
      cal_outlined: 'Brown=Meals',
      cal_inverted: 'Green=Holidays'
    });
    expect(styleForCalendar('Pink', '8e6f9a3d-6fc6-48fc-8ae8-2aa019daa0dc', iosStyles, '#FF12D9')).toEqual({
      name: 'Primary',
      bar: 1,
      invert: false
    });
    expect(styleForCalendar('Red', '2FAB523F-24C3-4F8D-8C95-36FB127848AF', iosStyles, '#FF383C')).toEqual({
      name: 'Birthdays',
      bar: 0,
      invert: false
    });
    expect(styleForCalendar('Orange', '845FB949-6F21-4924-A290-F4D7829F4EFF', iosStyles, '#ED732E')).toEqual({
      name: 'D&D',
      bar: 4,
      invert: false
    });
    expect(styleForCalendar('Brown', 'e067a40e-4abd-4f43-ba3e-a1969d77a410', iosStyles, '#AC7F5E')).toEqual({
      name: 'Meals',
      bar: 2,
      invert: false
    });
    expect(styleForCalendar('Green', '61aaab27-ceae-3e2a-980e-f56f50bbd976', iosStyles, '#83D754')).toEqual({
      name: 'Holidays',
      bar: 10,
      invert: true
    });
  });

  test('matches explicit hex codes in form fields', () => {
    const hexStyles = compileCalendarStyles({
      cal_solid_black: '#FF12D9=Primary',
      cal_diag_stripes: 'ED732E=D&D'
    });
    expect(styleForCalendar('Pink', '8e6f9a3d-6fc6-48fc-8ae8-2aa019daa0dc', hexStyles, '#FF12D9')).toEqual({
      name: 'Primary',
      bar: 1,
      invert: false
    });
    expect(styleForCalendar('Orange', '845FB949-6F21-4924-A290-F4D7829F4EFF', hexStyles, '#ED732E')).toEqual({
      name: 'D&D',
      bar: 4,
      invert: false
    });
  });
});

describe('isEventUid', () => {
  test('identifies UUIDs and long hex event IDs from the iOS Companion app', () => {
    expect(isEventUid('8e6f9a3d-6fc6-48fc-8ae8-2aa019daa0dc')).toBe(true);
    expect(isEventUid('03172FB4-743A-4ED1-99C3-C45B45D11955')).toBe(true);
    expect(isEventUid('FABD7E1639BF9812368FB1B919128CE4748AFA8E_0')).toBe(true);
  });

  test('does not flag real calendar names or email addresses', () => {
    expect(isEventUid('Family')).toBe(false);
    expect(isEventUid('US Holidays')).toBe(false);
    expect(isEventUid('guplem@gmail.com')).toBe(false);
    expect(isEventUid('')).toBe(false);
  });
});

describe('colorNameForHex', () => {
  test('maps iOS Calendar background_color hex codes to friendly color names', () => {
    expect(colorNameForHex('#FF12D9')).toBe('Pink');
    expect(colorNameForHex('#ED732E')).toBe('Orange');
    expect(colorNameForHex('#83D754')).toBe('Green');
    expect(colorNameForHex('#FF383C')).toBe('Red');
    expect(colorNameForHex('#AC7F5E')).toBe('Brown');
    expect(colorNameForHex('#007AFF')).toBe('Blue');
    expect(colorNameForHex('#AF52DE')).toBe('Purple');
    expect(colorNameForHex('#FFCC00')).toBe('Yellow');
    expect(colorNameForHex('')).toBe('');
  });
});

describe('resolveCalendarName', () => {
  test('replaces iOS event UUIDs with the calendar color name from background_color', () => {
    expect(resolveCalendarName('8e6f9a3d-6fc6-48fc-8ae8-2aa019daa0dc', '#FF12D9', {})).toBe('Pink');
    expect(resolveCalendarName('8e6f9a3d-6fc6-48fc-8ae8-2aa019daa0dc', '', {})).toBe('');
    expect(resolveCalendarName('guplem@gmail.com', '', { 'guplem@gmail.com': 'Personal' })).toBe('Personal');
    expect(resolveCalendarName('Family', '#FF12D9', {})).toBe('Family');
  });
});
