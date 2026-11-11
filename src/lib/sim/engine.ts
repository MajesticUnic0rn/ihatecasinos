/**
 * The simulation engine. Pure, seeded, and worker-safe — no DOM, no
 * imports from React. The same code runs one visible spin on the main
 * thread and a million invisible ones in a Worker.
 */

import { makeRng, type Rng } from "../rng";
import { BET_TYPES, settle, spin } from "../games/roulette";
import {
  STRATEGIES,
  initialState,
  type ProgressionState,
  type StrategyId,
} from "../strategies";

export interface SessionConfig {
  betId: string;
  strategy: StrategyId;
  /** Starting bankroll in dollars. */
  bankroll: number;
  /** Base unit in dollars. */
  baseUnit: number;
  tableMin: number;
  tableMax: number;
  /** Hard stop on number of bets. */
  maxBets: number;
  /** Walk away once profit reaches this. 0 = never walk away. */
  targetProfit: number;
  seed: string;
}

export type SessionOutcome =
  | "bust" /* bankroll hit zero */
  | "target" /* hit the walk-away number */
  | "limit" /* ran out of spins */
  | "capped"; /* progression exceeded the table max and broke */

export interface BetRecord {
  index: number;
  pocket: string;
  stake: number;
  /** Net change to bankroll. */
  delta: number;
  bankroll: number;
  won: boolean;
  /** True if the table maximum forced a smaller bet than the system wanted. */
  clamped: boolean;
  lossStreak: number;
}

export interface SessionResult {
  outcome: SessionOutcome;
  bets: number;
  finalBankroll: number;
  profit: number;
  /** Total amount wagered. The number the edge actually applies to. */
  handle: number;
  peakBankroll: number;
  troughBankroll: number;
  maxStake: number;
  longestLossStreak: number;
  timesClamped: boolean;
  /** Only populated when `trace` is requested. */
  trace?: BetRecord[];
}

function resolveBet(betId: string) {
  const bet = BET_TYPES.find((b) => b.id === betId);
  if (!bet) throw new Error(`Unknown bet: ${betId}`);
  return bet;
}

/**
 * Run a single session to completion.
 *
 * `trace` is opt-in because a million traced sessions is a million
 * arrays, and that is how you lock up a browser tab.
 */
export function runSession(
  config: SessionConfig,
  trace = false,
  rngOverride?: Rng,
): SessionResult {
  const rng = rngOverride ?? makeRng(config.seed);
  const bet = resolveBet(config.betId);
  const strategy = STRATEGIES[config.strategy];

  let bankroll = config.bankroll;
  let state: ProgressionState = initialState();
  let handle = 0;
  let peak = bankroll;
  let trough = bankroll;
  let maxStake = 0;
  let longestLossStreak = 0;
  let timesClamped = false;
  let outcome: SessionOutcome = "limit";
  let i = 0;

  const records: BetRecord[] | undefined = trace ? [] : undefined;

  for (; i < config.maxBets; i++) {
    const wanted = strategy.next(state, config.baseUnit);

    // You cannot bet more than the table allows, or more than you have.
    const ceiling = Math.min(config.tableMax, bankroll);
    const stake = Math.max(
      0,
      Math.min(wanted, ceiling),
    );

    if (stake < config.tableMin || stake <= 0) {
      // Can't even make the minimum. The table has shown you the door.
      outcome = bankroll < config.tableMin ? "bust" : "capped";
      break;
    }

    const clamped = stake < wanted;
    if (clamped) timesClamped = true;

    const pocket = spin(rng);
    const delta = settle(bet, stake, pocket);
    const won = delta > 0;

    bankroll += delta;
    handle += stake;
    if (stake > maxStake) maxStake = stake;
    if (bankroll > peak) peak = bankroll;
    if (bankroll < trough) trough = bankroll;

    state = strategy.update(state, won);
    if (state.lossStreak > longestLossStreak) {
      longestLossStreak = state.lossStreak;
    }

    records?.push({
      index: i,
      pocket,
      stake,
      delta,
      bankroll,
      won,
      clamped,
      lossStreak: state.lossStreak,
    });

    if (bankroll <= 0) {
      bankroll = 0;
      outcome = "bust";
      i++;
      break;
    }

    if (
      config.targetProfit > 0 &&
      bankroll - config.bankroll >= config.targetProfit
    ) {
      outcome = "target";
      i++;
      break;
    }
  }

  return {
    outcome,
    bets: i,
    finalBankroll: bankroll,
    profit: bankroll - config.bankroll,
    handle,
    peakBankroll: peak,
    troughBankroll: trough,
    maxStake,
    longestLossStreak,
    timesClamped,
    trace: records,
  };
}

/* ------------------------------------------------------------------ */
/* Monte Carlo                                                         */
/* ------------------------------------------------------------------ */

export interface MonteCarloResult {
  trials: number;
  config: SessionConfig;
  outcomes: Record<SessionOutcome, number>;
  /** Share of sessions that ended up ahead by any amount. */
  pAhead: number;
  pBust: number;
  meanProfit: number;
  medianProfit: number;
  /** Standard deviation of profit across sessions. */
  sdProfit: number;
  meanHandle: number;
  /** meanProfit / meanHandle — converges to the house edge. Always. */
  realizedEdge: number;
  worstProfit: number;
  bestProfit: number;
  /** p5 / p25 / p50 / p75 / p95 of profit. */
  percentiles: Record<string, number>;
  histogram: { bin: number; lo: number; hi: number; count: number }[];
  /** Raw sample, present only when `keepProfits` was requested. */
  profits?: Float64Array;
}

export const HISTOGRAM_BINS = 41;

/** Bin a profit sample over an explicit domain. */
export function binProfits(
  profits: Float64Array,
  lo: number,
  hi: number,
  bins = HISTOGRAM_BINS,
): MonteCarloResult["histogram"] {
  const width = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < profits.length; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((profits[i] - lo) / width)));
    counts[b]++;
  }
  return counts.map((count, bin) => ({
    bin,
    lo: lo + bin * width,
    hi: lo + (bin + 1) * width,
    count,
  }));
}

export function runMonteCarlo(
  config: SessionConfig,
  trials: number,
  onProgress?: (done: number, total: number) => void,
  /**
   * Keep the raw profit sample on the result. Needed only when several
   * runs have to be re-binned onto SHARED bin edges afterwards — small
   * multiples drawn on per-panel bins are not a comparison.
   * The caller is expected to drop this before posting across a thread.
   */
  keepProfits = false,
): MonteCarloResult {
  const outcomes: Record<SessionOutcome, number> = {
    bust: 0,
    target: 0,
    limit: 0,
    capped: 0,
  };

  const profits = new Float64Array(trials);
  let sumProfit = 0;
  let sumHandle = 0;
  const baseSeed = config.seed;

  const progressEvery = Math.max(1, Math.floor(trials / 50));

  for (let t = 0; t < trials; t++) {
    // Distinct, reproducible stream per trial.
    const r = runSession({ ...config, seed: `${baseSeed}#${t}` }, false);
    outcomes[r.outcome]++;
    profits[t] = r.profit;
    sumProfit += r.profit;
    sumHandle += r.handle;

    if (onProgress && t % progressEvery === 0) onProgress(t, trials);
  }
  onProgress?.(trials, trials);

  const meanProfit = sumProfit / trials;
  const meanHandle = sumHandle / trials;

  let varSum = 0;
  let ahead = 0;
  for (let t = 0; t < trials; t++) {
    const d = profits[t] - meanProfit;
    varSum += d * d;
    if (profits[t] > 0) ahead++;
  }
  const sdProfit = Math.sqrt(varSum / trials);

  const sorted = Float64Array.from(profits).sort();
  const q = (f: number) =>
    sorted[Math.min(trials - 1, Math.max(0, Math.floor(f * (trials - 1))))];

  const worst = sorted[0];
  const best = sorted[trials - 1];


  return {
    trials,
    config,
    outcomes,
    pAhead: ahead / trials,
    pBust: outcomes.bust / trials,
    meanProfit,
    medianProfit: q(0.5),
    sdProfit,
    meanHandle,
    realizedEdge: meanHandle > 0 ? -meanProfit / meanHandle : 0,
    worstProfit: worst,
    bestProfit: best,
    percentiles: {
      p5: q(0.05),
      p25: q(0.25),
      p50: q(0.5),
      p75: q(0.75),
      p95: q(0.95),
    },
    histogram: binProfits(profits, worst, best),
    profits: keepProfits ? profits : undefined,
  };
}

export const DEFAULT_CONFIG: SessionConfig = {
  betId: "red",
  strategy: "martingale",
  bankroll: 1000,
  baseUnit: 5,
  tableMin: 5,
  tableMax: 500,
  maxBets: 250,
  targetProfit: 100,
  seed: "house-always-wins",
};
