/**
 * The course spine. Kept in one place so the nav, the landing page and
 * each lesson footer can never drift out of sync.
 */

export const GAMES = [
  {
    href: "/roulette",
    glyph: "🎡",
    title: "Roulette",
    rules: "Bet on where the ball lands — a number, a color, or odd and even.",
    keeps: "5.3¢",
    lesson: "Expected value",
    tone: "ember" as const,
    blurb:
      "The purest case. No decisions, no skill, no card removal — just 38 pockets paying as though there were 36. Where you learn what an edge is, and why no betting system touches it.",
    statA: { label: "House edge (US)", value: "5.26%" },
    statB: { label: "Bets that change it", value: "None" },
  },
  {
    href: "/blackjack",
    glyph: "🂡",
    title: "Blackjack",
    rules: "Get closer to 21 than the dealer without going over.",
    keeps: "0.5–2¢",
    lesson: "Conditional probability",
    tone: "lagoon" as const,
    blurb:
      "The one game where your decisions genuinely move the number — from roughly 2% down to 0.5%. Also the game where the casino quietly changed one payout and took all of that back.",
    statA: { label: "Edge, 6:5 table", value: "1.89%" },
    statB: { label: "Edge, basic strategy", value: "0.50%" },
  },
  {
    href: "/craps",
    glyph: "🎲",
    title: "Craps",
    rules: "Bet on the dice. Roll your number again before a 7.",
    keeps: "1.4–17¢",
    lesson: "Vig and free odds",
    tone: "amber" as const,
    blurb:
      "Two bets sit inches apart on the same felt. One takes 1.41%, the other 16.67%. The best bet in the building is here, and it is the one nobody is shouting about.",
    statA: { label: "Worst bet", value: "16.67%" },
    statB: { label: "Free odds", value: "0.00%" },
  },
  {
    href: "/poker",
    glyph: "♠",
    title: "Poker",
    rules: "Beat the other players with the best five-card hand.",
    keeps: "a slice of every pot",
    lesson: "The rake",
    tone: "violet" as const,
    blurb:
      "The only beatable game, which is why most people who play it lose. The house sits out the hand and takes a fixed tax on every pot, quietly eating most of the edge a good player has.",
    statA: { label: "Rake, low stakes", value: "~10 BB/100" },
    statB: { label: "Good win rate", value: "~5 BB/100" },
  },
];

export const LESSONS = [
  {
    id: "ev",
    title: "Expected value and the house edge",
    via: "Roulette",
    href: "/roulette#play",
    blurb:
      "A payout computed from the wrong denominator. Derive 5.26% yourself and watch it stay 5.26% no matter which bet you pick.",
  },
  {
    id: "independence",
    title: "Independence and the gambler's fallacy",
    via: "Roulette",
    href: "/roulette",
    blurb:
      "Ratios converge; differences don't. Eight reds in a row are not a debt the wheel intends to repay.",
  },
  {
    id: "systems",
    title: "Why no betting system can work",
    via: "Martingale",
    href: "/roulette#simulator",
    blurb:
      "Expected value is a sum, and reordering a sum doesn't change it. Progressions reshape the distribution and leave the mean exactly where it was.",
  },
  {
    id: "ruin",
    title: "Gambler's ruin and risk of ruin",
    via: "Martingale",
    href: "/roulette#simulator",
    blurb:
      "A finite bankroll against an unbounded one. With a negative edge, the probability of ruin approaches one given enough time.",
  },
  {
    id: "conditional",
    title: "Conditional probability and information",
    via: "Blackjack",
    href: "/blackjack",
    blurb:
      "The dealer's upcard changes everything downstream. This is Bayes' rule with money on it, and the only place in a casino where information has value.",
  },
  {
    id: "variance",
    title: "Variance, handle, and time on device",
    via: "Craps",
    href: "/craps",
    blurb:
      "Edge scales with n, luck with √n. The house doesn't need to beat you — it needs you to keep playing, which is a far easier thing to arrange.",
  },
  {
    id: "rake",
    title: "The rake: losing while being right",
    via: "Poker",
    href: "/poker",
    blurb:
      "A fixed tax on a zero-sum game makes it negative-sum. You can out-play everyone at the table and still finish behind the drop box.",
  },
];
