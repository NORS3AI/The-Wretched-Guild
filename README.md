# The Wretched Guild

A medieval **rags-to-regicide systems sim**. You begin as a beggar in the mud of
England and claw your way — through contracts, commerce, the shadows, the Church,
or the land itself — up 100 rungs of medieval rank, to the throne of England, and
beyond it to the secret seat of the Master of the World.

> **Design blueprint:** see [`GAME_DESIGN.md`](./GAME_DESIGN.md) for the full
> vision, systems, alignment model, and roadmap.

## What's playable now (M0–M4)

- **Two modes of play.** An *idle layer* (Beg, Honest Labour, Pick Pockets, Serve
  at the Chapel, Work a Market Stall, Lay Low) that accrues coin, attributes, and
  faction standing over ticks — and an *interactive layer*: a hand-played
  RPG-choice **contract** ("A Debt in Coin and Blood") with gated choices, a risk
  roll, and a real death vector.
- **Emergent alignment.** A hidden Law↔Chaos / Good↔Evil compass that drifts from
  your choices. The forged-warrant "arrest" is gated to the **Lawful** (the Frollo
  route); the Shadow Guild refuses the Lawful Good; the Church admits no Chaotic.
- **Factions & the rank ladder.** Five factions, each gated by alignment. Climb a
  100-rung ladder (first 15 rungs live) gated on coin + standing, with your
  **title themed by the path you chose** — a Cutpurse and an Almstaker stand on
  the same rung.
- **Economy & businesses.** Buy and upgrade ventures — Market Stall, Alehouse,
  Fencing Den, Craftsman's Shop, Smuggler's Wharf, Trade House — that earn
  **passive income** each tick. Illicit ones pay more but raise **Heat**, and the
  **watch** eventually raids or fines a notorious character.
- **The Guild (doer → director).** From rank 3, recruit wretches — each with
  their **own alignment** that dictates what work they'll take (a Lawful Good
  friar won't thieve; a Chaotic brute won't do almswork). Assign them to jobs
  that run in parallel, pay their wages, and manage their Heat and mortality —
  unpaid or captured members leave the roster.
- **Permadeath & Legacy.** Death ends the run; a persistent Guild banks
  **Legacy** (more for climbing higher) to spend on permanent unlocks.
- **Pause / fast-forward / offline** time, and **autosave** to browser storage
  through a single swappable `storage` seam — everything stays client-side.

## Tech

- **TypeScript** everywhere.
- **Pure-TS engine** (`src/engine/`) — deterministic, framework-free, testable.
- **Svelte + Vite** UI (`src/ui/`) — the UI only reads engine state and
  dispatches commands.
- **GitHub Pages** hosting from `main` → `/docs`.

## Project layout

```
src/engine/   framework-free simulation core (state, rng, activities,
              encounters, alignment, engine, death, save, storage)
src/ui/       Svelte components + the store that drives the tick loop
tests/        headless engine regression test (npm test)
docs/         GitHub Pages build output (committed)
```

## Development

```bash
npm install
npm run dev      # local dev server with hot reload
npm run check    # type-check (svelte-check)
npm test         # headless engine regression test
npm run build    # build to /docs for GitHub Pages
```

## Deploying (GitHub Pages)

The build output is committed to `/docs` on `main`. To publish:

1. Repo **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** `main`, **folder:** `/docs`.

The site serves at `https://<user>.github.io/The-Wretched-Guild/`. The Vite
`base` is set to `/The-Wretched-Guild/` to match; a `.nojekyll` marker ships in
the build so GitHub doesn't post-process it.
