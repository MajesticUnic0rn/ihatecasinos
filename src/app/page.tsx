import Link from "next/link";
import { CardShowcase } from "@/components/CardShowcase";
import { Badge, Panel } from "@/components/ui";
import { EdgeBars } from "@/components/viz/charts";
import { GAMES } from "@/lib/content";

export default function Home() {
  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="felt grain relative overflow-hidden border-b-2 border-ink">
        <div aria-hidden className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet opacity-25 blur-[100px]" />
        <div aria-hidden className="absolute -right-32 -bottom-40 h-[26rem] w-[26rem] rounded-full bg-ember opacity-20 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="text-h1 md:text-display font-bold text-balance text-cream">
                The house always wins.
                <br />
                <span className="text-amber">See for yourself.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-cream/75 md:text-xl">
                Learn four casino games in a minute each. Play them with $1,000
                of pretend money. Then see exactly where that money goes.
              </p>
              <Link
                href="#games"
                className="brut-sm brut-press mt-8 inline-block rounded-[50px] bg-amber px-6 py-3.5 text-sm font-bold tracking-wide text-ink uppercase"
              >
                Pick a game ↓
              </Link>
            </div>

            <CardShowcase />
          </div>
        </div>
      </section>

      {/* ---------------- the games ---------------- */}
      <section id="games" className="scroll-mt-16 border-b-2 border-ink bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {GAMES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="brut brut-press group flex flex-col gap-4 p-7"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl" aria-hidden>{g.glyph}</span>
                  <h2 className="text-h3 font-bold">{g.title}</h2>
                </div>
                <p className="text-lg leading-relaxed">{g.rules}</p>
                <p className="text-sm opacity-65">
                  The house keeps <strong className="text-ember">{g.keeps}</strong>{" "}
                  {g.href === "/poker" ? "— the rake." : "of every dollar you bet."}
                </p>
                <span className="mt-auto text-sm font-bold tracking-wide text-violet uppercase">
                  Learn it &amp; play with $1,000 →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- one chart ---------------- */}
      <section className="border-b-2 border-ink bg-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Badge tone="violet" className="mb-5">
              Every game, same ending
            </Badge>
            <h2 className="text-h3 font-bold text-balance">
              None of these games are rigged. They don&apos;t need to be.
            </h2>
            <p className="mt-5 text-lg leading-relaxed opacity-75">
              Each one pays you slightly less than your real odds. On a single
              bet you can&apos;t feel it. Over an evening, that small gap is the
              whole business — and the chart shows how big the gap is for the
              most popular bets.
            </p>
          </div>
          <Panel>
            <EdgeBars
              max={0.17}
              title="How much the house keeps from each $1 bet"
              rows={[
                { label: "Craps: pass line + odds", edge: 0.00374 },
                { label: "Blackjack, perfect play", edge: 0.005 },
                { label: "Craps: pass line", edge: 0.0141 },
                { label: "Blackjack, typical player", edge: 0.02 },
                { label: "Roulette: any bet", edge: 0.0526 },
                { label: "Craps: any seven", edge: 0.1667 },
              ]}
            />
          </Panel>
        </div>
      </section>

      {/* ---------------- close ---------------- */}
      <section className="felt grain relative">
        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 text-center md:px-8">
          <p className="text-h4 font-bold text-balance text-cream">
            There&apos;s no system that beats these numbers. Knowing them just
            makes the games a lot less interesting — which is the point.
          </p>
          <Link
            href="/course"
            className="mt-8 inline-block text-sm font-bold tracking-wide text-amber uppercase underline-offset-4 hover:underline"
          >
            Want the full math? It&apos;s all here →
          </Link>
        </div>
      </section>
    </>
  );
}
