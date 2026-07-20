// Time constants live alone so both the engine and the survival sim can import
// them without a circular dependency.

export const TICKS_PER_DAY = 24;
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

// Real-time pacing (UI concern only). A deliberate slow burn: one tick every 2
// real seconds at 1× (CSS transitions glide the bars between ticks), so a day is
// a slow ~48s and survival is a background concern over many minutes. Fast speeds
// (up to 10×) let you skip. Balance is measured in ticks, independent of this.
export const REAL_MS_PER_TICK = 2000;
