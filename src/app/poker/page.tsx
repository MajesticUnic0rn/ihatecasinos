import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Prose } from "@/components/PageHero";
import { RakeLab } from "@/components/poker/RakeLab";
import { PotOdds } from "@/components/poker/PotOdds";
import { Badge, Callout, Marquee, Panel, Stat, TableWrap } from "@/components/ui";
import { MATCHUPS, PREFLOP_FACTS } from "@/lib/games/poker";
import { pct } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Poker — the beatable game that most people lose at",
  description:
    "The house isn't your opponent in poker; it's a fixed tax on every pot. Model the rake, see what it does to a real win rate, and learn why skill and profit are different questions.",
};

export default function PokerPage() {
  return (
    <>
      <PageHero
        eyebrow="Lesson 8 · The rake"
        accent="violet"
        title={
          <>
            You can be the best player at the table and still go home down.
          </>
        }
        lede={
          <>
            Poker is the only game in the casino with no house edge — the house
            doesn&apos;t play. Instead it removes a percentage of every pot. That
            turns a zero-sum game between players into a negative-sum one, and
            the amount removed is usually larger than the edge separating a good
            player from a bad one.
          </>
        }
        stats={[
          { label: "House edge", value: "0%", note: "the house isn't in the hand" },
          { label: "Rake, live $1/$2", value: "~10 BB/100", note: "with the dealer toke" },
          { label: "Strong win rate", value: "~6 BB/100", note: "before rake, and genuinely hard" },
          { label: "Net", value: "−4 BB/100", note: "do the subtraction" },
        ]}
      />

      <Marquee
        tone="violet"
        items={["zero sum between players", "negative sum after the rake", "skill ≠ profit"]}
      />

      {/* ---------------- the rake ---------------- */}
      <Section
        tone="felt"
        eyebrow="The whole lesson"
        title="A fixed tax on a zero-sum game"
        lede={
          <>
            Move the sliders to a game you have actually sat in. The number that
            matters is at the bottom right, and the chart beside it shows what
            that number does to people who are genuinely good at this.
          </>
        }
      >
        <RakeLab />
      </Section>

      {/* ---------------- why it's different ---------------- */}
      <Section
        eyebrow="Why this game is different"
        title="Everywhere else, the house is your opponent. Here it is your landlord."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <Prose>
            <p>
              In roulette, blackjack and craps you are betting against the
              casino and losing at a known rate. In poker you are betting
              against the people around you, and <em>between you</em> the game
              is exactly zero-sum: every dollar won is a dollar someone else
              lost.
            </p>
            <p>
              Then the house takes its cut from each pot. The money between
              players no longer sums to zero — it sums to{" "}
              <strong>negative the rake</strong>. The table as a whole is
              guaranteed to lose, continuously, no matter who wins which hand.
            </p>
            <h3>The consequence people miss</h3>
            <p>
              Being a <em>winning player</em> and being a{" "}
              <em>better-than-average player</em> are different achievements,
              and the gap between them is exactly the rake. In a raked game, the
              break-even point isn&apos;t the middle of the field — it is well
              above it. Most of the table is below that line by construction.
            </p>
            <p>
              This is why the single highest-leverage decision in poker is not
              how you play a hand. It is <strong>game selection</strong>: which
              table, which stakes, which rake structure. Players spend years on
              strategy and minutes on the one choice that dominates it.
            </p>
            <h3>The honest version</h3>
            <p>
              Poker <em>is</em> beatable. People do it. It requires a genuinely
              soft game, a large bankroll, emotional control over hundreds of
              losing hours, and a rake structure that leaves something behind.
              Remove any one of those and the math closes.
            </p>
          </Prose>

          <div className="flex flex-col gap-6">
            <Panel className="bg-thistle">
              <h3 className="text-h4 mb-4 font-bold">The three ways to win</h3>
              <ol className="flex flex-col gap-4">
                {[
                  { n: "1", h: "Play better than the table", d: "Real, learnable, and the part everyone focuses on. It is also the smallest of the three in most games." },
                  { n: "2", h: "Pick a softer table", d: "Dominates the first. Finding a game with two bad players is worth more than a year of study applied to a tough one." },
                  { n: "3", h: "Pay less rake", d: "Dominates both. Higher stakes have proportionally lower rake, capped pots favour big games, and some structures are simply unbeatable at any skill level." },
                ].map((x) => (
                  <li key={x.n} className="flex gap-4">
                    <span className="tnum shrink-0 font-mono text-2xl font-bold opacity-40">
                      {x.n}
                    </span>
                    <div>
                      <strong className="block">{x.h}</strong>
                      <span className="text-sm leading-relaxed opacity-75">
                        {x.d}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Callout kind="key" title="Transfers to">
              <p>
                Any competitive market with a transaction cost: day trading,
                sports betting, fantasy sports, even freelance bidding. Beating
                the field is necessary and not sufficient. You have to beat the
                field <em>by more than the fee</em>, and the fee is usually the
                larger number.
              </p>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ---------------- pot odds ---------------- */}
      <Section
        tone="felt"
        eyebrow="The actual skill"
        title="Two numbers, compared, a few thousand times a night"
        lede={
          <>
            Strip away the theatre and poker is one calculation repeated: does
            my chance of winning exceed the price I&apos;m being asked to pay?
            Everything else is decoration on that question.
          </>
        }
      >
        <PotOdds />
      </Section>

      {/* ---------------- variance ---------------- */}
      <Section
        eyebrow="Variance"
        title="The reason bad players keep coming back, and good ones quit"
      >
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Prose>
            <p>
              Poker&apos;s edges are small and its variance is enormous. A
              winning player with a 5 BB/100 win rate and typical variance will
              have <strong>losing months</strong> routinely and losing stretches
              of tens of thousands of hands occasionally.
            </p>
            <p>This produces two symmetrical mistakes:</p>
            <ul>
              <li>
                <strong>Bad players read short-run wins as skill.</strong> A
                recreational player who runs hot for a weekend concludes they
                are good at this, and funds the game for years on that belief.
              </li>
              <li>
                <strong>Good players read short-run losses as failure.</strong>{" "}
                A genuinely winning player hits a 20,000-hand downswing,
                concludes the game is rigged or that they have lost it, and
                quits while ahead of the field.
              </li>
            </ul>
            <p>
              Both are the same error as the gambler&apos;s fallacy from{" "}
              <Link href="/roulette" className="underline underline-offset-4">
                lesson 2
              </Link>
              : treating a small sample as if it carried information it cannot
              carry. The difference is that in poker the signal is genuinely
              there — it is just buried under far more noise than a human
              session can surface.
            </p>
          </Prose>

          <div className="flex flex-col gap-6">
            <Panel>
              <h3 className="mb-5 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
                Preflop, for calibration
              </h3>
              <div className="grid grid-cols-2 gap-6">
                {PREFLOP_FACTS.map((f) => (
                  <Stat key={f.label} label={f.label} value={f.value} size="sm" sub={f.note} />
                ))}
              </div>
            </Panel>

            <Panel>
              <h3 className="mb-5 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
                All-in equities people get wrong
              </h3>
              <ul className="flex flex-col gap-3">
                {MATCHUPS.map((m) => (
                  <li key={`${m.a}-${m.b}`} className="flex items-center gap-3">
                    <span className="tnum w-28 shrink-0 font-mono text-sm font-bold">
                      {m.a} v {m.b}
                    </span>
                    <span className="relative h-5 flex-1 overflow-hidden rounded-[4px] bg-ink/10">
                      <span
                        className="absolute inset-y-0 left-0 rounded-[4px] bg-[#1f6fb8]"
                        style={{ width: `${m.aEq * 100}%` }}
                      />
                    </span>
                    <span className="tnum w-12 shrink-0 text-right font-mono text-xs font-bold">
                      {pct(m.aEq, 0)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed opacity-55">
                Note the third row. &ldquo;Coin flip&rdquo; is the standard
                phrase for AK against a pair, and the pair is actually a
                54:46 favourite — a meaningful edge that gets verbally rounded
                away at tables every night.
              </p>
            </Panel>
          </div>
        </div>
      </Section>

      {/* ---------------- mitigation ---------------- */}
      <Section
        tone="paper"
        eyebrow="Mitigation"
        title="If you're going to play, in order of leverage"
      >
        <TableWrap>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3 font-bold">Move</th>
              <th className="p-3 font-bold">Roughly worth</th>
              <th className="p-3 font-bold">Why</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Check the rake before you sit", "5–10 BB/100", "The largest single number in your results, and the one nobody looks up. A capped rake in a big-pot game is dramatically cheaper than an uncapped one."],
              ["Choose the table, not the seat", "3–8 BB/100", "Two recreational players at your table is worth more than any amount of study. If you can't tell who they are, it's you."],
              ["Play fewer hands from early position", "2–4 BB/100", "The most common and most expensive leak in low-stakes poker, and the easiest to fix by decision rather than skill."],
              ["Stop calling river bets to 'see it'", "1–3 BB/100", "Curiosity is the most expensive emotion at the table. Pot odds don't include the value of knowing."],
              ["Track results honestly", "—", "Nearly every amateur believes they're a small winner. The arithmetic says most of them cannot be. A spreadsheet settles it in a month."],
              ["Set a stop-loss and keep it", "—", "Tilt costs more than every strategic error combined, and it only happens when you're already losing."],
            ].map(([move, worth, why]) => (
              <tr key={move} className="border-b border-ink/15 align-top last:border-0">
                <td className="p-3 font-bold">{move}</td>
                <td className="tnum p-3 font-mono text-ember whitespace-nowrap">{worth}</td>
                <td className="p-3 opacity-75">{why}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      <Section tone="felt" className="border-b-0">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="paper">Finish</Badge>
          <h2 className="text-h3 md:text-h2 max-w-3xl font-bold text-balance text-cream">
            Four games, one structure. Here is the whole course in one page.
          </h2>
          <Link
            href="/course"
            className="brut-sm brut-press rounded-[50px] bg-amber px-6 py-3 text-sm font-bold tracking-wide text-ink uppercase"
          >
            The seven lessons →
          </Link>
        </div>
      </Section>
    </>
  );
}
