"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  EMPTY_TABLE,
  POINT_NUMBERS,
  SPOTS,
  canBet,
  canRemove,
  maxPassOdds,
  onTable,
  resolveRoll,
  type PointNumber,
  type RollResult,
  type Spot,
  type TableState,
} from "@/lib/games/crapsTable";
import { money, pct } from "@/lib/stats";
import { Badge, Button, Stat, cx } from "@/components/ui";
import { Chip, ChipRack, type RackTool } from "@/components/ui/chips";
import { DicePair } from "@/components/ui/dice";

const DiceTray = dynamic(() => import("@/components/three/DiceTray"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-felt-deep">
      <span className="text-xs tracking-[0.1em] text-cream/40 uppercase">Loading dice…</span>
    </div>
  ),
});

const START = 1000;
const NUMBER_WORD: Record<PointNumber, string> = { 4: "4", 5: "5", 6: "SIX", 8: "8", 9: "NINE", 10: "10" };

function edgeTone(e: number) {
  if (e <= 0.015) return "text-[#4bc292]";
  if (e <= 0.05) return "text-amber";
  return "text-ember";
}

/** Stake-weighted house edge of everything currently on the felt. */
function tableEdge(t: TableState): number | null {
  let stake = 0;
  let cost = 0;
  for (const [spot, amt] of Object.entries(t.bets) as [Spot, number][]) {
    if (!amt) continue;
    stake += amt;
    cost += amt * SPOTS[spot].edge;
  }
  for (const amt of Object.values(t.comePoints)) {
    stake += amt ?? 0;
    cost += (amt ?? 0) * SPOTS.come.edge;
  }
  for (const amt of Object.values(t.dontComePoints)) {
    stake += amt ?? 0;
    cost += (amt ?? 0) * SPOTS.dontCome.edge;
  }
  return stake ? cost / stake : null;
}

export function CrapsPlay() {
  const [table, setTable] = React.useState<TableState>(EMPTY_TABLE);
  const [cash, setCash] = React.useState(START);
  const [tool, setTool] = React.useState<RackTool>(25);
  const [rollId, setRollId] = React.useState(0);
  const [rolling, setRolling] = React.useState(false);
  const [dice, setDice] = React.useState<[number, number] | null>(null);
  const [last, setLast] = React.useState<RollResult | null>(null);
  const [hover, setHover] = React.useState<Spot | null>(null);
  const [nudge, setNudge] = React.useState<string | null>(null);
  const [rolls, setRolls] = React.useState(0);

  const felt = onTable(table);
  const net = cash + felt - START;
  const broke = cash + felt < 5 && !rolling;
  const edgeNow = tableEdge(table);

  const click = (spot: Spot) => {
    if (rolling) return;
    if (tool === "remove") {
      if (!canRemove(table, spot)) {
        setNudge(
          table.bets[spot]
            ? "Once the point is set, the pass line stays until it wins or loses."
            : "Nothing to take down there.",
        );
        return;
      }
      const amt = table.bets[spot] ?? 0;
      setCash((c) => c + amt);
      setTable((t) => {
        const bets = { ...t.bets };
        delete bets[spot];
        return { ...t, bets };
      });
      setNudge(null);
      return;
    }
    const check = canBet(table, spot, tool);
    if (!check.ok) {
      setNudge(check.reason ?? "Not allowed right now.");
      return;
    }
    if (cash < tool) {
      setNudge(`Not enough cash for a $${tool} chip.`);
      return;
    }
    setNudge(null);
    setCash((c) => c - tool);
    setTable((t) => ({ ...t, bets: { ...t.bets, [spot]: (t.bets[spot] ?? 0) + tool } }));
  };

  const roll = () => {
    if (rolling) return;
    setNudge(null);
    setRolling(true);
    setRollId((r) => r + 1);
  };

  // Reads `table` straight from render scope. The tray invokes this from
  // a frame callback that always holds the latest render's closure.
  const onResult = (a: number, b: number) => {
    const r = resolveRoll(table, a, b);
    setDice([a, b]);
    setTable(r.state);
    setCash((c) => c + r.returned);
    setLast(r);
    setRolls((n) => n + 1);
    setRolling(false);
  };

  const restart = () => {
    setTable(EMPTY_TABLE);
    setCash(START);
    setLast(null);
    setDice(null);
    setRolls(0);
  };

  /* ---------------- one spot on the felt ---------------- */
  const spot = (s: Spot, className: string, content: React.ReactNode) => {
    const amt = table.bets[s];
    const allowed =
      tool === "remove" ? canRemove(table, s) : canBet(table, s, tool).ok;
    return (
      <button
        onClick={() => click(s)}
        onPointerEnter={() => setHover(s)}
        onPointerLeave={() => setHover((h) => (h === s ? null : h))}
        onFocus={() => setHover(s)}
        aria-label={`${SPOTS[s].label}, pays ${SPOTS[s].pays}${amt ? `, $${amt} on it` : ""}`}
        className={cx(
          "relative flex cursor-pointer items-center justify-center border-[1.5px] border-white/75 text-white transition-[filter,opacity] select-none",
          "hover:brightness-125 focus-visible:z-10",
          className,
        )}
      >
        {/* Only the printed label dims when a spot is closed. The chips
            sitting on it are real money and must always stay legible —
            dimming the whole spot hid a live pass-line bet. The wrapper
            inherits the spot's flex direction, and stays unpositioned so
            the puck and come markers still anchor to the button. */}
        <span
          className={cx(
            "flex h-full w-full items-center justify-center [flex-direction:inherit]",
            !allowed && "opacity-35",
          )}
        >
          {content}
        </span>
        {amt ? <Chip amount={amt} size={28} className="absolute top-1 right-1 z-20" /> : null}
      </button>
    );
  };

  const info = hover ? SPOTS[hover] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- dice + what happened ---------------- */}
      <div className="felt-panel overflow-hidden p-0">
        <div className="grid lg:grid-cols-[1fr_1.15fr]">
          <div className="relative border-b-2 border-ink lg:border-r-2 lg:border-b-0">
            <DiceTray rollId={rollId} onResult={onResult} className="h-[280px] w-full md:h-[340px]" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span
                className={cx(
                  "grid h-11 w-11 place-items-center rounded-full border-2 text-[0.6rem] font-black tracking-wide",
                  table.point ? "border-ink bg-cream text-ink" : "border-cream/60 bg-ink text-cream",
                )}
                title={table.point ? `The point is ${table.point}` : "No point yet — the next roll is a come-out roll"}
              >
                {table.point ? "ON" : "OFF"}
              </span>
              {dice && (
                <span className="rounded-[10px] border-2 border-ink bg-cream px-2.5 py-1 text-lg font-bold text-ink">
                  <span className="mr-2"><DicePair a={dice[0]} b={dice[1]} size={20} /></span>
                  {dice[0] + dice[1]}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6 md:p-7">
            <div className="min-h-[8.5rem] rounded-[14px] border-2 border-ink bg-felt-deep p-4">
              {rolling ? (
                <p className="text-cream/70">Dice are out…</p>
              ) : last ? (
                <>
                  <p className="font-bold text-cream">{last.call}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {last.events.length === 0 && <li className="text-cream/45">No bets were decided.</li>}
                    {last.events.map((e, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-cream/75">{e.label}</span>
                        <span
                          className={cx(
                            "tnum font-mono font-bold",
                            e.outcome === "win" ? "text-[#4bc292]" : e.outcome === "lose" ? "text-ember" : "text-cream/50",
                          )}
                        >
                          {e.outcome === "win" ? `+${money(e.won, e.won % 1 ? 2 : 0)}` : e.outcome === "lose" ? `−${money(e.stake)}` : e.outcome === "move" ? "moves" : "tie"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-cream/70">
                  Start simple: put a chip on the <strong className="text-cream">Pass Line</strong> and roll.
                  7 or 11 wins straight away.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Stat label="Cash" value={money(cash, cash % 1 ? 2 : 0)} tone="cream" size="sm" sub={felt ? `${money(felt)} on the felt` : " "} />
              <Stat
                label="You're at"
                value={`${net >= 0 ? "+" : "−"}${money(Math.abs(net), net % 1 ? 2 : 0)}`}
                tone={net >= 0 ? "win" : "ember"}
                size="sm"
                sub={`${rolls} ${rolls === 1 ? "roll" : "rolls"}`}
              />
              <Stat
                label="Your bets' edge"
                value={edgeNow === null ? "—" : pct(edgeNow, 2)}
                tone="cream"
                size="sm"
                sub="house cut on what's down now"
              />
            </div>

            {broke ? (
              <Button onClick={restart} className="mt-auto">Out of chips — start over with $1,000</Button>
            ) : (
              <Button onClick={roll} disabled={rolling} className="mt-auto">
                {rolling ? "Rolling…" : table.point ? `Roll — point is ${table.point}` : "Roll — come-out"}
              </Button>
            )}
            {nudge && <p className="-mt-2 text-sm text-amber">{nudge}</p>}
          </div>
        </div>
      </div>

      {/* ---------------- the felt ---------------- */}
      <div className="felt-panel p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <ChipRack value={tool} onChange={setTool} />
          {table.point && table.bets.pass ? (
            <p className="text-sm text-cream/65">
              Odds room: <strong className="text-cream">{money(maxPassOdds(table) - (table.bets.passOdds ?? 0))}</strong> more behind your pass line
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[960px] grid-cols-[1fr_300px] overflow-hidden rounded-[14px] border-2 border-ink bg-[#14603c] text-white">
            {/* ======== main layout ======== */}
            <div
              className="grid border-r-[1.5px] border-white/75"
              style={{
                gridTemplateColumns: "116px repeat(6, 1fr)",
                gridTemplateRows: "112px 66px 84px 42px 56px",
              }}
            >
              <div style={{ gridColumn: 1, gridRow: 1 }} className="flex">
                {spot("dontCome", "flex-1 flex-col gap-0.5 bg-black/15 text-xs font-bold leading-tight", (
                  <>
                    <span>DON&apos;T</span>
                    <span>COME</span>
                    <span className="flex items-center gap-1 text-[0.65rem] opacity-80">BAR <DicePair a={6} b={6} size={11} gap={1} /></span>
                  </>
                ))}
              </div>

              {POINT_NUMBERS.map((n, i) => {
                const s = `place${n}` as Spot;
                const come = table.comePoints[n];
                const dontCome = table.dontComePoints[n];
                return (
                  <div key={n} style={{ gridColumn: i + 2, gridRow: 1 }} className="flex">
                    {spot(s, "flex-1 flex-col", (
                      <>
                        {table.point === n && (
                          <span className="absolute top-1 left-1 grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-cream text-[0.55rem] font-black text-ink shadow-[2px_2px_0_0_rgba(0,0,0,.4)]">
                            ON
                          </span>
                        )}
                        <span className="text-3xl leading-none font-black tracking-tight">{NUMBER_WORD[n]}</span>
                        <span className="mt-1 text-[0.65rem] font-bold opacity-70">place {SPOTS[s].pays.replace(" to ", ":")}</span>
                        {(come || dontCome) && (
                          <span className="absolute bottom-1 left-1 flex gap-1">
                            {come ? <span className="rounded bg-cream px-1 text-[0.6rem] font-bold text-ink">C {money(come)}</span> : null}
                            {dontCome ? <span className="rounded bg-ink px-1 text-[0.6rem] font-bold text-cream">DC {money(dontCome)}</span> : null}
                          </span>
                        )}
                      </>
                    ))}
                  </div>
                );
              })}

              <div style={{ gridColumn: 1, gridRow: "2 / 5" }} className="flex flex-col">
                {spot("big6", "flex-1 flex-col bg-[#d42a30]/25", (
                  <><span className="text-[0.6rem] font-bold opacity-80">BIG</span><span className="text-2xl font-black">6</span></>
                ))}
                {spot("big8", "flex-1 flex-col bg-[#d42a30]/25", (
                  <><span className="text-[0.6rem] font-bold opacity-80">BIG</span><span className="text-2xl font-black">8</span></>
                ))}
              </div>

              <div style={{ gridColumn: "2 / 8", gridRow: 2 }} className="flex">
                {spot("come", "flex-1 text-3xl font-black tracking-[0.3em] text-[#ffd43b]", "COME")}
              </div>

              <div style={{ gridColumn: "2 / 8", gridRow: 3 }} className="flex">
                {spot("field", "flex-1 flex-col", (
                  <>
                    <span className="flex items-baseline gap-4 text-lg font-bold">
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#ffd43b] text-sm text-[#ffd43b]">2</span>
                      3 · 4 · 9 · 10 · 11
                      <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#ffd43b] text-sm text-[#ffd43b]">12</span>
                    </span>
                    <span className="mt-0.5 text-sm font-black tracking-[0.35em] text-[#ffd43b]">FIELD</span>
                    <span className="text-[0.6rem] opacity-70">2 pays double · 12 pays triple</span>
                  </>
                ))}
              </div>

              <div style={{ gridColumn: "2 / 8", gridRow: 4 }} className="flex">
                {spot("dontPass", "flex-1 bg-black/15 text-sm font-bold tracking-[0.2em]", (
                  <>DON&apos;T PASS BAR <span className="ml-3 opacity-80"><DicePair a={6} b={6} size={14} gap={2} /></span></>
                ))}
              </div>

              <div style={{ gridColumn: "1 / 7", gridRow: 5 }} className="flex">
                {spot("pass", "flex-1 text-2xl font-black tracking-[0.35em]", "PASS LINE")}
              </div>
              <div style={{ gridColumn: 7, gridRow: 5 }} className="flex">
                {spot("passOdds", "flex-1 flex-col bg-black/15 text-xs font-bold", (
                  <><span>ODDS</span><span className="text-[0.6rem] opacity-70">0% edge</span></>
                ))}
              </div>
            </div>

            {/* ======== proposition box ======== */}
            <div className="flex flex-col">
              <div className="border-b-[1.5px] border-white/75 bg-black/20 py-2 text-center text-[0.7rem] font-black tracking-[0.2em] text-[#ffd43b]">
                PROPOSITION BETS
              </div>
              <div className="grid flex-1 grid-cols-2" style={{ gridTemplateRows: "1fr 1fr" }}>
                {([
                  ["hard6", [3, 3], "9 to 1"], ["hard10", [5, 5], "7 to 1"],
                  ["hard8", [4, 4], "9 to 1"], ["hard4", [2, 2], "7 to 1"],
                ] as const).map(([s, [a, b], pays]) => (
                  <div key={s} className="flex">
                    {spot(s, "flex-1 flex-col py-2", (
                      <>
                        <DicePair a={a} b={b} size={22} />
                        <span className="mt-1.5 text-[0.65rem] font-bold">{SPOTS[s].label.toUpperCase()} · {pays}</span>
                      </>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex h-12">
                {spot("any7", "flex-1 text-sm font-black tracking-[0.15em] text-[#ff8a8a]", "ANY SEVEN · 4 to 1")}
              </div>
              <div className="grid grid-cols-4">
                {([
                  ["aces", [1, 1], "30:1"], ["aceDeuce", [1, 2], "15:1"],
                  ["boxcars", [6, 6], "30:1"], ["yo", [5, 6], "15:1"],
                ] as const).map(([s, [a, b], pays]) => (
                  <div key={s} className="flex h-16">
                    {spot(s, "flex-1 flex-col", (
                      <>
                        <DicePair a={a} b={b} size={16} gap={2} />
                        <span className="mt-1.5 text-[0.6rem] font-bold">{pays}</span>
                      </>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex h-12">
                {spot("anyCraps", "flex-1 text-sm font-black tracking-[0.15em]", "ANY CRAPS · 7 to 1")}
              </div>
            </div>
          </div>
        </div>

        {/* what the hovered spot is */}
        <div className="mt-3 min-h-[4.5rem] rounded-[12px] border-2 border-ink bg-felt-deep p-4" aria-live="polite">
          {info ? (
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
              <span className="shrink-0 font-bold text-cream">{info.label}</span>
              <span className="shrink-0 text-sm text-cream/60">pays {info.pays}</span>
              <span className={cx("shrink-0 font-mono text-sm font-bold", edgeTone(info.edge))}>
                house edge {pct(info.edge, 2)}
              </span>
              <span className="text-sm text-cream/70">{info.rule}</span>
            </div>
          ) : (
            <p className="text-sm text-cream/50">
              Hover any spot to see how it works, what it pays, and how much the
              house keeps. <Badge tone="mint" className="ml-1">green</Badge> is cheap,{" "}
              <Badge tone="ember">red</Badge> is expensive.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
