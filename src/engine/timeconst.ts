// Time constants live alone so both the engine and the survival sim can import
// them without a circular dependency.

export const TICKS_PER_DAY = 24;
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

// The SIM clock. Ticks drive everything you do — activities, skills, attributes,
// needs, income, aging — at a lively pace so you learn and grow quickly. One tick
// every 2 real seconds at 1×; higher speeds skip through smoothly.
export const REAL_MS_PER_TICK = 2000;

// The DAY/NIGHT clock is a SEPARATE, real-time timer (it does NOT gate how fast
// you grow). A full day — sunrise to sunrise, the whole shop/church/tavern
// schedule — takes 6 real minutes at 1×, so an hour is 15 real seconds.
export const DAY_LENGTH_MS = 6 * 60 * 1000; // 6 minutes
export const HOUR_LENGTH_MS = DAY_LENGTH_MS / 24; // 15 s
/** New lives begin at 8 in the morning. */
export const START_HOUR = 8;
