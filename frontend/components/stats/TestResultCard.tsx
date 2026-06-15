import type { AnalysisSampleInfo, CorrelationResult, TestResult } from "@/lib/types";
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
    <span className={`inline-block rounded px-2 py-0.5 text-[14px] font-medium ${color}`}>
      p = {text}
    </span>
  );
}

export function AnalysisSampleInfoCard({ info }: { info: AnalysisSampleInfo }) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 text-[14px] sm:grid-cols-3">
        <div>
          <p className="text-gray-400 dark:text-neutral-600">元データ</p>
          <p className="mt-0.5 font-mono text-gray-800 dark:text-neutral-200">{info.total} 件</p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-neutral-600">解析使用</p>
          <p className="mt-0.5 font-mono text-gray-800 dark:text-neutral-200">{info.used} 件</p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-neutral-600">除外</p>
          <p className={`mt-0.5 font-mono ${info.excluded > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-800 dark:text-neutral-200"}`}>
            {info.excluded} 件
          </p>
        </div>
      </div>
      <p className="mt-2 border-t border-gray-200 dark:border-neutral-800 pt-2 text-[13px] text-gray-500 dark:text-neutral-500">
        除外理由: {info.exclusion_reason}
      </p>
    </div>
  );
}

export function TestResultCard({ result }: { result: TestResult }) {
  const rows: [string, string][] = [
    ["検定統計量", result.statistic !== null ? fmt(result.statistic) : "—"],
    ...(result.estimate !== null && result.estimate !== undefined && result.estimate_label
      ? [[result.estimate_label, fmt(result.estimate)] as [string, string]]
      : []),
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold text-gray-800 dark:text-neutral-200">{result.test_name}</h3>
        {pBadge(result.p_value)}
      </div>

      <table className="w-full table-fixed text-[16px] mb-4">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 dark:border-neutral-800 last:border-0">
              <td className="w-[55%] sm:w-64 py-1.5 text-gray-500 dark:text-neutral-500 pr-4">{label}</td>
              <td className="py-1.5 font-mono text-left text-gray-800 dark:text-neutral-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[16px] text-gray-600 dark:text-neutral-400 leading-relaxed bg-blue-50 dark:bg-neutral-900 rounded-md px-3 py-2">
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold text-gray-800 dark:text-neutral-200">{result.method}</h3>
        {pBadge(result.p_value)}
      </div>

      <table className="w-full table-fixed text-[16px] mb-4">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 dark:border-neutral-800 last:border-0">
              <td className="w-[55%] sm:w-64 py-1.5 text-gray-500 dark:text-neutral-500 pr-4">{label}</td>
              <td className="py-1.5 font-mono text-left text-gray-800 dark:text-neutral-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[16px] text-gray-600 dark:text-neutral-400 leading-relaxed bg-blue-50 dark:bg-neutral-900 rounded-md px-3 py-2">
        {result.interpretation}
      </p>
    </Card>
  );
}
