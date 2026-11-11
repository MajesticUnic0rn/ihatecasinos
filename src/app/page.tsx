import Link from "next/link";
import { Section, Prose } from "@/components/PageHero";
import { CardShowcase } from "@/components/CardShowcase";
import { Badge, Marquee, Panel, Stat, cx } from "@/components/ui";
import { EdgeBars } from "@/components/viz/charts";
import { LESSONS, GAMES } from "@/lib/content";

export default function Home() {
  return (
    <>
      {/* ---------------- hero ---------------- */}
      <section className="felt grain relative overflow-hidden border-b-2 border-ink">
        <div aria-hidden className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet opacity-25 blur-[100px]" />
        <div aria-hidden className="absolute -right-32 -bottom-40 h-[26rem] w-[26rem] rounded-full bg-ember opacity-20 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <Badge tone="ember" className="mb-6">
                A probability course in a hostile setting
              </Badge>
              <h1 className="text-h1 md:text-display font-bold text-balance text-cream">
                The house always wins.
                <br />
                <span className="text-amber">Here is the arithmetic.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-cream/75 md:text-xl">
                Four games, seven lessons, and a simulator that will run a
                hundred thousand sessions while you watch one. No systems, no
                tips, no edge — because there isn&apos;t one. Just the cleanest
                worked examples in applied probability, which happen to cost
                real people real money every day.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/roulette"
                  className="brut-sm brut-press rounded-[50px] bg-amber px-6 py-3.5 text-sm font-bold tracking-wide text-ink uppercase"
                >
                  Start with roulette →
                </Link>
                <Link
                  href="/course"
                  className="rounded-[50px] border-2 border-cream/35 px-6 py-3.5 text-sm font-bold tracking-wide text-cream uppercase transition-colors hover:bg-cream hover:text-ink"
                >
                  See all seven lessons
                </Link>
              </div>
            </div>

            <CardShowcase />
          </div>
        </div>
      </section>

      <Marquee
        items={[
          "expected value",
          "the gambler's fallacy",
          "variance vs edge",
          "gambler's ruin",
          "conditional probability",
          "the rake",
          "risk of ruin",
        ]}
      />

      {/* ---------------- the thesis ---------------- */}
      <Section tone="paper">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <Prose>
            <h3 className="!mt-0">The whole argument, in one table</h3>
            <p>
              Every game in a casino is a bet where the payout is calculated
              from slightly wrong odds. That&apos;s it. That&apos;s the
              industry. The difference between games isn&apos;t whether the
              gap exists — it&apos;s how well it&apos;s hidden.
            </p>
            <p>
              Roulette hides it behind a missing pocket. Craps hides it in the
              difference between two bets printed on the same felt. Blackjack
              hides it behind decisions, so losses feel like your fault. Poker
              hides it best of all: it puts you against other players and takes
              its cut from the pot, so you can genuinely be the best player at
              the table and still go home down.
            </p>
            <p>
              <strong>
                None of these games is rigged, and that is the point.
              </strong>{" "}
              They don&apos;t need to be. A small, honest, fully-disclosed edge
              applied to a large number of bets is mathematically indistinguishable
              from a slow robbery — and it is entirely legal, which is
              a much better business.
            </p>
          </Prose>

          <Panel>
            <EdgeBars
              max={0.08}
              title="House edge, best realistic play"
              rows={[
                { label: "Blackjack (3:2, basic strategy)", edge: 0.005 },
                { label: "Craps (pass + 3-4-5× odds)", edge: 0.00374 },
                { label: "Craps (pass line alone)", edge: 0.0141 },
                { label: "Roulette (European)", edge: 0.027 },
                { label: "Blackjack (6:5, basic strategy)", edge: 0.0189 },
                { label: "Roulette (American)", edge: 0.0526 },
                { label: "Craps (any 7)", edge: 0.1667 },
              ]}
              caption={
                <>
                  Same building, a 45× spread. The difference between the top
                  and bottom of this chart is worth more than every betting
                  system ever written, and it costs nothing but knowing which
                  table to sit at.
                </>
              }
            />
          </Panel>
        </div>
      </Section>

      {/* ---------------- games ---------------- */}
      <Section
        eyebrow="The games"
        title="Four tables, four different ways of not telling you the odds"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="brut brut-press group flex flex-col gap-4 p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="mb-3 block text-4xl">{g.glyph}</span>
                  <h3 className="text-h4 font-bold">{g.title}</h3>
                </div>
                <Badge tone={g.tone}>{g.lesson}</Badge>
              </div>
              <p className="leading-relaxed opacity-75">{g.blurb}</p>
              <dl className="mt-auto grid grid-cols-2 gap-5 border-t-2 border-ink pt-5">
                <Stat label={g.statA.label} value={g.statA.value} size="sm" tone="ember" />
                <Stat label={g.statB.label} value={g.statB.value} size="sm" />
              </dl>
              <span className="text-sm font-bold tracking-wide text-violet uppercase">
                Open the lesson →
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------------- lessons ---------------- */}
      <Section
        tone="felt"
        eyebrow="The course"
        title="Seven ideas, layered — each game teaches the next one"
        lede={
          <>
            The games are only the setting. What you should still have a year
            from now is this list, and none of it is about gambling.
          </>
        }
      >
        <ol className="grid gap-4 md:grid-cols-2">
          {LESSONS.map((l, i) => (
            <li key={l.id}>
              <Link
                href={l.href}
                className="group flex h-full gap-5 rounded-[16px] border-2 border-ink bg-felt p-6 transition-colors hover:bg-felt-deep"
              >
                <span className="tnum shrink-0 font-mono text-3xl font-bold text-violet-soft/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="mb-1.5 font-bold text-cream">{l.title}</h3>
                  <p className="text-sm leading-relaxed text-cream/60">
                    {l.blurb}
                  </p>
                  <span className="mt-3 inline-block text-[0.7rem] font-bold tracking-[0.08em] text-amber uppercase">
                    via {l.via}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------------- closing ---------------- */}
      <Section tone="paper" className="border-b-0">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <Badge tone="ember" className="mb-6">
              What this site will not do
            </Badge>
            <h2 className="text-h3 md:text-h2 font-bold text-balance">
              Teach you to win. That isn&apos;t withheld — it doesn&apos;t
              exist.
            </h2>
          </div>
          <Prose>
            <p>
              There are exactly three ways to have a positive expectation in a
              casino, and you will not like any of them: count cards well
              enough to get barred, play poker better than the rake plus the
              other players, or own the building.
            </p>
            <p>
              Everything else on offer — progressions, timing, hot tables,
              lucky numbers, &ldquo;advantage&rdquo; courses — is sold by
              people who discovered a more reliable edge than gambling, which
              is selling things to gamblers.
            </p>
            <p>
              What you <em>can</em> do is understand the machine precisely
              enough that it stops being interesting. That is the entire
              ambition here.
            </p>
          </Prose>
        </div>

        <div className="brut mt-14 flex flex-col items-start gap-5 bg-violet p-8 text-white md:flex-row md:items-center md:justify-between">
          <p className="text-h4 max-w-xl font-bold text-balance">
            Start where the math is impossible to hide: 38 pockets, 36 numbers.
          </p>
          <Link
            href="/roulette"
            className={cx(
              "brut-sm brut-press shrink-0 rounded-[50px] bg-cream px-6 py-3.5",
              "text-sm font-bold tracking-wide text-ink uppercase",
            )}
          >
            Lesson 1 →
          </Link>
        </div>
      </Section>
    </>
  );
}
