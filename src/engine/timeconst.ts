// Time constants live alone so both the engine and the survival sim can import
// them without a circular dependency.

export const TICKS_PER_DAY = 24;
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

// Real-time pacing (UI concern only — the engine never reads this): one in-game
// day takes 20 minutes at 1× speed. From that and TICKS_PER_DAY, each tick is a
// fixed number of real milliseconds, so balance (measured in ticks) is decoupled
// from wall-clock pacing.
export const REAL_MS_PER_DAY = 20 * 60 * 1000; // 20 minutes
export const REAL_MS_PER_TICK = REAL_MS_PER_DAY / TICKS_PER_DAY; // 50 s per tick
