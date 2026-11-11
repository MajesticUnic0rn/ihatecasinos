/**
 * Betting progressions.
 *
 * Every one of these is sold somewhere as a "system." Not one of them
 * changes expected value, because expected value is linear and no
 * amount of rearranging stake sizes alters a sum of negative terms.
 * What they DO change is the shape of the loss distribution — and
 * that shape is why people believe in them.
 */

export type StrategyId =
  | "flat"
  | "martingale"
  | "grand-martingale"
  | "paroli"
  | "dalembert"
  | "fibonacci";

export interface ProgressionState {
  /** Consecutive losses since the last win. */
  lossStreak: number;
  /** Consecutive wins since the last loss. */
  winStreak: number;
  /** Strategy-private cursor (Fibonacci index, D'Alembert level, …). */
  level: number;
}

export interface Strategy {
  id: StrategyId;
  name: string;
  tagline: string;
  /** What it feels like to play. */
  promise: string;
  /** What it actually does. */
  reality: string;
  risk: "low" | "medium" | "extreme";
  /** Next stake in UNITS, given the running state. */
  next: (s: ProgressionState, base: number) => number;
  /** Update state after a settled bet. */
  update: (s: ProgressionState, won: boolean) => ProgressionState;
}

export const FIB = [
  1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584,
  4181, 6765, 10946, 17711, 28657, 46368, 75025,
];

const fresh = (): ProgressionState => ({
  lossStreak: 0,
  winStreak: 0,
  level: 0,
});

export const initialState = fresh;

export const STRATEGIES: Record<StrategyId, Strategy> = {
  flat: {
    id: "flat",
    name: "Flat betting",
    tagline: "Same bet, every time.",
    promise: "Nothing. It promises nothing.",
    reality:
      "The honest baseline. Your loss rate equals the house edge exactly, and your bankroll dies slowly of old age.",
    risk: "low",
    next: (_s, base) => base,
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? s.winStreak + 1 : 0,
      level: 0,
    }),
  },

  martingale: {
    id: "martingale",
    name: "Martingale",
    tagline: "Double after every loss.",
    promise:
      "A win is inevitable, and one win recovers every loss plus one unit. It cannot fail.",
    reality:
      "It cannot fail only if your bankroll is infinite and the table has no maximum. Both are false. You win one unit roughly 99% of sessions and surrender the entire bankroll in the other 1%, which is precisely break-even against the edge — before the edge.",
    risk: "extreme",
    next: (s, base) => base * Math.pow(2, s.lossStreak),
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? s.winStreak + 1 : 0,
      level: 0,
    }),
  },

  "grand-martingale": {
    id: "grand-martingale",
    name: "Grand Martingale",
    tagline: "Double after every loss, plus one more unit.",
    promise: "Like Martingale, but you profit more when it finally hits.",
    reality:
      "Identical failure mode, reached sooner. The extra unit per step inflates exposure superlinearly, so you buy a slightly bigger grind with a materially closer cliff.",
    risk: "extreme",
    next: (s, base) =>
      base * (Math.pow(2, s.lossStreak) + s.lossStreak),
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? s.winStreak + 1 : 0,
      level: 0,
    }),
  },

  paroli: {
    id: "paroli",
    name: "Paroli (anti-Martingale)",
    tagline: "Double after every win. Reset after three.",
    promise: "Press your luck with the house's money, never your own.",
    reality:
      "There is no such thing as the house's money; once you win it, it is yours and you are risking it. This inverts Martingale's shape: many small losses, rare large wins. Same EV, friendlier ruin profile, still negative.",
    risk: "medium",
    next: (s, base) => base * Math.pow(2, Math.min(s.winStreak, 2)),
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? (s.winStreak + 1) % 3 : 0,
      level: 0,
    }),
  },

  dalembert: {
    id: "dalembert",
    name: "D'Alembert",
    tagline: "Up one unit on a loss, down one on a win.",
    promise:
      "Wins and losses even out, so stepping down after wins locks in the difference.",
    reality:
      "Built on the gambler's fallacy wearing a cravat. The ratio of wins to losses converges, while the raw difference between the counts grows without bound — so there is nothing to 'even out'. Gentler than Martingale, since it grows linearly where Martingale compounds.",
    risk: "medium",
    next: (s, base) => base * (1 + s.level),
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? s.winStreak + 1 : 0,
      level: won ? Math.max(0, s.level - 1) : s.level + 1,
    }),
  },

  fibonacci: {
    id: "fibonacci",
    name: "Fibonacci",
    tagline: "Advance the sequence on a loss, step back two on a win.",
    promise: "A mathematically elegant recovery curve.",
    reality:
      "Elegance buys you steps, never edge. Growth is roughly φ^n ≈ 1.618^n instead of 2^n, so it buys a few extra steps before the table limit stops you. The cliff is further away. It is still a cliff.",
    risk: "extreme",
    next: (s, base) => base * FIB[Math.min(s.level, FIB.length - 1)],
    update: (s, won) => ({
      lossStreak: won ? 0 : s.lossStreak + 1,
      winStreak: won ? s.winStreak + 1 : 0,
      level: won ? Math.max(0, s.level - 2) : s.level + 1,
    }),
  },
};

export const STRATEGY_LIST = Object.values(STRATEGIES);
