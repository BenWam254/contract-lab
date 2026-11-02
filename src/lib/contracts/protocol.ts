import type { DiffResult, ValidationResult } from "./types";

export type Policy = "reject" | "drop" | "allow";

export interface JobMap {
  validate: {
    input: { contract: string; payload: string; policy: Policy };
    output: ValidationResult;
  };
  diff: {
    input: { contract: string; newContract: string };
    output: DiffResult;
  };
}

export type JobType = keyof JobMap;

export type WorkerRequest = {
  [K in JobType]: { id: number; type: K } & JobMap[K]["input"];
}[JobType];

export type WorkerResponse =
  | {
      [K in JobType]: {
        id: number;
        type: K;
        ok: true;
        result: JobMap[K]["output"];
        ms: number;
      };
    }[JobType]
  | { id: number; type: JobType; ok: false; error: string };
