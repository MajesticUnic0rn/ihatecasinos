"use client";

import * as React from "react";
import {
  FINISH_META,
  SUIT_GLYPH,
  SUIT_IS_RED,
  isFaceCard,
  pipsFor,
  type Card,
  type Finish,
} from "@/lib/cards";
import { cx } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* The face, as SVG                                                    */
/* ------------------------------------------------------------------ */

const W = 100;
const H = 140;
const PAD = 10;
const INNER = { x: 22, y: 16, w: W - 44, h: H - 32 };

function Pip({
  x,
  y,
  suit,
  size = 13,
}: {
  x: number;
  y: number;
  suit: Card["suit"];
  size?: number;
}) {
  const px = INNER.x + x * INNER.w;
  const py = INNER.y + y * INNER.h;
  const flip = y > 0.52;
  return (
    <text
      x={px}
      y={py}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      transform={flip ? `rotate(180 ${px} ${py})` : undefined}
      className="select-none"
    >
      {SUIT_GLYPH[suit]}
    </text>
  );
}

/**
 * Face cards get a geometric emblem rather than a portrait. Portraits
 * at thumbnail size turn to mud; a heavy monogram stays readable at
 * 40px, which is the size most of these are actually rendered at.
 */
function FaceEmblem({ card }: { card: Card }) {
  const { rank, suit } = card;
  return (
    <g>
      <rect
        x={INNER.x + 3}
        y={INNER.y + 3}
        width={INNER.w - 6}
        height={INNER.h - 6}
        rx={6}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        opacity={0.28}
      />
      <text
        x={W / 2}
        y={H / 2 - 7}
        fontSize={40}
        fontWeight={800}
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none"
        style={{ letterSpacing: "-0.04em" }}
      >
        {rank}
      </text>
      <text
        x={W / 2}
        y={H / 2 + 24}
        fontSize={22}
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none"
      >
        {SUIT_GLYPH[suit]}
      </text>
    </g>
  );
}

function CardFace({ card }: { card: Card }) {
  const red = SUIT_IS_RED[card.suit];
  const ink = red ? "var(--color-suit-red)" : "var(--color-suit-black)";
  const pips = pipsFor(card.rank);
  const cornerSize = card.rank === "10" ? 15 : 18;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ color: ink, display: "block" }}
      role="img"
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <rect
        x={1.75}
        y={1.75}
        width={W - 3.5}
        height={H - 3.5}
        rx={10}
        fill="#fdfcf8"
        stroke="var(--color-suit-black)"
        strokeWidth={3.5}
      />

      {/* corner indices, top-left and bottom-right rotated */}
      <g fill="currentColor" fontWeight={800} style={{ letterSpacing: "-0.05em" }}>
        <text x={PAD} y={PAD + 5} fontSize={cornerSize} textAnchor="middle" dominantBaseline="hanging">
          {card.rank}
        </text>
        <text x={PAD} y={PAD + cornerSize + 9} fontSize={12} textAnchor="middle" dominantBaseline="hanging">
          {SUIT_GLYPH[card.suit]}
        </text>

        <g transform={`rotate(180 ${W - PAD} ${H - PAD - 5})`}>
          <text x={W - PAD} y={H - PAD - 10} fontSize={cornerSize} textAnchor="middle" dominantBaseline="hanging">
            {card.rank}
          </text>
          <text x={W - PAD} y={H - PAD + cornerSize - 6} fontSize={12} textAnchor="middle" dominantBaseline="hanging">
            {SUIT_GLYPH[card.suit]}
          </text>
        </g>
      </g>

      <g fill="currentColor">
        {isFaceCard(card.rank) || card.rank === "A" ? (
          card.rank === "A" ? (
            <text
              x={W / 2}
              y={H / 2}
              fontSize={46}
              textAnchor="middle"
              dominantBaseline="central"
              className="select-none"
            >
              {SUIT_GLYPH[card.suit]}
            </text>
          ) : (
            <FaceEmblem card={card} />
          )
        ) : (
          pips?.map(([x, y], i) => (
            <Pip key={i} x={x} y={y} suit={card.suit} />
          ))
        )}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The back                                                            */
/* ------------------------------------------------------------------ */

function CardBack() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }} aria-hidden>
      <defs>
        <pattern id="cb" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="var(--color-ink)" />
          <circle cx="5" cy="5" r="2.1" fill="var(--color-violet)" />
        </pattern>
      </defs>
      <rect x={1.75} y={1.75} width={W - 3.5} height={H - 3.5} rx={10} fill="var(--color-ink)" stroke="var(--color-suit-black)" strokeWidth={3.5} />
      <rect x={8} y={8} width={W - 16} height={H - 16} rx={6} fill="url(#cb)" />
      <rect x={8} y={8} width={W - 16} height={H - 16} rx={6} fill="none" stroke="var(--color-cream)" strokeWidth={2} opacity={0.5} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Finishes — the Balatro part                                         */
/* ------------------------------------------------------------------ */

/**
 * Balatro's foil/holo shaders map a noise or hex-grid field into an
 * HSL hue rotation and composite it back over the sprite. We get the
 * same read with layered CSS gradients and blend modes — no WebGL
 * context, no shader compile, and the card underneath stays real
 * DOM/SVG that a screen reader can still announce.
 */
function FinishOverlay({ finish, tilt }: { finish: Finish; tilt: { x: number; y: number } }) {
  if (finish === "none") return null;

  const shift = `${50 + tilt.y * 55}% ${50 - tilt.x * 55}%`;

  if (finish === "foil") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[7%] opacity-40 mix-blend-color-dodge"
        style={{
          background: `linear-gradient(${115 + tilt.x * 40}deg, transparent 20%, rgba(96,174,254,.55) 38%, rgba(255,255,255,.85) 48%, rgba(96,174,254,.55) 58%, transparent 78%)`,
          backgroundSize: "200% 200%",
          backgroundPosition: shift,
        }}
      />
    );
  }

  if (finish === "holo") {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[7%] opacity-30 mix-blend-color-dodge"
          style={{
            background:
              "conic-gradient(from 210deg, #ff611e, #ffa352, #4bc292, #60aefe, #6e61ff, #d1a4ff, #ff611e)",
            backgroundSize: "260% 260%",
            backgroundPosition: shift,
          }}
        />
        {/* hex grid, straight out of the original holo shader */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[7%] opacity-18 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,.9) 1px, transparent 1.6px)",
            backgroundSize: "7px 7px",
            backgroundPosition: shift,
          }}
        />
      </>
    );
  }

  // polychrome
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[7%] opacity-28 mix-blend-hard-light"
      style={{
        background: `linear-gradient(${60 + tilt.y * 60}deg, #ff611e, #ffa352, #dcf7e7, #60aefe, #6e61ff)`,
        backgroundSize: "180% 180%",
        backgroundPosition: shift,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* The component                                                       */
/* ------------------------------------------------------------------ */

export interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  finish?: Finish;
  /** Rendered width in px. Height follows the 1:1.4 poker ratio. */
  width?: number;
  /** Static rotation, for fanned hands. */
  rotate?: number;
  /** Lift it out of the hand — selected, or just dealt. */
  raised?: boolean;
  /** Disable pointer tilt (useful in dense tables). */
  interactive?: boolean;
  /** Stagger idle float so a row of cards doesn't breathe in lockstep. */
  index?: number;
  className?: string;
  onClick?: () => void;
  label?: string;
}

export function PlayingCard({
  card,
  faceDown = false,
  finish = "none",
  width = 92,
  rotate = 0,
  raised = false,
  interactive = true,
  index = 0,
  className,
  onClick,
  label,
}: PlayingCardProps) {
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (!interactive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  };

  const reset = () => setTilt({ x: 0, y: 0 });

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      // @ts-expect-error — polymorphic tag, ref type differs per element
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onClick={onClick}
      aria-label={label ?? (faceDown ? "Face-down card" : card ? `${card.rank} of ${card.suit}` : undefined)}
      className={cx(
        "relative shrink-0",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        width,
        height: width * 1.4,
        perspective: 700,
        transform: `rotate(${rotate}deg) translateY(${raised ? -14 : 0}px)`,
        transition: "transform .28s var(--ease-out-brut)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${tilt.x * 14}deg) rotateX(${-tilt.y * 14}deg) scale(${
            tilt.x || tilt.y ? 1.045 : 1
          })`,
          transition: "transform .16s var(--ease-out-brut)",
          filter: `drop-shadow(${2 - tilt.x * 4}px ${5 - tilt.y * 3}px 0 rgba(3,25,38,.45))`,
          animation:
            interactive && !tilt.x && !tilt.y
              ? `cardFloat 5s ease-in-out ${index * 0.22}s infinite`
              : undefined,
        }}
      >
        {faceDown || !card ? <CardBack /> : <CardFace card={card} />}
        {!faceDown && card && <FinishOverlay finish={finish} tilt={tilt} />}
      </div>
    </Tag>
  );
}

/** A fanned hand with natural arc + rotation. */
export function Hand({
  cards,
  width = 86,
  finishes,
  faceDown,
  className,
}: {
  cards: Card[];
  width?: number;
  finishes?: Finish[];
  faceDown?: boolean[];
  className?: string;
}) {
  const n = cards.length;
  const spread = Math.min(9, 26 / Math.max(1, n - 1));

  return (
    <div className={cx("flex items-end justify-center", className)}>
      {cards.map((c, i) => {
        const mid = (n - 1) / 2;
        const offset = i - mid;
        return (
          <div
            key={`${c.id}-${i}`}
            style={{
              marginLeft: i === 0 ? 0 : -width * 0.22,
              transform: `translateY(${Math.abs(offset) * 5}px)`,
              zIndex: i,
            }}
          >
            <PlayingCard
              card={c}
              width={width}
              index={i}
              rotate={offset * spread}
              finish={finishes?.[i] ?? "none"}
              faceDown={faceDown?.[i]}
            />
          </div>
        );
      })}
    </div>
  );
}

export { FINISH_META };
