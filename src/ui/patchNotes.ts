// The Chronicle of Changes. Every patch is one entry, newest first, stamped in
// Arizona time (MST, UTC-7, no daylight saving) in 12-hour form.
//
// The patch-notes viewer shows exactly ONE entry at a time and only ever mounts
// that single entry's DOM, so this list can grow to a thousand patches without
// the reader lagging — nothing off-screen is ever rendered.

export interface PatchNote {
  /** semantic-ish build tag shown in the corner, e.g. "v0.14.0" */
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

// Newest first. PATCH_NOTES[0] is the live build.
export const PATCH_NOTES: PatchNote[] = [
  {
    version: 'v0.14.0',
    date: 'July 20, 2026',
    time: '3:20 PM MST',
    title: 'Twenty Marks & the Slow Burn',
    changes: [
      'The Shadow Guild now keeps a whole roster of marks — Osric was only the first. Twenty more contracts join the board, each a different target with their own crime, dwelling, and prize.',
      'Fate sticks: a mark you KILL is gone for good and will never be offered again. A mark you SPARE lives on and can be robbed another night.',
      'Fixed the escape payout — the Guild pays for the kill, not the getaway. A finished contract now pays its full promised fee even if the watch glimpses you fleeing (being seen costs you Heat and blood, not coppers).',
      'Alignment is now a slow burn: choosing an evil, chaotic, or lawful option nudges your bearing only 0.1–0.4, so who you become is the sum of a hundred choices, never one.',
      'Cinzel is now the game\'s typeface, over a Diablo III-inspired burnished-gold palette for all text.',
      'Added this Chronicle of Changes and a version badge in the top-right corner.',
    ],
  },
  {
    version: 'v0.13.0',
    date: 'July 20, 2026',
    time: '2:51 PM MST',
    title: 'Livelihoods & Survival',
    changes: [
      'Honest Labour now has a 10% chance to raise Brawn (+0.1–0.4); Begging can raise Charm; a successful Pick Pockets can raise Luck.',
      'Attributes now start at 0 and cap at 100, grown slowly through use.',
      'Owning a Market Stall multiplies your "Work a Market Stall" takings — ×2 at level 1, up to ×3.5 and beyond. Every business can now reach 50 levels.',
      'Starvation now costs a quarter-heart every 4 hours; filth costs a quarter-heart every 8. The screen edges flash red and the hearts pulse when starvation bites.',
      'New Settings menu (the gear): toggle the danger flash, coin messages, and idle flavour messages.',
      'Fixed cold weather offering "Seek Shade" instead of "Seek Warmth".',
    ],
  },
  {
    version: 'v0.12.0',
    date: 'July 20, 2026',
    time: '2:38 PM MST',
    title: 'A Warning in Blood',
    changes: [
      'The first time you attempt something illicit, a one-time warning explains that dying mid-crime ends the run for good. Tick the box, continue, and it never shows again.',
      'Serving at the Chapel now has a chance to raise your Good (not your Lawfulness).',
    ],
  },
  {
    version: 'v0.11.0',
    date: 'July 20, 2026',
    time: '2:35 PM MST',
    title: 'The Long Climb',
    changes: [
      'One hundred named ranks, from Beggar to King — each advancement now spends the coin and resources it demands.',
      'RuneScape-style skills you train by doing: Fishing, Cooking, Firemaking, and more.',
      'Firewood builds a campfire (an hour\'s warmth); cook fish over it for a health boost.',
      'Pockets hold two things, stacking up to five each.',
      'The game keeps ticking in the background while you\'re away.',
    ],
  },
  {
    version: 'v0.10.0',
    date: 'July 20, 2026',
    time: '2:21 PM MST',
    title: 'Out of the Cold',
    changes: [
      'Seeking warmth banishes the cold entirely and grants a full day\'s immunity from it.',
    ],
  },
  {
    version: 'v0.9.0',
    date: 'July 20, 2026',
    time: '2:19 PM MST',
    title: 'The Pedlar & the Well',
    changes: [
      'A pedlar will buy the odds and ends from your pockets.',
      'Foraged herbs can be eaten for a little health and water.',
      'At the well you can refill your waterskin or risk a bath (get caught bathing and it\'s the stocks).',
    ],
  },
  {
    version: 'v0.8.0',
    date: 'July 20, 2026',
    time: '2:15 PM MST',
    title: 'Earning the Rung',
    changes: [
      'Advancement now spends the coin and standing it required, rather than merely checking it.',
      'Promotion looks at your combined standing across all factions, not just your best one.',
      'Laying Low auto-cancels once your wounds are fully healed and your Heat is nil.',
    ],
  },
  {
    version: 'v0.7.0',
    date: 'July 20, 2026',
    time: '2:10 PM MST',
    title: 'Game-Feel',
    changes: [
      'Text and images are no longer selectable or draggable — it plays like a game, not a document.',
      'Hearts are now pixel-art sprites with five phases, turning green when you\'re poisoned.',
    ],
  },
  {
    version: 'v0.6.0',
    date: 'July 20, 2026',
    time: '2:04 PM MST',
    title: 'Contracts & Consequences',
    changes: [
      'The first Shadow Guild contract arrives — a deferrable scroll you can read and return to.',
      'Get caught and you land in the stocks; pay 50 copper to be quietly let go.',
      'Progress bars now glide smoothly over each action instead of jumping.',
      'Tuned begging odds and the copper economy.',
    ],
  },
  {
    version: 'v0.5.0',
    date: 'July 20, 2026',
    time: '12:30 AM MST',
    title: 'Speed & Stability',
    changes: [
      'Rebuilt the tick loop for a lively pace and added a 10× fast-forward for downtime.',
      'Hardened loading: on-screen error reporting and a crash-guarded loop so a bug can never blank the page.',
    ],
  },
  {
    version: 'v0.4.0',
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
    version: 'v0.3.0',
    date: 'July 19, 2026',
    time: '11:58 PM MST',
    title: 'The Beggar Phase',
    changes: [
      'Added the survival layer that opens the game: hearts, food, water, comfort, hygiene, and relief.',
      'Real copper currency and a ladder of coin from copper upward.',
      'Wretched Tokens — a rare prestige earned across deaths.',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'July 19, 2026',
    time: '11:20 PM MST',
    title: 'Factions, Guild & Trade',
    changes: [
      'The rank ladder and its five factions, each gated by your alignment.',
      'Rites of Passage — lived, RPG-dialogue promotions instead of a button click.',
      'The Guild layer: recruit, assign, and manage member wretches who work in parallel.',
      'Businesses and passive income, with the law answering your notoriety.',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'July 19, 2026',
    time: '10:31 PM MST',
    title: 'The Vertical Slice',
    changes: [
      'First playable build on a Vite + Svelte + TypeScript foundation.',
      'The interactive Encounter layer and the full D&D-style alignment compass.',
    ],
  },
  {
    version: 'v0.0.1',
    date: 'July 19, 2026',
    time: '3:02 PM MST',
    title: 'In the Beginning, the Gutter',
    changes: [
      'The design blueprint for The Wretched Guild — from literal beggar to King, and the shadow above the throne.',
    ],
  },
];

/** The live build tag, shown in the top-right corner. */
export const GAME_VERSION = PATCH_NOTES[0].version;
