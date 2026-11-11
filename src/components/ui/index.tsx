import * as React from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */

type BadgeTone =
  | "violet" | "ember" | "lagoon" | "mint" | "amber" | "thistle" | "paper" | "ink";

const BADGE_TONES: Record<BadgeTone, string> = {
  violet: "bg-violet text-white",
  ember: "bg-ember text-white",
  lagoon: "bg-lagoon text-ink",
  mint: "bg-mint text-ink",
  amber: "bg-amber text-ink",
  thistle: "bg-thistle text-ink",
  paper: "bg-paper text-ink",
  ink: "bg-ink text-cream",
};

export function Badge({
  tone = "paper",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cx("badge", BADGE_TONES[tone], className)}>{children}</span>
  );
}

/* ------------------------------------------------------------------ */

export function Panel({
  className,
  tone = "paper",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "paper" | "felt" | "cream" }) {
  const base =
    tone === "felt" ? "felt-panel" : tone === "cream" ? "brut bg-cream" : "brut";
  return (
    <div className={cx(base, "p-6 md:p-8", className)} {...rest}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-violet text-white",
  secondary: "bg-paper text-ink",
  danger: "bg-ember text-white",
  ghost: "bg-transparent text-ink shadow-none hover:bg-ink/5",
};

export function Button({
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        variant === "ghost"
          ? "rounded-[50px] border-2 border-ink px-5 py-2.5"
          : "brut-sm brut-press rounded-[50px] px-5 py-2.5",
        "cursor-pointer text-sm font-bold tracking-wide uppercase",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */

/**
 * A single number, given room to land.
 * Tone is semantic and consistent sitewide: ember = the house's money.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "ink",
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ink" | "ember" | "lagoon" | "win" | "cream";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const toneClass = {
    ink: "text-ink",
    ember: "text-ember",
    lagoon: "text-lagoon",
    win: "text-win",
    cream: "text-cream",
  }[tone];

  const sizeClass = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl md:text-6xl",
  }[size];

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <span className="text-[0.7rem] font-bold tracking-[0.08em] uppercase opacity-60">
        {label}
      </span>
      <span
        className={cx(
          "tnum font-mono leading-none font-bold tracking-tight",
          sizeClass,
          toneClass,
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs leading-snug opacity-65">{sub}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: "note" | "warning" | "key";
  title?: string;
  children: React.ReactNode;
}) {
  const style = {
    note: { bg: "bg-mint", label: "Note", tone: "mint" as const },
    warning: { bg: "bg-amber", label: "Watch out", tone: "amber" as const },
    key: { bg: "bg-thistle", label: "The point", tone: "thistle" as const },
  }[kind];

  return (
    <aside className={cx("brut-flat my-8 p-6", style.bg)}>
      <Badge tone="ink" className="mb-3">
        {title ?? style.label}
      </Badge>
      <div className="[&_p]:mb-3 [&_p:last-child]:mb-0 text-[0.975rem] leading-relaxed">
        {children}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "ink",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: "ink" | "cream";
  className?: string;
}) {
  return (
    <header className={cx("max-w-3xl", className)}>
      {eyebrow && (
        <Badge tone={tone === "cream" ? "violet" : "violet"} className="mb-5">
          {eyebrow}
        </Badge>
      )}
      <h2
        className={cx(
          "text-h3 md:text-h2 font-bold text-balance",
          tone === "cream" ? "text-cream" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lede && (
        <p
          className={cx(
            "mt-5 text-lg leading-relaxed text-pretty",
            tone === "cream" ? "text-cream/75" : "text-ink/70",
          )}
        >
          {lede}
        </p>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  dark,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span
          className={cx(
            "text-[0.7rem] font-bold tracking-[0.08em] uppercase",
            dark ? "text-cream/60" : "opacity-60",
          )}
        >
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className={cx(
          "inline-flex flex-wrap gap-1 rounded-[50px] border-2 border-ink p-1",
          dark ? "bg-felt-deep" : "bg-paper",
        )}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              title={o.hint}
              onClick={() => onChange(o.value)}
              className={cx(
                "cursor-pointer rounded-[50px] px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors",
                active
                  ? "bg-violet text-white"
                  : dark
                    ? "text-cream/70 hover:bg-cream/10"
                    : "text-ink/70 hover:bg-ink/5",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  dark,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  dark?: boolean;
  hint?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cx(
            "text-[0.7rem] font-bold tracking-[0.08em] uppercase",
            dark ? "text-cream/60" : "opacity-60",
          )}
        >
          {label}
        </label>
        <span
          className={cx(
            "tnum font-mono text-sm font-bold",
            dark ? "text-cream" : "text-ink",
          )}
        >
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cx(
          "h-2 w-full cursor-pointer appearance-none rounded-full border-2 border-ink",
          dark ? "bg-felt-deep" : "bg-gainsboro",
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink",
          "[&::-webkit-slider-thumb]:bg-violet [&::-webkit-slider-thumb]:cursor-grab",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-violet",
        )}
      />
      {hint && (
        <span className={cx("text-xs", dark ? "text-cream/45" : "opacity-50")}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Marquee({
  items,
  tone = "ink",
}: {
  items: string[];
  tone?: "ink" | "ember" | "violet";
}) {
  const bg = { ink: "bg-ink", ember: "bg-ember", violet: "bg-violet" }[tone];
  const doubled = [...items, ...items];
  return (
    <div
      className={cx(
        "marquee-host overflow-hidden border-y-2 border-ink py-3",
        bg,
      )}
      aria-hidden
    >
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-6 px-6 text-sm font-bold tracking-[0.12em] whitespace-nowrap text-white uppercase"
          >
            {t}
            <span className="text-white/40">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Horizontal scroll wrapper so wide tables stay usable on phones. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="brut-flat my-8 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}
