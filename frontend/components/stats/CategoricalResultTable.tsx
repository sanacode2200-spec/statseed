import type { CategoricalResponse } from "@/lib/types";

export function CategoricalResultTable({ result }: { result: CategoricalResponse }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[15px]">
        <thead>
          <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
            <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-neutral-400">
              {result.variable_name}
            </th>
            <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-neutral-400">度数</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-neutral-400">割合 (%)</th>
          </tr>
        </thead>
        <tbody>
          {result.categories.map((cat, i) => (
            <tr key={cat.label} className={i % 2 === 0 ? "bg-white dark:bg-[#111]" : "bg-gray-50 dark:bg-neutral-900/50"}>
              <td className="px-4 py-2 text-gray-700 dark:text-neutral-300">{cat.label}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-800 dark:text-neutral-200">{cat.count}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-800 dark:text-neutral-200">
                <span className="inline-block w-12 text-right">{cat.percent.toFixed(1)}</span>
                <PercentBar percent={cat.percent} />
              </td>
            </tr>
          ))}
          <tr className="border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 font-medium">
            <td className="px-4 py-2 text-gray-600 dark:text-neutral-400">合計（有効）</td>
            <td className="px-4 py-2 text-right font-mono text-gray-800 dark:text-neutral-200">{result.n}</td>
            <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-neutral-500">100.0</td>
          </tr>
          {result.missing > 0 && (
            <tr className="bg-white dark:bg-[#111]">
              <td className="px-4 py-2 text-gray-400 dark:text-neutral-600 italic">欠損値</td>
              <td className="px-4 py-2 text-right font-mono text-gray-400 dark:text-neutral-600">{result.missing}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-400 dark:text-neutral-600">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PercentBar({ percent }: { percent: number }) {
  return (
    <span
      className="inline-block align-middle ml-2 h-2 rounded-sm opacity-60"
      style={{
        width: `${Math.max(2, percent)}px`,
        maxWidth: "80px",
        backgroundColor: "#fff",
      }}
    />
  );
}
