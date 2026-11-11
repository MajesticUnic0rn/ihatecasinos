/**
 * Craps: the game with the best bet and the worst bet in the building,
 * placed six inches apart on the same felt.
 *
 * Everything here derives from one table — the 36 equally likely
 * outcomes of two dice — which makes it the ideal place to teach the
 * difference between a bet's probability and a bet's price.
 */

/** Ways to roll each total with two fair dice. Sums to 36. */
export const WAYS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export const POINTS = [4, 5, 6, 8, 9, 10] as const;
export type Point = (typeof POINTS)[number];

export function waysFor(total: number): number {
  return WAYS[total] ?? 0;
}

export function probOf(total: number): number {
  return waysFor(total) / 36;
}

/**
 * P(make the point before a 7). Only the ways for the point and the
 * ways for 7 matter — every other roll is irrelevant, which is the
 * neat conditional-probability trick at the heart of the game.
 */
export function pMakePoint(point: Point): number {
  return WAYS[point] / (WAYS[point] + WAYS[7]);
}

/** True odds on a point, as a ratio to 1. */
export function trueOdds(point: Point): [number, number] {
  return [WAYS[7], WAYS[point]];
}

/** Free-odds payout, which is exactly the true odds — no house cut. */
export const ODDS_PAYOUT: Record<Point, [number, number]> = {
  4: [2, 1],
  10: [2, 1],
  5: [3, 2],
  9: [3, 2],
  6: [6, 5],
  8: [6, 5],
};

/** The 3-4-5× scheme: max odds depends on the point, so wins are uniform. */
export const MAX_ODDS_345: Record<Point, number> = {
  4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5,
};

/** Exact pass-line win probability: 244/495. */
export const PASS_WIN = (() => {
  const comeOutWin = (WAYS[7] + WAYS[11]) / 36;
  let pointWin = 0;
  for (const p of POINTS) pointWin += (WAYS[p] / 36) * pMakePoint(p);
  return comeOutWin + pointWin;
})();

export interface CrapsBet {
  id: string;
  label: string;
  edge: number;
  payout: string;
  group: "line" | "odds" | "place" | "prop";
  blurb: string;
}

export const CRAPS_BETS: CrapsBet[] = [
  {
    id: "pass-345",
    label: "Pass line + 3-4-5× odds",
    edge: 0.00374,
    payout: "1:1 + true odds",
    group: "odds",
    blurb:
      "The best bet available to a member of the public in a casino. The odds portion is paid at exactly fair value, which drags the blended edge down by a factor of four.",
  },
  {
    id: "dontpass-345",
    label: "Don't pass + 3-4-5× odds",
    edge: 0.00273,
    payout: "1:1 + true odds",
    group: "odds",
    blurb:
      "Marginally better still, and socially unbearable: you are betting against everyone else at the table, out loud, all night.",
  },
  {
    id: "dontpass",
    label: "Don't pass / don't come",
    edge: 0.0136,
    payout: "1:1",
    group: "line",
    blurb: "Slightly better than the pass line because the 12 pushes instead of winning.",
  },
  {
    id: "pass",
    label: "Pass line / come",
    edge: 0.01414,
    payout: "1:1",
    group: "line",
    blurb:
      "244 ways to win, 251 to lose. The headline bet, and one of the fairest in the house before you add odds.",
  },
  {
    id: "place68",
    label: "Place 6 or 8",
    edge: 0.0152,
    payout: "7:6",
    group: "place",
    blurb: "Genuinely decent. Pays 7:6, true odds are 6:5.",
  },
  {
    id: "field",
    label: "Field (12 pays 3:1)",
    edge: 0.0278,
    payout: "1:1, 2:1 on 2, 3:1 on 12",
    group: "place",
    blurb:
      "Covers seven of eleven totals, which feels generous until you notice those seven cover only 16 of 36 ways.",
  },
  {
    id: "place59",
    label: "Place 5 or 9",
    edge: 0.04,
    payout: "7:5",
    group: "place",
    blurb: "Pays 7:5; true odds are 3:2. The gap is the rent.",
  },
  {
    id: "place410",
    label: "Place 4 or 10",
    edge: 0.0667,
    payout: "9:5",
    group: "place",
    blurb: "Pays 9:5 against true odds of 2:1. Buy them instead if the commission is on the win only.",
  },
  {
    id: "big68",
    label: "Big 6 / Big 8",
    edge: 0.0909,
    payout: "1:1",
    group: "place",
    blurb:
      "Identical to placing the 6 or 8, except it pays even money instead of 7:6. Six times the edge for the same wager, in a bigger box, in a better spot on the layout.",
  },
  {
    id: "hard68",
    label: "Hard 6 / Hard 8",
    edge: 0.0909,
    payout: "9:1",
    group: "prop",
    blurb: "One way to win, ten to lose. Pays 9:1.",
  },
  {
    id: "anycraps",
    label: "Any craps (2, 3, 12)",
    edge: 0.1111,
    payout: "7:1",
    group: "prop",
    blurb: "4 ways in 36. Pays 7:1 against true odds of 8:1.",
  },
  {
    id: "hard410",
    label: "Hard 4 / Hard 10",
    edge: 0.1111,
    payout: "7:1",
    group: "prop",
    blurb: "One way to win, eight to lose. Pays 7:1.",
  },
  {
    id: "horn",
    label: "Horn (2, 3, 11, 12)",
    edge: 0.125,
    payout: "varies",
    group: "prop",
    blurb: "Four long shots bundled so the bad prices are harder to see individually.",
  },
  {
    id: "any7",
    label: "Any 7",
    edge: 0.1667,
    payout: "4:1",
    group: "prop",
    blurb:
      "The single worst bet on the table. Six ways in 36 — a 5:1 shot — paid at 4:1. One sixth of every dollar, gone.",
  },
];

/**
 * House edge on a pass line blended with N× free odds.
 *
 * The flat bet loses 7/495 per unit. The odds bet loses exactly nothing.
 * So the edge doesn't shrink because the odds are good — it shrinks
 * because the same fixed loss is spread over a larger average stake.
 * Odds are established on a point 24/36 of the time, hence the 2/3.
 */
export function passWithOdds(multiple: number): number {
  const flatLoss = 7 / 495;
  const avgOddsStake = (24 / 36) * multiple;
  return flatLoss / (1 + avgOddsStake);
}

/**
 * The 3-4-5× scheme specifically, where the multiple varies by point so
 * that every odds win pays the same amount — which is the only reason
 * casinos offer it. Works out to 100/36 average odds stake.
 */
export function pass345Edge(): number {
  const flatLoss = 7 / 495;
  let avgOddsStake = 0;
  for (const p of POINTS) avgOddsStake += (WAYS[p] / 36) * MAX_ODDS_345[p];
  return flatLoss / (1 + avgOddsStake);
}

export const ODDS_LADDER = [0, 1, 2, 3, 5, 10, 20, 100].map((m) => ({
  multiple: m,
  edge: passWithOdds(m),
}));
