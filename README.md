# I Hate Casinos

An interactive probability course that uses casino games as worked examples. Four games, seven layered lessons, real physics, and a Monte Carlo engine that will run a hundred thousand sessions while you watch one.

**The thesis:** every casino game is a bet whose payout is computed from slightly wrong odds. None of them is rigged, and that's the point — they don't need to be. A small, honest, fully-disclosed edge applied to a large number of bets is mathematically indistinguishable from a slow robbery, and it's entirely legal.

## How each game page works

Every game page follows the same simple shape, top to bottom:

1. **How to play** — the rules in three or four short steps, plus one line on where the house gets its money.
2. **Here's $1,000** — the playable game: a real roulette betting layout, a 6-deck blackjack shoe with a hint button, the full craps felt (line, come, field, place numbers, big 6/8, hardways and the proposition box), and five poker spots where you call or fold.
3. **What actually happens** — two or three numbers.
4. **Go deeper** — everything else (simulators, charts, strategy, counting), collapsed and not even loaded until opened. Deep links such as `/roulette#simulator` open it automatically.

## The lessons

| # | Idea | Taught via |
|---|------|-----------|
| 1 | Expected value and the house edge | Roulette |
| 2 | Independence and the gambler's fallacy | Roulette |
| 3 | Why no betting system can work | Martingale |
| 4 | Gambler's ruin and risk of ruin | Martingale |
| 5 | Conditional probability and the value of information | Blackjack |
| 6 | Variance, handle, and time on device | Craps |
| 7 | The rake: being right and still losing | Poker |

Each lesson closes with where the idea shows up outside a casino — the games are the setting, not the subject.

## Stack, and why

**Next.js 16 (App Router) · React 19 · Tailwind v4 · Three.js / R3F · Rapier · TypeScript**

### Three.js, not Godot

This was researched before building. For a content site with 3D in it — rather than a game — Three.js wins decisively:

| | Three.js / R3F | Godot 4 web export |
|---|---|---|
| Baseline payload | ~150 KB tree-shaken | ~37 MB wasm engine (~12 MB gzipped), fixed regardless of content |
| Text / SEO / a11y | Real DOM — selectable, indexable, screen-readable | Everything is pixels in a `<canvas>` |
| Hosting | Static on Vercel | Needs COOP/COEP for threads; CDNs often skip gzip on >10 MB objects |
| Sharing state with React charts | Same tree | JS↔wasm bridge |

Godot would only win if this were a game with some prose attached. It's the inverse.

### Three renderers for three jobs

Using WebGL for everything would be the obvious mistake. Instead:

- **Cards → DOM + CSS 3D + blend-mode overlays.** Balatro's cards are 2D quads; the magic is a shader mapping a noise/hex field into an HSL hue rotation. Layered CSS gradients get the same read at ~0 KB, with no shader compile — and the card text stays real DOM that a screen reader can announce.
- **Roulette → Three.js, animated not simulated.** The outcome is drawn from a seeded PRNG, then the ball is driven to it. Physics-sim roulette is slow and flaky; this is reproducible, auditable, and frees the Worker to run a million spins while you watch one.
- **Dice → R3F + Rapier, genuinely simulated.** Here the tumbling *is* the lesson. Rapier is deterministic on a fixed timestep, so a seed reproduces a throw exactly.
- **Charts → hand-written inline SVG.** No charting library.

### Simulation off the main thread

`src/lib/sim/` is a pure, seeded engine with no DOM and no React imports, so the same code runs one visible spin on the main thread and 100,000 invisible ones in a Web Worker.

## Design

Neo-brutalism (after [hybrid-state-of-mind](https://hybrid-state-of-mind.webflow.io/)) crossed with Balatro's chunky, high-contrast table. The organising idea: **the lesson is bright, bordered and legible; the casino is dark felt.** That contrast carries the argument.

Tokens lifted from the reference: Space Grotesk, `border: 2px solid #000`, `box-shadow: 6px 6px #000` (hard, no blur), 16/24/50px radii, a 56/48/36/24/18 type scale, and the violet–ember–lagoon palette.

### Chart colours are computed, not chosen

Charts use a **diverging pair with a neutral grey midpoint**, stepped separately per surface, because most of these charts are single-series or polarity-based rather than categorical:

```
light (on cream #f1f6f1)   gain #1f6fb8   loss #d4420f
dark  (on felt  #0d1a22)   gain #3d93e8   loss #f05a1c
```

Both pairs pass all six checks of a palette validator — lightness band, chroma floor, CVD separation (ΔE 27+ under protanopia), normal-vision floor, and 3:1 contrast against their own surface. The UI accent colours are deliberately *not* reused for data marks; they're too light on cream to carry a mark.

### Cards

52 procedurally generated SVG faces — a few KB total, crisp at any size, themeable. **No Balatro assets are reproduced**; LocalThunk's art is copyrighted, and the fan-project convention is to MIT the code and explicitly carve the art out. We borrow the design language and the foil/holo/polychrome vocabulary.

Those finishes are not decoration: a finish **encodes the card's Hi-Lo count value** (foil = +1, holo = −1, polychrome = 0), which is why they appear in blackjack and nowhere else.

## Verification

Every quantitative claim on the site is checked against a closed form or a large Monte Carlo run:

```bash
npm test     # 206 assertions
```

Covers wheel integrity, all 18 roulette bets, the Martingale closed form, gambler's ruin, 22 known basic-strategy spots (including `11 vs A → Hit` under S17, which is widely misremembered as Double), Hi-Lo balance, the craps 36-outcome table and odds ladder, and poker draw equities.

The load-bearing test: **all five betting progressions realise exactly the 5.26% house edge.** That's the site's central claim, and it fails loudly if the engine ever drifts.

The blackjack page carries a counting simulator that deals real shoes card by card, so its true-count distribution is measured rather than assumed. Its claims are tested too: flat betting reproduces the −0.5% basic-strategy baseline, deeper penetration strictly raises the hourly rate, a wider spread strictly raises the edge, and more players cuts hands per hour without moving the edge per round. The headline finding — **at 50% penetration a 1–8 counter is still losing money** — is an assertion, not a flourish.

The Martingale lab races all six systems at once on one config, which puts a second claim on screen — that the leftover spread between their realised edges is sampling noise. That's tested too: the spread narrows from ~0.75pp at 4,000 trials/system to ~0.12pp at 40,000, and every system lands within 0.3pp of theory.

> One finding worth keeping: left unbounded, a Martingale's stake reaches 2²⁹ and the profit distribution becomes so heavy-tailed that a Monte Carlo mean is meaningless at any feasible trial count. The test caps stakes to bound the tail — the estimator was what failed, not the engine.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm test
```

Deploys to Vercel with zero configuration — all seven routes prerender as static content.

## Layout

```
src/
  app/                 one route per game + /course
  components/
    game/              GameHeader, HowToPlay, PlaySection, TakeAway, GoDeeper
    cards/             procedural SVG cards + CSS foil/holo
    three/             RouletteWheel (animated), DiceTray (Rapier)
    viz/               hand-written SVG charts
    roulette/ blackjack/ craps/ poker/
  lib/
    games/             roulette, blackjack, craps, poker — pure math
                       crapsTable.ts: every spot on the felt as a state machine
                       holdem.ts: 7-card evaluator, exact equity, scenarios
    sim/               seeded engine + Web Worker + hook
    stats.ts           EV, gambler's ruin, Kelly, handle
    strategies.ts      the six betting progressions
    rng.ts             seeded PRNG (mulberry32)
scripts/test.ts        the math regression suite
```

## A note

None of this is a betting system, a tip, or a strategy for making money. There isn't one. The only genuinely winning move is the time you don't spend playing.

If it ever stops being a math problem: **1-800-GAMBLER** (US, 24/7), [ncpgambling.org](https://www.ncpgambling.org/help-treatment/).
