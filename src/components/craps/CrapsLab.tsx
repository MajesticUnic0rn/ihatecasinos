"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  MAX_ODDS_345,
  ODDS_PAYOUT,
  POINTS,
  WAYS,
  pMakePoint,
  probOf,
  trueOdds,
  type Point,
} from "@/lib/games/craps";
import { money, pct } from "@/lib/stats";
import { Badge, Button, Slider, Stat, cx } from "@/components/ui";
import { DistributionChart } from "@/components/viz/charts";

const DiceTray = dynamic(() => import("@/components/three/DiceTray"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-felt-deep">
      <span className="text-xs tracking-[0.1em] text-cream/40 uppercase">
        Loading dice…
      </span>
    </div>
  ),
});

const FLAT = 10;
const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function CrapsLab() {
  const [rollId, setRollId] = React.useState(0);
  const [dice, setDice] = React.useState<[number, number] | null>(null);
  const [rolling, setRolling] = React.useState(false);
  const [point, setPoint] = React.useState<Point | null>(null);
  const [oddsMultiple, setOddsMultiple] = React.useState(3);
  const [bankroll, setBankroll] = React.useState(1000);
  const [counts, setCounts] = React.useState<Record<number, number>>({});
  const [log, setLog] = React.useState<string[]>([]);
  const [wins, setWins] = React.useState(0);
  const [decided, setDecided] = React.useState(0);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setRollId((r) => r + 1);
  };

  // Reads `point` and `oddsMultiple` straight from render scope rather
  // than mirroring them into refs. The tray calls this from inside a
  // frame closure that is rebuilt every render, so it always sees the
  // current values and the identity churn costs nothing.
  const onResult = (a: number, b: number) => {
    const total = a + b;
    setDice([a, b]);
    setRolling(false);
    setCounts((c) => ({ ...c, [total]: (c[total] ?? 0) + 1 }));

    const p = point;
    const say = (s: string) => setLog((l) => [s, ...l].slice(0, 8));

    if (p === null) {
      // come-out roll
      if (total === 7 || total === 11) {
        setBankroll((b) => b + FLAT);
        setWins((w) => w + 1);
        setDecided((d) => d + 1);
        say(`${total} — natural. Pass line wins ${money(FLAT)}.`);
      } else if (total === 2 || total === 3 || total === 12) {
        setBankroll((b) => b - FLAT);
        setDecided((d) => d + 1);
        say(`${total} — craps. Pass line loses ${money(FLAT)}.`);
      } else {
        setPoint(total as Point);
        say(`${total} is the point. Odds are now available behind the line.`);
      }
      return;
    }

    // point is established
    const mult = Math.min(oddsMultiple, MAX_ODDS_345[p]);
    const oddsStake = FLAT * mult;

    if (total === p) {
      const [num, den] = ODDS_PAYOUT[p];
      const oddsWin = (oddsStake * num) / den;
      setBankroll((b) => b + FLAT + oddsWin);
      setWins((w) => w + 1);
      setDecided((d) => d + 1);
      setPoint(null);
      say(
        `${total} — point made. Flat pays ${money(FLAT)}, odds pay ${money(oddsWin)} at true ${num}:${den}.`,
      );
    } else if (total === 7) {
      setBankroll((b) => b - FLAT - oddsStake);
      setDecided((d) => d + 1);
      setPoint(null);
      say(`Seven out. Lost ${money(FLAT + oddsStake)}.`);
    } else {
      say(`${total} — no decision. Roll again.`);
    }
  };

  const totalRolls = Object.values(counts).reduce((a, b) => a + b, 0);
  const bins = TOTALS.map((t) => ({
    label: String(t),
    observed: counts[t] ?? 0,
    expected: probOf(t),
  }));

  const effectiveMult = point ? Math.min(oddsMultiple, MAX_ODDS_345[point]) : oddsMultiple;

  return (
    <div className="felt-panel overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* ---- tray ---- */}
        <div className="relative min-h-[380px] border-b-2 border-ink lg:border-r-2 lg:border-b-0">
          <DiceTray
            rollId={rollId}
            onResult={onResult}
            className="h-[380px] w-full lg:h-full lg:min-h-[540px]"
          />

          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            {dice && (
              <span className="grid h-12 min-w-12 place-items-center rounded-[12px] border-2 border-ink bg-cream px-3 text-xl font-bold text-ink shadow-[3px_3px_0_0_rgba(0,0,0,.5)]">
                {dice[0] + dice[1]}
              </span>
            )}
            {dice && (
              <Badge tone="paper">
                {dice[0]} + {dice[1]}
              </Badge>
            )}
            {point ? (
              <Badge tone="amber">Point is {point}</Badge>
            ) : (
              <Badge tone="violet">Come-out roll</Badge>
            )}
          </div>

          {log.length > 0 && (
            <div className="absolute right-0 bottom-0 left-0 max-h-32 overflow-hidden border-t-2 border-ink bg-felt-deep/88 px-4 py-2.5 backdrop-blur">
              {log.slice(0, 3).map((l, i) => (
                <p
                  key={i}
                  className="truncate text-xs text-cream/75"
                  style={{ opacity: 1 - i * 0.3 }}
                >
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ---- controls ---- */}
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div>
            <Badge tone="violet" className="mb-3">
              Pass line · {money(FLAT)} flat
            </Badge>
            <h3 className="text-h4 font-bold text-cream">
              {point
                ? `Make ${point} before a 7`
                : "Roll a 7 or 11 to win, 2/3/12 to lose"}
            </h3>
            {point && (
              <p className="mt-2 text-sm text-cream/60">
                {WAYS[point]} ways to make it, {WAYS[7]} ways to seven out —{" "}
                {pct(pMakePoint(point), 1)}. True odds {trueOdds(point)[0]}:
                {trueOdds(point)[1]}.
              </p>
            )}
          </div>

          <Slider
            dark
            label="Free odds behind the line"
            value={oddsMultiple}
            onChange={setOddsMultiple}
            min={0}
            max={5}
            step={1}
            format={(v) => (v === 0 ? "none" : `${v}×`)}
            hint={
              point
                ? `3-4-5× caps the ${point} at ${MAX_ODDS_345[point]}× — currently ${effectiveMult}× = ${money(FLAT * effectiveMult)}`
                : "Paid at exact true odds. The only bet in the building with zero house edge."
            }
          />

          <div className="rounded-[14px] border-2 border-ink bg-felt-deep p-4">
            <h4 className="mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              The odds bet, priced honestly
            </h4>
            <dl className="flex flex-col gap-1.5 font-mono text-[0.8rem] text-cream/85">
              {POINTS.map((p) => (
                <div
                  key={p}
                  className={cx(
                    "flex items-baseline justify-between gap-3 rounded px-1",
                    point === p && "bg-amber/20 text-amber",
                  )}
                >
                  <dt className="text-cream/55">Point {p}</dt>
                  <dd className="tnum">
                    {pct(pMakePoint(p), 1)} · pays {ODDS_PAYOUT[p][0]}:
                    {ODDS_PAYOUT[p][1]} · max {MAX_ODDS_345[p]}×
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-cream/55">
              Every line here pays exactly what the probability says it should.
              That is what &ldquo;zero house edge&rdquo; means, and it is the
              only place in the casino you will find it.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Stat label="Bankroll" value={money(bankroll)} tone={bankroll >= 1000 ? "win" : "ember"} size="sm" />
            <Stat
              label="Decisions won"
              value={decided > 0 ? pct(wins / decided, 0) : "—"}
              tone="cream"
              size="sm"
              sub={`${wins}/${decided} · theory 49.3%`}
            />
            <Stat label="Rolls" value={totalRolls} tone="cream" size="sm" />
          </div>

          <div className="mt-auto">
            <Button onClick={roll} disabled={rolling} className="w-full">
              {rolling ? "Rolling…" : point ? `Roll — chasing ${point}` : "Come out"}
            </Button>
          </div>
        </div>
      </div>

      {/* ---- distribution ---- */}
      <div className="border-t-2 border-ink bg-felt p-6 md:p-8">
        <DistributionChart
          dark
          bins={bins}
          total={totalRolls}
          title={`Totals rolled — ${totalRolls} ${totalRolls === 1 ? "roll" : "rolls"} so far`}
          caption={
            <>
              Grey ticks are the exact probabilities from the 36-outcome table;
              blue bars are what the physics engine actually produced. Early on
              they disagree wildly — that disagreement is variance, and it is
              the only thing that ever makes anyone money here. Keep rolling and
              watch it get squeezed out.
            </>
          }
        />
      </div>
    </div>
  );
}
