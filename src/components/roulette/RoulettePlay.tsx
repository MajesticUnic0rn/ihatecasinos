"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  LAYOUT_ROWS,
  WHEEL,
  colorOf,
  settleTable,
  tableBet,
  type SpinResult,
  type TableBetKey,
} from "@/lib/games/roulette";
import { makeRng, randomSeed, type Rng } from "@/lib/rng";
import { money } from "@/lib/stats";
import { Button, Stat, cx } from "@/components/ui";
import { Chip, ChipRack, type RackTool } from "@/components/ui/chips";

const RouletteWheel = dynamic(() => import("@/components/three/RouletteWheel"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-felt-deep">
      <span className="text-xs tracking-[0.1em] text-cream/40 uppercase">Loading wheel…</span>
    </div>
  ),
});

const START = 1000;

function resultLine(r: SpinResult): string {
  const won = r.winners.reduce((a, w) => a + w.won, 0);
  const lost = r.losers.reduce((a, l) => a + l.stake, 0);
  if (!r.winners.length) return `The house takes all ${money(lost)}.`;
  if (!lost) return `You win ${money(won)}.`;
  const net = won - lost;
  return `You win ${money(won)} and lose ${money(lost)} — ${net >= 0 ? "up" : "down"} ${money(Math.abs(net))} on the spin.`;
}
const EDGE = 2 / 38;

const POCKET_BG = {
  red: "bg-[#d42a30]",
  black: "bg-[#0e1620]",
  green: "bg-[#17864f]",
} as const;

type Bets = Record<TableBetKey, number>;

export function RoulettePlay() {
  const [cash, setCash] = React.useState(START);
  const [bets, setBets] = React.useState<Bets>({});
  const [placed, setPlaced] = React.useState<{ key: TableBetKey; amount: number }[]>([]);
  const [lastBets, setLastBets] = React.useState<Bets>({});
  const [tool, setTool] = React.useState<RackTool>(25);

  const [target, setTarget] = React.useState<number | null>(null);
  const [spinId, setSpinId] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<SpinResult | null>(null);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [wagered, setWagered] = React.useState(0);
  const [nudge, setNudge] = React.useState<string | null>(null);

  // Seeded lazily inside handlers — never at render, or the prerendered
  // HTML would bake one fixed seed into every visitor's session.
  const rngRef = React.useRef<Rng | null>(null);
  const rng = () => (rngRef.current ??= makeRng(randomSeed()))();

  // The bets being settled are frozen at the moment of the spin, so a
  // stray click mid-spin cannot change what the ball lands on.
  const pendingRef = React.useRef<{ idx: number; bets: Bets } | null>(null);

  const onTable = Object.values(bets).reduce((a, b) => a + b, 0);
  const net = cash + onTable - START;
  const broke = cash + onTable < 5 && !spinning;

  const place = (key: TableBetKey) => {
    if (spinning) return;
    setResult(null);
    if (tool === "remove") {
      const amt = bets[key];
      if (!amt) return;
      setCash((c) => c + amt);
      setBets((b) => {
        const next = { ...b };
        delete next[key];
        return next;
      });
      setPlaced((p) => p.filter((x) => x.key !== key));
      return;
    }
    if (cash < tool) {
      setNudge(`Not enough cash for a $${tool} chip.`);
      return;
    }
    setNudge(null);
    setCash((c) => c - tool);
    setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + tool }));
    setPlaced((p) => [...p, { key, amount: tool }]);
  };

  const undo = () => {
    const last = placed[placed.length - 1];
    if (!last || spinning) return;
    setPlaced((p) => p.slice(0, -1));
    setCash((c) => c + last.amount);
    setBets((b) => {
      const left = (b[last.key] ?? 0) - last.amount;
      const next = { ...b };
      if (left > 0) next[last.key] = left;
      else delete next[last.key];
      return next;
    });
  };

  const clear = () => {
    if (spinning) return;
    setCash((c) => c + onTable);
    setBets({});
    setPlaced([]);
  };

  const rebet = () => {
    const total = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (spinning || !total) return;
    if (total > cash + onTable) {
      setNudge("Not enough left to repeat that bet.");
      return;
    }
    setCash((c) => c + onTable - total);
    setBets({ ...lastBets });
    setPlaced(Object.entries(lastBets).map(([key, amount]) => ({ key, amount })));
    setResult(null);
  };

  const spin = () => {
    if (spinning) return;
    if (!onTable) {
      setNudge("Put a chip on the table first.");
      return;
    }
    setNudge(null);
    const idx = Math.floor(rng() * WHEEL.length);
    pendingRef.current = { idx, bets: { ...bets } };
    setTarget(idx);
    setSpinId((s) => s + 1);
    setSpinning(true);
    setResult(null);
  };

  const onSettled = () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setSpinning(false);
    if (!pending) return;
    const pocket = WHEEL[pending.idx];
    const r = settleTable(pending.bets, pocket);
    setCash((c) => c + r.returned);
    setWagered((w) => w + r.staked);
    setLastBets(pending.bets);
    setBets({});
    setPlaced([]);
    setRecent((h) => [pocket, ...h].slice(0, 14));
    setResult(r);
  };

  const restart = () => {
    setCash(START);
    setBets({});
    setPlaced([]);
    setLastBets({});
    setWagered(0);
    setRecent([]);
    setResult(null);
    setTarget(null);
  };

  const winnerKeys = new Set(result?.winners.map((w) => w.key) ?? []);

  /**
   * One spot on the felt. A plain render function rather than a nested
   * component: a component declared inside render is a new type every
   * render, so React would remount all 50 spots on every chip placed.
   */
  const spot = (
    k: TableBetKey,
    label: string,
    hint: string,
    className: string,
    content?: React.ReactNode,
  ) => {
    const amt = bets[k];
    const won = winnerKeys.has(k);
    // The pocket the ball actually landed in, whether or not anyone bet it.
    const landed = !spinning && result !== null && k === `n:${result.pocket}`;
    return (
      <button
        onClick={() => place(k)}
        title={hint}
        aria-label={`${label}. ${hint}${amt ? ` $${amt} on it.` : ""}${landed ? " The ball landed here." : ""}`}
        className={cx(
          "relative flex flex-1 cursor-pointer items-center justify-center border-[1.5px] border-white/70 font-bold text-white transition-[filter] select-none",
          "hover:brightness-125 focus-visible:z-10",
          won && "z-10 outline-[3px] outline-offset-[-3px] outline-amber outline-solid",
          landed && "z-10 scale-[1.06] shadow-[0_0_0_3px_#fff,0_0_18px_4px_rgba(255,255,255,.55)]",
          className,
        )}
      >
        {content ?? label}
        {amt ? <Chip amount={amt} size={26} className="absolute -top-1.5 -right-1.5 z-10" /> : null}
      </button>
    );
  };

  const numberHint = (n: string) =>
    `${n === "0" || n === "00" ? n : `Number ${n}`} — pays 35 to 1. One pocket out of 38.`;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- wheel + status ---------------- */}
      <div className="felt-panel overflow-hidden p-0">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="relative border-b-2 border-ink lg:border-r-2 lg:border-b-0">
            <RouletteWheel
              targetIndex={target}
              spinId={spinId}
              onSettled={onSettled}
              className="h-[300px] w-full md:h-[380px]"
            />
            {recent.length > 0 && (
              <div className="absolute right-0 bottom-0 left-0 flex items-center gap-2 border-t-2 border-ink bg-felt-deep/85 px-4 py-2 backdrop-blur">
                <span className="shrink-0 text-[0.62rem] font-bold tracking-[0.1em] text-cream/45 uppercase">
                  Last spins
                </span>
                <div className="flex gap-1 overflow-hidden">
                  {recent.map((p, i) => (
                    <span
                      key={`${p}-${i}`}
                      className={cx(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-[0.6rem] font-bold text-white",
                        POCKET_BG[colorOf(p)],
                      )}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 p-6 md:p-7">
            {/* what just happened */}
            <div className="min-h-[7.5rem] rounded-[14px] border-2 border-ink bg-felt-deep p-4">
              {spinning ? (
                <p className="text-cream/70">No more bets. The ball is rolling…</p>
              ) : result ? (
                <div className="flex gap-4">
                  <span
                    className={cx(
                      "grid h-14 w-14 shrink-0 place-items-center rounded-[12px] border-2 border-ink text-xl font-bold text-white",
                      POCKET_BG[colorOf(result.pocket)],
                    )}
                  >
                    {result.pocket}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-cream">{resultLine(result)}</p>
                    <p className="mt-1 text-sm text-cream/60">
                      {colorOf(result.pocket) === "green"
                        ? "Green. Every color, odd/even and high/low bet loses on this one — that's the house's pocket."
                        : `${result.pocket}, ${colorOf(result.pocket)}${Number(result.pocket) % 2 ? ", odd" : ", even"}.`}
                    </p>
                    {result.winners.length > 0 && (
                      <p className="mt-1 truncate text-xs text-cream/50">
                        Winners: {result.winners.map((w) => w.label).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-cream/70">
                  Pick a chip, tap the table to bet, then spin. Try red or
                  black first — it&apos;s nearly a coin flip.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Stat label="Cash" value={money(cash)} tone="cream" size="sm" sub={onTable ? `${money(onTable)} on the table` : " "} />
              <Stat
                label="You're at"
                value={`${net >= 0 ? "+" : "−"}${money(Math.abs(net))}`}
                tone={net >= 0 ? "win" : "ember"}
                size="sm"
                sub={`after ${money(wagered)} bet`}
              />
              <Stat
                label="Math expects"
                value={wagered ? `−${money(wagered * EDGE)}` : "$0"}
                tone="cream"
                size="sm"
                sub="5.26% of what you bet"
              />
            </div>

            {broke ? (
              <Button onClick={restart} className="mt-auto">
                Out of chips — start over with $1,000
              </Button>
            ) : (
              <div className="mt-auto flex flex-wrap gap-3">
                <Button onClick={spin} disabled={spinning} className="min-w-[8rem] flex-1">
                  {spinning ? "Spinning…" : onTable ? `Spin — ${money(onTable)} bet` : "Spin"}
                </Button>
                <Button variant="secondary" onClick={rebet} disabled={spinning || !Object.keys(lastBets).length}>
                  Same bet
                </Button>
              </div>
            )}
            {nudge && <p className="-mt-2 text-sm text-amber">{nudge}</p>}
          </div>
        </div>
      </div>

      {/* ---------------- the betting layout ---------------- */}
      <div className="felt-panel p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <ChipRack value={tool} onChange={setTool} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={undo} disabled={spinning || !placed.length}>
              Undo
            </Button>
            <Button variant="ghost" onClick={clear} disabled={spinning || !onTable}>
              Clear
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div
            className="grid min-w-[760px] overflow-hidden rounded-[12px] border-2 border-ink bg-[#15603d] text-sm"
            style={{
              gridTemplateColumns: "58px repeat(12, minmax(44px, 1fr)) 64px",
              gridTemplateRows: "repeat(3, 52px) 46px 46px",
            }}
          >
            {/* 0 and 00 */}
            <div className="flex flex-col" style={{ gridColumn: 1, gridRow: "1 / 4" }}>
              {["00", "0"].map((z) => (
                <React.Fragment key={z}>{spot(`n:${z}`, z, numberHint(z), cx("text-lg", POCKET_BG.green))}</React.Fragment>
              ))}
            </div>

            {/* the number grid */}
            {LAYOUT_ROWS.map((row, r) =>
              row.map((n, c) => (
                <div key={n} style={{ gridColumn: c + 2, gridRow: r + 1 }} className="flex">
                  {spot(`n:${n}`, String(n), numberHint(String(n)), cx("text-base", POCKET_BG[colorOf(String(n))]))}
                </div>
              )),
            )}

            {/* columns */}
            {(["column3", "column2", "column1"] as const).map((k, r) => (
              <div key={k} style={{ gridColumn: 14, gridRow: r + 1 }} className="flex">
                {spot(k, "2 to 1", `${tableBet(k).label} — the 12 numbers in this row. Pays 2 to 1.`, "text-xs")}
              </div>
            ))}

            {/* dozens */}
            {(["dozen1", "dozen2", "dozen3"] as const).map((k, i) => (
              <div key={k} style={{ gridColumn: `${2 + i * 4} / span 4`, gridRow: 4 }} className="flex">
                {spot(k, ["1st 12", "2nd 12", "3rd 12"][i], `${tableBet(k).label} — numbers ${i * 12 + 1} to ${i * 12 + 12}. Pays 2 to 1.`, "")}
              </div>
            ))}

            {/* even-money */}
            {(
              [
                ["low", "1 – 18", "Numbers 1 to 18. Pays 1 to 1."],
                ["even", "EVEN", "Any even number. Pays 1 to 1. 0 and 00 don't count."],
                ["red", "", "Any red number. Pays 1 to 1."],
                ["black", "", "Any black number. Pays 1 to 1."],
                ["odd", "ODD", "Any odd number. Pays 1 to 1."],
                ["high", "19 – 36", "Numbers 19 to 36. Pays 1 to 1."],
              ] as const
            ).map(([k, label, hint], i) => (
              <div key={k} style={{ gridColumn: `${2 + i * 2} / span 2`, gridRow: 5 }} className="flex">
                {spot(
                  k,
                  label || k.toUpperCase(),
                  hint,
                  "",
                  k === "red" || k === "black" ? (
                    <span
                      aria-hidden
                      className={cx("block h-6 w-11", k === "red" ? "bg-[#d42a30]" : "bg-[#0e1620]")}
                      style={{
                        clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                        filter: "drop-shadow(0 0 0 white)",
                      }}
                    />
                  ) : undefined,
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-cream/50">
          Hover any spot to see what it pays. Payouts: a single number 35 to
          1 · dozens and columns 2 to 1 · red/black, odd/even, 1–18/19–36 pay 1 to 1.
        </p>
      </div>
    </div>
  );
}
