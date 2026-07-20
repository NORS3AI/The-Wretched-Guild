# The Wretched Guild — Game Design Document

> A medieval "rags-to-regicide" systems sim. You begin as a beggar in the mud of
> England and claw your way — through contracts, commerce, the shadows, the
> Church, or the land itself — up 100 rungs of medieval rank, to the throne of
> England, and beyond it to the secret seat of the Master of the World.

**Status:** Living design doc. This is the blueprint we lock before building.
Nothing here is sacred — argue with it.

---

## 1. Vision

- **Genre:** Menu-based, tick-driven **idle systems sim** — "do something, wait,
  something happens." Not a clicker, not an ARPG.
- **Reference DNA:** *Medieval Guild 3* / *Crusader Kings* (length, systemic
  depth, life-and-death) × *Sid Meier's Civilization III* (economy, tech/rank
  progression, world state) × *Melvor Idle* (tick loop, 100+ hours, browser).
- **Target length:** ~120 hours of meaningful play across a full save.
- **Tone:** Grim, wry, medieval. The wretched clawing upward.
- **Feel:** You are a *director* as much as a doer. Early game you are the only
  pair of hands. Late game you command a guild and read the kingdom like a board.

---

## 2. Tech Stack (locked)

- **Language:** TypeScript.
- **UI:** Svelte + Vite. The DOM is the best dense-menu/table/tooltip system ever
  built, and this is a menu game.
- **Engine:** A **pure-TypeScript simulation core** — no framework, no DOM,
  deterministic, unit-testable, runnable headless. The UI only *reads* engine
  state and *dispatches* commands.
- **Hosting:** GitHub Pages (`main` branch, `/docs` output). 100% client-side.
- **Steam-ready:** Wrappable in **Tauri** later with no rewrite. Two rules keep
  that door open for free:
  1. All game logic stays client-side (already required for Pages).
  2. All saving/loading goes through **one `storage` module**, never scattered
     `localStorage` calls.

Full rationale lives in the chat history; the decision is settled.

---

## 3. The Core Loop

The heartbeat, from beggar to king, never changes shape — only scale:

1. **Assign** — commit yourself (and later, guild members) to an **Activity**:
   beg, pick a pocket, take a contract, fish, pray, run a stall, train, lay low.
2. **Time passes** — the engine advances in **ticks**. Activities have a
   duration. The player can **pause** and **fast-forward**; closing the tab
   computes **offline progress** on return.
3. **Resolve** — the activity yields resources / XP / standing… or fires an
   **Event** (you were seen, a noble took notice, a rival moved in, the plague
   came).
4. **Consequence & choice** — events branch. The player reacts; the world shifts.

Why this scales: the *same loop* runs the whole game. Early you assign one
worker (you). Late you assign a roster of assassins to contracts while juggling
businesses and factions. **The player gradually becomes the scheduler of an
empire.** That is the arc.

---

## 4. Death: Permadeath / Run-Based (with a persistent Guild)

Death **ends the run**. But a 120-hour game cannot be one fragile 120-hour run,
so the fantasy is reframed:

> **You are not a person. You are the Guild.** Individual members live, climb,
> and die. **The Wretched Guild persists across their deaths** and grows stronger
> with each one.

- **A Run = a life.** One member, from beggar upward, under constant mortal risk.
- **Death vectors:** the sword (a contract gone wrong), the noose (captured at
  high Heat), the plague/illness, and **old age** (your character ages every
  year — time itself is a death vector, which makes permadeath thematic, not
  just punitive).
- **On death → Legacy.** The member's accumulated **Legacy** (reputation,
  secret knowledge, coin stashed in the Guild vault) returns to the Guild as
  permanent meta-progression:
  - **Legacy points** → permanent unlocks (new starting archetypes, faction
    footholds, skills that begin unlocked, vault interest, reduced starting Heat).
  - **Persistent Guild vault** — a fraction of wealth survives death.
  - **Roster** — recruitable archetypes unlocked by prior lives' deeds.
- **The through-line:** early runs die poor and fast. Meta-progression lets later
  members survive long enough to actually seize the throne — and, eventually,
  discover the path *beyond* it. This is the roguelite structure (Hades-style)
  applied to a medieval life sim.

---

## 5. Character

**Attributes** (rise with use and training):
- **Cunning** — schemes, planning, contract prep.
- **Brawn** — violence, labor, endurance.
- **Charm** — persuasion, begging, commerce, court.
- **Stealth** — theft, assassination, evasion.
- **Piety** — Church standing, absolution, sanctuary.
- **Wits** — learning speed, prices, information.

**Vitals & state:**
- **Health** — injury and illness deplete it; zero = death.
- **Age** — advances with the calendar; old age raises death odds.
- **Coin** — the base currency.
- **Heat / Notoriety** — how wanted you are (see §8).
- **Faction Standing** — a value per faction (see §7).
- **Skills** — per-path unlockable trees (a churchman and a rogue *play*
  differently).

---

## 6. Activities — the verbs

Each Activity has: **requirements** (stats/rank/faction/tools), **duration**
(ticks), **yield** (coin/goods/XP/standing), and **risk** (see §8). The starter
set and where it leads:

| Activity | Path | Early yield | Grows into |
|---|---|---|---|
| **Beg** | Commons | A trickle of coin, builds Charm | Reading marks, information |
| **Labor** (farm/fish/log/hunt) | Commons | Steady goods & coin, low risk | Owning land, supply chains |
| **Pickpocket / Steal / Burgle** | Shadow | Coin & contraband, raises Heat | Heists, fencing empires |
| **Take a Contract** | Shadow | Big coin, big risk (assassination) | Signature kills, guild ops |
| **Pray / Serve** | Church | Piety, sanctuary, absolution | Clergy rank, laundering Heat |
| **Trade / Run a Stall** | Commerce | Passive income | Businesses, monopolies |
| **Train** | Any | Converts time+coin into stats/skills | — |
| **Lay Low / Recover** | Any | Reduces Heat, heals | — |
| **Recruit** | Guild | Adds a member to your roster | Empire management (§10) |

---

## 7. Factions & Paths

Your "class" is not chosen — it's **which factions you climb**. Paths overlap and
often *conflict*, which is the strategic meat.

- **The Crown & Nobility** — political power, titles, land, and ultimately the
  throne. Values wealth, legitimacy, and useful violence; despises exposed crime.
- **The Church** (England) — piety, **sanctuary** (hide from the law), and
  **absolution** (launder Heat). Its **Inquisition** is a deadly enemy if you
  stray. Path to Bishop, Archbishop, and spiritual leverage over the Crown.
- **The Shadow Guild** — *The Wretched Guild itself.* The thief/assassin spine.
  Contracts, fences, safehouses, and the roster you build. At odds with Crown law.
- **The Merchant Guilds** — commerce, businesses, trade routes, monopolies. Money
  as power. Can buy what the sword cannot.
- **The Commons** — farming, fishing, logging, hunting. Humble, stable, low-Heat.
  The bedrock you can always retreat to, and a quiet route to land and title.

**Standing** with each faction opens/closes activities, prices, ranks, and
events. Rising with one often costs you another (crimes anger the Church; guild
power alarms the Crown). Managing these tensions *is* the mid-game.

---

## 8. Risk, Law & Heat

The engine that makes permadeath bite.

- **Outcome roll:** every risky Activity resolves as **Success / Complication /
  Disaster**, weighted by relevant stats, tools, difficulty, and current **Heat**.
- **Heat / Notoriety** rises with crime and violence, falls with laying low,
  bribes, sanctuary, or Church absolution.
- **Escalation ladder:** rising Heat draws **guards → investigations → bounties →
  bounty hunters → capture**. Capture → prison, fines, or **execution** (a death
  vector). High rank and faction friends can quash charges — for a price.
- **Tools & prep** (lockpicks, poisons, disguises, a lookout) shift the odds.
  Preparation is a resource sink that buys safety.

---

## 9. Economy

The Civ III flavor.

- **Currencies/goods:** **Coin**, tradable **Goods** (grain, fish, timber, game,
  cloth…), and **Contraband** (stolen goods, poisons) that needs fencing.
- **Dynamic prices** respond to **season**, **war**, **plague**, harvests, and
  **player manipulation** (corner a market, burn a rival's supply).
- **Businesses** are passive income engines (stalls → shops → trade houses) that
  also generate attention/Heat — or, run through the Church/guild, help launder
  it. Owning the economy is one of several routes to the throne.

---

## 10. The Guild — from doer to director

The mid-to-late game. This is where "idle" becomes "empire," and thematically,
where you *build the Wretched Guild*.

- **Recruit** members (archetypes: cutpurse, brute, seductress, friar, factor…),
  each with their own stats and specialties.
- **Assign** them to Activities and Contracts — they run the same loop you do,
  in parallel, generating income and progress while you scheme.
- **Train** them, equip them, and manage their **Heat and mortality** — your
  people can die too, and a captured member can betray the Guild.
- The player's role shifts from *pulling every lever* to *directing a network*.

---

## 11. The 100-Rung Ladder

The spine and the pacing dial. Rank is **gated** by converging requirements —
wealth **+** faction standing **+** skills **+** sometimes a **signature deed**
(a specific contract, a title purchased, a rival removed). Outline by band
(exact 100 titles are content work):

| Band | Rungs | Flavor examples |
|---|---|---|
| **Destitute** | 1–10 | Beggar, Vagrant, Cutpurse, Footpad |
| **Underworld Initiate** | 11–25 | Fence, Burglar, Bravo, Lay Brother, Farmhand |
| **Established** | 26–45 | Journeyman (crime/trade/clergy), Freeholder, Shopkeeper |
| **Notable** | 46–65 | Guild Master, Knight, Merchant, Priest, Spymaster's agent |
| **Powerful** | 66–85 | Baron, Bishop, Magnate, Guild Spymaster |
| **Elite** | 86–99 | Duke, Archbishop, Royal Advisor, Guildlord |
| **The Throne** | 100 | **King of England** |
| **Beyond** | ??? | **Master of the World** (secret — see §12) |

Multiple *routes* reach each band, so a Church run and a Shadow run climb the
same ladder by different rungs.

---

## 12. Endgame

- **King of England (Rank 100).** Requires converging power: immense wealth,
  noble legitimacy, and the neutralizing (by blade, coin, or marriage) of rival
  claimants. A dedicated **claim/coup sequence** — the hardest, most-watched play
  in the game, at maximum Heat, where one mistake ends the run at the summit.
- **Master of the World (secret).** The true 120-hour capstone, revealed only
  through discoveries accumulated **across multiple runs** — hints that England is
  one board among many, and a shadow network sits above every throne. Reaching it
  demands mastery of *all* paths (the sword, the coin, the cross, the crown). Kept
  deliberately mysterious; its *shape* is defined, its details are late-project.

---

## 13. Architecture

The wall that lets a 15-system game survive.

- **Engine (pure TS).** Owns all state and rules. Deterministic. **Seeded RNG**
  (so runs are reproducible/testable). Advances via a single **tick reducer**:
  `state → (tick + queued commands) → state'`.
- **Commands.** The UI never mutates state; it **dispatches commands**
  ("assignActivity", "takeContract", "layLow"). The engine reduces them. This
  keeps logic testable and UI dumb.
- **UI (Svelte).** Reactive views over engine state. Panels, lists, tooltips.
- **Time & offline.** Ticks map to in-game time (day/season/year). On load, the
  gap since last save is converted to elapsed ticks and simulated forward
  (bounded, summarized as "while you were away…").
- **Storage abstraction.** One `storage` module. Web → localStorage/IndexedDB.
  Tauri (later) → save file. **Versioned saves + migrations** from day one.
- **Data-driven content.** Activities, ranks, events, factions defined as
  **data** (typed config), not hardcoded logic — so authoring 120 hours is
  editing data, not writing code. This is what makes the "massive" tractable.

---

## 14. Vertical Slice (first build)

Prove the loop is fun before building 15 systems. Scope:

- Tick engine with **pause / fast-forward / offline** catch-up.
- **Coin** + core attributes + **Heat**.
- Four Activities: **Beg**, **Pickpocket**, one **Contract**, **Lay Low**.
- The **risk roll** (Success / Complication / Disaster) with one **death vector**.
- **One event** with a branching choice.
- **Save/load** through the `storage` abstraction.
- The **run → death → Legacy → new run** loop in minimal form (earn Legacy,
  spend it on one permanent unlock).

If sitting with *that* for ten minutes is compelling, the whole game works.

---

## 15. Roadmap

| Milestone | Deliverable |
|---|---|
| **M0** | Project scaffold (Vite+Svelte+TS), engine/UI split, storage module, GitHub Pages build to `/docs`. |
| **M1** | **Vertical slice** (§14). |
| **M2** | Factions & the five paths; standing-gated activities. |
| **M3** | Economy & businesses; dynamic prices. |
| **M4** | Guild recruitment & member assignment (doer → director). |
| **M5** | The 100-rung ladder content & gating. |
| **M6** | Endgame: King of England claim sequence; Master of the World secret. |
| **M7** | Tauri wrap & Steam prep. |

---

## 16. Open Questions

- **Tick pacing:** how long is a "day" in real seconds at 1× (and how aggressive
  is fast-forward)? Balances "idle" vs "waiting around."
- **Meta vs run balance:** how much should Legacy carry over so early deaths feel
  like progress, not punishment?
- **Path exclusivity:** can one life master multiple paths, or does specializing
  matter (and generalizing is the *slow* route to Master of the World)?
- **Named 100 titles:** the full rank list is a content pass to schedule.
