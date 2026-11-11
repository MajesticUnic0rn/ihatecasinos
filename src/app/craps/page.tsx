import type { Metadata } from "next";
import { GameSwitcher, Section, Prose } from "@/components/PageHero";
import { GameHeader, HowToPlay, PlaySection, TakeAway } from "@/components/game/GameShell";
import { GoDeeper } from "@/components/game/GoDeeper";
import { CrapsPlay } from "@/components/craps/CrapsPlay";
import { DicePair } from "@/components/ui/dice";
import { EdgeBars } from "@/components/viz/charts";
import { Callout, Panel, Stat, TableWrap } from "@/components/ui";
import {
  CRAPS_BETS,
  ODDS_LADDER,
  PASS_WIN,
  POINTS,
  WAYS,
  pMakePoint,
  pass345Edge,
  trueOdds,
} from "@/lib/games/craps";
import { pct } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Craps — the best bet and the worst bet, six inches apart",
  description:
    "Free odds carry a 0.00% house edge. Any 7 carries 16.67%. They sit on the same felt, and only one of them is announced. Roll real physics dice and watch the 36-outcome table assert itself.",
};

const ladderRows = ODDS_LADDER.filter((l) => l.multiple <= 20).map((l) => ({
  label: l.multiple === 0 ? "Pass line, no odds" : `Pass line + ${l.multiple}× odds`,
  edge: l.edge,
}));

export default function CrapsPage() {
  return (
    <>
      <GameHeader
        game="Craps"
        title="Bet on the dice. The simplest bet is the best one."
        tagline="Two dice and a table full of boxes. Every box is a different bet with a different price — and the cheapest one is right in front of you."
      />

      <HowToPlay
        steps={[
          {
            title: "Bet the Pass Line",
            body: "Before the first roll, put your chips on the Pass Line. That is the main bet, and the one to learn first.",
          },
          {
            title: "The first roll",
            body: (
              <>
                <strong>7 or 11:</strong> you win. <strong>2, 3 or 12:</strong>{" "}
                you lose. Any other number — 4, 5, 6, 8, 9, 10 — becomes{" "}
                <strong>the point</strong>.
              </>
            ),
            visual: <DicePair a={3} b={4} size={34} gap={6} />,
          },
          {
            title: "Hit the point",
            body: "The dice keep rolling. Roll the point again before a 7 and you win. Roll a 7 first and you lose — that’s a “seven out.”",
          },
          {
            title: "Add the odds",
            body: "Once there’s a point, add chips in the Odds box. It pays exactly fair odds — the only bet in the casino the house takes nothing from.",
          },
        ]}
        catchLine={
          <>
            Seven is the most common roll — 6 of the 36 ways two dice can land.
            Every bet on the table pays a little less than its true odds, and
            the colourful bets in the middle pay a lot less.
          </>
        }
      />

      <PlaySection hint="Hover any box on the felt to see how it works and what the house keeps.">
        <CrapsPlay />
      </PlaySection>

      <TakeAway
        numbers={[
          { value: "1.41%", label: "House edge on the Pass Line. One of the best deals in the casino." },
          { value: "0%", label: "House edge on the Odds bet. Truly free, which is why there is no sign for it." },
          { value: "16.67%", label: "House edge on Any Seven — the worst bet on the same table." },
        ]}
        line={
          <>
            Same dice, same table, same roll. The box you put your chips in
            changes what you pay by more than ten times.
          </>
        }
      />

      <GoDeeper
        topics={["The 36 outcomes", "Why the Pass Line wins 49.3%", "How free odds work", "Every bet, priced", "How to lose less"]}
      >


      {/* ---------------- the table ---------------- */}
      <Section
        eyebrow="Everything comes from here"
        title="Two dice, 36 outcomes, no hidden state"
        lede={
          <>
            There is no shoe, no wheel, no dealer decision. Every bet on the
            layout is priced off this one table — which means you can audit any
            of them in about fifteen seconds.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel>
            <h3 className="mb-5 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
              Ways to roll each total
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(WAYS).map(([total, ways]) => (
                <div key={total} className="flex items-center gap-3">
                  <span className="tnum w-6 text-right font-mono text-sm font-bold">
                    {total}
                  </span>
                  <span className="flex gap-1">
                    {Array.from({ length: ways }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-5 w-5 rounded-[4px] border-2 border-ink ${
                          Number(total) === 7 ? "bg-ember" : "bg-lagoon"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="tnum ml-auto font-mono text-xs opacity-55">
                    {pct(ways / 36, 1)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed opacity-65">
              Seven has more ways than any other total. That single fact is the
              engine of the entire game: it wins on the come-out and kills you
              after the point, and every price on the layout is a statement
              about it.
            </p>
          </Panel>

          <div className="flex flex-col gap-6">
            <Prose>
              <h3 className="!mt-0">The pass line, derived</h3>
              <p>
                On the come-out you win with 7 or 11 (8 ways of 36) and lose
                with 2, 3 or 12 (4 ways). Anything else sets a point, and now you
                need that number again before a seven.
              </p>
              <p>
                The conditional step is the elegant part. Once a point is set,{" "}
                <em>every roll that is neither the point nor a 7 is
                irrelevant</em>. So the probability is just the point&apos;s ways
                over the point&apos;s ways plus six:
              </p>
              <p className="tnum rounded-[10px] border-2 border-ink bg-cream px-4 py-3 text-center font-mono text-sm">
                P(win) = 8/36 + Σ (ways/36) × ways/(ways+6) ={" "}
                <strong>244/495</strong>
              </p>
              <p>
                That is <strong>{pct(PASS_WIN, 2)}</strong>, so the house edge is{" "}
                1 − 2 × 0.49293 = <strong>1.41%</strong>. Honest, legible, and
                one of the better deals in the building.
              </p>
            </Prose>

            <Panel className="bg-mint">
              <h3 className="mb-4 font-bold">Point probabilities</h3>
              <div className="grid grid-cols-3 gap-5">
                {POINTS.map((p) => (
                  <Stat
                    key={p}
                    label={`Point ${p}`}
                    value={pct(pMakePoint(p), 1)}
                    size="sm"
                    sub={`true ${trueOdds(p)[0]}:${trueOdds(p)[1]}`}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </Section>

      {/* ---------------- odds ---------------- */}
      <Section
        eyebrow="The good bet"
        title="Free odds: the only wager in the casino priced at its true probability"
        lede={
          <>
            Once a point is set, you may put an additional bet behind the line
            that pays exactly what the math says, to the cent.
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <Prose>
            <p>
              A point of 4 is made 3 ways against 7&apos;s 6 ways — a 2:1 shot.
              The odds bet pays <strong>2:1</strong>. Expected value: exactly
              zero. The house takes nothing.
            </p>
            <h3>So why does the edge go down?</h3>
            <p>
              This is the part worth understanding, because it generalises. The
              flat bet still loses 7/495 per unit — that never changes. What
              changes is the <em>denominator</em>. House edge is{" "}
              <em>expected loss ÷ total wagered</em>, and the odds bet adds to
              total wagered while adding nothing to expected loss.
            </p>
            <p className="tnum rounded-[10px] border-2 border-ink bg-cream px-4 py-3 text-center font-mono text-sm">
              edge = (7/495) ÷ (1 + ⅔ × multiple)
            </p>
            <p>
              The odds bet{" "}
              <strong>dilutes a fixed loss across more money</strong>. Your
              expected dollar loss per decision is identical; your variance goes
              up substantially. That is a real trade-off, not a free lunch — but
              it is the best trade available.
            </p>
            <h3>Which is why it isn&apos;t advertised</h3>
            <p>
              Free odds appear nowhere on the felt. There is no box for them.
              You have to know they exist, and know to ask. A bet with zero
              house edge is a concession, and concessions get printed in small
              type.
            </p>
          </Prose>

          <div className="flex flex-col gap-6">
            <Panel>
              <EdgeBars
                title="Blended edge as odds increase"
                max={0.015}
                rows={[
                  ...ladderRows,
                  { label: "Pass line + 3-4-5× (standard)", edge: pass345Edge() },
                ]}
                caption="Same flat bet throughout. The only thing changing is how much zero-edge money sits beside it."
              />
            </Panel>
            <Callout kind="key" title="Transfers to">
              <p>
                Any fee expressed as a percentage of a total. Fund expense
                ratios, payment processing, exchange spreads: the way to shrink
                the percentage is rarely to negotiate it down, and usually to
                change what it is divided by.
              </p>
            </Callout>
          </div>
        </div>
      </Section>

      {/* ---------------- every bet ---------------- */}
      <Section
        tone="paper"
        eyebrow="The whole layout"
        title="A 45× spread, all on one piece of felt"
      >
        <TableWrap>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="p-3 font-bold">Bet</th>
              <th className="p-3 font-bold">Pays</th>
              <th className="p-3 font-bold">Edge</th>
              <th className="p-3 font-bold">What it is</th>
            </tr>
          </thead>
          <tbody>
            {CRAPS_BETS.map((b) => (
              <tr key={b.id} className="border-b border-ink/15 align-top last:border-0">
                <td className="p-3 font-bold whitespace-nowrap">{b.label}</td>
                <td className="tnum p-3 font-mono text-xs whitespace-nowrap opacity-70">
                  {b.payout}
                </td>
                <td
                  className={`tnum p-3 font-mono font-bold ${
                    b.edge < 0.015 ? "text-[#1b7a53]" : "text-ember"
                  }`}
                >
                  {pct(b.edge, 2)}
                </td>
                <td className="p-3 opacity-75">{b.blurb}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>

        <Callout kind="warning" title="Big 6 / Big 8 deserves its own warning">
          <p>
            Placing the 6 pays 7:6 for a 1.52% edge. The Big 6 box — larger,
            better positioned, easier to reach — is the identical wager paying
            1:1, for <strong>9.09%</strong>. Six times the cost, same bet, and
            the only difference is which rectangle you put the chip in. Some
            jurisdictions have banned it. Most have not.
          </p>
        </Callout>
      </Section>

      {/* ---------------- mitigation ---------------- */}
      <Section
        tone="felt"
        eyebrow="Mitigation"
        title="The entire strategy, which fits in one sentence"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="felt-panel bg-violet/15 p-8">
            <p className="text-h4 md:text-h3 font-bold text-balance text-cream">
              Bet the pass line or don&apos;t pass, take the maximum free odds
              you can afford, and ignore absolutely everything in the middle of
              the table.
            </p>
            <p className="mt-6 leading-relaxed text-cream/70">
              That is it. That is the whole thing. Every proposition in the
              centre — hardways, horn, any craps, any seven, C&amp;E, the
              world — ranges from 9% to 16.67%, and they are physically placed
              in the middle because the stickman has to be able to reach them,
              which tells you how often the house wants them bet.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              { h: "Bankroll for the odds", d: "If you can't comfortably cover 3-4-5× behind the line, drop to a lower-minimum table rather than skipping the odds. The odds are the entire point." },
              { h: "Don't pass is better, barely", d: "1.36% vs 1.41%. You'll be the only person at the table rooting for a seven. Price that socially however you like." },
              { h: "The dice don't get hot", d: "Shooters are not streaky. Controlled throwing has never been demonstrated under conditions that would convince anyone who wasn't selling a seminar." },
            ].map((c) => (
              <div key={c.h} className="rounded-[16px] border-2 border-ink bg-felt p-6">
                <h3 className="mb-2 font-bold text-cream">{c.h}</h3>
                <p className="text-sm leading-relaxed text-cream/65">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      </GoDeeper>

      <GameSwitcher current="/craps" />
    </>
  );
}
