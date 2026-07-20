// The day/night clock runs on its OWN real-time timer (run.dayMs), wholly apart
// from the sim ticks that drive how fast you grow — a full day is 6 real minutes.
// Shops, the church, taverns, and the best hours for illicit work all key off the
// hour derived here.

import type { RunState } from './types';
import { DAY_LENGTH_MS, HOUR_LENGTH_MS } from './timeconst';

/** 0–23, the current hour of the day/night cycle. */
export function hourOfDay(run: RunState): number {
  const ms = ((run.dayMs ?? 0) % DAY_LENGTH_MS + DAY_LENGTH_MS) % DAY_LENGTH_MS;
  return Math.floor(ms / HOUR_LENGTH_MS) % 24;
}

/** The town vendor / market — open 8 am to 5 pm. */
export function shopOpen(run: RunState): boolean {
  const h = hourOfDay(run);
  return h >= 8 && h < 17;
}

/** The church — open 6 am to 9 pm. */
export function churchOpen(run: RunState): boolean {
  const h = hourOfDay(run);
  return h >= 6 && h < 21;
}

/** The taverns — open 6 am to 2 am. */
export function tavernOpen(run: RunState): boolean {
  const h = hourOfDay(run);
  return h >= 6 || h < 2;
}

/** The dead of night — 2 am to 5 am — when illicit work is least likely to be
 *  seen. Thieves prosper in these hours. */
export function illicitPrime(run: RunState): boolean {
  const h = hourOfDay(run);
  return h >= 2 && h < 5;
}

export type DayPart = 'night' | 'dawn' | 'day' | 'dusk';

/** Coarse phase of the day, for the sky/lighting. */
export function dayPart(run: RunState): DayPart {
  const h = hourOfDay(run);
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 18) return 'day';
  if (h >= 18 && h < 21) return 'dusk';
  return 'night';
}

/** "3:00 AM" — a 12-hour clock string for a whole-hour value. */
export function formatClock(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr}:00 ${period}`;
}
