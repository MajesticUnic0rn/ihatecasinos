/**
 * Poker: the only beatable game in the building, which is exactly why
 * most people who play it lose.
 *
 * The house is not your opponent here — it is a fixed percentage
 * removed from every pot. That converts a zero-sum game between players
 * into a negative-sum one, and the size of that negative is almost
 * always larger than the edge a decent player has over a bad one.
 */

/* ------------------------------------------------------------------ */
/* The rake                                                            */
/* ------------------------------------------------------------------ */

export interface RakeConfig {
  bigBlind: number;
  avgPot: number;
  /** Percentage taken from the pot, e.g. 0.05. */
  rakePct: number;
  /** Maximum taken from any one pot. */
  cap: number;
  /** Dealer toke per raked pot. Live games only; it is still money leaving. */
  toke: number;
  handsPerHour: number;
  /** Share of hands that reach a flop and therefore get raked. */
  flopPct: number;
  players: number;
}

export interface RakeModel {
  rakePerPot: number;
  cappedShare: boolean;
  rakedHandsPerHour: number;
  /** Dollars leaving the table per hour, across all seats. */
  tableLossPerHour: number;
  /** Your share, assuming seats contribute equally over time. */
  yourLossPerHour: number;
  /** The standard unit poker players actually compare: big blinds per 100 hands. */
  bbPer100: number;
}

export function modelRake(c: RakeConfig): RakeModel {
  const uncapped = c.avgPot * c.rakePct;
  const rake = Math.min(uncapped, c.cap);
  const perPot = rake + c.toke;

  const rakedHands = c.handsPerHour * c.flopPct;
  const tableLossPerHour = perPot * rakedHands;
  const yourLossPerHour = tableLossPerHour / c.players;

  // Over 100 hands dealt, how many big blinds leave your seat?
  const hoursPer100 = 100 / c.handsPerHour;
  const bbPer100 = (yourLossPerHour * hoursPer100) / c.bigBlind;

  return {
    rakePerPot: perPot,
    cappedShare: uncapped > c.cap,
    rakedHandsPerHour: rakedHands,
    tableLossPerHour,
    yourLossPerHour,
    bbPer100,
  };
}

export const DEFAULT_RAKE: RakeConfig = {
  bigBlind: 2,
  avgPot: 40,
  rakePct: 0.05,
  cap: 5,
  toke: 1,
  handsPerHour: 30,
  flopPct: 0.6,
  players: 9,
};

/** Realistic pre-rake win rates, for comparison against the number above. */
export const WIN_RATES = [
  { label: "Exceptional live player", bb100: 10, note: "Top of the room, soft game, relentless." },
  { label: "Strong winning player", bb100: 6, note: "Studies, reviews hands, plays well most sessions." },
  { label: "Solid player", bb100: 3, note: "Knows the fundamentals, makes few big errors." },
  { label: "Break-even player", bb100: 0, note: "Beats the other players by exactly the rake." },
  { label: "Typical recreational player", bb100: -8, note: "Plays too many hands, calls too much." },
];

/* ------------------------------------------------------------------ */
/* Equity and pot odds                                                 */
/* ------------------------------------------------------------------ */

/**
 * Equity you need for a call to break even.
 * Call `toCall` into a pot of `pot` (pot BEFORE your call).
 */
export function requiredEquity(pot: number, toCall: number): number {
  return toCall / (pot + toCall);
}

export function potOddsRatio(pot: number, toCall: number): string {
  const r = pot / toCall;
  return `${r.toFixed(1)} : 1`;
}

/**
 * The "rule of 4 and 2" — the mental shortcut every player uses.
 * Outs × 4 with two cards to come, × 2 with one. Accurate to a couple
 * of points, which is well inside the precision anyone needs at a table.
 */
export function ruleOf4And2(outs: number, cardsToCome: 1 | 2): number {
  return Math.min(0.95, (outs * (cardsToCome === 2 ? 4 : 2)) / 100);
}

/** Exact probability of hitting at least one out. */
export function exactOuts(outs: number, cardsToCome: 1 | 2): number {
  const unseen = 47; // 52 − 2 hole − 3 flop
  if (cardsToCome === 1) return outs / 46;
  const miss = ((unseen - outs) / unseen) * ((unseen - 1 - outs) / (unseen - 1));
  return 1 - miss;
}

/** Hands are card ids ("Ah", "10s") so the card engine can render them. */
export const DRAWS = [
  {
    id: "flush",
    label: "Flush draw",
    outs: 9,
    hole: "Ah Kh",
    board: "7h 2h 9c",
    note: "Nine hearts left. The most common big draw in the game.",
  },
  {
    id: "oesd",
    label: "Open-ended straight draw",
    outs: 8,
    hole: "Js 10s",
    board: "9d 8h 2c",
    note: "Any queen or seven completes it — four of each.",
  },
  {
    id: "combo",
    label: "Flush + open-ender",
    outs: 15,
    hole: "Jh 10h",
    board: "9h 8c 2h",
    note: "The monster draw. A favourite over one pair.",
  },
  {
    id: "gutshot",
    label: "Gutshot",
    outs: 4,
    hole: "Js 10s",
    board: "9d 7h 2c",
    note: "Only an eight. Four outs, and people chase it constantly.",
  },
  {
    id: "overcards",
    label: "Two overcards",
    outs: 6,
    hole: "As Kd",
    board: "9h 7c 2d",
    note: "Six outs, and several of them lose anyway when they hit.",
  },
  {
    id: "set",
    label: "Pocket pair to a set",
    outs: 2,
    hole: "7c 7d",
    board: "As Kh 2d",
    note: "Two outs. Almost never worth chasing on its own.",
  },
];

/** Well-known preflop matchups. Equities are standard published figures. */
export const MATCHUPS = [
  { a: "AA", b: "KK", aEq: 0.819, label: "The nightmare" },
  { a: "AA", b: "7♠2♦", aEq: 0.877, label: "Best vs worst" },
  { a: "AKs", b: "QQ", aEq: 0.462, label: "The classic coin flip" },
  { a: "AKo", b: "QQ", aEq: 0.433, label: "Unsuited costs ~3%" },
  { a: "JTs", b: "AA", aEq: 0.225, label: "Suited connectors do better than you'd think" },
  { a: "A♠K♦", b: "A♥Q♣", aEq: 0.735, label: "Domination" },
];

export const PREFLOP_FACTS = [
  { label: "Dealt a specific pair (e.g. AA)", value: "1 in 221", note: "0.45% of hands" },
  { label: "Dealt any pocket pair", value: "1 in 17", note: "5.9% of hands" },
  { label: "Pocket pair flops a set", value: "1 in 8.5", note: "11.8% — and this is why you call preflop" },
  { label: "Suited cards flop a flush", value: "1 in 118", note: "0.84%" },
];
