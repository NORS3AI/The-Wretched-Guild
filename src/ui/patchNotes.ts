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
    date: 'July 21, 2026',
    time: '7:05 PM MST',
    title: 'No Fire Without Firewood',
    changes: [
      '"Make a Campfire" no longer appears at all unless you\'re holding firewood to burn (it still only shows in the cold). No more offering a fire you can\'t light.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '6:45 PM MST',
    title: 'The Wretch Takes a Tab',
    changes: [
      'The Wretch (your Attributes and Skills) is now its own tab — the first one — instead of sitting fixed to the side. The main column now shows one tab at a time, with the Chronicle beneath as always.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '6:15 PM MST',
    title: 'A Still Chronicle',
    changes: [
      'The Chronicle no longer scrolls — it reads as a fixed console, the newest lines pinned to the bottom while older ones fall off the top.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '5:40 PM MST',
    title: 'Cleaner Coin & Merchant Counts',
    changes: [
      'The Coin of the Realm now reads as proper denominations — 1,000 copper rolls up to "1sh 0c" and never shows a raw count like "3 million" of anything. Each rung shows its place-value digit.',
      'New short marks for the coin: copper c · shilling sh · silver s · crown cr · triton t · gold g · platinum p · amethyst ag · topaz tg · emerald eg · ruby rg · sapphire sg · diamond dg.',
      'The town Merchant now shows how many of each ware you already hold ("you own ×12"), so you can avoid buying more than you need.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '5:00 PM MST',
    title: 'Ledger, Enterprises & a Longer Chronicle',
    changes: [
      'The Chronicle now keeps far more history (up to 400 lines) and — the real fix — no longer yanks you back to the newest line when you scroll up to read older entries. Scroll back freely; it only sticks to the bottom when you are already there.',
      'Enterprises now appear once you can afford their Base Cost and have the faction standing (and your bearing fits the faction). The old Attribute and Rank gates are gone — coin and standing are the whole of it.',
      'Re-priced the ventures to a grander scale: Alehouse 250c · Fencing Den 2 shillings · Craftsman\'s Shop 5 silver · Smuggler\'s Wharf 1 crown · Trade House 200 triton. (The Market Stall still opens the road at 50 copper.) Costs now show in proper denominations.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '4:20 PM MST',
    title: 'The Coin of the Realm',
    changes: [
      'Tap your Purse in the top bar to see the whole wealth ladder — copper, shilling, silver, crown, triton, gold, platinum, amethyst, topaz, emerald, ruby, sapphire, diamond. Each rung is 1,000 of the one below it.',
      'The ladder marks what your coin has reached (with how many of each you hold) and what still lies above, so you can always see your next milestone of wealth — right up to a king\'s diamond.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '3:45 PM MST',
    title: 'The Town Merchant',
    changes: [
      'The Merchant tab is now the town shop — the local merchant who sells the Goblet of Oil and Slab of Butter. The tab is always there; when the shop is shut it shows a "We\'re Closed" sign telling you it reopens at 8:00 AM.',
      'The town merchant now keeps hours of 8:00 AM to 6:00 PM (was 8 to 5).',
      'Removed the oil/butter stall and the shop-hours line from Body & Needs — that trade now lives on the Merchant tab.',
      'The travelling pack-merchant (packs, pouches, beasts of burden, gear) once again appears inside Ply Your Trade when they pass through town, separate from the town shop.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '3:10 PM MST',
    title: 'Three Trades Across',
    changes: [
      'Ply Your Trade now lays its trades out three columns wide (dropping to two, then one, on narrower screens) — less scrolling, more of your options in view at a glance.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '2:45 PM MST',
    title: 'The Merchant Tab',
    changes: [
      'The wandering merchant now has its own tab. While the merchant is in town, a glowing "Merchant" tab appears up top — tap it to browse and buy their wares. When the merchant moves on, the tab is gone until they return.',
      'Every edible food still shows a green "Eat" button (and taps to eat). Raw catch — weasel, rabbit, boar, deer, elk, raw fish, a raw potato — now reads "cook first", to make plain it must be roasted or cooked (under Tend to Yourself) before it can be eaten. That is why raw game shows no Eat button.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '2:00 PM MST',
    title: 'A Clear Eat Button',
    changes: [
      'Every food in your Larder or Pockets — including pastries, cakes, fried fish, curry, and potions won at the Market Stall — now shows an explicit green "Eat" button beside "Sell". (Tapping the item name still eats it too.)',
      'Moved "Tend to Yourself" up above the Larder, so your remedies sit right under your needs.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '1:20 PM MST',
    title: "The Guild's Ledger",
    changes: [
      'Added a Legacy button to the top bar. It opens the Guild\'s Ledger: your banked Legacy and Wretched Tokens, what your kept Legacy is adding to your Luck (every 10 unspent Legacy = +0.1 Luck), what Luck actually does and how it\'s calculated, which Guild unlocks you hold and at what level, and a live "were you to die now" tally of the Legacy and Tokens this life would yield.',
      'You cannot spend anything from the Ledger — spending Legacy and Tokens still happens only on the death screen. This is purely the reckoning.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '12:40 PM MST',
    title: 'One Main Panel, Fully Tabbed',
    changes: [
      'The tabs now swap the whole main panel. Ply Your Trade is the default tab; tap Body & Needs, Enterprises, Wretched, or Reputation and it takes over the main area — tap Ply Your Trade to return. The Wretch stays on the left and the Chronicle along the bottom, always.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '12:05 PM MST',
    title: 'Tabs Across the Top',
    changes: [
      'Moved the tab strip (Body & Needs, Enterprises, Wretched, Reputation) up to run full-width across the top, right under the bar of Hearts, Purse, and Bearing — so switching panels is a glance-and-tap away.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '11:15 AM MST',
    title: 'Tap to Eat & Sworn to the End',
    changes: [
      'Eating is simpler now: just tap a food in your Larder or Pockets to eat it. The separate "Eat" button beside Drink is gone — the item itself is the button.',
      'Sworn Guild members no longer walk out over unpaid wages, nor are they picked off at random on risky work. A member is only ever lost when their own Heat boils over to 100 (then the watch takes them) — or when you dismiss them yourself. Keep them cool (Lay Low) and they stay loyal.',
    ],
  },
  {
    date: 'July 21, 2026',
    time: '9:30 AM MST',
    title: 'Tabs & the Long Console',
    changes: [
      'Reworked the layout to end the endless scrolling on tablet and phone: two columns now instead of three. The Wretch keeps its narrow column, Ply Your Trade fills the wide one, and the Chronicle stretches across the bottom like a long console.',
      'The lower-left panel is now tabbed: Body & Needs, Enterprises, Wretched (the Guild), and Reputation (formerly "Standing in the World"). Tap a tab to switch — no more hunting up and down the page. Enterprises appears once you have coin to invest, Wretched once the Guild opens to you.',
      'Moved your Hearts up to the top bar, right beside your Bearing. Heat lives on the top bar too now.',
      'The Wretch panel is pared down to just your Attributes and Skills.',
      'Your Bearing (e.g. "True Neutral") is now a button on the top bar — click it to see your true standing on the Lawful–Chaotic and Good–Evil axes at a glance.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '10:50 PM MST',
    title: 'The Hunter & the Merchant\'s Wares',
    changes: [
      'The wandering merchant now sells gear: a larger Waterskin (+2 charges), Warm Woollens that keep the cold from draining your comfort, and a Hunting Bow (150 copper).',
      'New trade — Hunter (needs a bow): stalk game in the wood. Weasel (worth 11c) is commonest, Elk (300c) the rarest and richest; Rabbit, Boar, Sheep, Goat, and Deer fall in between. A keener Hunting skill tips you toward rarer quarry.',
      'Roast your kills with a Goblet of Oil (the new "Roast Game" deed): Weasel +5% food; Rabbit +10/5; Boar +15/5; Sheep +20/5; Goat +30/5; Deer +40/10; Elk +65/10 (food/water). A burn leaves you charred Burnt Meat.',
      'Tidied up the old orphaned "Snared Game" that had no source — game now comes from hunting.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '10:15 PM MST',
    title: 'In Lock-Step',
    changes: [
      'Fixed the Chronicle lagging behind your work: the sim clock now runs on measured real time, so the log lands the instant a cycle finishes and the activity bars, clock, and Chronicle all stay in step.',
      'Encounters no longer pause the game — time keeps flowing while a contract or event is on screen, since you can always leave it.',
      'Laying Low now also cools your Guild members: each member with Heat sheds 2 per cycle alongside you.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '9:40 PM MST',
    title: 'The Larder & the Long Way Round',
    changes: [
      'Food now lives in a dedicated six-slot Larder, separate from your pockets — so a purse full of ingredients (oil, butter, firewood) never leaves you unable to cook. Raw catch you mean to cook is kept in the larder too.',
      'Every event can now be waved off: "A Whisper in the Dark" has a Leave button, and each random town event has a "Leave — pay it no mind" option, just like the wandering merchant.',
      'Cooking now teaches from every attempt that reaches the pan: +1 skill on a burn, and double (+2) on a success.',
      'The advancement screen now labels the coin requirement simply "Copper" instead of "Coppers (spent)".',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '9:05 PM MST',
    title: 'Whispers, Wages & a Living Town',
    changes: [
      'The contract offer ("A Whisper in the Dark") now shows what the job pays — and contracts are worth more at higher rank: the Guild trusts the risen with weightier, better-paid work (+10% of the base fee per rank above Beggar).',
      'The town now throws random events at you beyond killing work — a harvest to lend a hand to, the chapel bell, an unguarded stall, a dropped purse, a child in rags, a mired cart, a wandering preacher. Most are chances to do good (or ill): farming, worship, charity, and honest help, alongside a bit of theft for those so inclined.',
      'Market Stall pastry drops now start from level 1: 10% at L1, 15% at L2, 20% at L3+ (the higher-tier drops are unchanged).',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '8:30 PM MST',
    title: 'Clear the Chronicle',
    changes: [
      'Added a Clear button to the Chronicle so you can wipe the log by hand whenever you like.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '8:10 PM MST',
    title: 'Pause Means Pause',
    changes: [
      'A new life now begins PAUSED — press Resume when you\'re ready and time will start to flow.',
      'Fixed the pause not truly stopping time: a paused game no longer advances in the background (offline catch-up and the day/night clock now respect the pause), so days won\'t creep forward while you\'re paused or away.',
      'Corrected the kept-Legacy Luck bonus to the right scale: 1% Luck is 0.1 on the Luck attribute, so every 10 unspent Legacy adds 0.1 Luck (was 1.0).',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '7:45 PM MST',
    title: 'A Fresh Start',
    changes: [
      'A new life now begins with all needs at 100% and pockets reset to the base two (any extra pockets, pouches, or containers are cleared) — everything resets except what you keep in the Guild (Legacy, Tokens, unlocks, and the vault).',
      'The Enterprises panel stays hidden until you have at least 50 copper (enough to acquire your first venture).',
      'The Wretched Guild panel stays hidden until you reach rank 3.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '7:20 PM MST',
    title: 'A Clean Page',
    changes: [
      'Fixed the death-screen unlocks not updating their Level when bought — buying now correctly ticks Level 0 → 1 → 2 … and the button/cost refresh instantly.',
      'Beginning a new life now clears the Chronicle, so each wretch starts with a fresh, empty log.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '6:55 PM MST',
    title: 'The Weight of Legacy',
    changes: [
      'Legacy is rebalanced: 1 per 1,000 copper held at death, 1 per 2 years lived past 16, and 1 per rank above Beggar.',
      'Wretched Tokens: the first wealth token now needs 2 shillings (2,000 copper) of peak wealth, not 1. The other thresholds are unchanged.',
      'Kept Legacy now sharpens your Luck: every 10 unspent Legacy grants +1 Luck to your next wretch (based on what you hold, not what you\'ve earned or spent). Spending Legacy trades that Luck away — a real choice on the death screen.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '6:30 PM MST',
    title: 'Blood, Bread & the Working Wage',
    changes: [
      'Working an enterprise you own now shows the coin/tick it pays while you work it — the gold "working" figure adds your labour on top of the passive idle income.',
      'Healing Herbs now restore 20% food and 5% water, and mend half a quarter-heart.',
      'Taking a life weighs heavier on the soul: a killing now grows your Evil by a full 1–3, where lesser wicked choices remain a slow-burn 0.1–0.4 nudge.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '6:05 PM MST',
    title: 'Two Clocks & a Tidier Ledger',
    changes: [
      'The day/night cycle now runs on its OWN 6-minute real-time timer, wholly separate from how fast you learn and grow. Skills, attributes, and activities are back to their quick pace — you can build yourself up in a short session while the sun still takes 6 minutes to cross the sky.',
      'Fixed the Enterprises panel: the Market Stall\'s level row no longer spills a string of circles off the edge — it now reads a tidy "Lv 0/50".',
      'Make a Campfire only appears when the air is cold; Seek Warmth/Seek Shade follow the weather.',
      'Cook a River Fish shows up only once you\'re carrying a river fish; Bake a Potato only with a potato in hand; See a Doctor only when you\'re actually sick.',
      'Coin-earning work now shows what it pays (Fell Timber, the Coal Mines, Till the Fields, Pick Pockets, and Begging all carry a copper tag).',
      'What builds your Brawn, Wits, Charm, and the like — and how fast your skills rise — is no longer spelled out. That\'s for you to discover.',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '5:35 PM MST',
    title: 'A Proper Day & a Patient Merchant',
    changes: [
      'The day/night cycle now runs at a believable pace: one in-game day is 6 real minutes at 1× (one hour every 15 seconds). The clock and shop hours turn accordingly, and faster speeds skip through smoothly.',
      'The wandering merchant now stays in town until you send them off with the new Leave button — no more vanishing on a timer. They wander back another day.',
      'Rebuilt the wandering-merchant panel so it lays out cleanly on desktop, tablet, and phone (a tidy stacked list instead of cramped columns).',
    ],
  },
  {
    date: 'July 20, 2026',
    time: '5:10 PM MST',
    title: 'Infinite Legacy & Steady Hands on Glass',
    changes: [
      'Meta-unlocks now have infinite levels — spend your Legacy and Tokens on the death screen however you like, as many times as you like. Each shows its current Level, and the cost keeps climbing past the listed ladder.',
      'Your Legacy and Tokens are now banked the moment you die, so you can spend everything you just earned right there on the death screen.',
      'iPad and phone: double-tap-to-zoom is disabled so a quick double-tap on a button no longer zooms the page.',
    ],
  },
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
