"use client";

import * as React from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { finishForCount, hiLoValue } from "@/lib/cards";
import {
  DEFAULT_COUNT_CONFIG,
  PENETRATION_PRESETS,
  dealShoe,
  edgeAtTrueCount,
  roundsPerHour,
  simulateCounting,
  type CountConfig,
  type CountStats,
  type RoundRecord,
} from "@/lib/games/counting";
import { makeRng, randomSeed } from "@/lib/rng";
import { pct } from "@/lib/stats";
import { Badge, Button, Segmented, Slider, Stat, cx } from "@/components/ui";

const SHOES = 300;
const SIM_SEED = "counting-lab";
const UNIT = 25; // dollars, for translating units into money

export function CountingLab() {
  const [config, setConfig] = React.useState<CountConfig>(DEFAULT_COUNT_CONFIG);
  const [shoe, setShoe] = React.useState<RoundRecord[] | null>(null);
  const [step, setStep] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  const set = <K extends keyof CountConfig>(k: K, v: CountConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  /* ---------------- aggregate ---------------- */

  const stats: CountStats = React.useMemo(
    () => simulateCounting(makeRng(SIM_SEED), config, SHOES),
    [config],
  );

  /** Same config, flat bets — the counter's edge is the gap between these. */
  const flatStats: CountStats = React.useMemo(
    () => simulateCounting(makeRng(SIM_SEED), { ...config, spread: 1 }, SHOES),
    [config],
  );

  /* ---------------- live shoe ---------------- */

  const trace = shoe ?? [];
  const atEnd = shoe !== null && step >= trace.length;
  const isPlaying = playing && !atEnd;

  React.useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setStep((s) => s + 1), 260);
    return () => clearTimeout(t);
  }, [isPlaying, step]);

  const deal = () => {
    setShoe(dealShoe(makeRng(randomSeed()), config));
    setStep(0);
    setPlaying(true);
  };

  const current = trace[Math.min(step, trace.length - 1)];
  const spots = config.otherPlayers + 1;

  return (
    <div className="flex flex-col gap-6">
      {/* ------------- controls ------------- */}
      <div className="felt-panel p-6 md:p-8">
        <Badge tone="lagoon" className="mb-5">
          The shoe, not the arithmetic
        </Badge>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Segmented
            dark
            label="Decks"
            value={String(config.decks)}
            onChange={(v) => set("decks", Number(v))}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "6", label: "6" },
              { value: "8", label: "8" },
            ]}
          />
          <Segmented
            dark
            label="Penetration"
            value={String(config.penetration)}
            onChange={(v) => set("penetration", Number(v))}
            options={PENETRATION_PRESETS.map((p) => ({
              value: String(p.value),
              label: p.label,
              hint: p.note,
            }))}
          />
          <Slider
            dark
            label="Other players at the table"
            value={config.otherPlayers}
            onChange={(v) => set("otherPlayers", v)}
            min={0}
            max={6}
            step={1}
            format={(v) => (v === 0 ? "heads-up" : `${v}`)}
            hint={`${spots} spots · about ${roundsPerHour(spots)} rounds an hour`}
          />
          <Slider
            dark
            label="Bet spread"
            value={config.spread}
            onChange={(v) => set("spread", v)}
            min={1}
            max={16}
            step={1}
            format={(v) => (v === 1 ? "flat" : `1–${v}`)}
            hint="Wider earns more and gets you barred sooner"
          />
        </div>
      </div>

      {/* ------------- live shoe ------------- */}
      <div className="felt-panel p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-h4 font-bold text-cream">Deal a shoe</h3>
            <p className="mt-1 text-sm text-cream/60">
              Every card shifts the count. Low cards leaving the shoe are good
              for you; tens and aces leaving are bad.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={deal} disabled={isPlaying}>
              {isPlaying ? "Dealing…" : shoe ? "New shoe" : "Deal"}
            </Button>
            {isPlaying && (
              <Button
                variant="secondary"
                onClick={() => {
                  setPlaying(false);
                  setStep(trace.length);
                }}
              >
                Skip to cut card
              </Button>
            )}
          </div>
        </div>

        {current ? (
          <>
            <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Running count"
                value={current.running > 0 ? `+${current.running}` : current.running}
                tone={current.running > 0 ? "win" : "cream"}
                sub={`round ${Math.min(step + 1, trace.length)} of ${trace.length}`}
              />
              <Stat
                label="Decks remaining"
                value={current.decksRemaining.toFixed(1)}
                tone="cream"
                sub="the divisor that makes it true"
              />
              <Stat
                label="True count"
                value={current.trueCount >= 0 ? `+${current.trueCount.toFixed(1)}` : current.trueCount.toFixed(1)}
                tone={current.trueCount >= 2 ? "win" : current.trueCount <= -1 ? "ember" : "cream"}
                sub="running ÷ decks left"
              />
              <Stat
                label="Your bet"
                value={`${current.bet}×`}
                tone={current.bet > 1 ? "win" : "cream"}
                sub={
                  current.edge > 0
                    ? `you are ahead ${pct(current.edge, 2)}`
                    : `house ahead ${pct(-current.edge, 2)}`
                }
              />
            </div>

            {/* shoe depth */}
            <div className="mb-6">
              <div className="mb-1.5 flex items-center justify-between text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
                <span>Shoe depth</span>
                <span className="tnum">
                  cut card at {pct(config.penetration, 0)}
                </span>
              </div>
              <div className="relative h-5 overflow-hidden rounded-full border-2 border-ink bg-felt-deep">
                <div
                  className="h-full bg-lagoon transition-[width] duration-200"
                  style={{ width: `${current.depth * 100}%` }}
                />
                {/* the cut card: everything past here is never dealt */}
                <div
                  className="absolute inset-y-0 w-[3px] bg-ember"
                  style={{ left: `${config.penetration * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(45deg,rgba(241,246,241,.12),rgba(241,246,241,.12)_4px,transparent_4px,transparent_8px)]"
                  style={{ left: `${config.penetration * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-cream/45">
                The hatched tail is the {pct(1 - config.penetration, 0)} of the
                shoe they never deal. Those cards still count against your
                divisor, and you never get to see them.
              </p>
            </div>

            {/* cards from this round */}
            <div>
              <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
                This round — {current.dealt.length} cards across {spots}{" "}
                {spots === 1 ? "spot" : "spots"} and the dealer
              </span>
              <div className="flex flex-wrap gap-1.5">
                {current.dealt.slice(0, 22).map((c, i) => (
                  <div key={`${c.id}-${i}`} className="flex flex-col items-center gap-1">
                    <PlayingCard
                      card={c}
                      width={44}
                      index={i}
                      interactive={false}
                      finish={finishForCount(c.rank)}
                    />
                    <span
                      className={cx(
                        "tnum font-mono text-[0.65rem] font-bold",
                        hiLoValue(c.rank) > 0
                          ? "text-win"
                          : hiLoValue(c.rank) < 0
                            ? "text-ember"
                            : "text-cream/40",
                      )}
                    >
                      {hiLoValue(c.rank) > 0 ? "+1" : hiLoValue(c.rank) < 0 ? "−1" : "0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-cream/45">
            Deal a shoe and watch the count walk. Most of it is spent near
            zero, which is the part nobody mentions.
          </p>
        )}
      </div>

      {/* ------------- aggregate ------------- */}
      <div className="brut p-6 md:p-8">
        <div className="mb-6">
          <Badge tone="ember" className="mb-2">
            {SHOES} shoes, same settings
          </Badge>
          <h3 className="text-h4 max-w-2xl font-bold text-balance">
            Where the hours actually go
          </h3>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Rounds you have an edge"
            value={pct(stats.pAdvantage, 1)}
            tone={stats.pAdvantage > 0.25 ? "good" : "ember"}
            sub="the rest you play at a loss, on purpose"
          />
          <Stat
            label="Rounds per shoe"
            value={stats.roundsPerShoe.toFixed(1)}
            sub={`${spots} spots · ${pct(config.penetration, 0)} penetration`}
          />
          <Stat
            label="Blended edge"
            value={pct(stats.overallEdge, 3)}
            tone={stats.overallEdge > 0 ? "good" : "ember"}
            sub={`flat betting the same shoe: ${pct(flatStats.overallEdge, 3)}`}
          />
          <Stat
            label="Expected per hour"
            value={`${stats.unitsPerHour >= 0 ? "+" : "−"}$${Math.abs(stats.unitsPerHour * UNIT).toFixed(0)}`}
            tone={stats.unitsPerHour > 0 ? "good" : "ember"}
            sub={`${stats.roundsPerHour} rounds/hr at $${UNIT} units`}
          />
        </div>

        {/* true count distribution */}
        <div className="brut-flat mb-6 bg-cream p-5">
          <h4 className="mb-4 text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
            Where the true count sits when you place a bet
          </h4>
          <ul className="flex flex-col gap-2">
            {stats.distribution.map((d) => {
              const max = Math.max(...stats.distribution.map((x) => x.share));
              const profitable = edgeAtTrueCount(d.tc) > 0;
              return (
                <li
                  key={d.label}
                  className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3"
                >
                  <span className="tnum text-right font-mono text-xs font-bold">
                    {d.label}
                  </span>
                  <span className="relative h-5 overflow-hidden rounded-[4px] bg-ink/8">
                    <span
                      className="absolute inset-y-0 left-0 rounded-[4px]"
                      style={{
                        width: `${max > 0 ? (d.share / max) * 100 : 0}%`,
                        background: profitable ? "#1b7a53" : "#d4420f",
                        opacity: profitable ? 0.9 : 0.55,
                      }}
                    />
                  </span>
                  <span className="tnum text-right font-mono text-xs opacity-70">
                    {pct(d.share, 1)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-relaxed opacity-60">
            Green bars are rounds where you genuinely have the better of it.
            They add up to <strong>{pct(stats.pAdvantage, 1)}</strong> of your
            hands. The other {pct(1 - stats.pAdvantage, 1)} you sit there
            betting one unit into a negative edge, waiting.
          </p>
        </div>

        {/* penetration comparison */}
        <PenetrationTable config={config} />
      </div>
    </div>
  );
}

/**
 * The single most important variable, isolated. Everything else on the
 * page is held fixed while the cut card moves.
 */
function PenetrationTable({ config }: { config: CountConfig }) {
  const rows = React.useMemo(
    () =>
      PENETRATION_PRESETS.map((p) => {
        // Same seed and shoe count as the headline figures above, so the
        // row matching the current setting reads EXACTLY the same number.
        // A different sample here would show +$0 next to a headline of
        // −$6 for identical settings, which just looks broken.
        const s = simulateCounting(
          makeRng(SIM_SEED),
          { ...config, penetration: p.value },
          SHOES,
        );
        return { ...p, stats: s };
      }),
    [config],
  );

  const best = Math.max(...rows.map((r) => r.stats.unitsPerHour));

  return (
    <div className="brut-flat overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">
          Hourly expectation by deck penetration
        </caption>
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="p-3 font-bold">Penetration</th>
            <th className="p-3 font-bold">What it means</th>
            <th className="p-3 text-right font-bold">Rounds / shoe</th>
            <th className="p-3 text-right font-bold">Rounds with an edge</th>
            <th className="p-3 text-right font-bold">Per hour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.label}
              className={cx(
                "border-b border-ink/15 align-top last:border-0",
                r.value === config.penetration && "bg-thistle/35",
              )}
            >
              <td className="tnum p-3 font-mono font-bold">{r.label}</td>
              <td className="p-3 opacity-70">{r.note}</td>
              <td className="tnum p-3 text-right font-mono">
                {r.stats.roundsPerShoe.toFixed(1)}
              </td>
              <td className="tnum p-3 text-right font-mono">
                {pct(r.stats.pAdvantage, 1)}
              </td>
              <td
                className={cx(
                  "tnum p-3 text-right font-mono font-bold",
                  r.stats.unitsPerHour > 0 ? "text-[#1b7a53]" : "text-ember",
                )}
              >
                {r.stats.unitsPerHour >= 0 ? "+" : "−"}$
                {Math.abs(r.stats.unitsPerHour * UNIT).toFixed(0)}
                {r.stats.unitsPerHour === best && r.stats.unitsPerHour > 0 && " ★"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t-2 border-ink p-3 text-xs leading-relaxed opacity-65">
        Same decks, same players, same spread — only the cut card moves. A
        shallow shoe does not reduce a counter&apos;s edge so much as remove
        the opportunities to use it, and it is the cheapest countermeasure the
        house has. Moving the cut card costs them nothing.
      </p>
    </div>
  );
}
