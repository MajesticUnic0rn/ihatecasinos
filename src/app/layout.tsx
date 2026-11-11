import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-num",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://ihatecasinos.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "I Hate Casinos — the math, in public",
    template: "%s · I Hate Casinos",
  },
  description:
    "An interactive course in casino probability. Roulette, blackjack, craps and poker, simulated honestly — including why the Martingale feels unbeatable and is not.",
  keywords: [
    "house edge", "expected value", "martingale", "roulette odds",
    "blackjack basic strategy", "craps odds", "poker rake",
    "gambler's ruin", "probability course",
  ],
  openGraph: {
    title: "I Hate Casinos",
    description:
      "Every casino game is a tax on arithmetic. Here is the arithmetic.",
    url: SITE,
    siteName: "I Hate Casinos",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "I Hate Casinos" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:brut-sm focus:bg-violet focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
