import type { Metadata } from "next";
import { GameSwitcher, Section, Prose } from "@/components/PageHero";
import { GameHeader, HowToPlay, PlaySection, TakeAway } from "@/components/game/GameShell";
import { GoDeeper } from "@/components/game/GoDeeper";
import { RoulettePlay } from "@/components/roulette/RoulettePlay";
import { MartingaleLab } from "@/components/roulette/MartingaleLab";
import { TimeOnDevice } from "@/components/roulette/TimeOnDevice";
import { EdgeBars } from "@/components/viz/charts";
import { Badge, Callout, Panel, Stat, TableWrap } from "@/components/ui";
import { BET_TYPES, edgeFor } from "@/lib/games/roulette";
import { analyzeMartingale, money, oneIn, pct } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Roulette — where the house edge is easiest to see",
  description:
    "Every roulette payout is calculated as if zero weren't on the wheel. Spin a real 3D wheel, derive the 5.26% edge yourself, then run 100,000 Martingale sessions and watch the system fail on schedule.",
};

const betRows = BET_TYPES.map((b) => ({
  label: b.label,
  edge: edgeFor(b).houseEdge,
}));

const evenMoney = edgeFor(BET_TYPES[0]);

// $1023 bankroll in $1 units = exactly 10 doublings. The textbook case.
const textbook = analyzeMartingale(1023, evenMoney.pWin);

export default function RoulettePage() {
  return (
    <>
      <GameHeader
        game="Roulette"
        title="Guess where the ball lands."
        tagline="Bet on a single number, a color, or odd and even. The dealer spins, the ball drops into one pocket, and every chip on the table either wins or loses."
      />

      <HowToPlay
        steps={[
          {
            title: "Place your chips",
            body: "Put chips on a single number, red or black, odd or even, low (1–18) or high (19–36), or a group of twelve numbers.",
            visual: (
              <div className="flex gap-1.5">
                {[["#d42a30", "7"], ["#0e1620", "8"], ["#d42a30", "9"], ["#17864f", "0"]].map(([bg, n]) => (
                  <span key={n} className="grid h-9 w-9 place-items-center rounded-[6px] border-2 border-ink font-bold text-white" style={{ background: bg }}>{n}</span>
                ))}
              </div>
            ),
          },
          {
            title: "The wheel spins",
            body: "The ball lands in one of 38 pockets: the numbers 1 to 36, plus a green 0 and a green 00.",
          },
          {
            title: "Get paid",
            body: (
              <ul className="flex flex-col gap-1">
                <li><strong>1 to 1</strong> — red/black, odd/even, low/high</li>
                <li><strong>2 to 1</strong> — a dozen or a column</li>
                <li><strong>35 to 1</strong> — one single number</li>
              </ul>
            ),
          },
        ]}
        catchLine={
          <>
            0 and 00 are green. They count as neither red nor black, odd nor
            even — so when the ball lands on one, every one of those bets
            loses. Two pockets out of 38 is the house&apos;s entire edge.
          </>
        }
      />

      <PlaySection hint="Hover any spot on the table to see what it pays.">
        <RoulettePlay />
      </PlaySection>

      <TakeAway
        numbers={[
          { value: "47.4%", label: "Chance that red wins. It pays as though it were a fair 50%." },
          { value: "5.26%", label: "Kept by the house from every bet, on average — on every spot but one." },
          { value: "−$26", label: "What an hour of $10 spins costs you on average (about 50 spins)." },
        ]}
        line={
          <>
            Any single spin can go your way. Over a few hundred spins, the two
            green pockets win — slowly, quietly, and every time.
          </>
        }
      />

      <GoDeeper
        anchors={["simulator"]}
        topics={["Why every bet costs the same", "The gambler’s fallacy", "The Martingale system", "Time at the table", "How to lose less"]}
      >


      {/* ---------------- 2. every bet, same edge ---------------- */}
      <Section
        eyebrow="Why they all match"
        title="Nearly every bet on an American wheel has exactly the same edge"
        lede={
          <>
            Straight-up, split, corner, column, red. Wildly different win rates,
            wildly different payouts, and — with one exception — an identical
            5.26% cut. The uniformity is deliberate — it falls straight out of
            the formula.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Panel>
            <EdgeBars
              rows={betRows}
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
              <h3 className="mb-5 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
                What each bet would pay if it were fair
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-left">
                    <th className="py-2 pr-3 font-bold">Bet</th>
                    <th className="py-2 pr-3 text-right font-bold">Covers</th>
                    <th className="py-2 pr-3 text-right font-bold">Fair</th>
                    <th className="py-2 text-right font-bold">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {["red", "dozen1", "sixline", "corner", "street", "split", "straight", "basket"].map((id) => {
                    const b = BET_TYPES.find((x) => x.id === id)!;
                    const e = edgeFor(b);
                    return (
                      <tr key={id} className="border-b border-ink/15 last:border-0">
                        <td className="py-2 pr-3 font-bold">{b.label}</td>
                        <td className="tnum py-2 pr-3 text-right font-mono opacity-70">
                          {b.coverCount}/38
                        </td>
                        <td className="tnum py-2 pr-3 text-right font-mono opacity-70">
                          {(e.pLose / e.pWin).toFixed(2)}:1
                        </td>
                        <td className="tnum py-2 text-right font-mono font-bold text-ember">
                          {b.payout}:1
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-xs leading-relaxed opacity-60">
                The actual column is always short of the fair one, and always
                short by the same proportion. Systems, timing and &ldquo;due&rdquo;
                numbers leave both columns exactly where they are.
              </p>
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
        eyebrow="Independence"
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
        eyebrow="Betting systems"
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
              Take $1,023 and $1 units. That bankroll buys you exactly ten
              doublings: 1, 2, 4, 8, … 512, summing to 1,023. You lose only if
              red misses ten times in a row.
            </p>
            <p>
              P(ten consecutive losses) ={" "}
              <strong>(20/38)¹⁰ = {pct(textbook.pCatastrophe, 4)}</strong>. So{" "}
              {pct(textbook.pGrind, 2)} of the time you walk away up a dollar.
              A win rate starting with 99 feels like a cheat code.
            </p>
            <p>Then price the other branch:</p>
            <p className="tnum rounded-[10px] border-2 border-ink bg-felt-deep px-4 py-3 text-center font-mono text-sm text-amber">
              {pct(textbook.pGrind, 4)} × (+$1) − {pct(textbook.pCatastrophe, 4)} × ($1,023)
              <br />= {money(textbook.evPerSequence, 4)}
            </p>
            <p>
              Sixty-seven cents lost per sequence — which is exactly 5.26% of
              the amount you wagered getting there. The edge is untouched. It
              was always going to be untouched: expected value is a sum, and
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
                $1,023 bankroll · $1 unit · 38 pockets
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
                <strong>1 in 89</strong>, and you are still only chasing one
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
        eyebrow="Handle"
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
        eyebrow="Mitigation"
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
              ["Skip the top line", "7.89% → 5.26%", "The one bet on this wheel that is actively worse than the rest. Costs you nothing to avoid."],
              ["Make fewer, larger bets", "Cuts handle", "Expected loss scales with total wagered. Half the spins, half the expected loss — the clock is the real meter."],
              ["Bet outside, not inside", "No edge change", "Identical EV, far lower variance. You will lose at the same rate, just more smoothly and over more time."],
              ["Ignore the results board", "Behavioural", "It carries no information. It exists to increase your bet frequency."],
              ["Decide the stop-loss before you sit", "Behavioural", "The one decision that is genuinely yours, and the only one you make while not losing."],
              ["Walk past the wheel", "5.26% → 0%", "The only move on this list that makes the number zero. Everything above it just slows the bleed."],
            ].map(([move, effect, why]) => (
              <tr key={move} className="border-b border-ink/15 last:border-0 align-top">
                <td className="p-3 font-bold">{move}</td>
                <td className="tnum p-3 font-mono text-ember">{effect}</td>
                <td className="p-3 opacity-75">{why}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>

        <Callout kind="note" title="One thing this site doesn't model">
          <p>
            Single-zero wheels exist. Thirty-seven pockets instead of
            thirty-eight takes the same bets from 5.26% to{" "}
            <strong>2.70%</strong>, and a La Partage rule halves that again to{" "}
            <strong>1.35%</strong> on even-money bets. That is the largest
            improvement available to a roulette player and it requires no skill
            whatsoever — only reading the wheel before you sit.
          </p>
          <p>
            Everything on this page models the double-zero game, because that is
            the one most US floors actually offer. If you have a choice between
            the two, the choice is the whole decision.
          </p>
        </Callout>

        <Callout kind="warning" title="Not on this list">
          <p>
            Betting systems, progressions, &ldquo;due&rdquo; numbers, dealer
            signature, wheel clocking on a modern maintained wheel, or any
            product sold to you as a strategy. The first five do nothing. The
            last one has a negative expected value of whatever it cost.
          </p>
        </Callout>
      </Section>

      </GoDeeper>

      <GameSwitcher current="/roulette" />
    </>
  );
}
