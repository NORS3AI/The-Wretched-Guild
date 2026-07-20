// The Chronicle of Changes. Every patch is one entry, newest first, stamped in
// Arizona time (MST, UTC-7, no daylight saving) in 12-hour form.
//
// The patch-notes viewer shows exactly ONE entry at a time and only ever mounts
// that single entry's DOM, so this list can grow to a thousand patches without
// the reader lagging — nothing off-screen is ever rendered.
//
// Versions are an odometer, alpha for now: they start at v0.0.1-alpha and count
// up — the patch digit rolls 0–9, the minor digit 0–99, then the major climbs.
// So 0.0.9 → 0.1.0, and 0.99.9 → 1.0.0.

export interface PatchNote {
  /** odometer build tag, e.g. "v0.1.7-alpha" — assigned by position */
  version: string;
  /** "July 20, 2026" — Arizona (MST) calendar date */
  date: string;
  /** "3:20 PM MST" — 12-hour Arizona time */
  time: string;
  /** a short headline for the patch */
  title: string;
  /** the bullet list of changes */
  changes: string[];
}

type RawPatch = Omit<PatchNote, 'version'>;

/** The odometer: ordinal 1 → v0.0.1-alpha, 9 → v0.0.9, 10 → v0.1.0, 999 →
 *  v0.99.9, 1000 → v1.0.0. (z: 0–9, y: 0–99, x: the major.) */
export function versionForOrdinal(n: number): string {
  const x = Math.floor(n / 1000);
  const y = Math.floor(n / 10) % 100;
  const z = n % 10;
  return `v${x}.${y}.${z}-alpha`;
}

// Newest first. Versions are computed from position below.
const RAW: RawPatch[] = [
  {
    date: 'July 20, 2026',
    time: '4:45 PM MST',
    title: 'A Lucky Start & a Fairer Pan',
    changes: [
      'Cooking (and any skill\'s success roll) now has a 0.5% floor at skill 0 — no dish is ever a guaranteed failure, so you can always, rarely, learn by doing.',
      'Meta-unlocks are now leveled ladders, bought a rung at a time with Legacy:',
      'A Coin in the Lining — each new wretch is passed 15 copper (a single upgrade).',
      'Hardened Stock — +1 heart per level, up to 7 (costs 8, 50, 300, 800, 3,000, 15,000, 50,000).',
      'Beggar\'s Luck — +2 Luck per level, up to 16 (costs 1, 1, 2, 3, 5, 10, 25, 60, 150, 400, 900, 2,000, 5,000, 15,000, 45,000, 100,000).',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '4:15 PM MST',
    title: 'Skills, Labour & the Rise of Enterprise',
    changes: [
      'Skills you have never used are now hidden until you discover them by doing. Each skill is a percentage, 0–100.',
      'Cooking is a real gamble now: your Cooking % is the chance a dish comes out right. Below 30% skill, 60% of dishes burn; the burn rate steps down to 50% (@30), 25% (@50), 10% (@80) and 0% (@100). Whatever\'s left is a fumble that spares your ingredients. A good cook trains the skill; a burn does not. Fishing rises by 1 for every two fish landed.',
      'Honest Labour became Hard Labour with three jobs — Fell Timber, Work the Coal Mines, Till the Fields — each paying 3–5 copper with a chance at logs, coal, iron ore, seeds, or a stray potato.',
      'Bake a potato with 1 potato + 1 oil + 1 slab of butter (butter now sold by the town vendor for 6c). A Baked Potato restores 15% food (worth 8c); a burnt one is worthless.',
      'Enterprises rework: you now WORK the businesses you own (all of them, not just the stall) for a payout that scales ×2, ×2.5, ×3 … with their level. The market-stall work moved out of "Ply Your Trade" and into the Enterprises panel — and you can\'t work a stall you haven\'t bought.',
      'Enterprises stay hidden until you meet their rank, standing, alignment, and attribute requirements. And the moment you own your first enterprise, the begging life is behind you — Beg is removed.',
      'Fixed the layout spilling off the screen on iPads, tablets, and phones — it now reflows to two columns, then one, and never scrolls sideways.',
      'The Cinzel font is now bundled with the game, so it plays fully offline.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '3:45 PM MST',
    title: 'The Day, the Night & the Larder',
    changes: [
      'Added a day/night cycle — a clock now turns in the top bar. Shops open 8am–5pm, the church 6am–9pm, taverns 6am–2am.',
      'Illicit work is safest in the dead of night: pick pockets between 2am and 5am and you\'re far less likely to be caught.',
      'A high-level market stall now drops treats while you work it: a Pastry (L3), Honey Cake (L7), Fried Fish (L15), and at L30 a Chicken Curry, a Health Potion (heals a full heart), or a belt pouch.',
      'Carry more! A wandering merchant visits town and sells upgrades — extra pockets (up to 6), belt pouches (up to 6, +2 slots each), then satchels, backpacks, pack horses, handcarts, caravans, and a great wagon — if you have the coin and standing.',
      'River fish must now be cooked before eating: fry 1 raw fish with 1 Goblet of Cooking Oil (12c from the town vendor). Cooked fish restores 35% food / 5% water (worth 7c); raw is worth 3c.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '3:20 PM MST',
    title: 'Twenty Marks & the Slow Burn',
    changes: [
      'The Shadow Guild now keeps a whole roster of marks — Osric was only the first. Twenty more contracts join the board, each a different target with their own crime, dwelling, and prize.',
      'Fate sticks: a mark you KILL is gone for good and will never be offered again. A mark you SPARE lives on and can be robbed another night.',
      'Fixed the escape payout — the Guild pays for the kill, not the getaway. A finished contract now pays its full promised fee even if the watch glimpses you fleeing.',
      'Alignment is now a slow burn: choosing an evil, chaotic, or lawful option nudges your bearing only 0.1–0.4.',
      'Cinzel is now the game\'s typeface, over a Diablo III-inspired burnished-gold palette for all text.',
      'Added the Chronicle of Changes and a version badge in the top-right corner.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:51 PM MST',
    title: 'Livelihoods & Survival',
    changes: [
      'Honest Labour has a chance to raise Brawn; Begging can raise Charm; a successful Pick Pockets can raise Luck.',
      'Attributes now start at 0 and cap at 100, grown slowly through use.',
      'Owning a Market Stall multiplies your takings, and every business can now reach 50 levels.',
      'Starvation now costs a quarter-heart every 4 hours; filth every 8. The screen flashes red and the hearts pulse when starvation bites.',
      'New Settings menu (the gear): toggle the danger flash, coin messages, and idle flavour messages.',
      'Fixed cold weather offering "Seek Shade" instead of "Seek Warmth".',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:38 PM MST',
    title: 'A Warning in Blood',
    changes: [
      'The first time you attempt something illicit, a one-time warning explains that dying mid-crime ends the run for good.',
      'Serving at the Chapel now has a chance to raise your Good (not your Lawfulness).',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:35 PM MST',
    title: 'The Long Climb',
    changes: [
      'One hundred named ranks, from Beggar to King — each advancement spends the coin and resources it demands.',
      'RuneScape-style skills you train by doing: Fishing, Cooking, Firemaking, and more.',
      'Firewood builds a campfire (an hour\'s warmth); cook fish over it for a health boost.',
      'Pockets hold two things, stacking up to five each.',
      'The game keeps ticking in the background while you\'re away.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:21 PM MST',
    title: 'Out of the Cold',
    changes: ['Seeking warmth banishes the cold entirely and grants a full day\'s immunity from it.'],
  },
  {
    date: 'July 20, 2026',
    time: '2:19 PM MST',
    title: 'The Pedlar & the Well',
    changes: [
      'A pedlar will buy the odds and ends from your pockets.',
      'Foraged herbs can be eaten for a little health and water.',
      'At the well you can refill your waterskin or risk a bath.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:15 PM MST',
    title: 'Earning the Rung',
    changes: [
      'Advancement now spends the coin and standing it required.',
      'Promotion looks at your combined standing across all factions.',
      'Laying Low auto-cancels once your wounds are healed and your Heat is nil.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:10 PM MST',
    title: 'Game-Feel',
    changes: [
      'Text and images are no longer selectable or draggable — it plays like a game, not a document.',
      'Hearts are now pixel-art sprites with five phases, turning green when you\'re poisoned.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '2:04 PM MST',
    title: 'Contracts & Consequences',
    changes: [
      'The first Shadow Guild contract arrives — a deferrable scroll you can read and return to.',
      'Get caught and you land in the stocks; pay 50 copper to be quietly let go.',
      'Progress bars now glide smoothly over each action.',
      'Tuned begging odds and the copper economy.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '12:30 AM MST',
    title: 'Speed & Stability',
    changes: [
      'Rebuilt the tick loop for a lively pace and added a 10× fast-forward.',
      'Hardened loading: on-screen error reporting and a crash-guarded loop.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '12:05 AM MST',
    title: 'Playable on the Web',
    changes: [
      'Fixed GitHub Pages hosting with relative asset paths so the game actually loads.',
      'Added a "Play the Game" link to the top of the README.',
      'Reworked day pacing and removed the confusing "two game modes".',
    ],
  },
  {
    date: 'July 19, 2026',
    time: '11:58 PM MST',
    title: 'The Beggar Phase',
    changes: [
      'Added the survival layer: hearts, food, water, comfort, hygiene, and relief.',
      'Real copper currency and a ladder of coin from copper upward.',
      'Wretched Tokens — a rare prestige earned across deaths.',
    ],
  },
  {
    date: 'July 19, 2026',
    time: '11:20 PM MST',
    title: 'Factions, Guild & Trade',
    changes: [
      'The rank ladder and its five factions, each gated by your alignment.',
      'Rites of Passage — lived, RPG-dialogue promotions instead of a button click.',
      'The Guild layer: recruit, assign, and manage member wretches.',
      'Businesses and passive income, with the law answering your notoriety.',
    ],
  },
  {
    date: 'July 19, 2026',
    time: '10:31 PM MST',
    title: 'The Vertical Slice',
    changes: [
      'First playable build on a Vite + Svelte + TypeScript foundation.',
      'The interactive Encounter layer and the full D&D-style alignment compass.',
    ],
  },
  {
    date: 'July 19, 2026',
    time: '3:02 PM MST',
    title: 'In the Beginning, the Gutter',
    changes: ['The design blueprint for The Wretched Guild — from literal beggar to King, and the shadow above the throne.'],
  },
];

// Assign odometer versions by position: the OLDEST patch is ordinal 1
// (v0.0.1-alpha), counting up to the newest.
export const PATCH_NOTES: PatchNote[] = RAW.map((p, i) => ({
  ...p,
  version: versionForOrdinal(RAW.length - i),
}));

/** The live build tag, shown in the top-right corner. */
export const GAME_VERSION = PATCH_NOTES[0].version;
