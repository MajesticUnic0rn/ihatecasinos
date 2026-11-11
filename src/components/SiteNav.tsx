"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/components/ui";
import { NAV } from "@/lib/nav";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-cream/92 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8"
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-bold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span className="grid h-9 w-9 place-items-center rounded-[10px] border-2 border-ink bg-ember text-base text-white shadow-[3px_3px_0_0_var(--color-ink)] transition-transform group-hover:-rotate-12">
            ♠
          </span>
          <span className="text-[0.95rem] leading-tight">
            I Hate
            <br className="hidden sm:block" /> Casinos
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.note}
                  className={cx(
                    "rounded-[50px] px-4 py-2 text-sm font-bold transition-colors",
                    active
                      ? "border-2 border-ink bg-violet text-white"
                      : "border-2 border-transparent hover:border-ink hover:bg-paper",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/#games"
            className="brut-sm brut-press hidden rounded-[50px] bg-ink px-4 py-2 text-xs font-bold tracking-wide text-cream uppercase sm:block"
          >
            Play with $1,000
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle menu"
            className="brut-sm brut-press h-10 w-10 rounded-[12px] bg-paper text-lg leading-none lg:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t-2 border-ink bg-paper lg:hidden">
          {NAV.map((item) => (
            <li key={item.href} className="border-b border-ink/15 last:border-0">
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline justify-between gap-4 px-6 py-4"
              >
                <span className="font-bold">{item.label}</span>
                <span className="text-xs opacity-55">{item.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
