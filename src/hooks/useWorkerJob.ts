"use client";

import { useEffect, useRef, useState } from "react";
import type { JobMap, JobType, WorkerRequest, WorkerResponse } from "@/lib/contracts/protocol";

export interface JobState<T> {
  status: "idle" | "running" | "done" | "error";
  value: T | null;
  error: string | null;
  ms: number | null;
}

const IDLE: JobState<never> = { status: "idle", value: null, error: null, ms: null };

function spawn(): Worker {
  // Must stay an inline `new Worker(new URL(...))` so webpack bundles it.
  return new Worker(new URL("../workers/contract.worker.ts", import.meta.url), {
    type: "module",
  });
}

/**
 * Runs a validate/diff job in a Web Worker.
 * - `input` must be referentially stable (memoize it in the caller).
 * - `null` input = idle.
 * - Latest input wins: the previous in-flight worker is terminated.
 */
export function useWorkerJob<K extends JobType>(
  type: K,
  input: JobMap[K]["input"] | null,
  debounceMs = 250,
): JobState<JobMap[K]["output"]> {
  type Out = JobMap[K]["output"];
  const [state, setState] = useState<JobState<Out>>(IDLE);
  const workerRef = useRef<Worker | null>(null);
  const seq = useRef(0);

  const kill = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  useEffect(() => kill, []);

  useEffect(() => {
    const id = ++seq.current;

    if (input === null) {
      kill();
      setState(IDLE);
      return;
    }

    // Keep the previous value on screen while recomputing (no flicker).
    setState((s) => ({ ...s, status: "running" }));

    const timer = setTimeout(() => {
      kill(); // hard-cancel any superseded job
      const worker = spawn();
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.id !== seq.current) return; // stale
        if (msg.ok) {
          setState({ status: "done", value: msg.result as Out, error: null, ms: msg.ms });
        } else {
          setState({ status: "error", value: null, error: msg.error, ms: null });
        }
      };
      worker.onerror = (e) => {
        if (id !== seq.current) return;
        setState({ status: "error", value: null, error: e.message || "Worker crashed", ms: null });
      };

      worker.postMessage({ id, type, ...input } as WorkerRequest);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [type, input, debounceMs]);

  return state;
}
