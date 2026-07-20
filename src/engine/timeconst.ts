// Time constants live alone so both the engine and the survival sim can import
// them without a circular dependency.

export const TICKS_PER_DAY = 24;
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

// Real-time pacing (UI concern only). A sim tick fires this often at 1× speed —
// twice a second — so bars visibly move and the game feels alive. Higher speeds
// process multiple ticks per interval. Balance is measured in ticks, so it's
// independent of this number.
export const REAL_MS_PER_TICK = 500;
