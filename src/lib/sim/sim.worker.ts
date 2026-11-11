/// <reference lib="webworker" />

/**
 * Monte Carlo off the main thread.
 *
 * A hundred thousand sessions is a few hundred million spins. Run that
 * inline and the tab freezes, the animation stutters, and the point —
 * that the aggregate is smooth and inevitable — gets lost in jank.
 *
 * Requests carry a LIST of strategies so the six betting systems can be
 * raced against one another in a single pass, on one config. Comparing
 * them side by side is the whole argument; comparing them one at a time
 * asks the reader to hold five numbers in their head.
 */

import {
  binProfits,
  runMonteCarlo,
  type MonteCarloResult,
  type SessionConfig,
} from "./engine";
import { STRATEGIES, type StrategyId } from "../strategies";

export type SimRequest = {
  id: number;
  config: SessionConfig;
  trials: number;
  /** One Monte Carlo per entry. Defaults to the config's own strategy. */
  strategies?: StrategyId[];
};

export interface StrategyRun {
  strategy: StrategyId;
  result: MonteCarloResult;
}

export type SimResponse =
  | { id: number; type: "progress"; done: number; total: number; label: string }
  | { id: number; type: "result"; results: StrategyRun[] }
  | { id: number; type: "error"; message: string };

self.onmessage = (e: MessageEvent<SimRequest>) => {
  const { id, config, trials, strategies } = e.data;
  const list = strategies?.length ? strategies : [config.strategy];
  const post = (m: SimResponse) => self.postMessage(m);

  try {
    const results: StrategyRun[] = [];
    const grandTotal = list.length * trials;
    let lastPost = 0;

    const isRace = list.length > 1;

    for (let i = 0; i < list.length; i++) {
      const strategy = list[i];
      const result = runMonteCarlo(
        { ...config, strategy },
        trials,
        (done) => {
          const now = Date.now();
          // Throttle: progress messages are cheap individually, ruinous
          // in bulk — and six strategies multiply the message count.
          if (now - lastPost > 60) {
            lastPost = now;
            post({
              id,
              type: "progress",
              done: i * trials + done,
              total: grandTotal,
              label: STRATEGIES[strategy].name,
            });
          }
        },
        isRace,
      );
      results.push({ strategy, result });
    }

    if (isRace) {
      // Re-bin every run onto ONE set of edges spanning all of them.
      // Per-panel bins would give each system a different bar width and
      // a different zero position, which makes the small multiples look
      // like a comparison while quietly not being one.
      const lo = Math.min(...results.map((r) => r.result.worstProfit));
      const hi = Math.max(...results.map((r) => r.result.bestProfit));
      for (const r of results) {
        if (!r.result.profits) continue;
        r.result.histogram = binProfits(r.result.profits, lo, hi);
        // Drop the sample before it crosses the thread boundary.
        delete r.result.profits;
      }
    }

    post({ id, type: "result", results });
  } catch (err) {
    post({
      id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
