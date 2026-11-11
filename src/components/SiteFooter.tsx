import Link from "next/link";
import { NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="felt grain relative border-t-2 border-ink">
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-h4 max-w-sm font-bold text-balance text-cream">
              Every game in this building is a tax on arithmetic.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/60">
              Nothing here is a betting system, a tip, or a strategy for making
              money. There isn&apos;t one. It&apos;s a probability course that
              happens to use the most expensive classroom ever built.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="mb-4 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              The games
            </h2>
            <ul className="space-y-2.5 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="text-cream/80 underline-offset-4 hover:text-cream hover:underline"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              If it stopped being math
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-cream/70">
              The numbers on this site describe a game. They don&apos;t describe
              what it does to people who can&apos;t stop playing it.
            </p>
            <ul className="space-y-2 text-sm text-cream/80">
              <li>
                <a
                  href="tel:1-800-522-4700"
                  className="font-bold underline underline-offset-4 hover:text-cream"
                >
                  1-800-GAMBLER
                </a>{" "}
                <span className="text-cream/50">(US, 24/7)</span>
              </li>
              <li>
                <a
                  href="https://www.ncpgambling.org/help-treatment/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4 hover:text-cream"
                >
                  ncpgambling.org
                </a>
              </li>
              <li>
                <a
                  href="https://www.gamblersanonymous.org/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4 hover:text-cream"
                >
                  Gamblers Anonymous
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-cream/15 pt-6 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built with Next.js, Three.js and an unreasonable number of Monte
            Carlo trials. Open source.
          </p>
          <p>
            Playing-card design is original work inspired by Balatro. No game
            assets are reproduced.
          </p>
        </div>
      </div>
    </footer>
  );
}
