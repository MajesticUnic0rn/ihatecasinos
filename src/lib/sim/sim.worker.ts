/// <reference lib="webworker" />

/**
 * Monte Carlo off the main thread.
 *
 * A hundred thousand sessions is a few hundred million spins. Run that
 * inline and the tab freezes, the animation stutters, and the point —
 * that the aggregate is smooth and inevitable — gets lost in jank.
 */

import { runMonteCarlo, type SessionConfig } from "./engine";

export type SimRequest = {
  id: number;
  config: SessionConfig;
  trials: number;
};

export type SimResponse =
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "result"; result: ReturnType<typeof runMonteCarlo> }
  | { id: number; type: "error"; message: string };

self.onmessage = (e: MessageEvent<SimRequest>) => {
  const { id, config, trials } = e.data;
  const post = (m: SimResponse) => self.postMessage(m);

  try {
    let lastPost = 0;
    const result = runMonteCarlo(config, trials, (done, total) => {
      const now = Date.now();
      // Throttle: progress messages are cheap individually, ruinous in bulk.
      if (now - lastPost > 60 || done === total) {
        lastPost = now;
        post({ id, type: "progress", done, total });
      }
    });
    post({ id, type: "result", result });
  } catch (err) {
    post({
      id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
