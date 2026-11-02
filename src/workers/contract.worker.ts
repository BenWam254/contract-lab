import { handleRequest } from "@/lib/contracts/dispatch";
import type { WorkerRequest, WorkerResponse } from "@/lib/contracts/protocol";

// Minimal typing instead of `/// <reference lib="webworker" />`,
// which clashes with the DOM lib in a single tsconfig.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(msg: WorkerResponse): void;
};

ctx.onmessage = (e) => {
  ctx.postMessage(handleRequest(e.data));
};
