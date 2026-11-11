/**
 * The transferable math. Nothing in here is roulette-specific —
 * that is the whole point. These functions are what a student should
 * still remember after forgetting every table layout.
 */

/* ------------------------------------------------------------------ */
/* Gambler's ruin                                                      */
/* ------------------------------------------------------------------ */

/**
 * Probability of reaching `target` units before hitting 0, starting
 * from `start`, on repeated even-money bets won with probability p.
 *
 * Classic result. The important case is p < 1/2, where the ratio
 * (q/p)^n explodes and the answer collapses toward zero far faster
 * than intuition expects.
 */
export function ruinSurvival(
  start: number,
  target: number,
  p: number,
): number {
  if (start <= 0) return 0;
  if (start >= target) return 1;
  const q = 1 - p;
  if (Math.abs(p - 0.5) < 1e-12) return start / target;

  const r = q / p;
  // Work in logs: r^target overflows for realistic bankrolls.
  const lr = Math.log(r);
  const num = -Math.expm1(start * lr); // 1 - r^start
  const den = -Math.expm1(target * lr); // 1 - r^target
  if (den === 0) return start / target;
  return num / den;
}

/** Probability of going broke before reaching the target. */
export function ruinProbability(
  start: number,
  target: number,
  p: number,
): number {
  return 1 - ruinSurvival(start, target, p);
}

/* ------------------------------------------------------------------ */
/* Martingale                                                          */
/* ------------------------------------------------------------------ */

export interface MartingaleAnalysis {
  /** How many consecutive losses the bankroll can absorb. */
  doublings: number;
  /** Total units risked to survive that many doublings: 2^k - 1. */
  maxExposure: number;
  /** Probability a single sequence ends in the catastrophic loss. */
  pCatastrophe: number;
  /** Probability a single sequence ends in the +1 unit win. */
  pGrind: number;
  /** Expected profit per completed sequence, in units. */
  evPerSequence: number;
  /** Expected total staked across one sequence. */
  expectedStake: number;
  /** Sequences you can expect to win before the first blow-up. */
  sequencesBeforeRuin: number;
}

/**
 * Exact analysis of one Martingale sequence.
 *
 * The result students find counterintuitive: pGrind is enormous
 * (often 99.9%), and the EV is still exactly the flat-bet EV. The
 * progression buys a pleasant win rate by selling a rare, total loss.
 * The progression only reshapes the distribution; the edge is untouched.
 */
export function analyzeMartingale(
  bankrollUnits: number,
  pWin: number,
  tableMaxUnits = Infinity,
): MartingaleAnalysis {
  const q = 1 - pWin;

  // How many doublings fit in both the bankroll and the table limit?
  let doublings = 0;
  let exposure = 0;
  let next = 1;
  while (
    exposure + next <= bankrollUnits &&
    next <= tableMaxUnits &&
    doublings < 60
  ) {
    exposure += next;
    next *= 2;
    doublings++;
  }

  const pCatastrophe = Math.pow(q, doublings);
  const pGrind = 1 - pCatastrophe;
  const evPerSequence = pGrind * 1 - pCatastrophe * exposure;

  // E[stake] = sum over i of (prob we reach step i) * 2^i
  let expectedStake = 0;
  for (let i = 0; i < doublings; i++) {
    expectedStake += Math.pow(q, i) * Math.pow(2, i);
  }

  return {
    doublings,
    maxExposure: exposure,
    pCatastrophe,
    pGrind,
    evPerSequence,
    expectedStake,
    sequencesBeforeRuin: pCatastrophe > 0 ? 1 / pCatastrophe : Infinity,
  };
}

/* ------------------------------------------------------------------ */
/* Edge, handle, and time on device                                    */
/* ------------------------------------------------------------------ */

export interface HandleModel {
  /** Total amount wagered across the session — NOT the bankroll. */
  handle: number;
  expectedLoss: number;
  /** Expected loss as a share of the money you walked in with. */
  bankrollBurn: number;
  hoursToHalfBankroll: number;
}

/**
 * The single most useful correction to how people think about losses.
 *
 * A 2.70% edge does not mean "I lose 2.7% of my money." It means the
 * house takes 2.7% of everything that crosses the felt — and the same
 * chips cross it again and again. Expected loss scales with HANDLE,
 * which scales with TIME.
 */
export function modelHandle(
  bankroll: number,
  avgBet: number,
  betsPerHour: number,
  hours: number,
  houseEdge: number,
): HandleModel {
  const handle = avgBet * betsPerHour * hours;
  const expectedLoss = handle * houseEdge;
  const lossPerHour = avgBet * betsPerHour * houseEdge;
  return {
    handle,
    expectedLoss,
    bankrollBurn: bankroll > 0 ? expectedLoss / bankroll : 0,
    hoursToHalfBankroll: lossPerHour > 0 ? bankroll / 2 / lossPerHour : Infinity,
  };
}

/* ------------------------------------------------------------------ */
/* Variance, Kelly, and the law of large numbers                       */
/* ------------------------------------------------------------------ */

/** Standard deviation of a single unit bet paying `payout` with prob p. */
export function betStdDev(p: number, payout: number): number {
  const ev = p * payout - (1 - p);
  const ex2 = p * payout * payout + (1 - p) * 1;
  return Math.sqrt(ex2 - ev * ev);
}

/**
 * Kelly stake as a fraction of bankroll.
 *
 * Included mostly to show that it returns <= 0 for every bet in a
 * casino. Kelly's answer to "how much should I bet on a negative-edge
 * game" is, literally, "nothing."
 */
export function kellyFraction(p: number, payout: number): number {
  const b = payout;
  const f = (p * (b + 1) - 1) / b;
  return f;
}

/**
 * How many bets until the house edge reliably dominates variance?
 * Returns n where |EV*n| = k * sigma * sqrt(n), i.e. the point at
 * which you are k standard deviations underwater.
 */
export function betsUntilEdgeDominates(
  edgePerBet: number,
  sigma: number,
  k = 1,
): number {
  if (edgePerBet <= 0) return Infinity;
  return Math.pow((k * sigma) / edgePerBet, 2);
}

/** Normal CDF via Abramowitz & Stegun 7.1.26. Good to ~1e-7. */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-z * z);
  return 0.5 * (1 + sign * y);
}

/**
 * Probability of being AHEAD after n bets, normal approximation.
 * Watch this number fall as n grows. That fall is the business model.
 */
export function probAheadAfter(
  n: number,
  edgePerBet: number,
  sigma: number,
): number {
  if (n <= 0) return 0.5;
  const mean = -edgePerBet * n;
  const sd = sigma * Math.sqrt(n);
  return 1 - normalCdf((0 - mean) / sd);
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function pct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function money(x: number, digits = 0): string {
  const sign = x < 0 ? "−" : "";
  return `${sign}$${Math.abs(x).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function compact(x: number): string {
  if (!isFinite(x)) return "∞";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(x);
}

/**
 * Odds phrased the way people actually feel them: "1 in 784".
 * Percentages below ~0.5% stop registering as real risk; this doesn't.
 */
export function oneIn(p: number): string {
  if (p <= 0) return "never";
  if (p >= 1) return "every time";
  return `1 in ${Math.round(1 / p).toLocaleString("en-US")}`;
}
