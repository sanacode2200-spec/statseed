import type { CorrelationResult, TestResult } from "@/lib/types";
import { Card } from "@/components/ui/Card";

function fmt(v: number | null, digits = 3): string {
  return v === null ? "—" : v.toFixed(digits);
}

function pBadge(p: number) {
  const text = p < 0.001 ? "< 0.001" : p.toFixed(3);
  const color =
    p < 0.01
      ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400"
      : p < 0.05
      ? "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400"
      : "bg-gray-100 dark:bg-neutral-900 text-gray-600 dark:text-neutral-400";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${color}`}>
      p = {text}
    </span>
  );
}

export function TestResultCard({ result }: { result: TestResult }) {
  const rows: [string, string][] = [
    ["検定統計量", result.statistic !== null ? fmt(result.statistic) : "—"],
    ...(result.effect_size !== null && result.effect_size_label
      ? [[result.effect_size_label, fmt(result.effect_size)] as [string, string]]
      : []),
    ...(result.ci95_low !== null && result.ci95_high !== null
      ? [
          [
            "95%信頼区間（差）",
            `${fmt(result.ci95_low)} – ${fmt(result.ci95_high)}`,
          ] as [string, string],
        ]
      : []),
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-neutral-200">{result.test_name}</h3>
        {pBadge(result.p_value)}
      </div>

      <table className="w-full text-[12px] mb-4">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 dark:border-neutral-800 last:border-0">
              <td className="py-1.5 text-gray-500 dark:text-neutral-500 pr-4">{label}</td>
              <td className="py-1.5 font-mono text-right text-gray-800 dark:text-neutral-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[12px] text-gray-600 dark:text-neutral-400 leading-relaxed bg-blue-50 dark:bg-neutral-900 rounded-md px-3 py-2">
        {result.interpretation}
      </p>
    </Card>
  );
}

export function CorrelationResultCard({ result }: { result: CorrelationResult }) {
  const rows: [string, string][] = [
    ["相関係数 r", result.r.toFixed(3)],
    ["データ数", `${result.n} 件`],
    ...(result.ci95_low !== null && result.ci95_high !== null
      ? [
          [
            "95%信頼区間",
            `${result.ci95_low.toFixed(3)} – ${result.ci95_high.toFixed(3)}`,
          ] as [string, string],
        ]
      : []),
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-neutral-200">{result.method}</h3>
        {pBadge(result.p_value)}
      </div>

      <table className="w-full text-[12px] mb-4">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 dark:border-neutral-800 last:border-0">
              <td className="py-1.5 text-gray-500 dark:text-neutral-500 pr-4">{label}</td>
              <td className="py-1.5 font-mono text-right text-gray-800 dark:text-neutral-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[12px] text-gray-600 dark:text-neutral-400 leading-relaxed bg-blue-50 dark:bg-neutral-900 rounded-md px-3 py-2">
        {result.interpretation}
      </p>
    </Card>
  );
}
