import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section, Prose } from "@/components/PageHero";
import { StrategyChart } from "@/components/blackjack/StrategyChart";
import { BlackjackTable } from "@/components/blackjack/BlackjackTable";
import { EdgeBars } from "@/components/viz/charts";
import { Badge, Callout, Marquee, Panel, TableWrap } from "@/components/ui";
import { DEALER_BUST, P_BLACKJACK, RULE_EFFECTS, UPCARDS } from "@/lib/games/blackjack";
import { pct } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Blackjack — the only game where information is worth money",
  description:
    "Basic strategy takes blackjack from ~2% to 0.5%. Then the casino changed one payout from 3:2 to 6:5 and took nearly all of it back. Playable table with a strategy coach.",
};

export default function BlackjackPage() {
  return (
    <>
      <PageHero
        eyebrow="Lesson 6 · Conditional probability"
        accent="lagoon"
        title={
          <>
            The dealer&apos;s upcard is the most valuable piece of information
            in the building.
          </>
        }
        lede={
          <>
            Blackjack is the one major casino game where your decisions move
            the number — from roughly 2% down to 0.5%. It is also the game
            where the house quietly changed a single payout and took almost all
            of that back, from players who never noticed.
          </>
        }
        stats={[
          { label: "Basic strategy, 3:2", value: "0.50%", note: "about as good as a casino gets" },
          { label: "Same play, 6:5", value: "1.89%", note: "one number on the felt" },
          { label: "Average player", value: "~2.0%", note: "strategy errors, mostly timid" },
          { label: "P(natural)", value: pct(P_BLACKJACK, 2), note: "and this is what they repriced" },
        ]}
      />

      <Marquee
        tone="violet"
        items={["3 to 2", "not 6 to 5", "check the felt", "every single time"]}
      />

      {/* ---------------- dealer upcard ---------------- */}
      <Section
        eyebrow="The core idea"
        title="Everything downstream is conditional on one card"
        lede={
          <>
            A hard 16 is a hopeless hand or a routine one depending entirely on
            what the dealer is showing. That is conditional probability doing
            real work, and it is why blackjack has a strategy at all while
            roulette cannot.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Panel>
            <EdgeBars
              title="Dealer bust rate by upcard"
              max={0.45}
              rows={UPCARDS.map((u) => ({
                label: `Dealer shows ${u}`,
                edge: DEALER_BUST[u],
              }))}
              caption={
                <>
                  6 decks, dealer stands on soft 17, conditioned on the dealer
                  having already peeked and not having blackjack. Note the cliff
                  between 6 and 7: the dealer busts {pct(DEALER_BUST["6"], 0)} of
                  the time with a six and {pct(DEALER_BUST["7"], 0)} with a
                  seven. Almost every &ldquo;surprising&rdquo; entry in the
                  strategy chart is that cliff.
                </>
              }
            />
          </Panel>

          <div className="flex flex-col gap-6">
            <Prose>
              <h3 className="!mt-0">Why you stand on 16 against a 6</h3>
              <p>
                Standing on 16 feels like surrender. You will lose that hand
                most of the time. But the comparison is not &ldquo;16 versus
                winning&rdquo; — it&apos;s <em>16 standing</em> versus{" "}
                <em>16 hitting</em>, and both are bad.
              </p>
              <p>
                Stand, and you win only if the dealer busts:{" "}
                <strong>{pct(DEALER_BUST["6"], 1)}</strong>. Hit, and you bust
                immediately on any 6 through king — <strong>61.5%</strong> of the
                deck — and even surviving leaves you with a weak total.
              </p>
              <p>
                Basic strategy is not a chart of winning plays. It is a chart of{" "}
                <em>least-losing</em> plays, which is a much harder thing to
                follow, because every correct decision still feels wrong a
                majority of the time.
              </p>
            </Prose>

            <Callout kind="key" title="The transferable bit">
              <p>
                &ldquo;This option loses money&rdquo; is not an argument against
                it. The question is always whether it loses <em>less</em> than
                the alternative. People who internalise this stop making a
                particular class of decision error well outside casinos.
              </p>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ---------------- the chart ---------------- */}
      <Section
        tone="paper"
        eyebrow="The chart"
        title="Three hundred decisions, all of them already solved"
        lede={
          <>
            This was computed by brute force decades ago and has not changed
            since. It is legal to use at the table, printed on cards sold in the
            casino gift shop, and ignored by most players at it.
          </>
        }
      >
        <StrategyChart />
      </Section>

      {/* ---------------- playable ---------------- */}
      <Section
        tone="felt"
        eyebrow="Play it"
        title="Every decision graded against the chart"
        lede={
          <>
            Real 6-deck shoe, real shuffle, dealer stands on soft 17. Flip the
            payout to 6:5 and watch the bankroll curve change without a single
            rule of play changing. Turn the count on and the card finishes start
            meaning something.
          </>
        }
      >
        <BlackjackTable />
      </Section>

      {/* ---------------- 6:5 ---------------- */}
      <Section
        eyebrow="The heist"
        title="How the house took back a century of basic strategy with one number"
      >
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Prose>
            <p>
              A natural blackjack — an ace with a ten — arrives about{" "}
              <strong>{pct(P_BLACKJACK, 2)}</strong> of hands. Traditionally it
              paid <strong>3:2</strong>: bet $10, win $15.
            </p>
            <p>
              Many tables now pay <strong>6:5</strong>. Same bet, same hand,{" "}
              $12 instead of $15. The felt says &ldquo;Blackjack pays 6 to
              5&rdquo; in the same font as everything else, and the number is
              bigger, which does not hurt.
            </p>
            <p>
              The cost: you lose $3 on {pct(P_BLACKJACK, 2)} of hands, which is{" "}
              <strong>1.39%</strong> of your action. Against a 0.5% game that is
              not a tweak — it <em>quadruples</em> the house edge and erases the
              entire value of knowing what you&apos;re doing.
            </p>
            <h3>What that means in practice</h3>
            <p>
              A player using perfect basic strategy at a 6:5 table is getting a
              worse deal than a sloppy player at a 3:2 table. Every hour spent
              learning the chart is worth less than thirty seconds spent reading
              the felt before you sit down.
            </p>
          </Prose>

          <div className="flex flex-col gap-6">
            <Panel>
              <EdgeBars
                title="What each rule change costs you"
                max={0.02}
                rows={RULE_EFFECTS.map((r) => ({
                  label: r.rule,
                  edge: r.delta,
                  note: r.note,
                }))}
                caption="Added to a 0.50% baseline. The top line alone is worth more than the other five combined."
              />
            </Panel>
            <Callout kind="warning" title="Before you sit down">
              <p>
                Read the felt. 3:2 or 6:5 is the only question that matters, and
                it is answered in writing, in advance, for free.
              </p>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ---------------- insurance & counting ---------------- */}
      <Section
        tone="paper"
        eyebrow="Two side bets, one real"
        title="Insurance is a sucker bet. Counting is a real edge you will not be allowed to keep."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Panel className="bg-cream">
            <Badge tone="ember" className="mb-4">
              Insurance
            </Badge>
            <h3 className="text-h4 mb-4 font-bold">
              A 2:1 payout on a 30.9% event
            </h3>
            <Prose className="max-w-none text-[1rem]">
              <p>
                Dealer shows an ace and offers &ldquo;insurance&rdquo; at 2:1.
                It is not insurance — it is an independent side bet on whether
                the hole card is a ten.
              </p>
              <p>
                With six decks and three cards visible, 96 of the 311 unseen
                cards are tens:
              </p>
              <p className="tnum rounded-[10px] border-2 border-ink bg-paper px-4 py-3 text-center font-mono text-sm">
                2 × (96/311) − (215/311) = −23/311 = <strong>−7.40%</strong>
              </p>
              <p>
                A 7.4% house edge — fifteen times worse than the game you are
                already playing. It is offered on every ace because the word
                &ldquo;insurance&rdquo; does more work than any odds ever could.
              </p>
              <p>
                <strong>The only exception:</strong> a card counter with a true
                count of +3 or higher, when the remaining shoe is genuinely
                ten-rich. Then — and only then — it turns positive.
              </p>
            </Prose>
          </Panel>

          <Panel className="bg-cream">
            <Badge tone="lagoon" className="mb-4">
              Card counting
            </Badge>
            <h3 className="text-h4 mb-4 font-bold">
              Why it works, and why it barely matters
            </h3>
            <Prose className="max-w-none text-[1rem]">
              <p>
                Blackjack is the only common casino game <em>with memory</em>.
                Cards leave the shoe and don&apos;t come back, so the
                composition drifts — and a ten-rich shoe favours the player
                (more naturals, more dealer busts, more profitable doubles).
              </p>
              <p>
                Hi-Lo assigns +1 to 2–6, 0 to 7–9, and −1 to tens and aces. Divide
                the running count by the decks remaining to get the{" "}
                <em>true count</em>. Each true point above about +1 is worth
                roughly 0.5% of edge.
              </p>
              <p>
                So a good counter plays a game with maybe a{" "}
                <strong>0.5–1.5% edge</strong>, available in short bursts,
                requiring a large bankroll to survive the variance, bet spreads
                that are obvious to anyone watching, and perfect play under
                pressure for hours.
              </p>
              <p>
                <strong>And then they bar you.</strong> Casinos are private
                property. Counting is not illegal; being asked to leave is also
                not illegal. The best outcome available to a world-class
                advantage player is a slightly profitable job that ends the
                moment it starts working.
              </p>
            </Prose>
          </Panel>
        </div>

        <TableWrap>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3 font-bold">True count</th>
              <th className="p-3 font-bold">Approx. player edge</th>
              <th className="p-3 font-bold">What it actually feels like</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["−2 or below", "−1.5%", "Worse than flat-betting a normal game. Most of your hours are here."],
              ["0", "−0.5%", "A standard losing game. Also most of your hours."],
              ["+2", "+0.5%", "Break-even-ish. Time to raise the bet, and to be noticed."],
              ["+4", "+1.5%", "Genuinely good. Occurs rarely, briefly, and visibly."],
              ["+6", "+2.5%", "Excellent, and about when someone starts watching the table."],
            ].map(([tc, edge, feel]) => (
              <tr key={tc} className="border-b border-ink/15 align-top last:border-0">
                <td className="tnum p-3 font-mono font-bold">{tc}</td>
                <td className="tnum p-3 font-mono text-ember">{edge}</td>
                <td className="p-3 opacity-75">{feel}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Section>

      {/* ---------------- mitigation ---------------- */}
      <Section
        tone="felt"
        eyebrow="Mitigation"
        title="The checklist, in order of how much it is worth"
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { n: "1", h: "Find a 3:2 table", d: "Worth 1.39%. Larger than every other item on this list combined, and it takes one glance at the felt." },
            { n: "2", h: "Learn the chart", d: "Worth roughly 1.5% against how most people actually play. It's free, it's allowed, and it fits on a card." },
            { n: "3", h: "Never take insurance", d: "Worth 7.4% of every insurance bet you don't make. The easiest rule on the list: just always say no." },
            { n: "4", h: "Find dealer-stands-on-soft-17", d: "Worth 0.22%. Printed on the felt alongside the payout." },
            { n: "5", h: "Always split 8s and aces", d: "Two hands starting at 8 or 11 beat one starting at 16 or a soft 12. The most commonly botched pair in the game." },
            { n: "6", h: "Skip every side bet", d: "21+3, Perfect Pairs, Lucky Ladies: all between 3% and 8%. They exist because the main game's edge is embarrassingly small." },
          ].map((c) => (
            <div key={c.n} className="rounded-[16px] border-2 border-ink bg-felt p-6">
              <span className="tnum mb-3 block font-mono text-3xl font-bold text-violet-soft/60">
                {c.n}
              </span>
              <h3 className="mb-2 font-bold text-cream">{c.h}</h3>
              <p className="text-sm leading-relaxed text-cream/65">{c.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper" className="border-b-0">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="violet">Next</Badge>
          <h2 className="text-h3 md:text-h2 max-w-3xl font-bold text-balance">
            Craps puts the best bet and the worst bet in the house within six
            inches of each other, and only shouts about one of them.
          </h2>
          <Link
            href="/craps"
            className="brut-sm brut-press rounded-[50px] bg-violet px-6 py-3 text-sm font-bold tracking-wide text-white uppercase"
          >
            Lesson 7 · Craps →
          </Link>
        </div>
      </Section>
    </>
  );
}
