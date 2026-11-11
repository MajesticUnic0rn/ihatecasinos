"use client";

import * as React from "react";
import { modelHandle, money, pct, probAheadAfter, betStdDev } from "@/lib/stats";
import { Slider, Stat, Segmented, Badge } from "@/components/ui";
import { ProbAheadCurve } from "@/components/viz/charts";

const EDGES = [
  { value: "0.0270", label: "Euro roulette" },
  { value: "0.0526", label: "US roulette" },
  { value: "0.0050", label: "Blackjack" },
];

export function TimeOnDevice() {
  const [bankroll, setBankroll] = React.useState(500);
  const [avgBet, setAvgBet] = React.useState(10);
  const [betsPerHour, setBetsPerHour] = React.useState(50);
  const [hours, setHours] = React.useState(4);
  const [edgeStr, setEdgeStr] = React.useState("0.0526");

  const edge = Number(edgeStr);
  const m = modelHandle(bankroll, avgBet, betsPerHour, hours, edge);
  const sigma = betStdDev(18 / 38, 1);

  const series = React.useMemo(() => {
    const pts: { n: number; p: number }[] = [];
    for (let e = 0; e <= 5; e += 0.08) {
      const n = Math.round(Math.pow(10, e));
      pts.push({ n, p: probAheadAfter(n, edge, sigma) });
    }
    return pts;
  }, [edge, sigma]);

  const sessionBets = Math.round(betsPerHour * hours);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="brut p-6 md:p-8">
        <Badge tone="violet" className="mb-4">
          Handle, not bankroll
        </Badge>
        <div className="flex flex-col gap-5">
          <Segmented
            label="Game"
            value={edgeStr}
            onChange={setEdgeStr}
            options={EDGES}
          />
          <Slider label="Money you walked in with" value={bankroll} onChange={setBankroll} min={100} max={5000} step={50} format={money} />
          <Slider label="Average bet" value={avgBet} onChange={setAvgBet} min={1} max={200} step={1} format={money} />
          <Slider label="Bets per hour" value={betsPerHour} onChange={setBetsPerHour} min={20} max={120} step={5} hint="Roulette runs ~40–60. Online slots run ~600." />
          <Slider label="Hours played" value={hours} onChange={setHours} min={1} max={12} step={1} format={(v) => `${v}h`} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-5 border-t-2 border-ink pt-6">
          <Stat
            label="Total wagered"
            value={money(m.handle)}
            sub={`${sessionBets.toLocaleString()} bets · ${(m.handle / bankroll).toFixed(1)}× your bankroll`}
          />
          <Stat
            label="Expected loss"
            value={money(m.expectedLoss)}
            tone="ember"
            sub={`${pct(m.bankrollBurn, 0)} of what you brought`}
          />
        </div>
      </div>

      <div className="brut p-6 md:p-8">
        <ProbAheadCurve
          series={series}
          markers={[
            { n: sessionBets, label: "your session" },
            { n: 10000, label: "a year of weekends" },
          ]}
          title="Probability you are still ahead"
          caption={
            <>
              Variance is the only thing that ever puts you in front, and it
              scales with <strong>√n</strong> while the edge scales with{" "}
              <strong>n</strong>. Luck grows slower than the tax. Past a few
              thousand bets the curve is pinned to the floor and stays there.
            </>
          }
        />
        <div className="brut-flat mt-6 bg-amber p-5 text-sm leading-relaxed">
          <strong>The correction most people need:</strong> a {pct(edge)} edge
          does not mean you lose {pct(edge)} of your money. It means the house
          takes {pct(edge)} of <em>everything you wager</em> — and at{" "}
          {betsPerHour} bets an hour, the same chips cross the felt{" "}
          {(m.handle / bankroll).toFixed(1)} times over. That is how a{" "}
          {pct(edge)} tax eats {pct(m.bankrollBurn, 0)} of a bankroll in{" "}
          {hours} hours.
        </div>
      </div>
    </div>
  );
}
