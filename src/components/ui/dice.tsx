/**
 * Dice faces drawn as SVG.
 *
 * The Unicode die glyphs (U+2680–2685) look tidy where they exist, but
 * they are missing from the site font and from many fallback stacks, so
 * on a lot of machines they render as empty boxes. Drawing them costs a
 * few bytes and looks the same everywhere.
 */

const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

export function Die({
  value,
  size = 18,
  light = true,
}: {
  value: number;
  size?: number;
  /** White die with dark pips (default) or the reverse. */
  light?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="inline-block shrink-0 align-middle"
    >
      <rect
        x="0.75"
        y="0.75"
        width="14.5"
        height="14.5"
        rx="3"
        fill={light ? "#fdfcf8" : "#031926"}
        stroke={light ? "#031926" : "#fdfcf8"}
        strokeWidth="1.2"
      />
      {PIPS[value]?.map(([x, y], i) => (
        <circle
          key={i}
          cx={x * 4}
          cy={y * 4}
          r="1.45"
          fill={value === 1 ? "#d4420f" : light ? "#031926" : "#fdfcf8"}
        />
      ))}
    </svg>
  );
}

export function DicePair({
  a,
  b,
  size = 18,
  gap = 3,
}: {
  a: number;
  b: number;
  size?: number;
  gap?: number;
}) {
  return (
    <span className="inline-flex items-center" style={{ gap }}>
      <Die value={a} size={size} />
      <Die value={b} size={size} />
    </span>
  );
}
