"use client";

import * as React from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { parseHand, type Card } from "@/lib/cards";
import {
  RANKING_EXAMPLES,
  SCENARIOS,
  callEv,
  equity,
  evaluate,
  requiredShare,
  runout,
  scenarioCards,
  type Scenario,
} from "@/lib/games/holdem";
import { makeRng, randomSeed, type Rng } from "@/lib/rng";
import { money, pct } from "@/lib/stats";
import { Badge, Button, Stat, cx } from "@/components/ui";

const START = 1000;

type Phase = "decide" | "folded" | "showdown";

interface Showdown {
  board: Card[];
  heroHand: string;
  villainHand: string;
  outcome: "win" | "lose" | "tie";
  delta: number;
}

interface Batch {
  wins: number;
  ties: number;
  losses: number;
  net: number;
}

function settle(s: Scenario, outcome: Showdown["outcome"]): number {
  if (outcome === "win") return s.pot;
  if (outcome === "lose") return -s.toCall;
  return (s.pot + s.toCall) / 2 - s.toCall;
}

export function PokerPlay() {
  const [index, setIndex] = React.useState(0);
  const [cash, setCash] = React.useState(START);
  const [phase, setPhase] = React.useState<Phase>("decide");
  const [showdown, setShowdown] = React.useState<Showdown | null>(null);
  const [batch, setBatch] = React.useState<Batch | null>(null);
  const [choice, setChoice] = React.useState<"call" | "fold" | null>(null);

  const rngRef = React.useRef<Rng | null>(null);
  const rng = () => (rngRef.current ??= makeRng(randomSeed()));

  const s = SCENARIOS[index];
  const { hero, villain, board } = React.useMemo(() => scenarioCards(s), [s]);

  // Preflop spots are sampled (with a fixed seed, so the number shown is
  // stable); flop and turn spots are enumerated exactly.
  const eq = React.useMemo(
    () => equity(hero, villain, board, makeRng(`eq-${s.id}`), 30_000),
    [hero, villain, board, s.id],
  );
  const need = requiredShare(s);
  const ev = callEv(s, eq);
  const callIsRight = ev > 0;

  const pick = (i: number) => {
    setIndex(i);
    setPhase("decide");
    setShowdown(null);
    setBatch(null);
    setChoice(null);
  };

  const call = () => {
    const full = runout([...hero, ...villain, ...board], board, rng());
    const h = evaluate([...hero, ...full]);
    const v = evaluate([...villain, ...full]);
    const outcome = h.value > v.value ? "win" : h.value < v.value ? "lose" : "tie";
    const delta = settle(s, outcome);
    setCash((c) => c + delta);
    setShowdown({ board: full, heroHand: h.name, villainHand: v.name, outcome, delta });
    setChoice("call");
    setPhase("showdown");
  };

  const fold = () => {
    setChoice("fold");
    setPhase("folded");
  };

  /** The whole point: the same decision, a thousand times. */
  const thousand = () => {
    const r = rng();
    const out: Batch = { wins: 0, ties: 0, losses: 0, net: 0 };
    const known = [...hero, ...villain, ...board];
    for (let i = 0; i < 1000; i++) {
      const full = runout(known, board, r);
      const h = evaluate([...hero, ...full]).value;
      const v = evaluate([...villain, ...full]).value;
      const o = h > v ? "win" : h < v ? "lose" : "tie";
      if (o === "win") out.wins++;
      else if (o === "lose") out.losses++;
      else out.ties++;
      out.net += settle(s, o);
    }
    setBatch(out);
  };

  const shownBoard: (Card | null)[] = showdown
    ? showdown.board
    : [...board, ...Array<null>(5 - board.length).fill(null)];

  const decidedRight = choice === null ? null : (choice === "call") === callIsRight;

  return (
    <div className="flex flex-col gap-6">
      {/* scenario picker */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((sc, i) => (
          <button
            key={sc.id}
            onClick={() => pick(i)}
            aria-pressed={i === index}
            className={cx(
              "cursor-pointer rounded-[50px] border-2 px-4 py-2 text-sm font-bold transition-colors",
              i === index ? "border-ink bg-violet text-white" : "border-cream/25 text-cream/75 hover:border-cream/60",
            )}
          >
            {i + 1}. {sc.title}
          </button>
        ))}
      </div>

      <div className="felt-panel overflow-hidden p-0">
        <div className="grid lg:grid-cols-[1.2fr_1fr]">
          {/* ---------------- the table ---------------- */}
          <div className="flex flex-col gap-6 border-b-2 border-ink bg-[#14603c]/60 p-6 md:p-8 lg:border-r-2 lg:border-b-0">
            <div>
              <span className="mb-2 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/55 uppercase">
                Opponent {showdown && <span className="text-cream">— {showdown.villainHand}</span>}
              </span>
              <div className="flex gap-2">
                {villain.map((c, i) => (
                  <PlayingCard key={c.id} card={c} faceDown={phase !== "showdown"} width={64} index={i} interactive={false} />
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 flex items-center gap-3 text-[0.7rem] font-bold tracking-[0.08em] text-cream/55 uppercase">
                Board
                <span className="rounded-[50px] bg-ink px-2.5 py-0.5 text-cream normal-case tracking-normal">
                  Pot {money(s.pot)}
                </span>
              </span>
              <div className="flex gap-2">
                {shownBoard.map((c, i) =>
                  c ? (
                    <PlayingCard key={`${c.id}-${i}`} card={c} width={64} index={i} interactive={false} />
                  ) : (
                    <div
                      key={`empty-${i}`}
                      className="rounded-[7px] border-2 border-dashed border-cream/25"
                      style={{ width: 64, height: 64 * 1.4 }}
                      aria-label="Card still to come"
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/55 uppercase">
                You {showdown && <span className="text-cream">— {showdown.heroHand}</span>}
              </span>
              <div className="flex gap-2">
                {hero.map((c, i) => (
                  <PlayingCard key={c.id} card={c} width={78} index={i} />
                ))}
              </div>
            </div>
          </div>

          {/* ---------------- the decision ---------------- */}
          <div className="flex flex-col gap-5 p-6 md:p-7">
            <div>
              <h3 className="text-h4 font-bold text-cream">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-cream/75">{s.setup}</p>
            </div>

            {phase === "decide" && (
              <div className="flex flex-wrap gap-3">
                <Button onClick={call} className="flex-1">Call {money(s.toCall)}</Button>
                <Button variant="secondary" onClick={fold} className="flex-1">Fold</Button>
              </div>
            )}

            {phase !== "decide" && (
              <div
                className={cx(
                  "rounded-[14px] border-2 border-ink p-4",
                  phase === "folded"
                    ? "bg-felt-deep"
                    : showdown?.outcome === "win"
                      ? "bg-[#1b7a53]"
                      : showdown?.outcome === "lose"
                        ? "bg-ember"
                        : "bg-felt-deep",
                )}
              >
                <p className="font-bold text-white">
                  {phase === "folded"
                    ? "You folded. That costs nothing more."
                    : showdown!.outcome === "win"
                      ? `You win the pot: +${money(showdown!.delta)}.`
                      : showdown!.outcome === "lose"
                        ? `You lose your call: −${money(Math.abs(showdown!.delta))}.`
                        : "Split pot — you get your call back."}
                </p>
              </div>
            )}

            {phase !== "decide" && (
              <div className="rounded-[14px] border-2 border-ink bg-felt-deep p-4">
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Your chance to win" value={pct(eq.share, eq.exact ? 1 : 0)} tone="cream" size="sm" sub={eq.exact ? "every runout counted" : "from 30,000 sample boards"} />
                  <Stat label="Chance you needed" value={pct(need, 1)} tone="cream" size="sm" sub={`call ${money(s.toCall)} to win ${money(s.pot)}`} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-cream/80">
                  <Badge tone={decidedRight ? "mint" : "ember"} className="mr-2">
                    {decidedRight ? "Right call" : "Wrong call"}
                  </Badge>
                  {callIsRight
                    ? `Calling earns about ${money(ev, 2)} on average each time you face this.`
                    : `Calling loses about ${money(Math.abs(ev), 2)} on average each time you face this.`}{" "}
                  {s.lesson}
                </p>
              </div>
            )}

            {phase !== "decide" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={thousand}>Call this 1,000 times</Button>
                  <Button variant="ghost" onClick={() => pick(index)}>Play it again</Button>
                  {index < SCENARIOS.length - 1 && (
                    <Button onClick={() => pick(index + 1)}>Next spot →</Button>
                  )}
                </div>
                {batch && (
                  <p className="text-sm leading-relaxed text-cream/80">
                    Won <strong className="text-cream">{batch.wins}</strong>, lost{" "}
                    <strong className="text-cream">{batch.losses}</strong>
                    {batch.ties ? <>, split <strong className="text-cream">{batch.ties}</strong></> : null}.
                    Calling every time:{" "}
                    <strong className={batch.net >= 0 ? "text-[#4bc292]" : "text-ember"}>
                      {batch.net >= 0 ? "+" : "−"}{money(Math.abs(batch.net))}
                    </strong>
                    . Folding every time: $0.
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-cream/15 pt-4">
              <Stat label="Your money" value={money(cash)} tone={cash >= START ? "win" : "ember"} size="sm" />
              <Stat label="To call" value={money(s.toCall)} tone="cream" size="sm" sub={`pot is ${money(s.pot)}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Strongest to weakest, with a real example of each. */
export function HandRankings() {
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {RANKING_EXAMPLES.map((r, i) => (
        <li key={r.name} className="brut-flat flex flex-col gap-2 bg-cream p-4">
          <div className="flex items-baseline gap-2">
            <span className="tnum font-mono text-sm font-bold opacity-40">{i + 1}</span>
            <h3 className="font-bold">{r.name}</h3>
          </div>
          <div className="flex gap-1">
            {parseHand(r.cards).map((c, j) => (
              <PlayingCard key={c.id} card={c} width={36} index={j} interactive={false} />
            ))}
          </div>
          <p className="text-xs opacity-65">{r.note}</p>
        </li>
      ))}
    </ol>
  );
}
