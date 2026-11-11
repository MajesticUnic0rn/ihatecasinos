/**
 * Texas Hold'em, just enough of it: a 7-card hand evaluator, exact
 * equity for two known hands, and the teaching scenarios.
 *
 * The evaluator works on bitmasks instead of enumerating the 21 possible
 * five-card hands, so a Monte Carlo of tens of thousands of runouts stays
 * well under a frame budget.
 */

import { makeDeck, parseHand, type Card, type Rank } from "../cards";
import { shuffle, type Rng } from "../rng";

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

export const CATEGORY_NAMES = [
  "High card",
  "One pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

export interface HandScore {
  /** Comparable: higher always wins. */
  value: number;
  category: number;
  name: string;
}

/** Highest straight in a rank bitmask (bit r set = rank r present). */
function straightHigh(mask: number): number {
  // Ace plays low too: copy bit 14 down to bit 1 for the wheel.
  const m = mask | (mask & (1 << 14) ? 1 << 1 : 0);
  for (let hi = 14; hi >= 5; hi--) {
    const run = 0b11111 << (hi - 4);
    if ((m & run) === run) return hi;
  }
  return 0;
}

/** Top `n` set ranks of a mask, descending. */
function topRanks(mask: number, n: number): number[] {
  const out: number[] = [];
  for (let r = 14; r >= 2 && out.length < n; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

function pack(category: number, kickers: number[]): number {
  let v = category;
  for (let i = 0; i < 5; i++) v = v * 15 + (kickers[i] ?? 0);
  return v;
}

export function evaluate(cards: Card[]): HandScore {
  const counts = new Array(15).fill(0);
  const suitMask = [0, 0, 0, 0];
  const suitCount = [0, 0, 0, 0];
  const SUIT_I: Record<Card["suit"], number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  let rankMask = 0;

  for (const c of cards) {
    const r = RANK_VALUE[c.rank];
    const s = SUIT_I[c.suit];
    counts[r]++;
    suitMask[s] |= 1 << r;
    suitCount[s]++;
    rankMask |= 1 << r;
  }

  const result = (category: number, kickers: number[]): HandScore => ({
    value: pack(category, kickers),
    category,
    name: CATEGORY_NAMES[category],
  });

  // Flush and straight flush
  const fs = suitCount.findIndex((n) => n >= 5);
  if (fs >= 0) {
    const sf = straightHigh(suitMask[fs]);
    if (sf) return result(8, [sf]);
  }

  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  for (let r = 14; r >= 2; r--) {
    if (counts[r] === 4) quads.push(r);
    else if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
  }

  if (quads.length) {
    const kicker = topRanks(rankMask & ~(1 << quads[0]), 1);
    return result(7, [quads[0], ...kicker]);
  }
  if (trips.length && (pairs.length || trips.length > 1)) {
    const pairRank = Math.max(pairs[0] ?? 0, trips[1] ?? 0);
    return result(6, [trips[0], pairRank]);
  }
  if (fs >= 0) return result(5, topRanks(suitMask[fs], 5));

  const st = straightHigh(rankMask);
  if (st) return result(4, [st]);

  if (trips.length) {
    return result(3, [trips[0], ...topRanks(rankMask & ~(1 << trips[0]), 2)]);
  }
  if (pairs.length >= 2) {
    const [a, b] = pairs;
    return result(2, [a, b, ...topRanks(rankMask & ~(1 << a) & ~(1 << b), 1)]);
  }
  if (pairs.length === 1) {
    return result(1, [pairs[0], ...topRanks(rankMask & ~(1 << pairs[0]), 3)]);
  }
  return result(0, topRanks(rankMask, 5));
}

/* ------------------------------------------------------------------ */
/* Equity                                                              */
/* ------------------------------------------------------------------ */

export interface Equity {
  win: number;
  tie: number;
  lose: number;
  /** Win + half of ties: your share of the pot. */
  share: number;
  /** True if every runout was counted rather than sampled. */
  exact: boolean;
  samples: number;
}

function remainingDeck(known: Card[]): Card[] {
  const used = new Set(known.map((c) => c.id));
  return makeDeck().filter((c) => !used.has(c.id));
}

/**
 * Equity of `hero` against `villain` given a partial board.
 *
 * With one or two cards to come every runout is enumerated (at most 990).
 * Preflop that would be 1.7 million boards, so it samples instead.
 */
export function equity(
  hero: Card[],
  villain: Card[],
  board: Card[],
  rng?: Rng,
  samples = 30_000,
): Equity {
  const deck = remainingDeck([...hero, ...villain, ...board]);
  const need = 5 - board.length;
  let win = 0, tie = 0, lose = 0, n = 0;

  const score = (runout: Card[]) => {
    const full = [...board, ...runout];
    const h = evaluate([...hero, ...full]).value;
    const v = evaluate([...villain, ...full]).value;
    if (h > v) win++;
    else if (h < v) lose++;
    else tie++;
    n++;
  };

  if (need === 0) score([]);
  else if (need === 1) for (const a of deck) score([a]);
  else if (need === 2) {
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++) score([deck[i], deck[j]]);
  } else {
    if (!rng) throw new Error("Preflop equity is sampled and needs an rng");
    const pool = [...deck];
    for (let s = 0; s < samples; s++) {
      // Partial Fisher-Yates: only the first `need` slots matter.
      for (let k = 0; k < need; k++) {
        const j = k + Math.floor(rng() * (pool.length - k));
        [pool[k], pool[j]] = [pool[j], pool[k]];
      }
      score(pool.slice(0, need));
    }
  }

  return {
    win: win / n,
    tie: tie / n,
    lose: lose / n,
    share: (win + tie / 2) / n,
    exact: need <= 2,
    samples: n,
  };
}

/** Deal the rest of the board at random, for the playable runout. */
export function runout(known: Card[], board: Card[], rng: Rng): Card[] {
  const deck = shuffle(rng, remainingDeck(known));
  return [...board, ...deck.slice(0, 5 - board.length)];
}

/* ------------------------------------------------------------------ */
/* Scenarios                                                           */
/* ------------------------------------------------------------------ */

export interface Scenario {
  id: string;
  title: string;
  setup: string;
  hero: string;
  villain: string;
  board: string;
  /** Pot before your call, including the bet you are facing. */
  pot: number;
  toCall: number;
  lesson: string;
}

/**
 * Each scenario's "right answer" is not hardcoded anywhere — it falls
 * out of comparing equity with the price, and the test suite checks the
 * verdict each lesson claims.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "aces",
    title: "Pocket aces",
    setup: "You look down at the best starting hand in the game. Your opponent pushes all-in for $100.",
    hero: "As Ah",
    villain: "Kc Kd",
    board: "",
    pot: 150,
    toCall: 100,
    lesson: "A huge favourite still loses about one time in five. Being right and winning tonight are different things.",
  },
  {
    id: "flush-draw",
    title: "The flush draw",
    setup: "Two hearts on the board give you four to a flush. Your opponent bets $30 into a $70 pot.",
    hero: "Ah Kh",
    villain: "9s 8s",
    board: "7h 2h 9c",
    pot: 100,
    toCall: 30,
    lesson: "You are behind right now and calling is still clearly correct. What matters is your chance against the price you are paying.",
  },
  {
    id: "gutshot",
    title: "Chasing a gutshot",
    setup: "You need exactly an 8 for a straight. Your opponent bets $60 into a $60 pot.",
    hero: "Js 10s",
    villain: "9c 9s",
    board: "9d 7h 2c",
    pot: 120,
    toCall: 60,
    lesson: "Four cards in the deck help you. The pot is asking you to win a third of the time, and you will not get close.",
  },
  {
    id: "coin-flip",
    title: "A coin flip in a big pot",
    setup: "Your opponent shoves $100 into a pot that already holds $150.",
    hero: "Ac Kd",
    villain: "Qh Qs",
    board: "",
    pot: 250,
    toCall: 100,
    lesson: "You are an underdog and calling is still right. A big enough pot pays you to take the worse side of a flip.",
  },
  {
    id: "weak-kicker",
    title: "Top pair, weak kicker",
    setup: "You paired your king, but your other card is a 4. Your opponent bets $80 into $80 on the turn.",
    hero: "Ks 4d",
    villain: "Kd Qc",
    board: "Kh 9c 3s 7d",
    pot: 160,
    toCall: 80,
    lesson: "Having a pair feels like a hand. Against a better pair you are drawing to three cards, and folding saves money.",
  },
];

export function scenarioCards(s: Scenario) {
  return {
    hero: parseHand(s.hero),
    villain: parseHand(s.villain),
    board: s.board ? parseHand(s.board) : [],
  };
}

/** Break-even equity for a call. */
export function requiredShare(s: Scenario): number {
  return s.toCall / (s.pot + s.toCall);
}

/** Expected profit of calling, in dollars. Folding is always $0. */
export function callEv(s: Scenario, eq: Equity): number {
  const total = s.pot + s.toCall;
  return eq.win * s.pot + eq.tie * (total / 2 - s.toCall) - eq.lose * s.toCall;
}

/** Example hands for the rankings table, strongest first. */
export const RANKING_EXAMPLES: { name: string; cards: string; note: string }[] = [
  { name: "Straight flush", cards: "9h 8h 7h 6h 5h", note: "Five in a row, all one suit." },
  { name: "Four of a kind", cards: "Qs Qh Qd Qc 3s", note: "All four of one rank." },
  { name: "Full house", cards: "Js Jh Jd 4c 4s", note: "Three of one rank, two of another." },
  { name: "Flush", cards: "Ad Jd 8d 6d 2d", note: "Any five of one suit." },
  { name: "Straight", cards: "10c 9d 8s 7h 6c", note: "Five in a row, mixed suits." },
  { name: "Three of a kind", cards: "7s 7h 7d Kc 2s", note: "Three of one rank." },
  { name: "Two pair", cards: "As Ad 5c 5h 9s", note: "Two different pairs." },
  { name: "One pair", cards: "Ks Kh 9d 6c 3s", note: "Two of one rank." },
  { name: "High card", cards: "Ah Qd 8s 5c 3h", note: "Nothing — your highest card plays." },
];
