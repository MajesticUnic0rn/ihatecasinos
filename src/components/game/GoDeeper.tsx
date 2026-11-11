"use client";

import * as React from "react";
import { cx } from "@/components/ui";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const clientHash = () => window.location.hash.slice(1);
const serverHash = () => "";

/**
 * Everything past the basics lives behind this.
 *
 * Children mount only once the section is first opened. That keeps the
 * page light for someone who just wants to play — the Monte Carlo
 * worker, the counting simulator and the strategy chart cost nothing
 * until asked for — and it keeps them mounted afterwards, so closing and
 * reopening doesn't throw away a simulation you just ran.
 *
 * `anchors` lists ids that live inside. A link such as
 * /roulette#simulator opens the section automatically and scrolls to it,
 * so deep links from other pages keep working even though the target
 * isn't in the DOM at page load. The hash is read through
 * useSyncExternalStore so the server render (closed) and the first
 * client render agree, and there is no hydration mismatch.
 */
export function GoDeeper({
  topics,
  anchors = [],
  children,
}: {
  topics: string[];
  anchors?: string[];
  children: React.ReactNode;
}) {
  const hash = React.useSyncExternalStore(subscribe, clientHash, serverHash);
  const linked = anchors.includes(hash);

  const [userOpen, setUserOpen] = React.useState<boolean | null>(null);
  const [everOpened, setEverOpened] = React.useState(false);
  const open = userOpen ?? linked;
  const show = everOpened || open;
  const id = React.useId();

  React.useEffect(() => {
    if (!linked) return;
    // The target only exists after this render commits.
    const raf = requestAnimationFrame(() =>
      document.getElementById(hash)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(raf);
  }, [linked, hash]);

  const toggle = () => {
    setUserOpen(!open);
    setEverOpened(true);
  };

  return (
    <section className="border-b-2 border-ink bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          className="brut brut-press flex w-full cursor-pointer flex-col gap-4 p-6 text-left md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div>
            <span className="mb-2 block text-[0.7rem] font-bold tracking-[0.08em] text-violet uppercase">
              Optional
            </span>
            <span className="text-h4 block font-bold">
              {open ? "Hide the deeper math" : "Go deeper: the math behind it"}
            </span>
            <span className="mt-3 flex flex-wrap gap-2">
              {topics.map((t) => (
                <span
                  key={t}
                  className="rounded-[50px] border-2 border-ink/20 px-3 py-1 text-xs font-bold opacity-70"
                >
                  {t}
                </span>
              ))}
            </span>
          </div>
          <span
            aria-hidden
            className={cx(
              "grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink bg-violet text-xl text-white transition-transform",
              open && "rotate-180",
            )}
          >
            ↓
          </span>
        </button>
      </div>

      <div id={id} hidden={!open}>
        {show && children}
      </div>
    </section>
  );
}
