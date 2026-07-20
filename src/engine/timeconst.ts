// Time constants live alone so both the engine and the survival sim can import
// them without a circular dependency.

export const TICKS_PER_DAY = 24; // one tick = one in-game hour
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

// Real-time pacing (UI concern only). A whole in-game day is 6 real minutes at
// 1×, so one hour (one tick) is 15 real seconds — the day/night cycle turns at a
// believable, unhurried pace. 24 ticks × 15 s = 360 s = 6 min. The render loop is
// decoupled from this (it repaints several times a second), so faster speeds skip
// smoothly rather than in big chunks. Balance is measured in ticks, independent
// of this constant.
export const REAL_MS_PER_TICK = 15000;

/** A full in-game day in real milliseconds at 1× speed (should be 6 minutes). */
export const REAL_MS_PER_DAY = TICKS_PER_DAY * REAL_MS_PER_TICK;
