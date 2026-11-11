"use client";

import * as React from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import {
  basicStrategy,
  evaluate,
  ACTION_FULL,
  ACTION_LABEL,
  type Action,
} from "@/lib/games/blackjack";
import { makeDeck, type Card } from "@/lib/cards";
import { makeRng, randomSeed, shuffle, type Rng } from "@/lib/rng";
import { money, pct } from "@/lib/stats";
import { Badge, Button, Segmented, Stat, cx } from "@/components/ui";

const DECKS = 6;
const START = 1000;
const BET_SIZES = [10, 25, 50, 100] as const;

interface PlayerHand {
  cards: Card[];
  bet: number;
  done: boolean;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  result?: string;
  delta?: number;
}

type Phase = "idle" | "player" | "dealer" | "settled";

function freshShoe(rng: Rng): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < DECKS; i++) shoe.push(...makeDeck());
  return shuffle(rng, shoe);
}

export function BlackjackTable() {
  const rngRef = React.useRef<Rng | null>(null);
  const getRng = () => (rngRef.current ??= makeRng(randomSeed()));

  const [shoe, setShoe] = React.useState<Card[]>([]);
  const [hands, setHands] = React.useState<PlayerHand[]>([]);
  const [dealer, setDealer] = React.useState<Card[]>([]);
  const [active, setActive] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [bankroll, setBankroll] = React.useState(START);
  const [bet, setBet] = React.useState<number>(25);
  const [hint, setHint] = React.useState(false);
  const [payout, setPayout] = React.useState<"3:2" | "6:5">("3:2");
  const [coach, setCoach] = React.useState({ right: 0, total: 0 });
  const [feedback, setFeedback] = React.useState<{
    ok: boolean;
    played: Action;
    correct: Action;
  } | null>(null);
  const [handsPlayed, setHandsPlayed] = React.useState(0);

  const draw = (src: Card[], n: number): [Card[], Card[]] => {
    const taken = src.slice(0, n);
    return [taken, src.slice(n)];
  };

  const deal = () => {
    if (bankroll < bet) return;
    setHint(false);
    let s = shoe;
    // Reshuffle at 25% penetration, like a real shoe.
    if (s.length < DECKS * 52 * 0.25) {
      s = freshShoe(getRng());
    }
    const [p, s1] = draw(s, 2);
    const [d, s2] = draw(s1, 2);

    setShoe(s2);
    setDealer(d);
    setHands([
      { cards: p, bet, done: false, doubled: false, surrendered: false, fromSplit: false },
    ]);
    setActive(0);
    setFeedback(null);
    setPhase("player");

    // A natural on either side ends the hand before any decision.
    const pv = evaluate(p);
    const dv = evaluate(d);
    if (pv.blackjack || dv.blackjack) {
      setTimeout(
        () =>
          finish(
            d,
            [{ cards: p, bet, done: true, doubled: false, surrendered: false, fromSplit: false }],
            s2,
            true,
          ),
        450,
      );
    }
  };

  const currentHand = hands[active];
  const dealerUp = dealer[0];

  // The bankroll still includes every bet already riding on this round,
  // so doubling or splitting must be paid out of what is NOT committed.
  // Checking against the raw bankroll let a player double their last bet
  // and finish below zero.
  const committed = hands.reduce((a, h) => a + h.bet, 0);
  const free = bankroll - committed;
  const canDouble = !!currentHand && currentHand.cards.length === 2 && free >= currentHand.bet;
  const canSplit =
    !!currentHand &&
    currentHand.cards.length === 2 &&
    hands.length < 4 &&
    free >= currentHand.bet &&
    (currentHand.cards[0].rank === currentHand.cards[1].rank ||
      (evaluate([currentHand.cards[0]]).total === 10 &&
        evaluate([currentHand.cards[1]]).total === 10));
  const canSurrender = !!currentHand && currentHand.cards.length === 2 && !currentHand.fromSplit;

  const correctAction = React.useMemo(() => {
    if (!currentHand || !dealerUp || phase !== "player") return null;
    return basicStrategy(currentHand.cards, dealerUp.rank, {
      canDouble,
      canSplit,
      canSurrender,
    });
  }, [currentHand, dealerUp, phase, canDouble, canSplit, canSurrender]);

  const judge = (played: Action) => {
    if (!correctAction) return;
    const ok = played === correctAction || (played === "D" && correctAction === "Ds");
    setCoach((c) => ({ right: c.right + (ok ? 1 : 0), total: c.total + 1 }));
    setFeedback({ ok, played, correct: correctAction });
  };

  const advance = (next: PlayerHand[], s: Card[], d: Card[]) => {
    const idx = next.findIndex((h) => !h.done);
    if (idx === -1) {
      setPhase("dealer");
      setTimeout(() => playDealer(d, next, s), 500);
    } else {
      setActive(idx);
    }
  };

  const act = (a: Action) => {
    if (phase !== "player" || !currentHand) return;
    setHint(false);
    judge(a);
    let s = shoe;
    const next = hands.map((h) => ({ ...h }));
    const h = next[active];

    if (a === "H" || a === "D") {
      const [c, rest] = draw(s, 1);
      s = rest;
      h.cards = [...h.cards, ...c];
      if (a === "D") {
        h.bet *= 2;
        h.doubled = true;
        h.done = true;
      }
      if (evaluate(h.cards).busted) h.done = true;
    } else if (a === "S") {
      h.done = true;
    } else if (a === "R") {
      h.surrendered = true;
      h.done = true;
    } else if (a === "P") {
      const [c1, r1] = draw(s, 1);
      const [c2, r2] = draw(r1, 1);
      s = r2;
      const left: PlayerHand = { ...h, cards: [h.cards[0], ...c1], fromSplit: true };
      const right: PlayerHand = { ...h, cards: [h.cards[1], ...c2], fromSplit: true };
      next.splice(active, 1, left, right);
    }

    setShoe(s);
    setHands(next);
    advance(next, s, dealer);
  };

  const playDealer = (d: Card[], finalHands: PlayerHand[], s: Card[]) => {
    const anyLive = finalHands.some(
      (h) => !h.surrendered && !evaluate(h.cards).busted,
    );
    const dcards = [...d];
    let rest = s;

    if (anyLive) {
      // Dealer stands on ALL 17s, soft included — the S17 rule the whole
      // chart on this page assumes. Under H17 every doubling shifts.
      while (true) {
        const v = evaluate(dcards);
        if (v.total >= 17) break;
        const [c, r] = draw(rest, 1);
        rest = r;
        dcards.push(...c);
      }
    }
    setDealer(dcards);
    setShoe(rest);
    finish(dcards, finalHands, rest, false);
  };

  const finish = (
    d: Card[],
    finalHands: PlayerHand[],
    s: Card[],
    immediate: boolean,
  ) => {
    const dv = evaluate(d);
    let total = 0;
    const settled = finalHands.map((h) => {
      const pv = evaluate(h.cards);
      let delta = 0;
      let result = "";

      if (h.surrendered) {
        delta = -h.bet / 2;
        result = "Surrendered";
      } else if (pv.blackjack && !h.fromSplit && !dv.blackjack) {
        delta = h.bet * (payout === "3:2" ? 1.5 : 1.2);
        result = `Blackjack, pays ${payout}`;
      } else if (pv.busted) {
        delta = -h.bet;
        result = "Bust";
      } else if (dv.blackjack) {
        delta = pv.blackjack ? 0 : -h.bet;
        result = pv.blackjack ? "Push — both blackjack" : "Dealer blackjack";
      } else if (dv.busted) {
        delta = h.bet;
        result = "Dealer busts";
      } else if (pv.total > dv.total) {
        delta = h.bet;
        result = `${pv.total} beats ${dv.total}`;
      } else if (pv.total < dv.total) {
        delta = -h.bet;
        result = `${dv.total} beats ${pv.total}`;
      } else {
        delta = 0;
        result = `Push on ${pv.total}`;
      }
      total += delta;
      return { ...h, done: true, result, delta };
    });

    setHands(settled);
    setBankroll((b) => b + total);
    setHandsPlayed((n) => n + settled.length);
    setPhase("settled");
    if (immediate) setShoe(s);
  };

  const dealerHidden = phase === "player";
  const accuracy = coach.total > 0 ? coach.right / coach.total : null;

  return (
    <div className="felt-panel overflow-hidden p-0">
      {/* ---- table ---- */}
      <div
        className={cx(
          "relative border-b-2 border-ink p-6 transition-[min-height] md:p-8",
          // Idle tables should not reserve space for cards that are not
          // there — it pushes Deal below the fold on the game-first layout.
          hands.length === 0 ? "min-h-[240px]" : "min-h-[460px]",
        )}
      >
        <div className="absolute top-5 right-6 flex flex-wrap gap-2">
          <Badge tone="ink">{DECKS} decks · S17 · DAS</Badge>
          <Badge tone={payout === "3:2" ? "mint" : "ember"}>
            Blackjack pays {payout}
          </Badge>
        </div>

        {/* dealer */}
        <div className="mb-10">
          <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
            Dealer{" "}
            {dealer.length > 0 && !dealerHidden && (
              <span className="tnum font-mono text-amber">
                {evaluate(dealer).total}
                {evaluate(dealer).busted && " — bust"}
              </span>
            )}
          </span>
          <div className="flex min-h-[112px] gap-2">
            {dealer.map((c, i) => (
              <PlayingCard
                key={`${c.id}-${i}`}
                card={c}
                width={78}
                index={i}
                faceDown={dealerHidden && i === 1}
              />
            ))}
          </div>
        </div>

        {/* player hands */}
        <div>
          <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
            You
          </span>
          <div className="flex flex-wrap gap-8">
            {hands.map((h, hi) => {
              const v = evaluate(h.cards);
              const isActive = phase === "player" && hi === active;
              return (
                <div
                  key={hi}
                  className={cx(
                    "rounded-[14px] border-2 p-3 transition-colors",
                    isActive ? "border-amber bg-amber/10" : "border-transparent",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="tnum font-mono text-sm font-bold text-cream">
                      {v.total}
                      {v.soft && !v.busted ? " soft" : ""}
                    </span>
                    {h.doubled && <Badge tone="lagoon">Doubled</Badge>}
                    {h.result && (
                      <Badge tone={(h.delta ?? 0) > 0 ? "mint" : (h.delta ?? 0) < 0 ? "ember" : "paper"}>
                        {h.result}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {h.cards.map((c, i) => (
                      <PlayingCard
                        key={`${c.id}-${i}`}
                        card={c}
                        width={78}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {hands.length === 0 && (
              <p className="py-10 text-sm text-cream/45">
                Pick a bet and press Deal. Stuck on a hand? Press “What should
                I do?” for the textbook answer.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---- controls ---- */}
      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {phase === "player" ? (
              <>
                <Button onClick={() => act("H")}>Hit</Button>
                <Button variant="secondary" onClick={() => act("S")}>
                  Stand
                </Button>
                <Button variant="secondary" onClick={() => act("D")} disabled={!canDouble}>
                  Double
                </Button>
                <Button variant="secondary" onClick={() => act("P")} disabled={!canSplit}>
                  Split
                </Button>
                <Button variant="ghost" onClick={() => act("R")} disabled={!canSurrender}>
                  Surrender
                </Button>
              </>
            ) : bankroll < BET_SIZES[0] ? (
              <Button
                onClick={() => {
                  setBankroll(START);
                  setHands([]);
                  setDealer([]);
                  setPhase("idle");
                }}
              >
                Out of money — start over with $1,000
              </Button>
            ) : (
              <>
                <Button onClick={deal} disabled={phase === "dealer" || bankroll < bet}>
                  {phase === "idle" ? `Deal — bet ${money(bet)}` : `Next hand — ${money(bet)}`}
                </Button>
                <Segmented
                  dark
                  value={String(bet)}
                  onChange={(v) => setBet(Number(v))}
                  options={BET_SIZES.filter((b) => b <= bankroll).map((b) => ({
                    value: String(b),
                    label: `$${b}`,
                  }))}
                />
              </>
            )}
            {phase === "player" && (
              <Button variant="ghost" onClick={() => setHint((h) => !h)}>
                {hint ? "Hide hint" : "What should I do?"}
              </Button>
            )}
          </div>
          {hint && phase === "player" && correctAction && (
            <p className="-mt-1 text-sm text-amber">
              The chart says: <strong>{ACTION_FULL[correctAction]}</strong>.
            </p>
          )}

          {/* the coach */}
          <div
            className={cx(
              "min-h-[5.5rem] rounded-[14px] border-2 border-ink p-4 text-sm leading-relaxed",
              feedback
                ? feedback.ok
                  ? "bg-[#1b7a53] text-white"
                  : "bg-ember text-white"
                : "bg-felt-deep text-cream/70",
            )}
          >
            {feedback ? (
              <>
                <strong className="mb-1 block">
                  {feedback.ok ? "Correct." : `Basic strategy says ${ACTION_LABEL[feedback.correct]}.`}
                </strong>
                {feedback.ok
                  ? ACTION_FULL[feedback.correct]
                  : `You played ${ACTION_LABEL[feedback.played]}. Over a long session that single leak is worth more than every superstition at the table combined.`}
              </>
            ) : phase === "player" && correctAction ? (
              <>
                <strong className="mb-1 block text-cream">Your move.</strong>
                The chart has an answer for this exact spot. Play it, and
                it&apos;ll tell you if you were right.
              </>
            ) : (
              <>
                <strong className="mb-1 block text-cream">
                  Every decision is graded.
                </strong>
                Basic strategy gives the exact play that maximises expectation
                for each of the 300-odd situations the game can produce. Every
                one was solved by brute force decades ago.
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Segmented
              dark
              label="Blackjack pays"
              value={payout}
              onChange={(v) => setPayout(v)}
              options={[
                { value: "3:2", label: "3:2" },
                { value: "6:5", label: "6:5" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 rounded-[14px] border-2 border-ink bg-felt-deep p-5">
          <Stat
            label="Bankroll"
            value={money(bankroll)}
            tone={bankroll >= START ? "win" : "ember"}
            size="sm"
            sub={`${handsPlayed} hands`}
          />
          <Stat
            label="Strategy accuracy"
            value={accuracy === null ? "—" : pct(accuracy, 0)}
            tone={accuracy === null ? "cream" : accuracy > 0.9 ? "win" : "ember"}
            size="sm"
            sub={`${coach.right}/${coach.total} correct`}
          />
        </div>
      </div>
    </div>
  );
}
