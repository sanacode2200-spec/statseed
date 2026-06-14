import type { DescriptiveResponse } from "@/lib/types";

function fmt(v: number | null, digits = 2): string {
  return v === null ? "—" : v.toFixed(digits);
}

function pFmt(p: number | null): string {
  if (p === null) return "—";
  if (p < 0.001) return "< 0.001";
  return p.toFixed(3);
}

export function DescriptiveResultTable({ result }: { result: DescriptiveResponse }) {
  const rows: [string, string][] = [
    ["有効データ数", `${result.n} 件`],
    ["欠損数", `${result.missing} 件`],
    ["平均", fmt(result.mean)],
    ["標準偏差（SD）", fmt(result.sd)],
    ["中央値", fmt(result.median)],
    ["第1四分位数（Q1）", fmt(result.q1)],
    ["第3四分位数（Q3）", fmt(result.q3)],
    ["四分位範囲（IQR）", fmt(result.iqr)],
    ["最小値", fmt(result.minimum)],
    ["最大値", fmt(result.maximum)],
    [
      "95%信頼区間",
      result.ci95_low !== null && result.ci95_high !== null
        ? `${fmt(result.ci95_low)} – ${fmt(result.ci95_high)}`
        : "—",
    ],
    ["Shapiro-Wilk p値", pFmt(result.shapiro_wilk_p)],
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full table-fixed text-[15px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
            <th className="w-[55%] sm:w-64 text-left px-4 py-2 font-medium text-gray-600 dark:text-neutral-400">
              {result.variable_name}
            </th>
            <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-neutral-400">値</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={label} className={i % 2 === 0 ? "bg-white dark:bg-[#111]" : "bg-gray-50 dark:bg-neutral-900/50"}>
              <td className="px-4 py-2 text-gray-600 dark:text-neutral-400">{label}</td>
              <td className="px-4 py-2 text-left font-mono text-gray-800 dark:text-neutral-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
