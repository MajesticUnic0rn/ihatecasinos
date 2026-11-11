"use client";

import * as React from "react";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { parseCard, type Finish } from "@/lib/cards";

const DEMO: { id: string; finish: Finish }[] = [
  { id: "Ks", finish: "holo" },
  { id: "5h", finish: "foil" },
  { id: "8d", finish: "polychrome" },
  { id: "Ac", finish: "holo" },
  { id: "3s", finish: "foil" },
];

export function CardShowcase() {
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="flex items-end justify-center"
        onPointerLeave={() => setHovered(null)}
      >
        {DEMO.map((d, i) => {
          const mid = (DEMO.length - 1) / 2;
          const offset = i - mid;
          return (
            <div
              key={d.id}
              onPointerEnter={() => setHovered(i)}
              style={{
                marginLeft: i === 0 ? 0 : -26,
                zIndex: hovered === i ? 20 : i,
                transform: `translateY(${Math.abs(offset) * 7}px)`,
              }}
            >
              <PlayingCard
                card={parseCard(d.id)}
                finish={d.finish}
                width={104}
                index={i}
                rotate={offset * 7}
                raised={hovered === i}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
