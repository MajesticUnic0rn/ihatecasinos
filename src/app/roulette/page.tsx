import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Prose } from "@/components/PageHero";
import { WheelLab } from "@/components/roulette/WheelLab";
import { MartingaleLab } from "@/components/roulette/MartingaleLab";
import { TimeOnDevice } from "@/components/roulette/TimeOnDevice";
import { EdgeBars } from "@/components/viz/charts";
import { Badge, Callout, Marquee, Panel, Stat, TableWrap } from "@/components/ui";
import { BET_TYPES, edgeFor } from "@/lib/games/roulette";
import { analyzeMartingale, money, oneIn, pct } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Roulette — where the house edge is easiest to see",
  description:
    "Every roulette payout is calculated as if zero weren't on the wheel. Spin a real 3D wheel, derive the 5.26% edge yourself, then run 100,000 Martingale sessions and watch the system fail on schedule.",
};

const americanRows = BET_TYPES.map((b) => ({
  label: b.label,
  edge: edgeFor(b, "american").houseEdge,
}));

const comparison = [
  { label: "European, La Partage, even-money", edge: edgeFor(BET_TYPES[0], "european", "la-partage").houseEdge },
  { label: "European, single zero", edge: edgeFor(BET_TYPES[0], "european").houseEdge },
  { label: "American, double zero", edge: edgeFor(BET_TYPES[0], "american").houseEdge },
  { label: "American, top line (0-00-1-2-3)", edge: edgeFor(BET_TYPES.find((b) => b.id === "basket")!, "american").houseEdge },
];

// $1023 bankroll in $1 units = exactly 10 doublings. The textbook case.
const textbook = analyzeMartingale(1023, 18 / 37);

export default function RoulettePage() {
  return (
    <>
      <PageHero
        eyebrow="Lesson 1 · Expected value"
        accent="ember"
        title={
          <>
            Every payout assumes zero isn&apos;t on the wheel.
            <br />
            Zero is on the wheel.
          </>
        }
        lede={
          <>
            Roulette is the cleanest casino game to analyse because nothing is
            hidden. No dealer decisions, no card removal, no skill to argue
            about. There are 38 pockets and the table pays 36. Everything that
            follows is that one sentence, compounded.
          </>
        }
        stats={[
          { label: "American edge", value: "5.26%", note: "on nearly every bet" },
          { label: "European edge", value: "2.70%", note: "one zero instead of two" },
          { label: "With La Partage", value: "1.35%", note: "even-money bets only" },
          { label: "Spins to lose half", value: "475", note: "$10 flat, US wheel, $500 in" },
        ]}
      />

      <Marquee
        tone="ember"
        items={[
          "36 numbers",
          "38 pockets",
          "35 to 1",
          "do the subtraction",
        ]}
      />

      {/* ---------------- 1. the lab ---------------- */}
      <Section
        id="wheel"
        tone="felt"
        eyebrow="Try it"
        title="Spin it, and watch the derivation update underneath"
        lede={
          <>
            Change the wheel, change the bet. The panel on the right recalculates
            the edge from scratch every time — number of winning pockets, fair
            payout, actual payout, and the gap between the last two.
          </>
        }
      >
        <WheelLab />
      </Section>

      {/* ---------------- 2. every bet, same edge ---------------- */}
      <Section
        eyebrow="Lesson 1a"
        title="Nearly every bet on an American wheel has exactly the same edge"
        lede={
          <>
            Straight-up, split, corner, column, red. Wildly different win rates,
            wildly different payouts, and — with one exception — an identical
            5.26% cut. This is not a coincidence; it is the design.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Panel>
            <EdgeBars
              rows={americanRows}
              title="American wheel — house edge by bet"
              max={0.08}
              caption={
                <>
                  The top line is the only outlier, and it is worse. A five-pocket
                  bet paying 6:1 on a 38-pocket wheel works out to 7.89% — the
                  worst bet on the table, created purely as an artefact of adding
                  a second zero.
                </>
              }
            />
          </Panel>

          <div className="flex flex-col gap-8">
            <Panel>
              <EdgeBars
                rows={comparison}
                title="The same even-money bet, four rule sets"
                max={0.08}
                caption="Rules are the only lever that actually moves this number. Not systems. Not timing. Not which numbers are 'due'."
              />
            </Panel>

            <Panel className="bg-thistle">
              <h3 className="text-h4 mb-3 font-bold">Why they match</h3>
              <Prose className="max-w-none text-[1rem]">
                <p>
                  Take any bet covering <em>k</em> of 38 pockets. The casino pays{" "}
                  <strong>(36 − k) / k</strong> to 1 — the fair odds for a{" "}
                  <em>36-pocket</em> wheel. Your expected value is
                </p>
                <p className="tnum rounded-[10px] border-2 border-ink bg-paper px-4 py-3 text-center font-mono text-sm">
                  (k/38)·(36−k)/k − (38−k)/38 = −2/38
                </p>
                <p>
                  The <em>k</em> cancels. It doesn&apos;t matter what you bet on —
                  only how many zeros are on the wheel. Chasing &ldquo;better
                  bets&rdquo; inside one wheel is rearranging deck chairs with
                  great precision.
                </p>
              </Prose>
            </Panel>
          </div>
        </div>
      </Section>

      {/* ---------------- 3. the fallacy ---------------- */}
      <Section
        tone="paper"
        eyebrow="Lesson 2 · Independence"
        title="Red has come up eight times. What should you bet?"
      >
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Prose>
            <p>
              The honest answer is <strong>it does not matter</strong>, and most
              people find that genuinely difficult to accept. Both wrong answers
              are popular, and they contradict each other:
            </p>
            <ul>
              <li>
                <strong>&ldquo;Black is due.&rdquo;</strong> The gambler&apos;s
                fallacy. The wheel has no memory, no ledger, and no obligation.
              </li>
              <li>
                <strong>&ldquo;Red is hot.&rdquo;</strong> The hot-hand fallacy
                applied to an object that cannot have a hand.
              </li>
            </ul>
            <p>
              Both come from the same misreading of the law of large numbers.
              What converges is the <em>ratio</em> of reds to spins. What does{" "}
              <em>not</em> converge — what in fact grows without limit — is the
              raw <em>difference</em> between the counts. Eight reds are never
              repaid. They are diluted, over a horizon longer than your evening.
            </p>
            <h3>The part that is actually rigged</h3>
            <p>
              Casinos post the last 18 results on a lit board above the wheel.
              That board costs money, requires wiring, and conveys exactly zero
              information about the next spin. It exists because it reliably
              causes people to bet more. It is the cheapest piece of behavioural
              engineering on the floor.
            </p>
          </Prose>

          <div className="flex flex-col gap-6">
            <Panel className="bg-mint">
              <Badge tone="ink" className="mb-4">
                Streaks are ordinary
              </Badge>
              <div className="grid grid-cols-2 gap-6">
                <Stat label="8 reds in a row" value={oneIn(Math.pow(18 / 38, 8))} size="sm" sub="from any given spin" />
                <Stat label="In a 4-hour session" value="≈ 23%" size="sm" sub="~200 spins, at least one run of 8" />
                <Stat label="10 in a row" value={oneIn(Math.pow(18 / 38, 10))} size="sm" />
                <Stat label="Longest recorded" value="26" size="sm" sub="black, Monte Carlo, 1913" />
              </div>
              <p className="mt-5 text-sm leading-relaxed opacity-75">
                In 1913 the Monte Carlo wheel landed black 26 consecutive times.
                Players lost millions betting on red, each spin more certain it
                had to break. Every one of those spins was 48.6% red. All 26 of
                them.
              </p>
            </Panel>

            <Callout kind="key" title="Transfers to">
              <p>
                This is the same error as &ldquo;I&apos;m due for a win&rdquo; in
                slots, &ldquo;this machine hasn&apos;t paid out&rdquo;, and
                doubling down on a losing trade. Independence is the concept;
                roulette is just where it is easiest to see.
              </p>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ---------------- 4. martingale ---------------- */}
      <Section
        id="simulator"
        tone="felt"
        eyebrow="Lesson 3 · Betting systems"
        title="The Martingale, and why it feels unbeatable"
        lede={
          <>
            Double after every loss. The first win recovers everything plus one
            unit. It is arithmetically true, it works almost every time, and it
            is the most efficient bankroll-destruction device ever marketed.
          </>
        }
      >
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Prose dark>
            <p>
              Take $1,023 and $1 units on a European wheel. That bankroll buys
              you exactly ten doublings: 1, 2, 4, 8, … 512, summing to 1,023.
              You lose only if red misses ten times in a row.
            </p>
            <p>
              P(ten consecutive losses) ={" "}
              <strong>(19/37)¹⁰ = {pct(textbook.pCatastrophe, 4)}</strong>. So{" "}
              {pct(textbook.pGrind, 2)} of the time you walk away up a dollar.
              That is a <em>99.87% win rate</em>. It feels like a cheat code.
            </p>
            <p>Then price the other branch:</p>
            <p className="tnum rounded-[10px] border-2 border-ink bg-felt-deep px-4 py-3 text-center font-mono text-sm text-amber">
              {pct(textbook.pGrind, 4)} × (+$1) − {pct(textbook.pCatastrophe, 4)} × ($1,023)
              <br />= {money(textbook.evPerSequence, 4)}
            </p>
            <p>
              Thirty-one cents lost per sequence — which is exactly 2.70% of the
              amount you wagered getting there. The edge is untouched. It was
              always going to be untouched: expected value is a sum, and
              reordering the terms of a sum does not change it.
            </p>
            <p>
              <strong>
                What Martingale actually buys is a different shape.
              </strong>{" "}
              It converts a steady trickle of small losses into a long run of
              tiny wins punctuated by one catastrophe. Same mean, fatter tail,
              and a vastly more addictive experience.
            </p>
          </Prose>

          <div className="flex flex-col gap-5">
            <div className="felt-panel p-6">
              <h3 className="mb-5 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
                $1,023 bankroll · $1 unit · European wheel
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <Stat label="Doublings available" value={textbook.doublings} tone="cream" />
                <Stat label="Win rate per sequence" value={pct(textbook.pGrind, 2)} tone="win" />
                <Stat label="Wipeout odds" value={oneIn(textbook.pCatastrophe)} tone="ember" />
                <Stat label="EV per sequence" value={money(textbook.evPerSequence, 2)} tone="ember" />
              </div>
            </div>

            <div className="felt-panel bg-ember/15 p-6">
              <Badge tone="ember" className="mb-3">
                The quiet killer
              </Badge>
              <p className="text-sm leading-relaxed text-cream/80">
                Table maximums are not there to stop whales. A $5 table with a
                $500 maximum permits <strong>seven</strong> doublings — not ten,
                because the eighth bet would be $640. That moves your wipeout
                odds from 1 in {Math.round(1 / textbook.pCatastrophe).toLocaleString()} to{" "}
                <strong>1 in 106</strong>, and you are still only chasing one
                dollar a sequence. The limit is the system&apos;s off-switch,
                and it is bolted to every table in the building.
              </p>
            </div>
          </div>
        </div>

        <MartingaleLab />
      </Section>

      {/* ---------------- 5. time on device ---------------- */}
      <Section
        eyebrow="Lesson 4 · Handle"
        title="The edge applies to everything you wager, not to what you brought"
        lede={
          <>
            This is the single most common misunderstanding about casino math,
            and correcting it changes every number people quote about their own
            losses.
          </>
        }
      >
        <TimeOnDevice />
      </Section>

      {/* ---------------- 6. mitigation ---------------- */}
      <Section
        tone="paper"
        eyebrow="Lesson 5 · Mitigation"
        title="If you are going to play anyway"
        lede={
          <>
            None of this makes roulette profitable. Nothing makes roulette
            profitable. These moves only reduce the rate at which a known
            negative expectation is realised — which is a real and limited thing
            to want.
          </>
        }
      >
        <TableWrap>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3 font-bold">Move</th>
              <th className="p-3 font-bold">Effect</th>
              <th className="p-3 font-bold">Why</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Find a single-zero wheel", "5.26% → 2.70%", "Halves the edge outright. The largest single improvement available, and it requires no skill."],
              ["Find La Partage or En Prison", "2.70% → 1.35%", "Half the stake returns on zero. Even-money bets only — it does nothing for your straight-up numbers."],
              ["Bet outside, not inside", "No edge change", "Identical EV, far lower variance. You will lose at the same rate, just more smoothly and over more time."],
              ["Make fewer, larger bets", "Cuts handle", "Expected loss scales with total wagered. Half the spins, half the expected loss — the clock is the real meter."],
              ["Skip the top line", "7.89% → 5.26%", "The only bet on an American wheel that is actively worse than the rest."],
              ["Ignore the results board", "Behavioural", "It carries no information. It exists to increase your bet frequency."],
              ["Decide the stop-loss before you sit", "Behavioural", "The one decision that is genuinely yours, and the only one you make while not losing."],
            ].map(([move, effect, why]) => (
              <tr key={move} className="border-b border-ink/15 last:border-0 align-top">
                <td className="p-3 font-bold">{move}</td>
                <td className="tnum p-3 font-mono text-ember">{effect}</td>
                <td className="p-3 opacity-75">{why}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>

        <Callout kind="warning" title="Not on this list">
          <p>
            Betting systems, progressions, &ldquo;due&rdquo; numbers, dealer
            signature, wheel clocking on a modern maintained wheel, or any
            product sold to you as a strategy. The first five do nothing. The
            last one has a negative expected value of whatever it cost.
          </p>
        </Callout>
      </Section>

      {/* ---------------- next ---------------- */}
      <Section tone="felt" className="border-b-0">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="paper">Next</Badge>
          <h2 className="text-h3 md:text-h2 max-w-3xl font-bold text-balance text-cream">
            Roulette has no decisions in it. Blackjack has nothing but
            decisions — and that changes what the math can do for you.
          </h2>
          <Link
            href="/blackjack"
            className="brut-sm brut-press rounded-[50px] bg-violet px-6 py-3 text-sm font-bold tracking-wide text-white uppercase"
          >
            Lesson 6 · Blackjack →
          </Link>
        </div>
      </Section>
    </>
  );
}
