"use client";

import * as React from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { parseHand } from "@/lib/cards";
import {
  DRAWS,
  exactOuts,
  potOddsRatio,
  requiredEquity,
  ruleOf4And2,
} from "@/lib/games/poker";
import { money, pct } from "@/lib/stats";
import { Badge, Segmented, Slider, Stat, cx } from "@/components/ui";

export function PotOdds() {
  const [drawId, setDrawId] = React.useState("flush");
  const [pot, setPot] = React.useState(100);
  const [toCall, setToCall] = React.useState(30);
  const [street, setStreet] = React.useState<"flop" | "turn">("flop");

  const draw = DRAWS.find((d) => d.id === drawId)!;
  const cardsToCome = street === "flop" ? 2 : 1;

  const equity = exactOuts(draw.outs, cardsToCome);
  const shortcut = ruleOf4And2(draw.outs, cardsToCome);
  const needed = requiredEquity(pot, toCall);
  const profitable = equity > needed;
  const evPerCall = equity * (pot + toCall) - toCall;

  const hole = parseHand(draw.hole);
  const board = parseHand(draw.board);

  return (
    <div className="felt-panel overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* ---- the hand ---- */}
        <div className="flex flex-col gap-7 border-b-2 border-ink p-6 md:p-8 lg:border-r-2 lg:border-b-0">
          <div>
            <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              Board
            </span>
            <div className="flex gap-2">
              {board.map((c, i) => (
                <PlayingCard key={c.id} card={c} width={74} index={i} />
              ))}
              {cardsToCome === 1 && (
                <PlayingCard faceDown width={74} index={3} label="Turn card" />
              )}
              <div className="flex items-center">
                <span className="ml-2 text-xs text-cream/40">
                  {cardsToCome} card{cardsToCome > 1 ? "s" : ""} to come
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="mb-3 block text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              Your hand
            </span>
            {/* No finish on these: on this site a foil/holo card MEANS a
                Hi-Lo count value, and that idea belongs to blackjack. */}
            <div className="flex gap-2">
              {hole.map((c, i) => (
                <PlayingCard key={c.id} card={c} width={88} index={i} />
              ))}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-cream/60">{draw.note}</p>

          <div className="mt-auto flex flex-col gap-5">
            <Segmented
              dark
              label="Draw"
              value={drawId}
              onChange={setDrawId}
              options={DRAWS.map((d) => ({ value: d.id, label: d.label }))}
            />
            <Segmented
              dark
              label="Street"
              value={street}
              onChange={(v: "flop" | "turn") => setStreet(v)}
              options={[
                { value: "flop", label: "On the flop" },
                { value: "turn", label: "On the turn" },
              ]}
            />
          </div>
        </div>

        {/* ---- the math ---- */}
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-5">
            <Slider dark label="Pot before your call" value={pot} onChange={setPot} min={10} max={500} step={10} format={money} />
            <Slider dark label="Amount to call" value={toCall} onChange={setToCall} min={5} max={400} step={5} format={money} />
          </div>

          <div className="rounded-[14px] border-2 border-ink bg-felt-deep p-5">
            <h3 className="mb-4 text-[0.7rem] font-bold tracking-[0.08em] text-cream/50 uppercase">
              The comparison
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <Stat
                label="Your equity"
                value={pct(equity, 1)}
                tone="cream"
                size="sm"
                sub={`${draw.outs} outs · rule of 4&2 says ${pct(shortcut, 0)}`}
              />
              <Stat
                label="Equity you need"
                value={pct(needed, 1)}
                tone="cream"
                size="sm"
                sub={`pot odds ${potOddsRatio(pot, toCall)}`}
              />
            </div>

            <div
              className={cx(
                "mt-5 rounded-[10px] border-2 border-ink p-4",
                profitable ? "bg-[#1b7a53]" : "bg-ember",
              )}
            >
              <p className="font-bold text-white">
                {profitable ? "Call." : "Fold."}{" "}
                <span className="tnum font-mono font-normal">
                  EV {evPerCall >= 0 ? "+" : "−"}
                  {money(Math.abs(evPerCall), 2)} per call
                </span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                {profitable
                  ? `You win ${pct(equity, 0)} of the time and the pot is laying you ${potOddsRatio(pot, toCall)}. Make this call every time it appears and the money shows up over the long run — whether or not it shows up tonight.`
                  : `You need ${pct(needed, 0)} and you have ${pct(equity, 0)}. Calling costs ${money(Math.abs(evPerCall), 2)} every time you do it, regardless of what the next card happens to be.`}
              </p>
            </div>
          </div>

          <div className="rounded-[14px] border-2 border-ink bg-felt p-5 text-sm leading-relaxed text-cream/70">
            <strong className="mb-1.5 block text-cream">
              This is the entire skill.
            </strong>
            Not reads, not tells, not courage. Poker is a long sequence of
            moments exactly like this one, and the players who win are the ones
            who get this comparison right more often — then accept that being
            right has no bearing on whether this particular card comes.
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[2, 4, 8].map((outs) => (
              <Stat
                key={outs}
                label={`${outs} outs`}
                value={pct(exactOuts(outs, cardsToCome), 0)}
                tone="cream"
                size="sm"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-ink bg-felt-deep px-6 py-4">
        <Badge tone="amber">Rule of 4 and 2</Badge>
        <span className="text-sm text-cream/65">
          Outs × 4 on the flop, × 2 on the turn. For this hand that estimates{" "}
          <strong className="tnum">{pct(shortcut, 0)}</strong> against an exact{" "}
          <strong className="tnum">{pct(equity, 1)}</strong> — close enough to
          decide with, at a table, in ten seconds.
        </span>
      </div>
    </div>
  );
}
