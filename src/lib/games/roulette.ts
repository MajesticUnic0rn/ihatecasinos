/**
 * Roulette: the cleanest house edge in the building.
 *
 * Every bet pays as if zero did not exist. Zero exists.
 * That single sentence is the whole game, and this file is just
 * bookkeeping for it.
 */

export type Variant = "american" | "european";
export type Color = "red" | "black" | "green";

/** Physical pocket order, clockwise. Not numeric order — the wheel interleaves. */
export const WHEEL_EUROPEAN = [
  "0", "32", "15", "19", "4", "21", "2", "25", "17", "34", "6", "27", "13",
  "36", "11", "30", "8", "23", "10", "5", "24", "16", "33", "1", "20", "14",
  "31", "9", "22", "18", "29", "7", "28", "12", "35", "3", "26",
] as const;

export const WHEEL_AMERICAN = [
  "0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34",
  "15", "3", "24", "36", "13", "1", "00", "27", "10", "25", "29", "12", "8",
  "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2",
] as const;

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function wheel(variant: Variant): readonly string[] {
  return variant === "american" ? WHEEL_AMERICAN : WHEEL_EUROPEAN;
}

export function pocketCount(variant: Variant): number {
  return variant === "american" ? 38 : 37;
}

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
  covers: (pocket: string, variant: Variant) => boolean;
  /** How many pockets it covers, for the derivation display. */
  coverCount: (variant: Variant) => number;
  group: "outside" | "inside";
  /** American-only (the basket is a double-zero artifact). */
  americanOnly?: boolean;
}

const n = (p: string) => Number(p);

export const BET_TYPES: BetType[] = [
  {
    id: "red",
    label: "Red",
    payout: 1,
    group: "outside",
    covers: (p) => colorOf(p) === "red",
    coverCount: () => 18,
  },
  {
    id: "black",
    label: "Black",
    payout: 1,
    group: "outside",
    covers: (p) => colorOf(p) === "black",
    coverCount: () => 18,
  },
  {
    id: "odd",
    label: "Odd",
    payout: 1,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) % 2 === 1,
    coverCount: () => 18,
  },
  {
    id: "even",
    label: "Even",
    payout: 1,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) % 2 === 0,
    coverCount: () => 18,
  },
  {
    id: "low",
    label: "1–18",
    payout: 1,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) <= 18,
    coverCount: () => 18,
  },
  {
    id: "high",
    label: "19–36",
    payout: 1,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) >= 19,
    coverCount: () => 18,
  },
  {
    id: "dozen1",
    label: "1st dozen",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) <= 12,
    coverCount: () => 12,
  },
  {
    id: "dozen2",
    label: "2nd dozen",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) >= 13 && n(p) <= 24,
    coverCount: () => 12,
  },
  {
    id: "dozen3",
    label: "3rd dozen",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) >= 25,
    coverCount: () => 12,
  },
  {
    id: "column1",
    label: "Column 1",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) % 3 === 1,
    coverCount: () => 12,
  },
  {
    id: "column2",
    label: "Column 2",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) % 3 === 2,
    coverCount: () => 12,
  },
  {
    id: "column3",
    label: "Column 3",
    payout: 2,
    group: "outside",
    covers: (p) => isNumbered(p) && n(p) % 3 === 0,
    coverCount: () => 12,
  },
  {
    id: "sixline",
    label: "Six line (1–6)",
    payout: 5,
    group: "inside",
    covers: (p) => isNumbered(p) && n(p) >= 1 && n(p) <= 6,
    coverCount: () => 6,
  },
  {
    id: "basket",
    label: "Top line (0, 00, 1, 2, 3)",
    payout: 6,
    group: "inside",
    americanOnly: true,
    covers: (p) => p === "0" || p === "00" || (isNumbered(p) && n(p) <= 3),
    coverCount: () => 5,
  },
  {
    id: "corner",
    label: "Corner (1, 2, 4, 5)",
    payout: 8,
    group: "inside",
    covers: (p) => [1, 2, 4, 5].includes(n(p)) && isNumbered(p),
    coverCount: () => 4,
  },
  {
    id: "street",
    label: "Street (1, 2, 3)",
    payout: 11,
    group: "inside",
    covers: (p) => isNumbered(p) && n(p) <= 3,
    coverCount: () => 3,
  },
  {
    id: "split",
    label: "Split (1, 2)",
    payout: 17,
    group: "inside",
    covers: (p) => isNumbered(p) && (n(p) === 1 || n(p) === 2),
    coverCount: () => 2,
  },
  {
    id: "straight",
    label: "Straight up (17)",
    payout: 35,
    group: "inside",
    covers: (p) => p === "17",
    coverCount: () => 1,
  },
];

export const EVEN_MONEY_IDS = new Set([
  "red", "black", "odd", "even", "low", "high",
]);

export type RuleSet = "standard" | "la-partage" | "en-prison";

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
 * ev = p(win) * payout - p(lose) * 1
 *
 * La Partage / En Prison refund half the stake on zero, but ONLY on
 * even-money bets — which is why the 1.35% figure gets quoted far more
 * often than it gets earned.
 */
export function edgeFor(
  bet: BetType,
  variant: Variant,
  rules: RuleSet = "standard",
): EdgeBreakdown {
  const pockets = pocketCount(variant);
  const winning = bet.coverCount(variant);
  const pWin = winning / pockets;
  const pLose = 1 - pWin;

  let ev = pWin * bet.payout - pLose;

  const halfBackApplies =
    variant === "european" &&
    rules !== "standard" &&
    EVEN_MONEY_IDS.has(bet.id);

  if (halfBackApplies) {
    // Zero is the only losing pocket that gets the refund.
    // Recover half of the stake on that single pocket.
    ev += 0.5 * (1 / pockets);
  }

  return {
    pockets,
    winning,
    pWin,
    pLose,
    payout: bet.payout,
    ev,
    houseEdge: -ev,
  };
}

/** Spin once. Returns the pocket label. */
export function spin(rng: () => number, variant: Variant): string {
  const w = wheel(variant);
  return w[Math.floor(rng() * w.length)];
}

/**
 * Settle a stake. Returns NET change to bankroll (not including the
 * stake coming back), so a 1-unit even-money win returns +1 and a loss
 * returns -1.
 */
export function settle(
  bet: BetType,
  stake: number,
  pocket: string,
  variant: Variant,
  rules: RuleSet = "standard",
): number {
  if (bet.covers(pocket, variant)) return stake * bet.payout;

  const isZero = pocket === "0" || pocket === "00";
  if (
    isZero &&
    variant === "european" &&
    rules !== "standard" &&
    EVEN_MONEY_IDS.has(bet.id)
  ) {
    // La Partage: half the stake is returned immediately.
    // En Prison: the stake rides one spin. Over many trials the two have
    // identical EV, so we model both as an immediate half-loss.
    return -stake / 2;
  }
  return -stake;
}

export const VARIANT_INFO: Record<
  Variant,
  { label: string; pockets: number; edge: string; blurb: string }
> = {
  european: {
    label: "European",
    pockets: 37,
    edge: "2.70%",
    blurb:
      "One zero. The civilised version, which is a strange thing to call a 2.70% tax.",
  },
  american: {
    label: "American",
    pockets: 38,
    edge: "5.26%",
    blurb:
      "A second zero was added and no payout changed. That is the entire innovation: the edge doubles.",
  },
};
