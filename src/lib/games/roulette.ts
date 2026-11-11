/**
 * Roulette: the cleanest house edge in the building.
 *
 * This site models the AMERICAN double-zero wheel only — 38 pockets,
 * payouts priced for 36. Single-zero wheels exist and halve the edge,
 * but the double-zero game is the one most people actually sit down at,
 * and modelling one wheel keeps every number on the page comparable.
 *
 * Every bet pays as if zero did not exist. Two zeros exist.
 * That single sentence is the whole game, and this file is just
 * bookkeeping for it.
 */

export type Color = "red" | "black" | "green";

/** Physical pocket order, clockwise. Not numeric order — the wheel interleaves. */
export const WHEEL = [
  "0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34",
  "15", "3", "24", "36", "13", "1", "00", "27", "10", "25", "29", "12", "8",
  "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2",
] as const;

export const POCKETS = WHEEL.length; // 38

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colorOf(pocket: string): Color {
  if (pocket === "0" || pocket === "00") return "green";
  return RED_NUMBERS.has(Number(pocket)) ? "red" : "black";
}

/** True for 1..36, false for 0 and 00. Guards every even-money predicate. */
function isNumbered(p: string): boolean {
  return p !== "0" && p !== "00";
}

export interface BetType {
  id: string;
  label: string;
  /** Payout to 1. A 35:1 bet returns 35 units of profit plus your stake. */
  payout: number;
  /** Which pockets win. */
  covers: (pocket: string) => boolean;
  /** How many pockets it covers, for the derivation display. */
  coverCount: number;
  group: "outside" | "inside";
}

const n = (p: string) => Number(p);

export const BET_TYPES: BetType[] = [
  { id: "red", label: "Red", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => colorOf(p) === "red" },
  { id: "black", label: "Black", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => colorOf(p) === "black" },
  { id: "odd", label: "Odd", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => isNumbered(p) && n(p) % 2 === 1 },
  { id: "even", label: "Even", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => isNumbered(p) && n(p) % 2 === 0 },
  { id: "low", label: "1–18", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => isNumbered(p) && n(p) <= 18 },
  { id: "high", label: "19–36", payout: 1, group: "outside", coverCount: 18,
    covers: (p) => isNumbered(p) && n(p) >= 19 },
  { id: "dozen1", label: "1st dozen", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) <= 12 },
  { id: "dozen2", label: "2nd dozen", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) >= 13 && n(p) <= 24 },
  { id: "dozen3", label: "3rd dozen", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) >= 25 },
  { id: "column1", label: "Column 1", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) % 3 === 1 },
  { id: "column2", label: "Column 2", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) % 3 === 2 },
  { id: "column3", label: "Column 3", payout: 2, group: "outside", coverCount: 12,
    covers: (p) => isNumbered(p) && n(p) % 3 === 0 },
  { id: "sixline", label: "Six line (1–6)", payout: 5, group: "inside", coverCount: 6,
    covers: (p) => isNumbered(p) && n(p) >= 1 && n(p) <= 6 },
  {
    id: "basket",
    label: "Top line (0, 00, 1, 2, 3)",
    payout: 6,
    group: "inside",
    coverCount: 5,
    covers: (p) => p === "0" || p === "00" || (isNumbered(p) && n(p) <= 3),
  },
  { id: "corner", label: "Corner (1, 2, 4, 5)", payout: 8, group: "inside", coverCount: 4,
    covers: (p) => isNumbered(p) && [1, 2, 4, 5].includes(n(p)) },
  { id: "street", label: "Street (1, 2, 3)", payout: 11, group: "inside", coverCount: 3,
    covers: (p) => isNumbered(p) && n(p) <= 3 },
  { id: "split", label: "Split (1, 2)", payout: 17, group: "inside", coverCount: 2,
    covers: (p) => isNumbered(p) && (n(p) === 1 || n(p) === 2) },
  { id: "straight", label: "Straight up (17)", payout: 35, group: "inside", coverCount: 1,
    covers: (p) => p === "17" },
];

export interface EdgeBreakdown {
  pockets: number;
  winning: number;
  pWin: number;
  pLose: number;
  payout: number;
  /** Expected profit per 1 unit staked. Negative = the house's cut. */
  ev: number;
  /** Positive percentage, the number casinos never print on the felt. */
  houseEdge: number;
}

/**
 * Derive the edge from first principles rather than quoting a table.
 *
 *   ev = p(win) · payout − p(lose) · 1
 *
 * For any bet covering k of 38 pockets the casino pays (36−k)/k to 1 —
 * the fair price on a 36-pocket wheel. The k cancels, leaving −2/38 for
 * every bet on the layout except the top line.
 */
export function edgeFor(bet: BetType): EdgeBreakdown {
  const winning = bet.coverCount;
  const pWin = winning / POCKETS;
  const pLose = 1 - pWin;
  const ev = pWin * bet.payout - pLose;

  return {
    pockets: POCKETS,
    winning,
    pWin,
    pLose,
    payout: bet.payout,
    ev,
    houseEdge: -ev,
  };
}

/** Spin once. Returns the pocket label. */
export function spin(rng: () => number): string {
  return WHEEL[Math.floor(rng() * POCKETS)];
}

/**
 * Settle a stake. Returns NET change to bankroll (not including the
 * stake coming back), so a 1-unit even-money win returns +1 and a loss
 * returns −1.
 */
export function settle(bet: BetType, stake: number, pocket: string): number {
  return bet.covers(pocket) ? stake * bet.payout : -stake;
}

export const WHEEL_INFO = {
  label: "American",
  pockets: POCKETS,
  edge: "5.26%",
  blurb:
    "Two zeros. A second one was added and no payout changed — that is the entire innovation, and it doubles the edge.",
};
