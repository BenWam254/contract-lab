import type { Change, Violation } from "@/lib/contracts/types";

const TH =
  "sticky top-0 z-10 bg-void px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-label text-muted border-b border-line";
const TD = "px-3 py-2.5 align-top border-b border-line/60";
const MONO = "font-mono text-xs break-all";

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-3 py-10 text-center text-xs uppercase tracking-label text-muted"
      >
        {children}
      </td>
    </tr>
  );
}

export function ViolationsTable({ violations }: { violations: Violation[] }) {
  return (
    <table className="w-full table-fixed border-collapse text-sm text-ink">
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[16%]" />
        <col className="w-[28%]" />
        <col className="w-[28%]" />
      </colgroup>
      <thead>
        <tr>
          <th className={TH}>Path</th>
          <th className={TH}>Kind</th>
          <th className={TH}>Expected</th>
          <th className={TH}>Actual</th>
        </tr>
      </thead>
      <tbody>
        {violations.length === 0 ? (
          <EmptyRow colSpan={4}>No violations</EmptyRow>
        ) : (
          violations.map((v, i) => (
            <tr
              key={`${v.path}-${v.kind}-${i}`}
              title={v.message}
              className="hover:bg-surface"
            >
              <td className={`${TD} ${MONO} text-gold`}>{v.path || "$"}</td>
              <td className={`${TD} text-xs uppercase tracking-wide text-electric`}>{v.kind}</td>
              <td className={`${TD} ${MONO} text-skyblue`}>{v.expected}</td>
              <td className={`${TD} ${MONO} text-babypink`}>{v.actual}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function SeverityBadge({ severity }: { severity: Change["severity"] }) {
  const breaking = severity === "breaking";
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label ${
        breaking
          ? "border-babypink text-babypink"
          : "border-skyblue text-skyblue"
      }`}
    >
      {severity}
    </span>
  );
}

export function DriftTable({ changes }: { changes: Change[] }) {
  return (
    <table className="w-full table-fixed border-collapse text-sm text-ink">
      <colgroup>
        <col className="w-[13%]" />
        <col className="w-[20%]" />
        <col className="w-[27%]" />
        <col className="w-[20%]" />
        <col className="w-[20%]" />
      </colgroup>
      <thead>
        <tr>
          <th className={TH}>Severity</th>
          <th className={TH}>Path</th>
          <th className={TH}>Reason</th>
          <th className={TH}>Before</th>
          <th className={TH}>After</th>
        </tr>
      </thead>
      <tbody>
        {changes.length === 0 ? (
          <EmptyRow colSpan={5}>No drift detected</EmptyRow>
        ) : (
          changes.map((c, i) => (
            <tr key={`${c.path}-${c.kind}-${i}`} className="hover:bg-surface">
              <td className={TD}>
                <SeverityBadge severity={c.severity} />
              </td>
              <td className={`${TD} ${MONO} text-gold`}>{c.path || "$"}</td>
              <td className={`${TD} text-xs leading-relaxed text-ink`}>{c.reason}</td>
              <td className={`${TD} ${MONO} text-muted`}>{c.before}</td>
              <td className={`${TD} ${MONO} text-ink`}>{c.after}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
