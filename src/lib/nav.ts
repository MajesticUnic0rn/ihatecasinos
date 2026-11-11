/**
 * Shared by the (client) nav and the (server) footer. Lives in its own
 * module so the server component never has to reach into a "use client"
 * boundary to read a plain array.
 */
export const NAV = [
  { href: "/roulette", label: "Roulette", note: "House edge & Martingale" },
  { href: "/blackjack", label: "Blackjack", note: "Conditional probability" },
  { href: "/craps", label: "Craps", note: "Vig vs free odds" },
  { href: "/poker", label: "Poker", note: "The rake" },
  { href: "/course", label: "The Course", note: "All seven lessons" },
];
