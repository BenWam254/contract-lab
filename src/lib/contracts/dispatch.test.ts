import { handleRequest } from "./dispatch";

function describe(_name: string, run: () => void): void {
  run();
}

function it(_name: string, run: () => void): void {
  run();
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown): void {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${String(actual)} to be ${String(expected)}`);
      }
    },
  };
}

describe("handleRequest", () => {
  it("validates and echoes the request id", () => {
    const res = handleRequest({
      id: 7,
      type: "validate",
      contract: JSON.stringify({ type: "object", required: ["a"] }),
      payload: "{}",
      policy: "reject",
    });
    expect(res.id).toBe(7);
    expect(res.ok).toBe(true);
    if (res.ok && res.type === "validate") expect(res.result.ok).toBe(false);
  });

  it("returns an error response for malformed contract JSON", () => {
    const res = handleRequest({
      id: 1,
      type: "diff",
      contract: "{nope",
      newContract: "{}",
    });
    expect(res.ok).toBe(false);
  });
});
