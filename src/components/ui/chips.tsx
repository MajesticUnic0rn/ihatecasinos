"use client";

import * as React from "react";
import { cx } from "@/components/ui";

export const DENOMINATIONS = [5, 25, 100] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

const CHIP_STYLE: Record<number, string> = {
  5: "bg-[#d4420f] text-white",
  25: "bg-[#1b7a53] text-white",
  100: "bg-ink text-cream",
};

/** Colour a stack by the largest chip that fits into it. */
function styleFor(amount: number) {
  if (amount >= 100) return CHIP_STYLE[100];
  if (amount >= 25) return CHIP_STYLE[25];
  return CHIP_STYLE[5];
}

function short(amount: number) {
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}k`;
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
}

/** A single chip, for showing what is sitting on a spot. */
export function Chip({
  amount,
  size = 30,
  className,
}: {
  amount: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "tnum pointer-events-none inline-grid shrink-0 place-items-center rounded-full border-2 border-ink font-mono leading-none font-bold tracking-normal normal-case shadow-[2px_2px_0_0_rgba(3,25,38,.55)]",
        styleFor(amount),
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * (amount >= 1000 ? 0.3 : 0.36),
        // the dashed inner ring is what makes it read as a casino chip
        backgroundImage:
          "radial-gradient(circle, transparent 54%, rgba(255,255,255,.55) 55%, rgba(255,255,255,.55) 60%, transparent 61%)",
      }}
    >
      {short(amount)}
    </span>
  );
}

export type RackTool = Denomination | "remove";

/** Chip selector plus a "take down" tool. */
export function ChipRack({
  value,
  onChange,
  dark = true,
}: {
  value: RackTool;
  onChange: (t: RackTool) => void;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={cx(
          "text-[0.7rem] font-bold tracking-[0.08em] uppercase",
          dark ? "text-cream/60" : "opacity-60",
        )}
      >
        Chip
      </span>
      <div className="flex items-center gap-2">
        {DENOMINATIONS.map((d) => (
          <button
            key={d}
            onClick={() => onChange(d)}
            aria-pressed={value === d}
            aria-label={`$${d} chip`}
            className={cx(
              "cursor-pointer rounded-full transition-transform",
              value === d
                ? "-translate-y-1 ring-[3px] ring-amber ring-offset-2 ring-offset-felt"
                : "opacity-80 hover:-translate-y-0.5 hover:opacity-100",
            )}
          >
            <Chip amount={d} size={40} />
          </button>
        ))}
        <button
          onClick={() => onChange("remove")}
          aria-pressed={value === "remove"}
          className={cx(
            "ml-1 cursor-pointer rounded-[50px] border-2 px-3 py-2 text-[0.7rem] font-bold tracking-wide uppercase",
            value === "remove"
              ? "border-amber bg-amber text-ink"
              : dark
                ? "border-cream/30 text-cream/70 hover:border-cream/70"
                : "border-ink/30 hover:border-ink",
          )}
        >
          Take down
        </button>
      </div>
    </div>
  );
}
