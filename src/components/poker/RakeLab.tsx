"use client";

import * as React from "react";
import {
  DEFAULT_RAKE,
  WIN_RATES,
  modelRake,
  type RakeConfig,
} from "@/lib/games/poker";
import { money, pct } from "@/lib/stats";
import { Badge, Segmented, Slider, Stat, cx } from "@/components/ui";

const PRESETS: Record<string, Partial<RakeConfig> & { label: string }> = {
  live12: { label: "Live $1/$2", bigBlind: 2, avgPot: 40, rakePct: 0.05, cap: 5, toke: 1, handsPerHour: 30, players: 9 },
  live25: { label: "Live $2/$5", bigBlind: 5, avgPot: 110, rakePct: 0.05, cap: 7, toke: 1, handsPerHour: 30, players: 9 },
  online: { label: "Online 6-max $0.25/$0.50", bigBlind: 0.5, avgPot: 11, rakePct: 0.05, cap: 1.5, toke: 0, handsPerHour: 75, players: 6 },
};

export function RakeLab() {
  const [preset, setPreset] = React.useState("live12");
  const [config, setConfig] = React.useState<RakeConfig>(DEFAULT_RAKE);

  const applyPreset = (key: string) => {
    setPreset(key);
    setConfig((c) => ({ ...c, ...PRESETS[key] }));
  };

  const set = <K extends keyof RakeConfig>(k: K, v: RakeConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const m = modelRake(config);

  // What a given pre-rake win rate becomes after the rake comes out.
  const after = WIN_RATES.map((w) => ({
    ...w,
    net: w.bb100 - m.bbPer100,
  }));
  const maxAbs = Math.max(...after.flatMap((a) => [Math.abs(a.bb100), Math.abs(a.net)]), 1);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="felt-panel p-6 md:p-8">
        <Badge tone="violet" className="mb-5">
          The rake calculator
        </Badge>

        <div className="mb-6">
          <Segmented
            dark
            label="Game"
            value={preset}
            onChange={applyPreset}
            options={Object.entries(PRESETS).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        </div>

        <div className="flex flex-col gap-5">
          <Slider dark label="Average pot" value={config.avgPot} onChange={(v) => set("avgPot", v)} min={5} max={300} step={5} format={money} />
          <Slider dark label="Rake percentage" value={config.rakePct * 100} onChange={(v) => set("rakePct", v / 100)} min={0} max={10} step={0.5} format={(v) => `${v}%`} />
          <Slider dark label="Rake cap" value={config.cap} onChange={(v) => set("cap", v)} min={1} max={15} step={0.5} format={money} />
          <Slider dark label="Dealer toke per pot" value={config.toke} onChange={(v) => set("toke", v)} min={0} max={5} step={0.5} format={money} hint="Not rake, but it leaves the table just the same" />
          <Slider dark label="Hands per hour" value={config.handsPerHour} onChange={(v) => set("handsPerHour", v)} min={20} max={120} step={5} />
          <Slider dark label="Players at the table" value={config.players} onChange={(v) => set("players", v)} min={2} max={9} step={1} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-5 border-t-2 border-cream/20 pt-6">
          <Stat
            label="Taken per raked pot"
            value={money(m.rakePerPot, 2)}
            tone="ember"
            size="sm"
            sub={m.cappedShare ? "capped — big pots are cheap" : `${pct(config.rakePct, 1)} of the pot`}
          />
          <Stat
            label="Off the table per hour"
            value={money(m.tableLossPerHour)}
            tone="ember"
            size="sm"
            sub={`${Math.round(m.rakedHandsPerHour)} raked hands`}
          />
          <Stat
            label="Your share per hour"
            value={money(m.yourLossPerHour, 2)}
            tone="ember"
            size="sm"
          />
          <Stat
            label="Cost in BB/100"
            value={m.bbPer100.toFixed(1)}
            tone="ember"
            size="sm"
            sub="the unit that matters"
          />
        </div>
      </div>

      <div className="brut p-6 md:p-8">
        <h3 className="text-h4 mb-1 font-bold">
          What that does to a real win rate
        </h3>
        <p className="mb-7 text-sm opacity-65">
          Pre-rake edge over the other players, and what survives after{" "}
          <strong className="tnum">{m.bbPer100.toFixed(1)} BB/100</strong>{" "}
          leaves the table.
        </p>

        <ul className="flex flex-col gap-5">
          {after.map((a) => {
            const w = (v: number) => (Math.abs(v) / maxAbs) * 50;
            return (
              <li key={a.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold">{a.label}</span>
                  <span className="tnum font-mono text-xs opacity-60">
                    {a.bb100 > 0 ? "+" : ""}
                    {a.bb100} →{" "}
                    <strong
                      className={a.net >= 0 ? "text-[#1b7a53]" : "text-ember"}
                    >
                      {a.net > 0 ? "+" : ""}
                      {a.net.toFixed(1)}
                    </strong>{" "}
                    BB/100
                  </span>
                </div>
                {/* Diverging bar around a zero axis — the only honest shape
                    for a quantity that changes sign. */}
                <div className="relative h-5 rounded-[4px] bg-ink/8">
                  <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-ink/35" />
                  <span
                    className="absolute inset-y-0 rounded-[4px] opacity-35"
                    style={{
                      background: a.bb100 >= 0 ? "#1f6fb8" : "#d4420f",
                      left: a.bb100 >= 0 ? "50%" : `${50 - w(a.bb100)}%`,
                      width: `${w(a.bb100)}%`,
                    }}
                  />
                  <span
                    className="absolute inset-y-[3px] rounded-[3px]"
                    style={{
                      background: a.net >= 0 ? "#1b7a53" : "#d4420f",
                      left: a.net >= 0 ? "50%" : `${50 - w(a.net)}%`,
                      width: `${w(a.net)}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs opacity-50">{a.note}</p>
              </li>
            );
          })}
        </ul>

        <div
          className={cx(
            "brut-flat mt-7 p-5 text-sm leading-relaxed",
            after[1].net > 0 ? "bg-mint" : "bg-ember/12",
          )}
        >
          <strong>
            {after[1].net > 0
              ? `A strong player survives this game, netting ${after[1].net.toFixed(1)} BB/100.`
              : `A strong winning player loses money in this game.`}
          </strong>{" "}
          {after[1].net > 0
            ? "Barely. And that assumes they're genuinely top-tier, never tilt, and the table stays soft."
            : `Beating the other players by 6 BB/100 is a real, hard-won skill. It is not enough, because the rake takes ${m.bbPer100.toFixed(1)}. The game is unbeatable regardless of how well anyone plays it.`}
        </div>
      </div>
    </div>
  );
}
