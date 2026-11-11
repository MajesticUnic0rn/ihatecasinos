/**
 * Shared by the (client) nav and the (server) footer. Lives in its own
 * module so the server component never has to reach into a "use client"
 * boundary to read a plain array.
 */
export const NAV = [
  { href: "/roulette", label: "Roulette", note: "Pick a number or a color" },
  { href: "/blackjack", label: "Blackjack", note: "Get to 21 without busting" },
  { href: "/craps", label: "Craps", note: "The whole table" },
  { href: "/poker", label: "Poker", note: "Five real spots" },
  { href: "/course", label: "The math", note: "All seven concepts" },
];
