import { Badge, cx } from "@/components/ui";

export function PageHero({
  eyebrow,
  title,
  lede,
  stats,
  accent = "violet",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede: React.ReactNode;
  stats?: { label: string; value: string; note?: string }[];
  accent?: "violet" | "ember" | "lagoon" | "amber";
}) {
  const accentBg = {
    violet: "bg-violet",
    ember: "bg-ember",
    lagoon: "bg-lagoon",
    amber: "bg-amber",
  }[accent];

  return (
    <section className="felt grain relative overflow-hidden border-b-2 border-ink">
      <div
        aria-hidden
        className={cx(
          "absolute -top-32 -right-24 h-80 w-80 rounded-full opacity-20 blur-3xl",
          accentBg,
        )}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <Badge tone="paper" className="mb-6">
          {eyebrow}
        </Badge>
        <h1 className="text-h1 md:text-display max-w-4xl font-bold text-balance text-cream">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-cream/70 md:text-xl">
          {lede}
        </p>

        {stats && (
          <dl className="mt-12 grid gap-6 border-t border-cream/15 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5">
                <dt className="text-[0.7rem] font-bold tracking-[0.08em] text-cream/45 uppercase">
                  {s.label}
                </dt>
                <dd className="tnum font-mono text-3xl font-bold text-cream md:text-4xl">
                  {s.value}
                </dd>
                {s.note && (
                  <dd className="text-xs leading-snug text-cream/50">{s.note}</dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  tone = "cream",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  tone?: "cream" | "paper" | "felt";
  className?: string;
}) {
  const bg = {
    cream: "bg-cream",
    paper: "bg-paper",
    felt: "felt grain relative",
  }[tone];
  const dark = tone === "felt";

  return (
    <section
      id={id}
      className={cx(bg, "border-b-2 border-ink scroll-mt-20", className)}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        {(eyebrow || title) && (
          <header className="mb-10 max-w-3xl md:mb-14">
            {eyebrow && (
              <Badge tone={dark ? "violet" : "violet"} className="mb-5">
                {eyebrow}
              </Badge>
            )}
            {title && (
              <h2
                className={cx(
                  "text-h3 md:text-h2 font-bold text-balance",
                  dark ? "text-cream" : "text-ink",
                )}
              >
                {title}
              </h2>
            )}
            {lede && (
              <div
                className={cx(
                  "mt-5 text-lg leading-relaxed text-pretty",
                  dark ? "text-cream/70" : "text-ink/70",
                )}
              >
                {lede}
              </div>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** Long-form reading column. Keeps measure sane inside wide sections. */
export function Prose({
  children,
  className,
  dark,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cx(
        "max-w-[68ch] text-[1.05rem] leading-[1.75]",
        "[&>p]:mb-5 [&>h3]:mt-10 [&>h3]:mb-3 [&>h3]:text-h4 [&>h3]:font-bold",
        "[&>ul]:mb-5 [&>ul]:flex [&>ul]:flex-col [&>ul]:gap-2.5 [&>ul]:pl-5 [&_li]:list-disc",
        "[&_strong]:font-bold [&_em]:italic",
        dark ? "text-cream/80 [&>h3]:text-cream" : "text-ink/85 [&>h3]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
