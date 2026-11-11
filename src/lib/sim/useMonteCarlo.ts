"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MonteCarloResult, SessionConfig } from "./engine";
import type { SimResponse } from "./sim.worker";

interface State {
  running: boolean;
  progress: number;
  result: MonteCarloResult | null;
  error: string | null;
}

export function useMonteCarlo() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [state, setState] = useState<State>({
    running: false,
    progress: 0,
    result: null,
    error: null,
  });

  useEffect(() => {
    const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e: MessageEvent<SimResponse>) => {
      const msg = e.data;
      // Ignore stragglers from a superseded run.
      if (msg.id !== idRef.current) return;

      if (msg.type === "progress") {
        setState((s) => ({ ...s, progress: msg.done / msg.total }));
      } else if (msg.type === "result") {
        setState({
          running: false,
          progress: 1,
          result: msg.result,
          error: null,
        });
      } else {
        setState((s) => ({
          ...s,
          running: false,
          error: msg.message,
        }));
      }
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const run = useCallback((config: SessionConfig, trials: number) => {
    const worker = workerRef.current;
    if (!worker) return;
    const id = ++idRef.current;
    setState({ running: true, progress: 0, result: null, error: null });
    worker.postMessage({ id, config, trials });
  }, []);

  const cancel = useCallback(() => {
    // Bump the id so in-flight results are discarded, then hard-restart
    // the worker — a synchronous Monte Carlo loop cannot be interrupted.
    idRef.current++;
    workerRef.current?.terminate();
    const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<SimResponse>) => {
      const msg = e.data;
      if (msg.id !== idRef.current) return;
      if (msg.type === "progress") {
        setState((s) => ({ ...s, progress: msg.done / msg.total }));
      } else if (msg.type === "result") {
        setState({ running: false, progress: 1, result: msg.result, error: null });
      } else {
        setState((s) => ({ ...s, running: false, error: msg.message }));
      }
    };
    workerRef.current = worker;
    setState((s) => ({ ...s, running: false, progress: 0 }));
  }, []);

  return { ...state, run, cancel };
}
