"use client";

import * as React from "react";
import {
  ACTION_FULL,
  HARD,
  PAIRS,
  SOFT,
  UPCARDS,
  type Action,
} from "@/lib/games/blackjack";
import { Segmented, cx } from "@/components/ui";

/**
 * Status-style palette: four reserved, labelled states — never a
 * categorical ramp. Every cell carries its letter, so the colour is
 * reinforcement rather than the only encoding.
 */
const CELL: Record<Action, string> = {
  H: "bg-[#f3f4f4] text-ink",
  S: "bg-[#d4420f] text-white",
  D: "bg-[#1f6fb8] text-white",
  Ds: "bg-[#1f6fb8] text-white",
  P: "bg-[#1b7a53] text-white",
  R: "bg-[#8a6d1f] text-white",
};

const LEGEND: { a: Action; label: string }[] = [
  { a: "H", label: "Hit" },
  { a: "S", label: "Stand" },
  { a: "D", label: "Double" },
  { a: "P", label: "Split" },
  { a: "R", label: "Surrender" },
];

type Mode = "hard" | "soft" | "pairs";

const ROWS: Record<Mode, [string, Action[]][]> = {
  hard: Object.entries(HARD)
    .map(([k, v]) => [k, v] as [string, Action[]])
    .sort((a, b) => Number(b[0]) - Number(a[0])),
  soft: Object.entries(SOFT)
    .map(([k, v]) => [`A,${Number(k) - 11}`, v] as [string, Action[]])
    .sort((a, b) => Number(b[0].split(",")[1]) - Number(a[0].split(",")[1])),
  pairs: ["A", "10", "9", "8", "7", "6", "5", "4", "3", "2"].map(
    (k) => [`${k},${k}`, PAIRS[k]] as [string, Action[]],
  ),
};

export function StrategyChart() {
  const [mode, setMode] = React.useState<Mode>("hard");
  const [hover, setHover] = React.useState<{ r: string; c: string; a: Action } | null>(null);

  const rows = ROWS[mode];

  return (
    <div className="brut p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-h4 font-bold">Basic strategy</h3>
          <p className="mt-1 text-sm opacity-60">
            4–8 decks · dealer stands on soft 17 · double after split · 3:2
          </p>
        </div>
        <Segmented
          value={mode}
          onChange={(m: Mode) => setMode(m)}
          options={[
            { value: "hard", label: "Hard" },
            { value: "soft", label: "Soft" },
            { value: "pairs", label: "Pairs" },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-separate border-spacing-[2px]">
          <caption className="sr-only">
            Basic strategy for {mode} hands against each dealer upcard
          </caption>
          <thead>
            <tr>
              <th className="p-1 text-left text-[0.65rem] font-bold tracking-wide uppercase opacity-50">
                You ↓ / Dealer →
              </th>
              {UPCARDS.map((u) => (
                <th
                  key={u}
                  className="tnum p-1 text-center font-mono text-xs font-bold"
                >
                  {u}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, actions]) => (
              <tr key={label}>
                <th
                  scope="row"
                  className="tnum pr-2 text-right font-mono text-xs font-bold whitespace-nowrap"
                >
                  {label}
                </th>
                {actions.map((a, i) => (
                  <td key={i} className="p-0">
                    <button
                      onPointerEnter={() =>
                        setHover({ r: label, c: UPCARDS[i], a })
                      }
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover({ r: label, c: UPCARDS[i], a })}
                      onBlur={() => setHover(null)}
                      aria-label={`${label} versus dealer ${UPCARDS[i]}: ${ACTION_FULL[a]}`}
                      className={cx(
                        "grid h-8 w-full min-w-[2rem] place-items-center rounded-[5px] text-[0.7rem] font-bold transition-transform",
                        CELL[a],
                        hover?.r === label || hover?.c === UPCARDS[i]
                          ? "scale-[1.08] ring-2 ring-ink"
                          : "",
                      )}
                    >
                      {a === "Ds" ? "D" : a}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t-2 border-ink pt-4">
        {LEGEND.map((l) => (
          <span key={l.a} className="flex items-center gap-1.5 text-xs font-bold">
            <span
              className={cx(
                "grid h-5 w-5 place-items-center rounded-[4px] text-[0.65rem]",
                CELL[l.a],
              )}
            >
              {l.a}
            </span>
            {l.label}
          </span>
        ))}
      </div>

      <p className="mt-4 min-h-[2.5rem] text-sm leading-relaxed opacity-70">
        {hover ? (
          <>
            <strong className="font-mono">{hover.r}</strong> vs dealer{" "}
            <strong className="font-mono">{hover.c}</strong> →{" "}
            <strong>{ACTION_FULL[hover.a]}</strong>
          </>
        ) : (
          "Hover any cell. This chart is the entire difference between a 2% game and a 0.5% game — and it is free, printed on cards sold in the gift shop, and allowed at the table."
        )}
      </p>
    </div>
  );
}
