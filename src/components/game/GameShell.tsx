import * as React from "react";
import { Badge, cx } from "@/components/ui";

/**
 * The simple page shape every game shares:
 *
 *   1. what the game is, in one line
 *   2. how to play, in a few steps
 *   3. here's $1,000 — play
 *   4. what actually happened, in two or three numbers
 *
 * Anything more lives in <GoDeeper>.
 */

export function GameHeader({
  game,
  title,
  tagline,
}: {
  game: string;
  title: React.ReactNode;
  tagline: React.ReactNode;
}) {
  return (
    <section className="felt grain relative border-b-2 border-ink">
      <div className="relative z-10 mx-auto max-w-7xl px-5 pt-12 pb-10 md:px-8 md:pt-16">
        <Badge tone="paper" className="mb-4">
          {game}
        </Badge>
        <h1 className="text-h2 md:text-h1 max-w-4xl font-bold text-balance text-cream">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-cream/70">
          {tagline}
        </p>
      </div>
    </section>
  );
}

export interface Step {
  title: string;
  body: React.ReactNode;
  /** Optional small visual: a few cards, a pocket, a dice pair. */
  visual?: React.ReactNode;
}

export function HowToPlay({
  steps,
  catchLine,
}: {
  steps: Step[];
  /** The one sentence about where the house gets its money. */
  catchLine: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-ink bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-14">
        <h2 className="text-h4 md:text-h3 mb-8 font-bold">How to play</h2>
        <ol
          className={cx(
            "grid gap-5",
            steps.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
          )}
        >
          {steps.map((s, i) => (
            <li key={s.title} className="brut-flat flex flex-col gap-3 bg-cream p-5">
              <span className="tnum grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-violet font-mono font-bold text-white">
                {i + 1}
              </span>
              <h3 className="font-bold">{s.title}</h3>
              <div className="text-sm leading-relaxed opacity-80">{s.body}</div>
              {s.visual && <div className="mt-auto pt-2">{s.visual}</div>}
            </li>
          ))}
        </ol>

        <div className="brut-flat mt-6 flex flex-col gap-2 bg-amber p-5 md:flex-row md:items-center md:gap-5">
          <Badge tone="ink" className="self-start md:self-center">
            The catch
          </Badge>
          <p className="leading-relaxed">{catchLine}</p>
        </div>
      </div>
    </section>
  );
}

export function PlaySection({
  id = "play",
  title = "Your turn. Here’s $1,000.",
  hint,
  children,
}: {
  id?: string;
  title?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="felt grain relative scroll-mt-16 border-b-2 border-ink">
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-14">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <h2 className="text-h3 font-bold text-cream">{title}</h2>
          {hint && <p className="max-w-md text-sm text-cream/60">{hint}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function TakeAway({
  numbers,
  line,
}: {
  numbers: { value: string; label: string }[];
  line: React.ReactNode;
}) {
  return (
    <section className="border-b-2 border-ink bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <h2 className="text-h4 md:text-h3 mb-8 font-bold">What actually happens</h2>
        <dl className="grid gap-5 sm:grid-cols-3">
          {numbers.map((n) => (
            <div key={n.label} className="brut-flat bg-cream p-5">
              <dd className="tnum font-mono text-4xl font-bold text-chart-loss">{n.value}</dd>
              <dt className="mt-2 text-sm leading-snug opacity-75">{n.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed">{line}</p>
      </div>
    </section>
  );
}
