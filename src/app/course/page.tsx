import type { Metadata } from "next";
import Link from "next/link";
import { Section, Prose } from "@/components/PageHero";
import { EdgeBars } from "@/components/viz/charts";
import { Badge, Callout, Panel, TableWrap } from "@/components/ui";

export const metadata: Metadata = {
  title: "The course — seven ideas, layered across four games",
  description:
    "Expected value, independence, betting systems, gambler's ruin, conditional probability, variance and handle, and the rake. The transferable version, with the formulas.",
};

const SYLLABUS = [
  {
    n: "01",
    id: "ev",
    title: "Expected value and the house edge",
    via: "Roulette",
    href: "/roulette#play",
    formula: "EV = Σ pᵢ · xᵢ",
    idea: "A bet's value is the sum of its outcomes weighted by their probabilities. A casino bet is one where that sum is negative, because the payout is computed from a denominator smaller than the real one.",
    transfer:
      "Insurance products, extended warranties, lottery tickets, and every 'free' trial that bills by default. Ask what the payout would have to be for the sum to reach zero.",
  },
  {
    n: "02",
    id: "independence",
    title: "Independence and the gambler's fallacy",
    via: "Roulette",
    href: "/roulette",
    formula: "P(A | B) = P(A)",
    idea: "Independent events carry no memory. The law of large numbers makes the RATIO converge; the absolute DIFFERENCE between wins and losses grows without bound. Nothing is ever 'due'.",
    transfer:
      "Hiring streaks, sports 'momentum', doubling down on losing trades, and the belief that a bad run must be followed by a good one.",
  },
  {
    n: "03",
    id: "systems",
    title: "Why no betting system can work",
    via: "Martingale",
    href: "/roulette#simulator",
    formula: "E[Σ Xᵢ] = Σ E[Xᵢ]",
    idea: "Expectation is linear. Scaling, reordering or conditioning your stakes on past results cannot turn a sum of negative terms positive. Systems reshape the distribution — more small wins, one enormous loss — while leaving the mean exactly where it was.",
    transfer:
      "Martingale appears in trading as 'averaging down', in product as 'doubling the ad spend to recover CAC', and in life as escalating commitment to a failing plan.",
  },
  {
    n: "04",
    id: "ruin",
    title: "Gambler's ruin and risk of ruin",
    via: "Martingale",
    href: "/roulette#simulator",
    formula: "P(ruin) = 1 − (1 − (q/p)ⁱ) / (1 − (q/p)ᴺ)",
    idea: "A finite bankroll playing against an effectively infinite one, at negative expectation, goes broke with probability approaching 1 given enough time. The only variable you control is how long you play.",
    transfer:
      "Position sizing, runway, and why a strategy with a positive mean and a small chance of total loss is still a bad strategy if you only get one run at it.",
  },
  {
    n: "05",
    id: "conditional",
    title: "Conditional probability and the value of information",
    via: "Blackjack",
    href: "/blackjack",
    formula: "P(A | B) = P(A ∩ B) / P(B)",
    idea: "The dealer's upcard changes every downstream probability. This is the only place in a casino where information has cash value — and the entire basic strategy chart is the worked answer.",
    transfer:
      "Medical test results, A/B test readouts, base rates in hiring. 'What's the probability?' is almost always the wrong question; 'given what?' is the right one.",
  },
  {
    n: "06",
    id: "variance",
    title: "Variance, handle, and time on device",
    via: "Craps",
    href: "/craps",
    formula: "loss ≈ edge × handle,  σ ∝ √n",
    idea: "Expected loss scales with total amount WAGERED, not with your bankroll. Meanwhile luck scales with √n. The edge grows faster than the noise that hides it, so the only real defence is fewer bets.",
    transfer:
      "Subscription churn, transaction fees on frequent rebalancing, and any system where a small per-event cost meets a high event rate.",
  },
  {
    n: "07",
    id: "rake",
    title: "The rake: being right and still losing",
    via: "Poker",
    href: "/poker",
    formula: "net = edge − fee",
    idea: "A fixed fee on a zero-sum game makes it negative-sum. Beating the field is necessary but not sufficient — you must beat it by more than the fee, and the fee is usually larger than the spread between good and average.",
    transfer:
      "Active fund management, retail trading, sports betting, and any marketplace that takes a percentage. The fee is the competitor nobody models.",
  },
];

export default function CoursePage() {
  return (
    <>
      {/* Slim header. The page leads with the syllabus itself — an h1 is
          kept for document structure and search, nothing more. */}
      <section className="felt grain relative border-b-2 border-ink">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8 md:py-12">
          <div>
            <Badge tone="paper" className="mb-4">
              The course
            </Badge>
            <h1 className="text-h3 md:text-h2 font-bold text-balance text-cream">
              The seven concepts
            </h1>
          </div>
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:max-w-xl">
            {[
              { label: "Concepts", value: "7" },
              { label: "Games", value: "4" },
              { label: "Systems that work", value: "0" },
              { label: "Required math", value: "Arithmetic" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <dt className="text-[0.65rem] font-bold tracking-[0.08em] text-cream/45 uppercase">
                  {s.label}
                </dt>
                <dd className="tnum font-mono text-xl font-bold text-cream">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- syllabus ---------------- */}
      <Section tone="paper">
        <ol className="flex flex-col gap-6">
          {SYLLABUS.map((s) => (
            <li key={s.n} id={s.id} className="brut scroll-mt-24 p-7 md:p-9">
              <div className="grid gap-7 lg:grid-cols-[auto_1fr_minmax(0,18rem)]">
                <span className="tnum font-mono text-4xl leading-none font-bold text-violet/35">
                  {s.n}
                </span>

                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-h4 font-bold">{s.title}</h2>
                    <Badge tone="thistle">via {s.via}</Badge>
                  </div>
                  <p className="tnum mb-4 inline-block rounded-[8px] border-2 border-ink bg-cream px-3 py-1.5 font-mono text-sm">
                    {s.formula}
                  </p>
                  <p className="leading-relaxed opacity-80">{s.idea}</p>
                  <Link
                    href={s.href}
                    className="mt-4 inline-block text-sm font-bold tracking-wide text-violet uppercase underline-offset-4 hover:underline"
                  >
                    See it in {s.via} →
                  </Link>
                </div>

                <div className="rounded-[14px] border-2 border-ink bg-mint p-5">
                  <h3 className="mb-2 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
                    Where else this shows up
                  </h3>
                  <p className="text-sm leading-relaxed">{s.transfer}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------------- the table ---------------- */}
      <Section
        eyebrow="Reference"
        title="Every number on this site, in one place"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Panel>
            <EdgeBars
              max={0.17}
              title="House edge, by game and rule set"
              rows={[
                { label: "Craps: don't pass + 3-4-5× odds", edge: 0.00273 },
                { label: "Craps: pass + 3-4-5× odds", edge: 0.00374 },
                { label: "Blackjack: basic strategy, 3:2", edge: 0.005 },
                { label: "Craps: don't pass", edge: 0.0136 },
                { label: "Craps: pass line", edge: 0.01414 },
                { label: "Craps: place 6 or 8", edge: 0.0152 },
                { label: "Blackjack: basic strategy, 6:5", edge: 0.0189 },
                { label: "Craps: field", edge: 0.0278 },
                { label: "Roulette: American", edge: 0.0526 },
                { label: "Blackjack: insurance", edge: 0.074 },
                { label: "Craps: Big 6 / Big 8", edge: 0.0909 },
                { label: "Craps: any 7", edge: 0.1667 },
              ]}
              caption="Roulette here is the American double-zero wheel, the one most US floors offer. Poker is absent because its house edge is genuinely zero — the rake is a separate mechanism, and a larger one."
            />
          </Panel>

          <div className="flex flex-col gap-6">
            <Prose>
              <h3 className="!mt-0">How to read this list</h3>
              <p>
                The spread from top to bottom is about <strong>60×</strong>.
                Every entry is published, legal, and sitting in the same
                building. Nobody is being deceived — the information is simply
                distributed in a way that rewards already knowing it.
              </p>
              <p>
                Note what moves a number and what doesn&apos;t.{" "}
                <strong>Rules move it.</strong> Which bet you pick moves it.{" "}
                <strong>How you bet does not.</strong> There is no entry on this
                chart for a progression, a system, a streak or a hunch, because
                none of those would change a single value.
              </p>
            </Prose>

            <Callout kind="key" title="The one-sentence version">
              <p>
                Choose the rules before you sit down, because that is the last
                moment your decisions affect the number — and then understand
                that the best available number is still negative, which is why
                the only genuinely winning move is the amount of time you
                don&apos;t spend playing.
              </p>
            </Callout>
          </div>
        </div>

        <TableWrap>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3 font-bold">Claim you will hear</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">What&apos;s actually true</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["\"Black is due after eight reds.\"", "False", "Spins are independent. The probability is 47.4% on a US wheel, as it was on all eight previous spins."],
              ["\"Martingale can't lose if you have enough money.\"", "False", "True only with an infinite bankroll AND no table limit. Both fail, and the table limit fails first."],
              ["\"I'm up, so I'm playing with the house's money.\"", "False", "Once won, it's your money, and it is exposed to exactly the same edge as the rest."],
              ["\"Card counting is illegal.\"", "False", "It's legal. Casinos are private property and may bar you anyway, which accomplishes the same thing."],
              ["\"Blackjack has the best odds in the casino.\"", "Partly", "Only at 3:2 with basic strategy. At 6:5 it is worse than the craps pass line, and most players don't use basic strategy anyway."],
              ["\"Taking odds in craps lowers the house edge.\"", "True-ish", "It lowers the edge as a PERCENTAGE by enlarging the denominator. Your expected dollar loss per decision is unchanged; variance rises."],
              ["\"Poker is a game of skill.\"", "True", "And still unprofitable for most players, because the rake exceeds the skill gap in most games."],
              ["\"Slot machines are due to hit.\"", "False", "Independent draws with a fixed return-to-player, typically 88–96%. The worst edge on the floor by a wide margin."],
            ].map(([claim, status, truth]) => (
              <tr key={claim} className="border-b border-ink/15 align-top last:border-0">
                <td className="p-3 font-bold">{claim}</td>
                <td
                  className={`p-3 font-bold whitespace-nowrap ${
                    status === "True" ? "text-[#1b7a53]" : status === "False" ? "text-ember" : "text-[#8a6d1f]"
                  }`}
                >
                  {status}
                </td>
                <td className="p-3 opacity-75">{truth}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      {/* ---------------- closing ---------------- */}
      <Section tone="felt" className="border-b-0">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="ember" className="mb-6">
              The last thing
            </Badge>
            <h2 className="text-h3 md:text-h2 font-bold text-balance text-cream">
              None of this is an argument that gamblers are stupid.
            </h2>
          </div>
          <Prose dark>
            <p>
              The games are engineered by people who understand probability
              extremely well, specifically to be enjoyable to people who
              don&apos;t. Near-misses, loss-disguised-as-win payouts, free
              drinks, absent clocks, chips instead of cash, the results board
              above the roulette wheel — none of that is an accident, and none
              of it is in the math.
            </p>
            <p>
              The math is the honest part. It is published, it is checkable, and
              it says the same thing everywhere you look: the edge is small, it
              is relentless, and it applies to every dollar that crosses the
              felt, which is a far larger number than the one in your pocket.
            </p>
            <p>
              Understanding it won&apos;t make you win. It will make the whole
              thing substantially less interesting, which is the only reliable
              defence anyone has found.
            </p>
            <p className="text-cream">
              <strong>
                If any of this stopped being a math problem, the numbers on this
                site are not the relevant information.
              </strong>{" "}
              <a
                href="tel:1-800-522-4700"
                className="underline underline-offset-4"
              >
                1-800-GAMBLER
              </a>{" "}
              is free, confidential and open all night, which is more than the
              cashier&apos;s cage can say.
            </p>
          </Prose>
        </div>
      </Section>
    </>
  );
}
