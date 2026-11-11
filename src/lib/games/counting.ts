/**
 * Card counting, simulated honestly.
 *
 * The usual presentation of Hi-Lo stops at "+1 for low cards, −1 for
 * tens and aces" and leaves the impression that the hard part is the
 * arithmetic. The arithmetic is trivial. What actually decides whether
 * counting is worth anything is the SHOE: how deep they cut it, and how
 * many hands per hour you get to play.
 *
 * This module deals real cards out of a real shoe so the true-count
 * distribution is a measured result rather than an assumption.
 */

import { hiLoValue, makeDeck, type Card } from "../cards";
import { cardValue } from "../cards";
import { shuffle, type Rng } from "../rng";

export interface CountConfig {
  decks: number;
  /** Fraction of the shoe dealt before the shuffle. 0.5 = half. */
  penetration: number;
  /** Other players at the table, besides you. */
  otherPlayers: number;
  /** Top of the bet ramp, in units. 1 = flat betting. */
  spread: number;
}

export const DEFAULT_COUNT_CONFIG: CountConfig = {
  decks: 6,
  penetration: 0.75,
  otherPlayers: 2,
  spread: 8,
};

/**
 * Player advantage at a given true count, 6-deck Hi-Lo.
 *
 * Each true count is worth roughly half a percent, and the break-even
 * point sits near TC +1 because basic strategy starts about 0.5% down.
 * A standard linearisation — real indices wobble around it, but not by
 * enough to change any conclusion on this page.
 */
export function edgeAtTrueCount(tc: number): number {
  return (tc - 1) * 0.005;
}

/**
 * The bet ramp.
 *
 * One unit at or below TC +1, then a linear climb that reaches the top
 * of the spread by TC +4. A naive `floor(trueCount)` ramp looks
 * reasonable and is far too timid — it does not reach the top of a 1–8
 * spread until TC +8, which almost never occurs, and it prices a real
 * counter down to break-even.
 *
 * Spreading wider earns more and gets you barred sooner. That trade is
 * the actual job, and it is why the spread is a control here.
 */
export function betAtTrueCount(tc: number, spread: number): number {
  if (spread <= 1 || tc < 1) return 1;
  const climb = 1 + ((tc - 1) * (spread - 1)) / 3;
  return Math.min(spread, Math.max(1, Math.round(climb)));
}

/**
 * Rounds per hour by table size. Heads-up is fast; a full table is a
 * third of the speed. Counting pays by the hour, so this matters as
 * much as the edge does.
 */
const ROUNDS_PER_HOUR = [200, 140, 115, 95, 80, 70, 62];

export function roundsPerHour(totalSpots: number): number {
  return ROUNDS_PER_HOUR[Math.min(ROUNDS_PER_HOUR.length - 1, Math.max(1, totalSpots) - 1)];
}

function buildShoe(rng: Rng, decks: number): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < decks; i++) shoe.push(...makeDeck());
  return shuffle(rng, shoe);
}

export interface RoundRecord {
  index: number;
  /** Running count BEFORE the round is dealt — when you size the bet. */
  running: number;
  trueCount: number;
  decksRemaining: number;
  bet: number;
  edge: number;
  /** Cards consumed by this round. */
  dealt: Card[];
  /** Fraction of the shoe used after this round. */
  depth: number;
}

/**
 * Deal one shoe to the cut card, returning a record per round.
 *
 * Hands are played with a simplified rule (hit below 17, stand at 17+)
 * rather than full basic strategy. That is deliberate: this simulation
 * exists to measure CARD CONSUMPTION and the resulting count, and the
 * difference in cards drawn between the two is small enough to be
 * invisible in the true-count distribution. Settlement is never
 * computed here, so strategy accuracy cannot bias the result.
 */
export function dealShoe(rng: Rng, config: CountConfig): RoundRecord[] {
  const { decks, penetration, otherPlayers } = config;
  const shoe = buildShoe(rng, decks);
  const total = shoe.length;
  const cutCard = Math.floor(total * penetration);

  let pos = 0;
  let running = 0;
  const rounds: RoundRecord[] = [];
  const spots = otherPlayers + 1;

  const draw = (): Card | null => (pos < total ? shoe[pos++] : null);

  while (pos < cutCard) {
    // Everything you bet on is known BEFORE the round is dealt, so the
    // count and the decks remaining are both snapshotted here.
    const decksRemaining = Math.max(0.25, (total - pos) / 52);
    const runningBefore = running;
    const trueCount = runningBefore / decksRemaining;

    const dealt: Card[] = [];
    const take = () => {
      const c = draw();
      if (c) {
        dealt.push(c);
        running += hiLoValue(c.rank);
      }
      return c;
    };

    // Two cards to every spot and to the dealer.
    const hands: Card[][] = [];
    for (let s = 0; s < spots; s++) hands.push([]);
    const dealerHand: Card[] = [];
    for (let pass = 0; pass < 2; pass++) {
      for (let s = 0; s < spots; s++) {
        const c = take();
        if (c) hands[s].push(c);
      }
      const d = take();
      if (d) dealerHand.push(d);
    }

    const totalOf = (cards: Card[]) => {
      let t = 0;
      let aces = 0;
      for (const c of cards) {
        t += cardValue(c.rank);
        if (c.rank === "A") aces++;
      }
      while (t > 21 && aces > 0) {
        t -= 10;
        aces--;
      }
      return t;
    };

    for (const hand of hands) {
      while (totalOf(hand) < 17) {
        const c = take();
        if (!c) break;
        hand.push(c);
      }
    }
    while (totalOf(dealerHand) < 17) {
      const c = take();
      if (!c) break;
      dealerHand.push(c);
    }

    rounds.push({
      index: rounds.length,
      running: runningBefore,
      trueCount,
      decksRemaining,
      bet: betAtTrueCount(trueCount, config.spread),
      edge: edgeAtTrueCount(trueCount),
      dealt,
      depth: pos / total,
    });

    if (pos >= total) break;
  }

  return rounds;
}

/* ------------------------------------------------------------------ */
/* Aggregate                                                           */
/* ------------------------------------------------------------------ */

export interface CountStats {
  shoes: number;
  rounds: number;
  roundsPerShoe: number;
  /** Share of rounds where the player actually has a positive edge. */
  pAdvantage: number;
  /** Share of rounds at TC +2 or better. */
  pTc2Plus: number;
  avgTrueCount: number;
  maxTrueCount: number;
  /** Expected units won per round, after the ramp. */
  evPerRound: number;
  avgBet: number;
  /** evPerRound / avgBet — the blended edge across the whole session. */
  overallEdge: number;
  roundsPerHour: number;
  unitsPerHour: number;
  /** Bucketed true count at bet time, for the chart. */
  distribution: { tc: number; label: string; share: number; edge: number }[];
}

const BUCKETS = [
  { tc: -4, label: "≤ −3" },
  { tc: -2, label: "−2" },
  { tc: -1, label: "−1" },
  { tc: 0, label: "0" },
  { tc: 1, label: "+1" },
  { tc: 2, label: "+2" },
  { tc: 3, label: "+3" },
  { tc: 4, label: "+4" },
  { tc: 5, label: "≥ +5" },
];

function bucketOf(tc: number): number {
  const r = Math.round(tc);
  if (r <= -3) return 0;
  if (r >= 5) return BUCKETS.length - 1;
  return BUCKETS.findIndex((b) => b.tc === r);
}

export function simulateCounting(
  rng: Rng,
  config: CountConfig,
  shoes: number,
): CountStats {
  const counts = new Array(BUCKETS.length).fill(0);
  let rounds = 0;
  let advantage = 0;
  let tc2 = 0;
  let sumTc = 0;
  let maxTc = -Infinity;
  let sumEv = 0;
  let sumBet = 0;

  for (let s = 0; s < shoes; s++) {
    for (const r of dealShoe(rng, config)) {
      rounds++;
      const b = bucketOf(r.trueCount);
      if (b >= 0) counts[b]++;
      if (r.edge > 0) advantage++;
      if (r.trueCount >= 2) tc2++;
      sumTc += r.trueCount;
      if (r.trueCount > maxTc) maxTc = r.trueCount;
      sumEv += r.bet * r.edge;
      sumBet += r.bet;
    }
  }

  const rph = roundsPerHour(config.otherPlayers + 1);
  const evPerRound = rounds ? sumEv / rounds : 0;
  const avgBet = rounds ? sumBet / rounds : 0;

  return {
    shoes,
    rounds,
    roundsPerShoe: rounds / shoes,
    pAdvantage: rounds ? advantage / rounds : 0,
    pTc2Plus: rounds ? tc2 / rounds : 0,
    avgTrueCount: rounds ? sumTc / rounds : 0,
    maxTrueCount: isFinite(maxTc) ? maxTc : 0,
    evPerRound,
    avgBet,
    overallEdge: avgBet ? evPerRound / avgBet : 0,
    roundsPerHour: rph,
    unitsPerHour: evPerRound * rph,
    distribution: BUCKETS.map((b, i) => ({
      tc: b.tc,
      label: b.label,
      share: rounds ? counts[i] / rounds : 0,
      edge: edgeAtTrueCount(b.tc),
    })),
  };
}

export const PENETRATION_PRESETS = [
  { value: 0.5, label: "50%", note: "Shallow. Common on a crowded weekend." },
  { value: 0.67, label: "67%", note: "Typical 6-deck shoe." },
  { value: 0.75, label: "75%", note: "Decent. What a counter looks for." },
  { value: 0.85, label: "85%", note: "Deep. Increasingly rare." },
];
