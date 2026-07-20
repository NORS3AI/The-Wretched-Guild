# The Wretched Guild — Game Design Document

> A medieval "rags-to-regicide" systems sim. You begin as a beggar in the mud of
> England and claw your way — through contracts, commerce, the shadows, the
> Church, or the land itself — up 100 rungs of medieval rank, to the throne of
> England, and beyond it to the secret seat of the Master of the World.

**Status:** Living design doc. This is the blueprint we lock before building.
Nothing here is sacred — argue with it.

---

## 1. Vision

- **Genre:** A **hybrid** of a menu-based, tick-driven **idle systems sim** and a
  choice-driven **RPG encounter** game. The grind idles; the *decisions* are
  hand-played.
- **Reference DNA:** *Medieval Guild 3* / *Crusader Kings* (length, systemic
  depth, life-and-death) × *Sid Meier's Civilization III* (economy, rank
  progression, world state) × *Melvor Idle* (tick loop, 100+ hours, browser) ×
  CRPG dialogue (the moral choices and their consequences).
- **Target length:** ~120 hours of meaningful play across a full save.
- **Tone:** Grim, wry, medieval. The wretched clawing upward.
- **Feel:** You are a *director* as much as a doer — but the moments that matter
  are *lived*, not idled through.

---

## 2. Tech Stack (locked)

- **Language:** TypeScript.
- **UI:** Svelte + Vite. The DOM is the best dense-menu/table/tooltip/dialogue
  system ever built, and this is a menu-and-choices game.
- **Engine:** A **pure-TypeScript simulation core** — no framework, no DOM,
  deterministic, unit-testable, runnable headless. The UI only *reads* engine
  state and *dispatches* commands.
- **Hosting:** GitHub Pages (`main` branch, `/docs` output). 100% client-side.
- **Scope:** A pure TypeScript **browser game**. No native/desktop/Steam target —
  the storage layer stays behind one `storage` module purely as clean
  architecture, not to enable any wrapper.

---

## 3. The Core Loop — Two Modes of Play

The game breathes between two textures. Getting the *split* right is the whole
design.

### 3a. The Idle Layer — the economy of time
Low-stakes, tick-resolved, background. **Begging, labor** (farm/fish/log/hunt),
**passive businesses, training, laying low.** You assign it and time carries it:

1. **Assign** an idle Activity.
2. **Time passes** in **ticks** — with **pause**, **fast-forward**, and
   **offline** catch-up when you return.
3. **Resolve** into coin / goods / XP / standing.

This is where resources and time accrue *between* the interesting bits. Nobody
wants to hand-play a fishing trip.

### 3b. The Interactive Layer — the set pieces
High-stakes, hand-played. **Assassin contracts, church jobs, heists, court
intrigue, moral dilemmas.** These arrive as **RPG-choice Encounters** (§8): a
narrative prompt and a handful of pre-written options you choose between, like
dialogue in a CRPG. *A situation arises — what do you do?*

This is where the story, the risk, and the **character** live. Nobody wants to
click-and-wait through an assassination.

**How they interlock:** the idle layer *funds and gates* the interactive layer;
the interactive layer spends what you built and *defines who you are* (§6).

---

## 4. Death: Permadeath / Run-Based (with a persistent Guild)

Death **ends the run** — but you are not really a person.

> **You are the Guild.** Individual members live, climb, and die. **The Wretched
> Guild persists across their deaths** and grows stronger with each one.

- **A Run = a life.** One member, from beggar upward, under constant mortal risk.
- **Death vectors:** the sword (a contract gone wrong), the noose (captured at
  high Heat), the plague/illness, and **old age** — your character ages every
  year, so *time itself* eventually kills you. Permadeath is thematic, not just
  punitive.
- **On death → Legacy.** The member's accumulated **Legacy** (reputation, secret
  knowledge, coin stashed in the Guild vault) becomes permanent
  meta-progression:
  - **Legacy points** → permanent unlocks (new starting archetypes, faction
    footholds, skills that begin unlocked, vault interest, reduced starting Heat).
  - **Persistent Guild vault** — a fraction of wealth survives death.
  - **Roster** — recruitable archetypes unlocked by prior lives' deeds.
- **The through-line:** early runs die poor and fast. Meta-progression lets later
  members survive long enough to seize the throne — and discover the path *beyond*
  it. Roguelite structure (Hades-style) applied to a medieval life sim.

---

## 5. Character

**Attributes** (rise with use and training):
- **Cunning** — schemes, planning, contract prep.
- **Brawn** — violence, labor, endurance.
- **Charm** — persuasion, begging, commerce, court.
- **Stealth** — theft, assassination, evasion, *keeping the mask on* (§6, §10).
- **Piety** — Church standing, absolution, sanctuary.
- **Wits** — learning speed, prices, information.

**Vitals & state:** **Health**, **Age**, **Coin**, **Heat/Notoriety** (§10),
**Faction Standing** (§9), **Alignment** (§6), and per-path **Skills**.

---

## 6. Alignment & Morality — the D&D compass

Alignment is not decoration. It is the **key that turns the locks on the path
system** (§9). It is never *chosen* — it **emerges** from what you repeatedly do.

### The two axes
Two hidden axes, each −100…+100:
- **Ethics — Law ↔ Chaos:** honoring oaths, hierarchy, and rules vs. whim,
  freedom, and personal code over society's.
- **Morals — Good ↔ Evil:** mercy and protecting others vs. cruelty and self at
  any cost.

Your coordinates fall into one of the **9 classic cells** (Lawful Good …
Chaotic Evil). Thresholds carve each axis into three bands.

### How it moves
- **It emerges.** Every Encounter choice (§8) carries a **weight** on one or both
  axes. Dozens of decisions settle you into a corner. No "pick your alignment"
  screen — you *become* what you do.
- **Sticky, with costly redemption.** A single choice nudges; patterns define.
  Once you're a notorious butcher, turning Good is *slow and expensive* — the
  world and your own habits resist it. Arcs of redemption and corruption are
  possible, never free. (This is a design fork — see §18.)
- **Signature deeds jolt it.** The first murder, sparing a king, betraying a
  mentor — landmark choices move the needle hard.

### The organizing principle (why Frollo works)
> **The Church and the Crown are institutions of *Law*. They care about your
> lawfulness, not your goodness. The Shadow Guild is an institution of *Chaos*.
> It cares about your willingness to break the world's rules.**

This single rule explains every gating case:
- **Chaotic Evil can't be a priest** — not for being evil, but for being
  **Chaotic**; the institution demands order he won't give.
- **Lawful Evil *can* be a priest** — a cruel, damned man who venerates
  hierarchy and oath (Judge Claude Frollo). The Church sees a devout servant, not
  his soul. *That gap is the character.*
- **The assassin/thief** must be **Chaotic or Evil**; a Lawful Good soul refuses
  the contract.

### Private self vs public mask (the Frollo mechanic)
- **Alignment** = your *true self*. Drifts from **every** choice, seen or unseen.
- **Reputation / Faction Standing** = your *public mask*. Moves only from acts
  that are **witnessed or discovered**.
- Sin in secret → privately damned, publicly a saint: you keep your Church rank
  *and* run contracts by night. Get **caught** → the mask shatters: standing
  collapses, Heat spikes (§10), the Inquisition comes. The entire double-life
  fantasy falls out of this one distinction, and it makes **Stealth** precious.

---

## 7. Activities — the idle verbs

Each Activity has: **requirements** (stats/rank/faction/tools), **duration**
(ticks), **yield**, and (for the risky ones) a **risk roll** (§10):

| Activity | Path | Early yield | Grows into |
|---|---|---|---|
| **Beg** | Commons | A trickle of coin, builds Charm | Reading marks, information |
| **Labor** (farm/fish/log/hunt) | Commons | Steady goods & coin, low risk | Owning land, supply chains |
| **Pickpocket / Steal / Burgle** | Shadow | Coin & contraband, raises Heat | Heists (interactive, §8) |
| **Pray / Serve** | Church | Piety, sanctuary, absolution | Clergy rank, laundering Heat |
| **Trade / Run a Stall** | Commerce | Passive income | Businesses, monopolies |
| **Train** | Any | Time+coin → stats/skills | — |
| **Lay Low / Recover** | Any | Reduces Heat, heals | — |
| **Recruit** | Guild | Adds a member to your roster | Empire management (§12) |

> Note: **contracts and church jobs are *not* here** — they are Encounters (§8),
> because they are meant to be *played*, not idled.

---

## 8. Encounters — the interactive verbs

The set-piece system. Where choices define you.

- **An Encounter** = a narrative scene: descriptive text + **2–5 choices**,
  presented as CRPG dialogue.
- **A choice** carries:
  - an optional **requirement gate** — `[Stealth 20]`, `[has Poison]`,
    `[Chaotic]`, `[Church rank ≥ 3]`. Ineligible choices show **greyed-out**, so
    the player *sees the life they could have led* — teasing build variety.
  - an **alignment weight** on the Ethics/Morals axes (§6).
  - an outcome that may trigger a **risk roll** (Success / Complication /
    Disaster).
  - **consequences:** coin/goods, Heat, standing shifts, alignment drift, and
    the unlocking (or closing) of future Encounters.
- **Missions are Encounter *chains*.** An assassination is
  **approach → infiltrate → the deed → escape**, each a decision node. Failing a
  node **branches** (fight your way out, get captured, flee, die) rather than
  dumping you to a single game-over — though Disaster on the wrong node *is* a
  death vector.
- **Arrival:** some Encounters are **chosen** (accept a contract from the board);
  others **intrude** unprompted, driven by world state, Heat, rank, or faction
  (a rival's ambush, an Inquisitor's summons, a beggar-child's plea).

---

## 9. Factions & Paths — gated by alignment

Your "class" is not chosen — it's **which factions you climb**, and **your
alignment decides which doors even open** (§6). Paths overlap and often
*conflict*; that tension is the strategic meat.

| Path | Alignment gate | Character |
|---|---|---|
| **The Church** (England) | Must be **Lawful** (any morals) | Sanctuary + absolution (launder Heat). Good clergy get mercy/charity options; Evil clergy (Frollo) get corruption/Inquisition options. Chaotic barred. |
| **The Shadow Guild** | **Chaotic or Evil** (not Lawful Good) | *The Wretched Guild itself.* Contracts, fences, safehouses, the roster. At war with Crown law. The blade refuses the saint. |
| **The Crown & Nobility** | **Lawful** preferred; Neutral tolerated | Titles, land, the throne. A just king *or* a tyrant. Chaos can *seize* a crown but struggles to *hold* one. |
| **The Merchant Guilds** | **Any**; grey/Evil unlocks exploitation | Money as power. Buys what the sword cannot. Neutral's natural home. |
| **The Commons** | **Any** | Farming, fishing, logging, hunting. Humble, low-Heat bedrock you can always retreat to. |

**Standing** with each faction opens/closes activities, prices, ranks, and
Encounters. Rising with one often costs another (crimes anger the Church; guild
power alarms the Crown). Managing these tensions *is* the mid-game.

---

## 10. Risk, Law & Heat

The engine that makes permadeath bite.

- **Outcome roll:** risky Activities and Encounter choices resolve as **Success /
  Complication / Disaster**, weighted by relevant stats, tools, difficulty, and
  current **Heat**.
- **Heat / Notoriety** rises with *witnessed or discovered* crime and violence
  (see the mask, §6), falls with laying low, bribes, sanctuary, or absolution.
- **Escalation ladder:** rising Heat draws **guards → investigations → bounties →
  bounty hunters → capture**. Capture → prison, fines, or **execution**. Rank and
  faction friends can quash charges — for a price.
- **Tools & prep** (lockpicks, poisons, disguises, a lookout) shift the odds.
  Preparation is a resource sink that buys safety.

---

## 11. Economy

The Civ III flavor.

- **Currencies/goods:** **Coin**, tradable **Goods** (grain, fish, timber, game,
  cloth…), and **Contraband** (stolen goods, poisons) that needs fencing.
- **Dynamic prices** respond to **season**, **war**, **plague**, harvests, and
  **player manipulation** (corner a market, burn a rival's supply).
- **Businesses** are passive income engines (stalls → shops → trade houses) that
  also generate attention/Heat — or, run through Church/guild, help launder it.

---

## 12. The Guild — from doer to director

The mid-to-late game, where "idle" becomes "empire" and you *build the Wretched
Guild*.

- **Recruit** members (cutpurse, brute, seductress, friar, factor…), each with
  their own stats, specialties — **and their own alignments**, which decide what
  work they'll accept.
- **Assign** them to Activities and Contracts; they run the loop in parallel.
- **Train, equip,** and manage their **Heat and mortality** — your people die
  too, and a captured member can betray the Guild.

---

## 13. The 100-Rung Ladder

The spine and pacing dial. Rank is **gated** by converging requirements — wealth
**+** faction standing **+** skills **+** *alignment eligibility* **+** sometimes
a **signature deed**. Outline by band (exact 100 titles are content work):

| Band | Rungs | Flavor examples |
|---|---|---|
| **Destitute** | 1–10 | Beggar, Vagrant, Cutpurse, Footpad |
| **Underworld Initiate** | 11–25 | Fence, Burglar, Bravo, Lay Brother, Farmhand |
| **Established** | 26–45 | Journeyman (crime/trade/clergy), Freeholder, Shopkeeper |
| **Notable** | 46–65 | Guild Master, Knight, Merchant, Priest, Spymaster's agent |
| **Powerful** | 66–85 | Baron, Bishop, Magnate, Guild Spymaster |
| **Elite** | 86–99 | Duke, Archbishop, Royal Advisor, Guildlord |
| **The Throne** | 100 | **King of England** |
| **Beyond** | ??? | **Master of the World** (secret — §14) |

Multiple routes reach each band: a Church run and a Shadow run climb the same
ladder by different rungs.

---

## 14. Endgame

- **King of England (Rank 100).** Requires converging power: immense wealth,
  noble legitimacy, and the neutralizing (by blade, coin, or marriage) of rival
  claimants — a dedicated **claim/coup Encounter chain** at maximum Heat, where
  one mistake ends the run at the summit. Your **alignment colors the reign**: a
  Lawful Good just king, a Lawful Evil tyrant, a Chaotic usurper who can barely
  hold it.
- **Master of the World (secret).** The true 120-hour capstone, revealed only
  through discoveries accumulated **across multiple runs** — that England is one
  board among many, and a shadow network sits above every throne. Demands mastery
  of *all* paths (sword, coin, cross, crown). Its *shape* is defined; its details
  are late-project.

---

## 15. Architecture

The wall that lets a 15-system game survive.

- **Engine (pure TS).** Owns all state and rules. Deterministic. **Seeded RNG**.
  Advances via a single **tick reducer**: `state → (tick + queued commands) →
  state'`.
- **Commands.** The UI never mutates state; it **dispatches commands**
  (`assignActivity`, `chooseEncounterOption`, `layLow`). The engine reduces them.
- **UI (Svelte).** Reactive views over engine state: panels, lists, tooltips,
  and the **Encounter dialogue view**.
- **Content is data.** Activities, ranks, factions, **Encounters**, and
  **alignment weights** are declared as **typed config data**, not hardcoded
  logic — so authoring 120 hours is *editing data*, not writing code. This is
  what makes the "massive" tractable. An Encounter is a small data tree of
  nodes → choices → (gates, weights, outcomes).
- **Alignment model.** Two integer axes on the character; choices push deltas;
  a pure function maps coordinates → 9-cell alignment → path eligibility.
- **Time & offline.** Ticks map to in-game time; the gap since last save is
  simulated forward (bounded, summarized as "while you were away…").
- **Storage abstraction.** One `storage` module wrapping browser storage.
  **Versioned saves + migrations** from day one.

---

## 16. Vertical Slice (first build)

Prove *both* modes are fun before building 15 systems. Scope:

- Tick engine with **pause / fast-forward / offline** catch-up.
- **Coin** + core attributes + **Heat** + the **two alignment axes**.
- Idle Activities: **Beg**, **Labor**, **Lay Low**.
- **One interactive Encounter** — a small contract, played as a 3-node chain
  (approach → deed → escape) with **gated choices**, **alignment weights**, a
  **risk roll**, and one **death vector**.
- Alignment visibly **shifts** from the choices, and **gates** at least one
  option (a `[Lawful]`/`[Chaotic]` fork).
- **Save/load** through the `storage` abstraction.
- The **run → death → Legacy → new run** loop in minimal form.

If sitting with *that* for ten minutes is compelling — the idle accrual *and* the
choice-driven contract — the whole game works.

---

## 17. Roadmap

| Milestone | Deliverable |
|---|---|
| **M0** | Scaffold (Vite+Svelte+TS), engine/UI split, storage module, Pages build to `/docs`. |
| **M1** | **Vertical slice** (§16): idle loop + one interactive Encounter + alignment. |
| **M2** | Encounter/alignment engine hardened; factions & the five paths; alignment gating. |
| **M3** | Economy & businesses; dynamic prices. |
| **M4** | Guild recruitment & member assignment (doer → director). |
| **M5** | The 100-rung ladder content & gating; Encounter content pass. |
| **M6** | Endgame: King of England claim chain; Master of the World secret. |

---

## 18. Open Questions

- **Alignment fluidity:** fully fluid (redeem/corrupt anytime) vs **sticky**
  (hard to escape a corner once notorious). *Leaning: sticky, costly redemption.*
- **Gate hardness:** **hard locks** (a Chaotic literally cannot hold Church
  office) vs **soft gates** (they can, but everything is harder and exposure is
  likelier). *Leaning: hard-lock the impossible cases, soft-gate the rest.*
- **Encounter authoring:** bespoke hand-written scenes (high quality, slow) vs
  templated/procedural with variables (scalable to 120h). *Leaning: a spine of
  bespoke story beats + a body of templated repeatable contracts.*
- **Tick pacing:** how long is a "day" in real seconds at 1×, and how aggressive
  is fast-forward?
- **Meta vs run balance:** how much Legacy carries over so early deaths feel like
  progress, not punishment?
- **Named 100 titles:** the full rank list is a scheduled content pass.
