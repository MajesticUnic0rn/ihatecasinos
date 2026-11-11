/**
 * Cards as data. Faces are generated, never shipped as sprites —
 * 52 crisp vector cards for a couple of kilobytes, themeable, and
 * legally ours (Balatro's actual art is LocalThunk's copyright; we
 * borrow the design language, not the pixels).
 */

export const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
  /** Stable key, e.g. "As", "10h". */
  id: string;
}

export const SUIT_GLYPH: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export const SUIT_LETTER: Record<Suit, string> = {
  spades: "s",
  hearts: "h",
  diamonds: "d",
  clubs: "c",
};

export const SUIT_IS_RED: Record<Suit, boolean> = {
  spades: false,
  hearts: true,
  diamonds: true,
  clubs: false,
};

export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${SUIT_LETTER[suit]}` };
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(card(r, s));
  return deck;
}

/** Blackjack value. Aces are 11 here; soft-hand logic demotes them later. */
export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/** Hi-Lo running count contribution. 2–6 = +1, 7–9 = 0, 10/A = −1. */
export function hiLoValue(rank: Rank): number {
  if (rank === "A" || cardValue(rank) === 10) return -1;
  const v = Number(rank);
  if (v >= 2 && v <= 6) return 1;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Pip geometry                                                        */
/* ------------------------------------------------------------------ */

/** Normalised pip positions inside the card's inner face area. */
const L = 0.265;
const C = 0.5;
const R = 0.735;

type Pip = [x: number, y: number];

const PIP_LAYOUTS: Record<string, Pip[]> = {
  A: [[C, 0.5]],
  "2": [[C, 0.14], [C, 0.86]],
  "3": [[C, 0.14], [C, 0.5], [C, 0.86]],
  "4": [[L, 0.14], [R, 0.14], [L, 0.86], [R, 0.86]],
  "5": [[L, 0.14], [R, 0.14], [C, 0.5], [L, 0.86], [R, 0.86]],
  "6": [[L, 0.14], [R, 0.14], [L, 0.5], [R, 0.5], [L, 0.86], [R, 0.86]],
  "7": [
    [L, 0.14], [R, 0.14], [C, 0.32],
    [L, 0.5], [R, 0.5], [L, 0.86], [R, 0.86],
  ],
  "8": [
    [L, 0.14], [R, 0.14], [C, 0.32],
    [L, 0.5], [R, 0.5], [C, 0.68], [L, 0.86], [R, 0.86],
  ],
  "9": [
    [L, 0.14], [R, 0.14], [L, 0.38], [R, 0.38], [C, 0.5],
    [L, 0.62], [R, 0.62], [L, 0.86], [R, 0.86],
  ],
  "10": [
    [L, 0.14], [R, 0.14], [C, 0.26], [L, 0.38], [R, 0.38],
    [L, 0.62], [R, 0.62], [C, 0.74], [L, 0.86], [R, 0.86],
  ],
};

export function pipsFor(rank: Rank): Pip[] | null {
  return PIP_LAYOUTS[rank] ?? null;
}

export function isFaceCard(rank: Rank): boolean {
  return rank === "J" || rank === "Q" || rank === "K";
}

/* ------------------------------------------------------------------ */
/* Card "enhancements" — a Balatro borrowing that earns its keep       */
/* ------------------------------------------------------------------ */

/**
 * We reuse Balatro's foil/holo/polychrome vocabulary, but here each
 * finish MEANS something: it marks how a card changes the count or
 * the decision. Decoration doing pedagogical work.
 */
export type Finish = "none" | "foil" | "holo" | "polychrome";

export const FINISH_META: Record<
  Finish,
  { label: string; meaning: string; hue: string }
> = {
  none: { label: "Plain", meaning: "Neutral card.", hue: "#ffffff" },
  foil: {
    label: "Foil",
    meaning: "Counts +1 for the player (low card, Hi-Lo).",
    hue: "#60aefe",
  },
  holo: {
    label: "Holographic",
    meaning: "Counts −1 for the player (ten or ace).",
    hue: "#d1a4ff",
  },
  polychrome: {
    label: "Polychrome",
    meaning: "Count-neutral (7, 8, 9).",
    hue: "#ffa352",
  },
};

/** Map a card to the finish that encodes its Hi-Lo contribution. */
export function finishForCount(rank: Rank): Finish {
  const v = hiLoValue(rank);
  if (v === 1) return "foil";
  if (v === -1) return "holo";
  return "polychrome";
}

/** Parse "As" / "10h" back into a Card. Handy for hardcoded examples. */
export function parseCard(id: string): Card {
  const letter = id.slice(-1);
  const rank = id.slice(0, -1) as Rank;
  const suit = (SUITS.find((s) => SUIT_LETTER[s] === letter) ?? "spades") as Suit;
  return card(rank, suit);
}

export function parseHand(ids: string): Card[] {
  return ids.trim().split(/\s+/).filter(Boolean).map(parseCard);
}
