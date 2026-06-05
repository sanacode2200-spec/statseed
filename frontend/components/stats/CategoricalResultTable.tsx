import type { CategoricalResponse } from "@/lib/types";

export function CategoricalResultTable({ result }: { result: CategoricalResponse }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2 font-medium text-gray-600">
                {result.variable_name}
              </th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">度数</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">割合 (%)</th>
            </tr>
          </thead>
          <tbody>
            {result.categories.map((cat, i) => (
              <tr key={cat.label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-2 text-gray-700">{cat.label}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-800">{cat.count}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-800">
                  <span className="inline-block w-12 text-right">{cat.percent.toFixed(1)}</span>
                  <PercentBar percent={cat.percent} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 bg-gray-50 font-medium">
              <td className="px-4 py-2 text-gray-600">合計（有効）</td>
              <td className="px-4 py-2 text-right font-mono text-gray-800">{result.n}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-500">100.0</td>
            </tr>
            {result.missing > 0 && (
              <tr className="bg-white">
                <td className="px-4 py-2 text-gray-400 italic">欠損値</td>
                <td className="px-4 py-2 text-right font-mono text-gray-400">{result.missing}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-400">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PercentBar({ percent }: { percent: number }) {
  return (
    <span
      className="inline-block align-middle ml-2 h-2 rounded-sm"
      style={{
        width: `${Math.max(2, percent)}px`,
        maxWidth: "80px",
        backgroundColor: "#0072B2",
        opacity: 0.6,
      }}
    />
  );
}
