import { validate } from "./validate";
import { diff } from "./diff";
import type { WorkerRequest, WorkerResponse } from "./protocol";

export function handleRequest(req: WorkerRequest): WorkerResponse {
  const t0 = performance.now();
  try {
    switch (req.type) {
      case "validate": {
        const result = validate(JSON.parse(req.contract), req.payload, req.policy);
        return { id: req.id, type: "validate", ok: true, result, ms: performance.now() - t0 };
      }
      case "diff": {
        const result = diff(JSON.parse(req.contract), JSON.parse(req.newContract));
        return { id: req.id, type: "diff", ok: true, result, ms: performance.now() - t0 };
      }
    }
  } catch (err) {
    return {
      id: req.id,
      type: req.type,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
