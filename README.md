# The Wretched Guild

A medieval **rags-to-regicide systems sim**. You begin as a beggar in the mud of
England and claw your way — through contracts, commerce, the shadows, the Church,
or the land itself — up 100 rungs of medieval rank, to the throne of England, and
beyond it to the secret seat of the Master of the World.

> **Design blueprint:** see [`GAME_DESIGN.md`](./GAME_DESIGN.md) for the full
> vision, systems, alignment model, and roadmap.

## What's here now (vertical slice — M0/M1)

A playable proof of the core loop:

- **Two modes of play.** An *idle layer* (Beg, Honest Labour, Pick Pockets, Lay
  Low) that accrues coin and trains attributes over ticks — and an *interactive
  layer*: a hand-played RPG-choice **contract** ("A Debt in Coin and Blood") with
  gated choices, a risk roll, and a real death vector.
- **Emergent alignment.** A hidden Law↔Chaos / Good↔Evil compass that drifts from
  your choices. One contract choice — the forged-warrant "arrest" — is gated to
  the **Lawful** (the Frollo route), demonstrating alignment-gated play.
- **Permadeath & the Guild.** Death ends the run; a persistent Guild banks
  **Legacy** to spend on permanent unlocks that shape every future life.
- **Pause / fast-forward / offline** time, and **autosave** to browser storage
  through a single swappable `storage` seam (clean architecture — everything
  stays client-side in the browser).

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
