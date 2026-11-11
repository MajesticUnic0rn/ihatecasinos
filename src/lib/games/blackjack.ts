/**
 * Blackjack: the only game on the floor where information is worth money.
 *
 * Rule set encoded here — this matters, because "basic strategy" is not
 * one chart, it is a chart per rule set:
 *   4–8 decks · dealer STANDS on soft 17 · double after split allowed
 *   · late surrender allowed · blackjack pays 3:2
 * Source chart: Wizard of Odds, 4–8 deck S17.
 */

import { cardValue, type Card, type Rank } from "../cards";

export type Action = "H" | "S" | "D" | "Ds" | "P" | "R";

export const ACTION_LABEL: Record<Action, string> = {
  H: "Hit",
  S: "Stand",
  D: "Double",
  Ds: "Double",
  P: "Split",
  R: "Surrender",
};

export const ACTION_FULL: Record<Action, string> = {
  H: "Hit",
  S: "Stand",
  D: "Double if allowed, otherwise hit",
  Ds: "Double if allowed, otherwise stand",
  P: "Split",
  R: "Surrender if allowed, otherwise hit",
};

/** Dealer upcards in chart order. */
export const UPCARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"] as const;
export type Upcard = (typeof UPCARDS)[number];

const H = "H" as const;
const S = "S" as const;
const D = "D" as const;
const Ds = "Ds" as const;
const P = "P" as const;
const R = "R" as const;

/* --- hard totals, 5..21 --------------------------------------------- */
export const HARD: Record<number, Action[]> = {
  //      2  3  4  5  6  7  8  9  10 A
  5:  [H, H, H, H, H, H, H, H, H, H],
  6:  [H, H, H, H, H, H, H, H, H, H],
  7:  [H, H, H, H, H, H, H, H, H, H],
  8:  [H, H, H, H, H, H, H, H, H, H],
  9:  [H, D, D, D, D, H, H, H, H, H],
  10: [D, D, D, D, D, D, D, D, H, H],
  11: [D, D, D, D, D, D, D, D, D, H],
  12: [H, H, S, S, S, H, H, H, H, H],
  13: [S, S, S, S, S, H, H, H, H, H],
  14: [S, S, S, S, S, H, H, H, H, H],
  15: [S, S, S, S, S, H, H, H, R, H],
  16: [S, S, S, S, S, H, H, R, R, R],
  17: [S, S, S, S, S, S, S, S, S, S],
  18: [S, S, S, S, S, S, S, S, S, S],
  19: [S, S, S, S, S, S, S, S, S, S],
  20: [S, S, S, S, S, S, S, S, S, S],
  21: [S, S, S, S, S, S, S, S, S, S],
};

/* --- soft totals, A+x (total 13..21) -------------------------------- */
export const SOFT: Record<number, Action[]> = {
  //      2   3   4   5   6   7  8  9  10 A
  13: [H,  H,  H,  D,  D,  H, H, H, H, H],
  14: [H,  H,  H,  D,  D,  H, H, H, H, H],
  15: [H,  H,  D,  D,  D,  H, H, H, H, H],
  16: [H,  H,  D,  D,  D,  H, H, H, H, H],
  17: [H,  D,  D,  D,  D,  H, H, H, H, H],
  18: [S,  Ds, Ds, Ds, Ds, S, S, H, H, H],
  19: [S,  S,  S,  S,  S,  S, S, S, S, S],
  20: [S,  S,  S,  S,  S,  S, S, S, S, S],
  21: [S,  S,  S,  S,  S,  S, S, S, S, S],
};

/* --- pairs (double-after-split allowed) ----------------------------- */
export const PAIRS: Record<string, Action[]> = {
  //      2  3  4  5  6  7  8  9  10 A
  A: [P, P, P, P, P, P, P, P, P, P],
  "10": [S, S, S, S, S, S, S, S, S, S],
  "9": [P, P, P, P, P, S, P, P, S, S],
  "8": [P, P, P, P, P, P, P, P, P, P],
  "7": [P, P, P, P, P, P, H, H, H, H],
  "6": [P, P, P, P, P, H, H, H, H, H],
  "5": [D, D, D, D, D, D, D, D, H, H], // never split 5s — it's a hard 10
  "4": [H, H, H, P, P, H, H, H, H, H],
  "3": [P, P, P, P, P, P, H, H, H, H],
  "2": [P, P, P, P, P, P, H, H, H, H],
};

/* ------------------------------------------------------------------ */
/* Hand evaluation                                                     */
/* ------------------------------------------------------------------ */

export interface HandValue {
  total: number;
  soft: boolean;
  busted: boolean;
  blackjack: boolean;
}

export function evaluate(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = cardValue(c.rank);
    total += v;
    if (c.rank === "A") aces++;
  }
  // Demote aces from 11 to 1 while we're over.
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  soft = aces > 0;
  return {
    total,
    soft,
    busted: total > 21,
    blackjack: cards.length === 2 && total === 21,
  };
}

export function upcardKey(rank: Rank): Upcard {
  if (rank === "A") return "A";
  const v = cardValue(rank);
  return (v === 10 ? "10" : String(v)) as Upcard;
}

export function upcardIndex(rank: Rank): number {
  return UPCARDS.indexOf(upcardKey(rank));
}

function pairKey(rank: Rank): string {
  if (rank === "A") return "A";
  return cardValue(rank) === 10 ? "10" : String(cardValue(rank));
}

/**
 * The correct play, given the chart above.
 *
 * `canDouble` / `canSplit` / `canSurrender` are respected, so the
 * coach never tells you to do something the table won't allow.
 */
export function basicStrategy(
  hand: Card[],
  dealerUp: Rank,
  opts: { canDouble?: boolean; canSplit?: boolean; canSurrender?: boolean } = {},
): Action {
  const { canDouble = true, canSplit = true, canSurrender = true } = opts;
  const i = upcardIndex(dealerUp);
  const v = evaluate(hand);

  if (
    canSplit &&
    hand.length === 2 &&
    pairKey(hand[0].rank) === pairKey(hand[1].rank)
  ) {
    // Split is the only decision the pair chart can add. Every non-split
    // entry (5,5 → hard 10; 10,10 → hard 20; 4,4 vs 2 → hard 8 …) is
    // identical to the hard-total row, so we fall through rather than
    // keep a second copy of the same truth.
    if (PAIRS[pairKey(hand[0].rank)]?.[i] === P) return P;
  }

  let action: Action;
  if (v.soft && v.total >= 13 && v.total <= 21) {
    action = SOFT[v.total][i];
  } else {
    action = HARD[Math.max(5, Math.min(21, v.total))][i];
  }

  if (action === R && (!canSurrender || hand.length > 2)) return H;
  if (action === D && !canDouble) return H;
  if (action === Ds && !canDouble) return S;
  return action;
}

/* ------------------------------------------------------------------ */
/* Reference probabilities                                             */
/* ------------------------------------------------------------------ */

/**
 * Dealer bust rate by upcard. 6 decks, stands on soft 17, conditioned on
 * the dealer having already peeked and NOT having blackjack — which is
 * why the 10 and A columns look better for the dealer than the raw
 * (unpeeked) numbers you sometimes see quoted.
 */
export const DEALER_BUST: Record<Upcard, number> = {
  "2": 0.354,
  "3": 0.374,
  "4": 0.396,
  "5": 0.418,
  "6": 0.423,
  "7": 0.26,
  "8": 0.24,
  "9": 0.23,
  "10": 0.21,
  A: 0.17,
};

/** P(natural blackjack) from a fresh shoe: 2 × (4/13) × (16/51). */
export const P_BLACKJACK = 2 * (4 / 13) * (16 / 51);

export const RULE_EFFECTS = [
  { rule: "Blackjack pays 6:5 instead of 3:2", delta: 0.0139, note: "The single most expensive rule change in the modern casino." },
  { rule: "Dealer hits soft 17", delta: 0.0022, note: "Looks like it helps you. It does not." },
  { rule: "8 decks instead of 1", delta: 0.0058, note: "Fewer favourable compositions, harder to track." },
  { rule: "No double after split", delta: 0.0014, note: "Quietly removes value from your best hands." },
  { rule: "No surrender", delta: 0.0008, note: "Costs least, removed most often." },
  { rule: "Double on 10 or 11 only", delta: 0.0018, note: "Kills every soft double." },
];
