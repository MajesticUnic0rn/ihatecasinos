"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { BET_TYPES, WHEEL, colorOf, edgeFor, settle } from "@/lib/games/roulette";
import { makeRng, randomSeed, type Rng } from "@/lib/rng";
import { money, oneIn, pct } from "@/lib/stats";
import { Badge, Button, Stat, cx } from "@/components/ui";

const RouletteWheel = dynamic(
  () => import("@/components/three/RouletteWheel"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-felt-deep">
        <span className="text-xs tracking-[0.1em] text-cream/40 uppercase">
          Loading wheel…
        </span>
      </div>
    ),
  },
);

const SWATCH: Record<string, string> = {
  red: "bg-[#c8252c] text-white",
  black: "bg-[#15212b] text-white",
  green: "bg-[#1f7a4d] text-white",
};

export function WheelLab() {
  const [betId, setBetId] = React.useState("red");
  const [spinId, setSpinId] = React.useState(0);
  const [target, setTarget] = React.useState<number | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [profit, setProfit] = React.useState(0);
  const [staked, setStaked] = React.useState(0);

  // One RNG stream for the whole session, so the sequence is a real
  // sequence rather than a fresh draw each click. Created lazily inside
  // an event handler — seeding at module/render time would bake a fixed
  // seed into the prerendered HTML.
  const rngRef = React.useRef<Rng | null>(null);
  const rng = () => (rngRef.current ??= makeRng(randomSeed()))();

  const bet = BET_TYPES.find((b) => b.id === betId)!;
  const breakdown = edgeFor(bet);
  const pockets = WHEEL;

  // The pending outcome lives in a ref. Settling must NOT read it out of
  // a state updater: React invokes updaters twice in development, which
  // would book every spin to the history and the bankroll twice.
  const pendingRef = React.useRef<number | null>(null);

  const doSpin = () => {
    if (spinning) return;
    const idx = Math.floor(rng() * pockets.length);
    pendingRef.current = idx;
    setTarget(idx);
    setSpinId((s) => s + 1);
    setSpinning(true);
  };

  // Not memoized: the React Compiler handles that, and a manual useCallback
  // here can't be preserved anyway. Identity churn is harmless — the wheel
  // only ever calls this from inside a frame closure.
  const onSettled = () => {
    const idx = pendingRef.current;
    pendingRef.current = null; // guard against a duplicate settle callback
    setSpinning(false);
    if (idx === null) return;

    const pocket = pockets[idx];
    const delta = settle(bet, 10, pocket);
    setProfit((p) => p + delta);
    setStaked((s) => s + 10);
    setHistory((h) => [pocket, ...h].slice(0, 40));
  };

  const reset = () => {
    setHistory([]);
    setProfit(0);
    setStaked(0);
    setTarget(null);
    pendingRef.current = null;
    rngRef.current = makeRng(randomSeed());
  };

  const result = target !== null && !spinning ? pockets[target] : null;
  const won = result ? bet.covers(result) : false;
  const expected = -staked * breakdown.houseEdge;

  return (
    <div className="felt-panel overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* ---------------- wheel ---------------- */}
        <div className="relative min-h-[360px] border-b-2 border-ink lg:border-r-2 lg:border-b-0">
          <RouletteWheel
            targetIndex={target}
            spinId={spinId}
            onSettled={onSettled}
            className="h-[360px] w-full lg:h-full lg:min-h-[520px]"
          />

          {result && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span
                className={cx(
                  "grid h-12 w-12 place-items-center rounded-[12px] border-2 border-ink text-lg font-bold shadow-[3px_3px_0_0_rgba(0,0,0,.5)]",
                  SWATCH[colorOf(result)],
                )}
              >
                {result}
              </span>
              <Badge tone={won ? "mint" : "ember"}>
                {won ? `Pays ${bet.payout}:1` : "Loses"}
              </Badge>
            </div>
          )}

          {/* last results — the strip every casino puts on the pit display,
              because it is the single most effective fallacy generator */}
          {history.length > 0 && (
            <div className="absolute right-0 bottom-0 left-0 border-t-2 border-ink bg-felt-deep/85 px-4 py-2.5 backdrop-blur">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.62rem] font-bold tracking-[0.1em] text-cream/45 uppercase">
                  Previous spins
                </span>
                <span className="text-[0.62rem] text-cream/35">
                  Tells you nothing about the next one
                </span>
              </div>
              <div className="flex gap-1 overflow-hidden">
                {history.slice(0, 18).map((p, i) => (
                  <span
                    key={`${p}-${i}`}
                    className={cx(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-[0.6rem] font-bold",
                      SWATCH[colorOf(p)],
                    )}
                    style={{ opacity: 1 - i * 0.035 }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- controls + derivation ---------------- */}
        <div className="flex flex-col gap-6 p-6 md:p-8">

          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-bold tracking-[0.08em] text-cream/60 uppercase">
              Your bet — $10 flat
            </span>
            <select
              value={betId}
              onChange={(e) => setBetId(e.target.value)}
              className="w-full rounded-[12px] border-2 border-ink bg-felt-deep px-3 py-2.5 text-sm font-bold text-cream"
            >
              <optgroup label="Outside (even-ish money)">
                {BET_TYPES.filter((b) => b.group === "outside").map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} — pays {b.payout}:1
                  </option>
                ))}
              </optgroup>
              <optgroup label="Inside (long shots)">
                {BET_TYPES.filter((b) => b.group === "inside").map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} — pays {b.payout}:1
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* The derivation. This is the whole lesson in six lines. */}
          <div className="rounded-[14px] border-2 border-ink bg-felt-deep p-4">
            <h3 className="mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              Where the edge comes from
            </h3>
            <dl className="flex flex-col gap-1.5 font-mono text-[0.8rem] text-cream/85">
              <Row k="Winning pockets" v={`${breakdown.winning} of ${breakdown.pockets}`} />
              <Row k="P(win)" v={`${pct(breakdown.pWin)}  (${oneIn(breakdown.pWin)})`} />
              <Row k="Fair payout would be" v={`${(breakdown.pLose / breakdown.pWin).toFixed(2)} : 1`} />
              <Row k="Actual payout" v={`${breakdown.payout} : 1`} highlight />
              <div className="my-1 border-t border-cream/15" />
              <Row
                k="EV per $1"
                v={`${breakdown.ev >= 0 ? "+" : "−"}$${Math.abs(breakdown.ev).toFixed(4)}`}
                highlight
              />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-cream/55">
              The payout is calculated as if the two zeros weren&apos;t on the
              wheel. That gap — {pct(breakdown.houseEdge)} — is the entire
              business.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="House edge"
              value={pct(breakdown.houseEdge)}
              tone="ember"
              size="sm"
            />
            <Stat
              label="You, so far"
              value={`${profit >= 0 ? "+" : "−"}${money(Math.abs(profit))}`}
              tone={profit >= 0 ? "win" : "ember"}
              size="sm"
              sub={`${history.length} ${history.length === 1 ? "spin" : "spins"}`}
            />
            <Stat
              label="Expected"
              value={money(expected, 2)}
              tone="cream"
              size="sm"
              sub={`on ${money(staked)} wagered`}
            />
          </div>

          <div className="mt-auto flex flex-wrap gap-3">
            <Button onClick={doSpin} disabled={spinning} className="flex-1">
              {spinning ? "Spinning…" : "Spin"}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={spinning}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
}: {
  k: string;
  v: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-cream/55">{k}</dt>
      <dd className={cx("tnum", highlight ? "font-bold text-amber" : "")}>{v}</dd>
    </div>
  );
}
