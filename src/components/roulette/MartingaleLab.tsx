"use client";

import * as React from "react";
import {
  DEFAULT_CONFIG,
  runSession,
  type SessionConfig,
  type SessionOutcome,
} from "@/lib/sim/engine";
import { useMonteCarlo } from "@/lib/sim/useMonteCarlo";
import { STRATEGIES, STRATEGY_LIST, type StrategyId } from "@/lib/strategies";
import { BET_TYPES, edgeFor, type Variant } from "@/lib/games/roulette";
import { analyzeMartingale, money, oneIn, pct } from "@/lib/stats";
import { randomSeed } from "@/lib/rng";
import {
  Badge,
  Button,
  Segmented,
  Slider,
  Stat,
  cx,
} from "@/components/ui";
import { BankrollChart, MiniHistogram, ProfitHistogram } from "@/components/viz/charts";

const OUTCOME_COPY: Record<SessionOutcome, { label: string; tone: "ember" | "mint" | "amber" }> = {
  bust: { label: "Broke", tone: "ember" },
  target: { label: "Hit the target and walked", tone: "mint" },
  limit: { label: "Ran out of spins", tone: "amber" },
  capped: { label: "Stopped by the table limit", tone: "ember" },
};

const TRIAL_OPTIONS = [1_000, 10_000, 100_000];
// Six systems in one pass. Measured on the default config: 6x10k runs in
// ~0.4s, 6x50k in ~2s, 6x200k in ~8s. The tiers matter for more than
// speed — at low trial counts the sampling error on the realised edge is
// wide enough (~2pp at 500/system) to look like a real difference between
// systems, which would undercut the entire point of the comparison.
const RACE_TRIALS = [10_000, 50_000, 200_000];
const ALL_IDS = STRATEGY_LIST.map((s) => s.id);

export function MartingaleLab() {
  const [config, setConfig] = React.useState<SessionConfig>({
    ...DEFAULT_CONFIG,
    seed: "oak-vivid-3817",
  });
  const [session, setSession] = React.useState<ReturnType<typeof runSession> | null>(null);
  const [step, setStep] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [trials, setTrials] = React.useState(10_000);
  const [raceAll, setRaceAll] = React.useState(true);

  const mc = useMonteCarlo();

  // Racing six systems costs six times the work, so the ceiling drops.
  const trialOptions = raceAll ? RACE_TRIALS : TRIAL_OPTIONS;

  // Clamped here rather than in an effect: the trial count is only ever
  // out of range as a consequence of THIS click.
  const setMode = (all: boolean) => {
    setRaceAll(all);
    const opts = all ? RACE_TRIALS : TRIAL_OPTIONS;
    if (!opts.includes(trials)) setTrials(opts[1]);
  };

  const race = mc.results && mc.results.length > 1 ? mc.results : null;
  const isRace = race !== null;

  /**
   * Small multiples only compare honestly on shared axes, so the domain
   * and the tallest bar are computed across ALL panels, not per panel.
   */
  const raceDomain = React.useMemo<[number, number]>(() => {
    if (!race) return [0, 1];
    return [
      Math.min(...race.map((r) => r.result.worstProfit)),
      Math.max(...race.map((r) => r.result.bestProfit)),
    ];
  }, [race]);

  const raceMaxCount = React.useMemo(() => {
    if (!race) return 1;
    return Math.max(
      1,
      ...race.flatMap((r) => r.result.histogram.map((h) => h.count)),
    );
  }, [race]);

  const raceSpread = React.useMemo(() => {
    if (!race) {
      return { minAhead: 0, maxAhead: 0, minEdge: 0, maxEdge: 0, bestWorst: 0, worstWorst: 0 };
    }
    const ahead = race.map((r) => r.result.pAhead);
    const edges = race.map((r) => r.result.realizedEdge);
    const worst = race.map((r) => r.result.worstProfit);
    return {
      minAhead: Math.min(...ahead),
      maxAhead: Math.max(...ahead),
      minEdge: Math.min(...edges),
      maxEdge: Math.max(...edges),
      bestWorst: Math.max(...worst),
      worstWorst: Math.min(...worst),
    };
  }, [race]);

  const set = <K extends keyof SessionConfig>(k: K, v: SessionConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const bet = BET_TYPES.find((b) => b.id === config.betId)!;
  const edge = edgeFor(bet, config.variant, config.rules);
  const analysis = analyzeMartingale(
    config.bankroll / config.baseUnit,
    edge.pWin,
    config.tableMax / config.baseUnit,
  );

  const play = () => {
    const r = runSession(config, true);
    setSession(r);
    setStep(0);
    setPlaying(true);
  };

  const trace = session?.trace ?? [];
  // `playing` is intent; whether we're actually still moving is derived.
  // Deriving it means the effect never has to setState to stop itself,
  // which would otherwise cascade an extra render on the final frame.
  const atEnd = session !== null && step >= trace.length;
  const isPlaying = playing && !atEnd;

  // Walk the trace so the session feels lived rather than computed.
  React.useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setStep((s) => s + 1), step < 60 ? 55 : 14);
    return () => clearTimeout(t);
  }, [isPlaying, step]);

  const shown = trace.slice(0, Math.max(1, step));
  const points = shown.length ? shown.map((b) => b.bankroll) : [config.bankroll];
  const current = shown[shown.length - 1];
  const liveBankroll = current?.bankroll ?? config.bankroll;
  const done = atEnd;

  const strategy = STRATEGIES[config.strategy];

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------- controls ------------------- */}
      <div className="felt-panel p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="violet" className="mb-3">
              The simulator
            </Badge>
            <h3 className="text-h4 font-bold text-cream">
              Pick a system. Watch it work. Then watch it 100,000 times.
            </h3>
          </div>
          <button
            onClick={() => set("seed", randomSeed())}
            className="rounded-[50px] border-2 border-cream/25 px-3 py-1.5 font-mono text-xs text-cream/70 hover:border-cream/60 hover:text-cream"
            title="Every run is reproducible from its seed"
          >
            seed: {config.seed} ↻
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-bold tracking-[0.08em] text-cream/60 uppercase">
              System
            </span>
            <select
              value={config.strategy}
              onChange={(e) => set("strategy", e.target.value as StrategyId)}
              className="w-full rounded-[12px] border-2 border-ink bg-felt-deep px-3 py-2.5 text-sm font-bold text-cream"
            >
              {STRATEGY_LIST.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.tagline}
                </option>
              ))}
            </select>
            <span
              className={cx(
                "mt-1 text-xs font-bold tracking-wide uppercase",
                strategy.risk === "extreme"
                  ? "text-ember"
                  : strategy.risk === "medium"
                    ? "text-amber"
                    : "text-cream/50",
              )}
            >
              {strategy.risk} risk of ruin
            </span>
          </div>

          <Segmented
            dark
            label="Wheel"
            value={config.variant}
            onChange={(v: Variant) => set("variant", v)}
            options={[
              { value: "american", label: "American" },
              { value: "european", label: "European" },
            ]}
          />

          <Slider
            dark
            label="Bankroll"
            value={config.bankroll}
            onChange={(v) => set("bankroll", v)}
            min={100}
            max={20000}
            step={100}
            format={money}
          />
          <Slider
            dark
            label="Base unit"
            value={config.baseUnit}
            onChange={(v) => set("baseUnit", Math.min(v, config.tableMax))}
            min={1}
            max={100}
            step={1}
            format={money}
          />
          <Slider
            dark
            label="Table maximum"
            value={config.tableMax}
            onChange={(v) => set("tableMax", v)}
            min={50}
            max={10000}
            step={50}
            format={money}
            hint="The casino's real defence against Martingale"
          />
          <Slider
            dark
            label="Walk away at +"
            value={config.targetProfit}
            onChange={(v) => set("targetProfit", v)}
            min={0}
            max={2000}
            step={25}
            format={(v) => (v === 0 ? "never" : money(v))}
          />
          <Slider
            dark
            label="Max bets"
            value={config.maxBets}
            onChange={(v) => set("maxBets", v)}
            min={25}
            max={2000}
            step={25}
            format={(v) => v.toLocaleString()}
          />
        </div>

        {/* exact analysis, before a single spin */}
        <div className="mt-6 grid gap-4 rounded-[14px] border-2 border-ink bg-felt-deep p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Doublings you can survive"
            value={analysis.doublings}
            tone="cream"
            size="sm"
            sub={`needs ${money(analysis.maxExposure * config.baseUnit)} to see through`}
          />
          <Stat
            label="Sessions that grind out +1"
            value={pct(analysis.pGrind, 2)}
            tone="win"
            size="sm"
            sub="the feeling of a working system"
          />
          <Stat
            label="Sessions that wipe out"
            value={oneIn(analysis.pCatastrophe)}
            tone="ember"
            size="sm"
            sub={pct(analysis.pCatastrophe, 3)}
          />
          <Stat
            label="EV per sequence"
            value={money(analysis.evPerSequence * config.baseUnit, 2)}
            tone="ember"
            size="sm"
            sub="the grind never covers it"
          />
        </div>
      </div>

      {/* ------------------- one session ------------------- */}
      <div className="brut p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge tone="thistle" className="mb-2">
              Step 1 — play it yourself
            </Badge>
            <h3 className="text-h4 font-bold">One night at the table</h3>
          </div>
          <div className="flex gap-3">
            <Button onClick={play} disabled={isPlaying}>
              {isPlaying ? "Playing…" : session ? "Play again" : "Play a session"}
            </Button>
            {isPlaying && (
              <Button variant="secondary" onClick={() => { setPlaying(false); setStep(trace.length); }}>
                Skip to end
              </Button>
            )}
          </div>
        </div>

        {session ? (
          <>
            <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Bankroll"
                value={money(liveBankroll)}
                size="lg"
                tone={liveBankroll >= config.bankroll ? "win" : "ember"}
              />
              <Stat
                label="Next bet would be"
                value={money(current?.stake ?? config.baseUnit)}
                size="sm"
                tone={current?.clamped ? "ember" : "ink"}
                sub={current?.clamped ? "clamped by the table max" : undefined}
              />
              <Stat
                label="Loss streak"
                value={current?.lossStreak ?? 0}
                size="sm"
                sub={`longest this session: ${session.longestLossStreak}`}
              />
              <Stat
                label="Total wagered"
                value={money(shown.reduce((a, b) => a + b.stake, 0))}
                size="sm"
                sub="what the edge actually taxes"
              />
            </div>

            <BankrollChart
              points={points}
              start={config.bankroll}
              title={`Session · ${strategy.name} · ${bet.label}`}
              caption={
                <>
                  The line above the dashes is profit; below is the hole.
                  Martingale sessions spend almost all of their time barely
                  above the line, which is exactly why they feel safe.
                </>
              }
            />

            {done && (
              <div
                className={cx(
                  "brut-flat mt-6 flex flex-wrap items-center justify-between gap-4 p-5",
                  session.outcome === "bust" || session.outcome === "capped"
                    ? "bg-ember/12"
                    : "bg-mint",
                )}
              >
                <div>
                  <Badge tone={OUTCOME_COPY[session.outcome].tone} className="mb-2">
                    {OUTCOME_COPY[session.outcome].label}
                  </Badge>
                  <p className="text-sm leading-relaxed">
                    {session.bets.toLocaleString()} bets · wagered{" "}
                    <strong className="tnum">{money(session.handle)}</strong> ·
                    biggest single bet{" "}
                    <strong className="tnum">{money(session.maxStake)}</strong>
                    {session.timesClamped &&
                      " · the table limit stopped the progression at least once"}
                  </p>
                </div>
                <Stat
                  label="Net"
                  value={`${session.profit >= 0 ? "+" : "−"}${money(Math.abs(session.profit))}`}
                  tone={session.profit >= 0 ? "win" : "ember"}
                  size="md"
                  className="text-right"
                />
              </div>
            )}
          </>
        ) : (
          <p className="py-12 text-center text-sm opacity-55">
            Press play. It will probably go well. That is the problem.
          </p>
        )}
      </div>

      {/* ------------------- monte carlo ------------------- */}
      <div className="brut p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="ember" className="mb-2">
              Step 2 — now do it tens of thousands of times
            </Badge>
            <h3 className="text-h4 max-w-xl font-bold text-balance">
              One session is an anecdote. This is the distribution the anecdote
              came from.
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={String(trials)}
              onChange={(v) => setTrials(Number(v))}
              options={trialOptions.map((t) => ({
                value: String(t),
                label: t.toLocaleString(),
              }))}
            />
            <Button
              variant="danger"
              onClick={() =>
                mc.run(config, trials, raceAll ? ALL_IDS : undefined)
              }
              disabled={mc.running}
            >
              {mc.running ? `${Math.round(mc.progress * 100)}%` : "Run"}
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Segmented
            label="What to simulate"
            value={raceAll ? "all" : "one"}
            onChange={(v) => setMode(v === "all")}
            options={[
              { value: "all", label: "All six systems" },
              { value: "one", label: `Just ${strategy.name}` },
            ]}
          />
          <span className="text-xs leading-snug opacity-55">
            {raceAll
              ? `${STRATEGY_LIST.length} × ${trials.toLocaleString()} = ${(STRATEGY_LIST.length * trials).toLocaleString()} sessions, same bankroll, same table limit, same seed.`
              : "One system at a time, if you want to study its shape on its own."}
          </span>
        </div>

        {mc.running && (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-gainsboro">
              <div
                className="h-full bg-violet transition-[width] duration-150"
                style={{ width: `${mc.progress * 100}%` }}
              />
            </div>
            {mc.label && (
              <p className="mt-2 text-xs opacity-55">Simulating {mc.label}…</p>
            )}
          </>
        )}

        {mc.error && (
          <p className="brut-flat bg-ember/15 p-4 text-sm">{mc.error}</p>
        )}

        {/* ---- the race ---- */}
        {isRace && !mc.running && (
          <>
            <div className="brut-flat mb-7 overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <caption className="sr-only">
                  Every betting system compared on identical settings
                </caption>
                <thead>
                  <tr className="border-b-2 border-ink text-left">
                    <th className="p-3 font-bold">System</th>
                    <th className="p-3 font-bold">Shape of {trials.toLocaleString()} sessions</th>
                    <th className="p-3 text-right font-bold">Finished ahead</th>
                    <th className="p-3 text-right font-bold">Went broke</th>
                    <th className="p-3 text-right font-bold">Worst</th>
                    <th className="p-3 text-right font-bold">Realised edge</th>
                  </tr>
                </thead>
                <tbody>
                  {race.map(({ strategy: id, result }) => {
                    const s = STRATEGIES[id];
                    return (
                      <tr
                        key={id}
                        className={cx(
                          "border-b border-ink/15 align-middle last:border-0",
                          id === config.strategy && "bg-thistle/35",
                        )}
                      >
                        <td className="p-3">
                          <span className="block font-bold">{s.name}</span>
                          <span className="text-xs opacity-55">{s.tagline}</span>
                        </td>
                        <td className="w-[15rem] p-3">
                          <MiniHistogram
                            bins={result.histogram}
                            domain={raceDomain}
                            maxCount={raceMaxCount}
                          />
                        </td>
                        <td className="tnum p-3 text-right font-mono">
                          {pct(result.pAhead, 1)}
                        </td>
                        <td className="tnum p-3 text-right font-mono text-ember">
                          {pct(result.pBust, 1)}
                        </td>
                        <td className="tnum p-3 text-right font-mono text-ember">
                          {money(result.worstProfit)}
                        </td>
                        <td className="tnum p-3 text-right font-mono font-bold text-ember">
                          {pct(result.realizedEdge, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="border-t-2 border-ink px-3 py-2.5 text-xs opacity-60">
                All six panels share one profit axis, running{" "}
                <strong className="tnum">{money(raceDomain[0])}</strong> to{" "}
                <strong className="tnum">{money(raceDomain[1])}</strong>, one
                set of bin edges, and one height scale — so the silhouettes are
                directly comparable. The dashed line is break-even.
              </p>
            </div>

            <div className="brut-flat bg-thistle p-6">
              <Badge tone="ink" className="mb-3">
                Read the last column
              </Badge>
              <p className="leading-relaxed">
                Look across the row of silhouettes first: a wall on the right,
                a long left tail, a lump in the middle. Six genuinely different
                experiences — win rates from{" "}
                <strong className="tnum">{pct(raceSpread.minAhead, 0)}</strong>{" "}
                to <strong className="tnum">{pct(raceSpread.maxAhead, 0)}</strong>
                , worst sessions from{" "}
                <strong className="tnum">{money(raceSpread.bestWorst)}</strong>{" "}
                to <strong className="tnum">{money(raceSpread.worstWorst)}</strong>.
              </p>
              <p className="mt-3 leading-relaxed">
                Now read the last column. Every system realises the same{" "}
                <strong className="tnum">
                  {pct(raceSpread.minEdge, 2)}–{pct(raceSpread.maxEdge, 2)}
                </strong>{" "}
                against a theoretical{" "}
                <strong className="tnum">{pct(edge.houseEdge, 2)}</strong>. The
                progressions moved the bars around. The mean stayed exactly
                where the wheel put it.
              </p>
              <p className="mt-3 text-sm leading-relaxed opacity-75">
                That last column still has{" "}
                <strong className="tnum">
                  {((raceSpread.maxEdge - raceSpread.minEdge) * 100).toFixed(2)}
                  pp
                </strong>{" "}
                of spread in it, and it would be fair to ask whether the lowest
                one is genuinely winning. It is sampling error, and it collapses
                like √n — quadruple the trials and it roughly halves. Push the
                count to {RACE_TRIALS[2].toLocaleString()} and the six systems
                agree to within about a tenth of a point.
              </p>
            </div>
          </>
        )}

        {/* ---- a single system ---- */}
        {!isRace && mc.result && !mc.running && (
          <>
            <div className="mb-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Sessions that finished ahead"
                value={pct(mc.result.pAhead, 1)}
                tone={mc.result.pAhead > 0.5 ? "win" : "ember"}
                sub="and this is the number systems are sold on"
              />
              <Stat
                label="Sessions that went broke"
                value={pct(mc.result.pBust, 1)}
                tone="ember"
                sub={`${mc.result.outcomes.bust.toLocaleString()} of ${mc.result.trials.toLocaleString()}`}
              />
              <Stat
                label="Average result"
                value={money(mc.result.meanProfit, 2)}
                tone="ember"
                sub={`median ${money(mc.result.medianProfit)}`}
              />
              <Stat
                label="Realised house edge"
                value={pct(mc.result.realizedEdge, 3)}
                tone="ember"
                sub={`theory says ${pct(edge.houseEdge, 3)}`}
              />
            </div>

            <ProfitHistogram
              bins={mc.result.histogram}
              trials={mc.result.trials}
              title={`${mc.result.trials.toLocaleString()} sessions · ${strategy.name}`}
              caption={
                <>
                  Mean loss divided by mean amount wagered comes to{" "}
                  <strong>{pct(mc.result.realizedEdge, 3)}</strong> — against a
                  theoretical <strong>{pct(edge.houseEdge, 3)}</strong>. The
                  system rearranged the bars. It did not move the mean.
                </>
              }
            />

            <div className="brut-flat mt-6 bg-cream p-5">
              <h4 className="mb-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
                What the tails look like
              </h4>
              <div className="grid gap-5 sm:grid-cols-4">
                <Stat label="Worst session" value={money(mc.result.worstProfit)} tone="ember" size="sm" />
                <Stat label="5th percentile" value={money(mc.result.percentiles.p5)} tone="ember" size="sm" />
                <Stat label="95th percentile" value={money(mc.result.percentiles.p95)} size="sm" />
                <Stat label="Best session" value={money(mc.result.bestProfit)} tone="win" size="sm" />
              </div>
            </div>
          </>
        )}

        {!mc.results && !mc.running && (
          <p className="py-10 text-center text-sm opacity-55">
            Nothing simulated yet.{" "}
            {raceAll
              ? `All six systems over ${trials.toLocaleString()} sessions each`
              : `${trials.toLocaleString()} sessions`}{" "}
            takes a second or two, off the main thread.
          </p>
        )}
      </div>

      {/* ------------------- the verdict ------------------- */}
      <div className="brut bg-thistle p-6 md:p-8">
        <Badge tone="ink" className="mb-4">
          {strategy.name}
        </Badge>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">
              What it promises
            </h4>
            <p className="leading-relaxed">{strategy.promise}</p>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">
              What it does
            </h4>
            <p className="leading-relaxed">{strategy.reality}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
