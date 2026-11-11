"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionConfig } from "./engine";
import type { SimResponse, StrategyRun } from "./sim.worker";
import type { StrategyId } from "../strategies";

interface State {
  running: boolean;
  progress: number;
  /** Which strategy the worker is currently chewing through. */
  label: string | null;
  results: StrategyRun[] | null;
  error: string | null;
}

const IDLE: State = {
  running: false,
  progress: 0,
  label: null,
  results: null,
  error: null,
};

export function useMonteCarlo() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const [state, setState] = useState<State>(IDLE);

  // One handler shape, reused when we hard-restart the worker to cancel.
  const attach = useCallback((worker: Worker) => {
    worker.onmessage = (e: MessageEvent<SimResponse>) => {
      const msg = e.data;
      // Ignore stragglers from a superseded run.
      if (msg.id !== idRef.current) return;

      if (msg.type === "progress") {
        setState((s) => ({
          ...s,
          progress: msg.done / msg.total,
          label: msg.label,
        }));
      } else if (msg.type === "result") {
        setState({
          running: false,
          progress: 1,
          label: null,
          results: msg.results,
          error: null,
        });
      } else {
        setState((s) => ({ ...s, running: false, error: msg.message }));
      }
    };
    return worker;
  }, []);

  useEffect(() => {
    const worker = attach(
      new Worker(new URL("./sim.worker.ts", import.meta.url), {
        type: "module",
      }),
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [attach]);

  /**
   * Pass `strategies` to race several systems on the same config in one
   * pass. Omit it to run whatever is already on the config.
   */
  const run = useCallback(
    (config: SessionConfig, trials: number, strategies?: StrategyId[]) => {
      const worker = workerRef.current;
      if (!worker) return;
      const id = ++idRef.current;
      setState({ ...IDLE, running: true });
      worker.postMessage({ id, config, trials, strategies });
    },
    [],
  );

  const cancel = useCallback(() => {
    // Bump the id so in-flight results are discarded, then hard-restart
    // the worker — a synchronous Monte Carlo loop cannot be interrupted.
    idRef.current++;
    workerRef.current?.terminate();
    workerRef.current = attach(
      new Worker(new URL("./sim.worker.ts", import.meta.url), {
        type: "module",
      }),
    );
    setState(IDLE);
  }, [attach]);

  return {
    ...state,
    /** Convenience for the single-strategy case. */
    result: state.results?.[0]?.result ?? null,
    run,
    cancel,
  };
}
