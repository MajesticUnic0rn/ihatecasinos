"use client";

import * as React from "react";
import { cx } from "@/components/ui";
import { money, pct } from "@/lib/stats";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export interface ChartTheme {
  gain: string;
  loss: string;
  neutral: string;
  grid: string;
  axis: string;
  ink: string;
  muted: string;
  surface: string;
}

export function theme(dark: boolean): ChartTheme {
  return dark
    ? {
        gain: "#3d93e8",
        loss: "#f05a1c",
        neutral: "#8b9aa3",
        grid: "rgba(241,246,241,.12)",
        axis: "rgba(241,246,241,.3)",
        ink: "#f1f6f1",
        muted: "rgba(241,246,241,.55)",
        surface: "#0d1a22",
      }
    : {
        gain: "#1f6fb8",
        loss: "#d4420f",
        neutral: "#5f6b73",
        grid: "rgba(3,25,38,.1)",
        axis: "rgba(3,25,38,.28)",
        ink: "#031926",
        muted: "rgba(3,25,38,.58)",
        surface: "#f1f6f1",
      };
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/**
 * Round every coordinate before it reaches the DOM.
 *
 * Not cosmetic: Math.pow/Math.log can differ in their last bits between
 * the Node render and the browser render, and an SVG `d` string built
 * from raw floats then mismatches on hydration. Two decimals is well
 * below a device pixel and makes the markup deterministic.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;

function Tooltip({
  x,
  y,
  w,
  children,
  dark,
}: {
  x: number;
  y: number;
  w: number;
  children: React.ReactNode;
  dark: boolean;
}) {
  // Flip to the left when near the right edge so it never clips out.
  const flip = x > w * 0.62;
  return (
    <div
      className={cx(
        "pointer-events-none absolute z-20 rounded-[10px] border-2 px-2.5 py-1.5 text-xs leading-tight font-medium whitespace-nowrap",
        dark
          ? "border-cream/30 bg-felt text-cream"
          : "border-ink bg-paper text-ink shadow-[3px_3px_0_0_var(--color-ink)]",
      )}
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? w - x + 12 : undefined,
        top: Math.max(4, y - 16),
      }}
    >
      {children}
    </div>
  );
}

function Figure({
  title,
  caption,
  legend,
  children,
  tableView,
}: {
  title: string;
  caption?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
  tableView?: React.ReactNode;
}) {
  const [showTable, setShowTable] = React.useState(false);
  return (
    <figure className="my-2">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <figcaption className="text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
          {title}
        </figcaption>
        <div className="flex items-center gap-3">
          {legend}
          {tableView && (
            <button
              onClick={() => setShowTable((s) => !s)}
              className="text-[0.7rem] font-bold tracking-wide uppercase underline underline-offset-4 opacity-55 hover:opacity-100"
            >
              {showTable ? "Hide" : "Data"}
            </button>
          )}
        </div>
      </div>
      {children}
      {showTable && tableView && (
        <div className="mt-4 max-h-64 overflow-auto text-xs">{tableView}</div>
      )}
      {caption && (
        <p className="mt-3 text-xs leading-relaxed opacity-60">{caption}</p>
      )}
    </figure>
  );
}

export function LegendSwatch({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide uppercase opacity-70">
      <span
        className="inline-block h-2.5 w-2.5 rounded-[3px]"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Bankroll over time — single series, diverging fill vs the start   */
/* ------------------------------------------------------------------ */

export function BankrollChart({
  points,
  start,
  dark = false,
  height = 240,
  title = "Bankroll by bet",
  caption,
}: {
  /** Bankroll after each bet. Index is the bet number. */
  points: number[];
  start: number;
  dark?: boolean;
  height?: number;
  title?: string;
  caption?: React.ReactNode;
}) {
  const t = theme(dark);
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { t: 12, r: 14, b: 26, l: 54 };
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;

  const n = points.length;
  const maxY = Math.max(start, ...points) * 1.06;
  const minY = 0;

  const sx = (i: number) => r2(PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * iw));
  const sy = (v: number) =>
    r2(PAD.t + ih - ((v - minY) / (maxY - minY || 1)) * ih);

  const path = points.map((p, i) => `${i ? "L" : "M"}${sx(i)},${sy(p)}`).join(" ");
  const startY = sy(start);

  // Area clipped above/below the starting line gives the diverging read
  // without ever drawing two scales.
  const area = `${path} L${sx(n - 1)},${startY} L${sx(0)},${startY} Z`;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (maxY / ticks) * i);

  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.l) / iw) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <Figure
      title={title}
      caption={caption}
      legend={
        <span className="text-[0.7rem] font-bold tracking-wide uppercase opacity-55">
          vs. starting {money(start)}
        </span>
      }
    >
      <div
        ref={ref}
        className="relative w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg width="100%" height={height} role="img" aria-label={title}>
          <defs>
            <clipPath id="above">
              <rect x={0} y={0} width={w} height={startY} />
            </clipPath>
            <clipPath id="below">
              <rect x={0} y={startY} width={w} height={height - startY} />
            </clipPath>
          </defs>

          {gridVals.map((v) => (
            <g key={v}>
              <line
                x1={PAD.l}
                x2={w - PAD.r}
                y1={sy(v)}
                y2={sy(v)}
                stroke={t.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.l - 8}
                y={sy(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill={t.muted}
                className="tnum"
              >
                {money(v)}
              </text>
            </g>
          ))}

          <path d={area} fill={t.gain} opacity={0.18} clipPath="url(#above)" />
          <path d={area} fill={t.loss} opacity={0.2} clipPath="url(#below)" />

          {/* the line you started on — the only number that matters */}
          <line
            x1={PAD.l}
            x2={w - PAD.r}
            y1={startY}
            y2={startY}
            stroke={t.neutral}
            strokeWidth={2}
            strokeDasharray="5 4"
          />

          <path
            d={path}
            fill="none"
            stroke={t.gain}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath="url(#above)"
          />
          <path
            d={path}
            fill="none"
            stroke={t.loss}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath="url(#below)"
          />

          {hover !== null && (
            <g>
              <line
                x1={sx(hover)}
                x2={sx(hover)}
                y1={PAD.t}
                y2={PAD.t + ih}
                stroke={t.axis}
                strokeWidth={1}
              />
              <circle
                cx={sx(hover)}
                cy={sy(points[hover])}
                r={5}
                fill={points[hover] >= start ? t.gain : t.loss}
                stroke={t.surface}
                strokeWidth={2}
              />
            </g>
          )}

          <line
            x1={PAD.l}
            x2={w - PAD.r}
            y1={PAD.t + ih}
            y2={PAD.t + ih}
            stroke={t.axis}
            strokeWidth={1}
          />
          <text x={PAD.l} y={height - 6} fontSize={10} fill={t.muted}>
            bet 1
          </text>
          <text
            x={w - PAD.r}
            y={height - 6}
            fontSize={10}
            fill={t.muted}
            textAnchor="end"
            className="tnum"
          >
            bet {n}
          </text>
        </svg>

        {hover !== null && (
          <Tooltip x={sx(hover)} y={sy(points[hover])} w={w} dark={dark}>
            <strong className="tnum">{money(points[hover])}</strong>
            <span className="opacity-60"> after bet {hover + 1}</span>
            <br />
            <span
              className="tnum"
              style={{ color: points[hover] >= start ? t.gain : t.loss }}
            >
              {points[hover] - start >= 0 ? "+" : ""}
              {money(points[hover] - start)}
            </span>
          </Tooltip>
        )}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Profit distribution histogram — diverging by sign                 */
/* ------------------------------------------------------------------ */

export function ProfitHistogram({
  bins,
  trials,
  dark = false,
  height = 240,
  title = "Where sessions ended up",
  caption,
}: {
  bins: { lo: number; hi: number; count: number }[];
  trials: number;
  dark?: boolean;
  height?: number;
  title?: string;
  caption?: React.ReactNode;
}) {
  const t = theme(dark);
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { t: 12, r: 14, b: 32, l: 48 };
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const maxC = Math.max(1, ...bins.map((b) => b.count));

  // 2px surface gap between adjacent bars.
  const slot = iw / bins.length;
  const bw = Math.max(1, slot - 2);

  const zeroBin = bins.findIndex((b) => b.lo <= 0 && b.hi >= 0);
  const zeroX = PAD.l + (zeroBin >= 0 ? zeroBin : 0) * slot + slot / 2;

  return (
    <Figure
      title={title}
      caption={caption}
      legend={
        <>
          <LegendSwatch color={t.loss} label="Lost money" />
          <LegendSwatch color={t.gain} label="Made money" />
        </>
      }
      tableView={
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left opacity-60">
              <th className="py-1 pr-4 font-bold">Profit range</th>
              <th className="py-1 pr-4 font-bold">Sessions</th>
              <th className="py-1 font-bold">Share</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {bins.map((b, i) => (
              <tr key={i} className="border-t border-current/10">
                <td className="py-1 pr-4">
                  {money(b.lo)} – {money(b.hi)}
                </td>
                <td className="py-1 pr-4">{b.count.toLocaleString()}</td>
                <td className="py-1">{pct(b.count / trials, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div ref={ref} className="relative w-full">
        <svg width="100%" height={height} role="img" aria-label={title}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD.l}
              x2={w - PAD.r}
              y1={PAD.t + ih - f * ih}
              y2={PAD.t + ih - f * ih}
              stroke={t.grid}
              strokeWidth={1}
            />
          ))}

          {bins.map((b, i) => {
            const h = (b.count / maxC) * ih;
            const x = PAD.l + i * slot + 1;
            const positive = b.hi > 0;
            const active = hover === i;
            return (
              <rect
                key={i}
                x={x}
                y={PAD.t + ih - h}
                width={bw}
                height={Math.max(h, b.count > 0 ? 2 : 0)}
                rx={Math.min(4, bw / 2)}
                fill={positive ? t.gain : t.loss}
                opacity={hover === null || active ? 1 : 0.45}
                stroke={active ? t.surface : "none"}
                strokeWidth={2}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}

          {/* break-even */}
          <line
            x1={zeroX}
            x2={zeroX}
            y1={PAD.t}
            y2={PAD.t + ih}
            stroke={t.neutral}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <text
            x={zeroX}
            y={PAD.t - 2}
            fontSize={10}
            fill={t.muted}
            textAnchor="middle"
          >
            break even
          </text>

          <line
            x1={PAD.l}
            x2={w - PAD.r}
            y1={PAD.t + ih}
            y2={PAD.t + ih}
            stroke={t.axis}
            strokeWidth={1}
          />
          <text x={PAD.l} y={height - 8} fontSize={10} fill={t.muted} className="tnum">
            {money(bins[0]?.lo ?? 0)}
          </text>
          <text
            x={w - PAD.r}
            y={height - 8}
            fontSize={10}
            fill={t.muted}
            textAnchor="end"
            className="tnum"
          >
            {money(bins[bins.length - 1]?.hi ?? 0)}
          </text>
        </svg>

        {hover !== null && bins[hover] && (
          <Tooltip
            x={PAD.l + hover * slot + slot / 2}
            y={PAD.t + ih - (bins[hover].count / maxC) * ih}
            w={w}
            dark={dark}
          >
            <strong className="tnum">
              {pct(bins[hover].count / trials, 2)}
            </strong>
            <span className="opacity-60"> of sessions</span>
            <br />
            <span className="tnum opacity-75">
              {money(bins[hover].lo)} to {money(bins[hover].hi)}
            </span>
          </Tooltip>
        )}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Probability of being ahead — single series decay                  */
/* ------------------------------------------------------------------ */

export function ProbAheadCurve({
  series,
  dark = false,
  height = 220,
  markers = [],
  title = "Chance you are ahead, by number of bets",
  caption,
}: {
  series: { n: number; p: number }[];
  dark?: boolean;
  height?: number;
  markers?: { n: number; label: string }[];
  title?: string;
  caption?: React.ReactNode;
}) {
  const t = theme(dark);
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { t: 14, r: 16, b: 30, l: 44 };
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const maxN = series[series.length - 1]?.n ?? 1;

  // log x: the interesting collapse happens across orders of magnitude
  const lx = (n: number) =>
    r2(PAD.l + (Math.log10(Math.max(1, n)) / Math.log10(maxN)) * iw);
  const ly = (p: number) => r2(PAD.t + ih - p * ih);

  const path = series
    .map((d, i) => `${i ? "L" : "M"}${lx(d.n)},${ly(d.p)}`)
    .join(" ");

  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let bd = Infinity;
    series.forEach((d, i) => {
      const dd = Math.abs(lx(d.n) - px);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <Figure title={title} caption={caption}>
      <div
        ref={ref}
        className="relative w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg width="100%" height={height} role="img" aria-label={title}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <g key={p}>
              <line
                x1={PAD.l}
                x2={w - PAD.r}
                y1={ly(p)}
                y2={ly(p)}
                stroke={p === 0.5 ? t.axis : t.grid}
                strokeWidth={1}
                strokeDasharray={p === 0.5 ? "4 4" : undefined}
              />
              <text
                x={PAD.l - 7}
                y={ly(p)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill={t.muted}
                className="tnum"
              >
                {Math.round(p * 100)}%
              </text>
            </g>
          ))}

          <path
            d={`${path} L${lx(maxN)},${ly(0)} L${lx(1)},${ly(0)} Z`}
            fill={t.loss}
            opacity={0.12}
          />
          <path d={path} fill="none" stroke={t.loss} strokeWidth={2} strokeLinecap="round" />

          {markers.map((m) => (
            <g key={m.n}>
              <line
                x1={lx(m.n)}
                x2={lx(m.n)}
                y1={PAD.t}
                y2={PAD.t + ih}
                stroke={t.neutral}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={lx(m.n) + 4}
                y={PAD.t + 10}
                fontSize={9.5}
                fill={t.muted}
              >
                {m.label}
              </text>
            </g>
          ))}

          {hover !== null && series[hover] && (
            <circle
              cx={lx(series[hover].n)}
              cy={ly(series[hover].p)}
              r={5}
              fill={t.loss}
              stroke={t.surface}
              strokeWidth={2}
            />
          )}

          <text x={PAD.l} y={height - 6} fontSize={10} fill={t.muted}>
            1 bet
          </text>
          <text
            x={w - PAD.r}
            y={height - 6}
            fontSize={10}
            fill={t.muted}
            textAnchor="end"
            className="tnum"
          >
            {maxN.toLocaleString()} bets
          </text>
        </svg>

        {hover !== null && series[hover] && (
          <Tooltip x={lx(series[hover].n)} y={ly(series[hover].p)} w={w} dark={dark}>
            <span className="opacity-60">After </span>
            <strong className="tnum">{series[hover].n.toLocaleString()}</strong>
            <span className="opacity-60"> bets</span>
            <br />
            <strong className="tnum" style={{ color: t.loss }}>
              {pct(series[hover].p, 1)}
            </strong>
            <span className="opacity-60"> still ahead</span>
          </Tooltip>
        )}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* 2b. Small-multiple histogram — for racing several systems at once    */
/* ------------------------------------------------------------------ */

/**
 * A stripped-down ProfitHistogram for small multiples.
 *
 * Shared axes are the whole point: every panel is drawn on the SAME
 * profit range and the SAME count scale, so the differing silhouettes
 * are a real comparison instead of six charts each autoscaled to
 * flatter itself.
 */
export function MiniHistogram({
  bins,
  domain,
  maxCount,
  dark = false,
  height = 86,
}: {
  bins: { lo: number; hi: number; count: number }[];
  /** Shared [min, max] profit across every panel. */
  domain: [number, number];
  /** Shared tallest bar across every panel. */
  maxCount: number;
  dark?: boolean;
  height?: number;
}) {
  const t = theme(dark);
  const W = 260;
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const x = (v: number) => r2(((v - lo) / span) * W);
  const zero = x(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden
      className="block"
    >
      {bins.map((b, i) => {
        if (!b.count) return null;
        const bx = x(b.lo);
        const bw = Math.max(2.5, x(b.hi) - bx - 1);
        const h = r2((b.count / maxCount) * (height - 10));
        return (
          <rect
            key={i}
            x={bx}
            y={height - h}
            width={bw}
            height={h}
            rx={1.5}
            fill={b.hi > 0 ? t.gain : t.loss}
          />
        );
      })}
      <line
        x1={0}
        x2={W}
        y1={height - 0.5}
        y2={height - 0.5}
        stroke={t.grid}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={zero}
        x2={zero}
        y1={0}
        y2={height}
        stroke={t.neutral}
        strokeWidth={1.5}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Observed vs expected — one bar series + a reference tick          */
/* ------------------------------------------------------------------ */

/**
 * Deliberately NOT two bar series. The expected value is a reference
 * marker, not a competing measurement — drawing it as a tick keeps one
 * visual hierarchy and makes "did reality reach the line yet" the only
 * question the chart asks.
 */
export function DistributionChart({
  bins,
  total,
  dark = false,
  height = 230,
  title = "Observed vs expected",
  caption,
}: {
  bins: { label: string; observed: number; expected: number }[];
  total: number;
  dark?: boolean;
  height?: number;
  title?: string;
  caption?: React.ReactNode;
}) {
  const t = theme(dark);
  const [hover, setHover] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(640);

  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { t: 14, r: 12, b: 28, l: 40 };
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const maxV = Math.max(
    ...bins.map((b) => Math.max(b.expected, total > 0 ? b.observed / total : 0)),
  );
  const scale = (v: number) => r2(maxV > 0 ? (v / maxV) * ih : 0);
  const slot = iw / bins.length;
  const bw = Math.max(1, slot - 6);

  return (
    <Figure
      title={title}
      caption={caption}
      legend={
        <>
          <LegendSwatch color={t.gain} label="Observed" />
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide uppercase opacity-70">
            <span
              className="inline-block h-[3px] w-4 rounded-full"
              style={{ background: t.neutral }}
            />
            Expected
          </span>
        </>
      }
    >
      <div ref={ref} className="relative w-full">
        <svg width="100%" height={height} role="img" aria-label={title}>
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={PAD.l}
              x2={w - PAD.r}
              y1={PAD.t + ih - f * ih}
              y2={PAD.t + ih - f * ih}
              stroke={t.grid}
              strokeWidth={1}
            />
          ))}

          {bins.map((b, i) => {
            const obs = total > 0 ? b.observed / total : 0;
            const h = scale(obs);
            const x = PAD.l + i * slot + (slot - bw) / 2;
            const ey = PAD.t + ih - scale(b.expected);
            const active = hover === i;
            return (
              <g
                key={b.label}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                <rect
                  x={PAD.l + i * slot}
                  y={PAD.t}
                  width={slot}
                  height={ih}
                  fill="transparent"
                />
                <rect
                  x={x}
                  y={PAD.t + ih - h}
                  width={bw}
                  height={Math.max(h, obs > 0 ? 2 : 0)}
                  rx={4}
                  fill={t.gain}
                  opacity={hover === null || active ? 0.9 : 0.45}
                />
                <line
                  x1={x - 3}
                  x2={x + bw + 3}
                  y1={ey}
                  y2={ey}
                  stroke={t.neutral}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <text
                  x={PAD.l + i * slot + slot / 2}
                  y={height - 9}
                  fontSize={10}
                  fill={t.muted}
                  textAnchor="middle"
                  className="tnum"
                >
                  {b.label}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.l}
            x2={w - PAD.r}
            y1={PAD.t + ih}
            y2={PAD.t + ih}
            stroke={t.axis}
            strokeWidth={1}
          />
        </svg>

        {hover !== null && bins[hover] && (
          <Tooltip
            x={PAD.l + hover * slot + slot / 2}
            y={PAD.t + ih - scale(total > 0 ? bins[hover].observed / total : 0)}
            w={w}
            dark={dark}
          >
            <strong className="tnum">Total {bins[hover].label}</strong>
            <br />
            <span className="tnum opacity-75">
              rolled {bins[hover].observed.toLocaleString()}× ={" "}
              {pct(total > 0 ? bins[hover].observed / total : 0, 1)}
            </span>
            <br />
            <span className="tnum opacity-60">
              expected {pct(bins[hover].expected, 1)}
            </span>
          </Tooltip>
        )}
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Edge comparison — sequential magnitude, one hue                   */
/* ------------------------------------------------------------------ */

export function EdgeBars({
  rows,
  dark = false,
  title = "House edge by bet",
  caption,
  max,
}: {
  rows: { label: string; edge: number; note?: string }[];
  dark?: boolean;
  title?: string;
  caption?: React.ReactNode;
  max?: number;
}) {
  const t = theme(dark);
  const hi = max ?? Math.max(...rows.map((r) => r.edge));

  return (
    <Figure title={title} caption={caption}>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          // Sequential: one hue, opacity encodes magnitude. Never a rainbow.
          const f = hi > 0 ? r.edge / hi : 0;
          return (
            <li key={r.label} className="grid grid-cols-[minmax(7rem,11rem)_1fr_4rem] items-center gap-3">
              <span className="truncate text-xs font-bold" title={r.label}>
                {r.label}
              </span>
              <span
                className="relative h-5 overflow-hidden rounded-[4px]"
                style={{ background: t.grid }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-[4px]"
                  style={{
                    width: `${Math.max(1.5, f * 100)}%`,
                    background: t.loss,
                    opacity: 0.35 + f * 0.65,
                  }}
                />
              </span>
              <span className="tnum text-right font-mono text-xs font-bold">
                {pct(r.edge, 2)}
              </span>
              {r.note && (
                <span className="col-span-3 -mt-1 text-[0.68rem] opacity-55">
                  {r.note}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Figure>
  );
}
