"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { encodeState, decodeState } from "@/lib/share";
import type { Policy } from "@/lib/contracts/protocol";
import { useWorkerJob } from "@/hooks/useWorkerJob";
import { DriftTable, ViolationsTable } from "@/components/Ui";

type Tab = "validation" | "drift";

interface AppState {
  contract: string;
  newContract: string;
  payload: string;
  policy: Policy;
}

const MAX_ROWS = 500;
const hasContent = (s: string) => /\S/.test(s); // stops at first non-space, no copy of huge strings

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

const SAMPLES: Record<string, { label: string; state: AppState }> = {
  user: {
    label: "User profile (breaking drift)",
    state: {
      policy: "reject",
      contract: pretty({
        type: "object",
        required: ["id", "email", "age"],
        properties: {
          id: { type: "integer" },
          email: { type: "string" },
          age: { type: "integer", minimum: 18 },
          role: { type: "string", enum: ["admin", "member"] },
        },
        additionalProperties: false,
      }),
      newContract: pretty({
        type: "object",
        required: ["id", "email", "age", "name"],
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          age: { type: "integer", minimum: 21 },
          role: { type: "string", enum: ["admin", "member", "guest"] },
          name: { type: "string" },
        },
        additionalProperties: false,
      }),
      payload: pretty({ id: "42", email: "ada@example.com", age: 17, role: "owner", extra: true }),
    },
  },
  order: {
    label: "Order (clean payload)",
    state: {
      policy: "drop",
      contract: pretty({
        type: "object",
        required: ["orderId", "items"],
        properties: {
          orderId: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["sku", "qty"],
              properties: { sku: { type: "string" }, qty: { type: "integer", minimum: 1 } },
            },
          },
        },
      }),
      newContract: "",
      payload: pretty({ orderId: "A-1009", items: [{ sku: "TW-001", qty: 2 }], note: "gift" }),
    },
  },
};

const EMPTY: AppState = { contract: "", newContract: "", payload: "", policy: "reject" };

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-b border-line last:border-b-0">
      <div className="flex items-baseline justify-between px-4 pb-1.5 pt-3">
        <label className="text-[10px] font-semibold uppercase tracking-label text-gold">
          {label}
        </label>
        {hint && <span className="text-[10px] uppercase tracking-label text-muted">{hint}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-h-[7rem] flex-1 resize-none border-0 bg-void px-4 py-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-muted/50 focus:bg-black"
        placeholder="{ }"
      />
    </div>
  );
}

function Badge({ tone, children }: { tone: "sky" | "pink" | "gold" | "purple"; children: React.ReactNode }) {
  const cls = {
    sky: "border-skyblue text-skyblue",
    pink: "border-babypink text-babypink",
    gold: "border-gold text-gold",
    purple: "border-electric text-electric",
  }[tone];
  return (
    <span className={`border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label ${cls}`}>
      {children}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border-b border-babypink/40 bg-babypink/5 px-4 py-3 font-mono text-xs text-babypink">
      {message}
    </div>
  );
}

export default function Page() {
  const [state, setState] = useState<AppState>(EMPTY);
  const [tab, setTab] = useState<Tab>("validation");
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof AppState>(key: K, value: AppState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  // Hydrate from share link, otherwise load the first sample.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    let loaded: AppState | null = null;
    if (hash) {
      try {
        loaded = decodeState(hash) as AppState;
      } catch {
        loaded = null;
      }
    }
    setState(loaded ?? SAMPLES.user.state);
    setHydrated(true);
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // Worker jobs: null input = idle. Inputs are memoized so the hook only reruns on real changes.
  const validateInput = useMemo(
    () =>
      hasContent(state.contract) && hasContent(state.payload)
        ? { contract: state.contract, payload: state.payload, policy: state.policy }
        : null,
    [state.contract, state.payload, state.policy],
  );

  const diffInput = useMemo(
    () =>
      hasContent(state.contract) && hasContent(state.newContract)
        ? { contract: state.contract, newContract: state.newContract }
        : null,
    [state.contract, state.newContract],
  );

  const validation = useWorkerJob("validate", hydrated ? validateInput : null);
  const drift = useWorkerJob("diff", hydrated ? diffInput : null);

  const allViolations = validation.value?.violations ?? [];
  const allChanges = drift.value?.changes ?? [];
  const violations = allViolations.slice(0, MAX_ROWS);
  const changes = allChanges.slice(0, MAX_ROWS);

  const copyLink = async () => {
    try {
      const hash = encodeState(state);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      window.history.replaceState(null, "", `#${hash}`);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const selectCls =
    "border border-line bg-void px-3 py-2 text-xs text-ink outline-none focus:border-gold";

  return (
    <div className="flex h-screen flex-col bg-obsidian text-ink">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-void px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="block h-3 w-3 bg-gold" aria-hidden />
          <h1 className="text-sm font-semibold uppercase tracking-label">Contract Lab</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Load sample"
            className={selectCls}
            value=""
            onChange={(e) => {
              const s = SAMPLES[e.target.value];
              if (s) setState(s.state);
            }}
          >
            <option value="">Load sample…</option>
            {Object.entries(SAMPLES).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Unknown-field policy"
            className={selectCls}
            value={state.policy}
            onChange={(e) => set("policy", e.target.value as Policy)}
          >
            <option value="reject">Policy: reject</option>
            <option value="drop">Policy: drop</option>
            <option value="allow">Policy: allow</option>
          </select>
          <button
            onClick={copyLink}
            disabled={!hydrated}
            className={`border px-4 py-2 text-xs font-semibold uppercase tracking-label transition-colors ${
              copied
                ? "border-skyblue bg-skyblue text-void"
                : "border-gold bg-gold text-void hover:bg-transparent hover:text-gold"
            }`}
          >
            {copied ? "Link copied" : "Copy Share Link"}
          </button>
        </div>
      </header>

      {/* Dashboard */}
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: inputs */}
        <section className="flex min-h-0 flex-col overflow-y-auto border-b border-line bg-surface lg:border-b-0 lg:border-r">
          <Field label="Contract" hint="JSON Schema" value={state.contract} onChange={(v) => set("contract", v)} />
          <Field label="New Contract" hint="Optional · drives drift" value={state.newContract} onChange={(v) => set("newContract", v)} />
          <Field label="Payload" hint="JSON" value={state.payload} onChange={(v) => set("payload", v)} />
        </section>

        {/* Right: results */}
        <section className="flex min-h-0 flex-col bg-obsidian">
          <div role="tablist" className="flex items-center border-b border-line bg-void">
            {(["validation", "drift"] as const).map((t) => {
              const active = tab === t;
              const job = t === "validation" ? validation : drift;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold uppercase tracking-label transition-colors ${
                    active
                      ? "border-gold text-ink"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t}
                  {job.status === "running" && (
                    <span className="h-1.5 w-1.5 animate-pulse bg-gold" aria-label="Running" />
                  )}
                  {t === "validation" && allViolations.length > 0 && (
                    <Badge tone="pink">{allViolations.length}</Badge>
                  )}
                  {t === "drift" && drift.value && (
                    <>
                      {drift.value.breaking > 0 && <Badge tone="pink">{drift.value.breaking}</Badge>}
                      {drift.value.nonBreaking > 0 && <Badge tone="sky">{drift.value.nonBreaking}</Badge>}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {tab === "validation" && (
              <>
                {validation.status === "idle" && (
                  <p className="px-4 py-10 text-center text-xs uppercase tracking-label text-muted">
                    Provide a contract and a payload
                  </p>
                )}
                {validation.error && <ErrorBanner message={validation.error} />}
                {validation.value && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                      <Badge tone={validation.value.ok ? "sky" : "pink"}>
                        {validation.value.ok ? "Pass" : "Fail"}
                      </Badge>
                      <Badge tone="gold">Policy · {state.policy}</Badge>
                      {validation.ms !== null && (
                        <span className="font-mono text-[11px] text-muted">{validation.ms.toFixed(1)} ms</span>
                      )}
                      {validation.value.warnings.length > 0 && (
                        <Badge tone="purple">{validation.value.warnings.length} warnings</Badge>
                      )}
                      {(validation.value.dropped ?? []).slice(0, 20).map((p) => (
                        <span key={p} className="font-mono text-[11px] text-electric">
                          dropped {p}
                        </span>
                      ))}
                    </div>
                    {allViolations.length > MAX_ROWS && (
                      <p className="border-b border-line px-4 py-2 text-[11px] uppercase tracking-label text-gold">
                        Showing first {MAX_ROWS} of {allViolations.length} violations
                      </p>
                    )}
                    <ViolationsTable violations={violations} />
                  </>
                )}
              </>
            )}

            {tab === "drift" && (
              <>
                {drift.status === "idle" && (
                  <p className="px-4 py-10 text-center text-xs uppercase tracking-label text-muted">
                    Provide a contract and a new contract
                  </p>
                )}
                {drift.error && <ErrorBanner message={drift.error} />}
                {drift.value && (
                  <>
                    {allChanges.length > MAX_ROWS && (
                      <p className="border-b border-line px-4 py-2 text-[11px] uppercase tracking-label text-gold">
                        Showing first {MAX_ROWS} of {allChanges.length} changes
                      </p>
                    )}
                    <DriftTable changes={changes} />
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
