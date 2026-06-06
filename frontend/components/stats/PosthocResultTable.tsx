import type { PosthocResult } from "@/lib/types";

export function PosthocResultTable({ result }: { result: PosthocResult }) {
  const hasParametric = result.pairs.some((p) => p.mean_diff !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[12px] text-gray-400 dark:text-neutral-500">検定法: </span>
          <span className="text-[13px] font-medium text-gray-700 dark:text-neutral-300">{result.method}</span>
        </div>
        <span className="text-[12px] text-gray-400 dark:text-neutral-500">
          {result.n_comparisons}ペア比較 · α = 0.05
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">比較ペア</th>
              {hasParametric && (
                <>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">平均（A）</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">平均（B）</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">平均差（A−B）</th>
                </>
              )}
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">p値（補正前）</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">p値（補正後）</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">判定</th>
            </tr>
          </thead>
          <tbody>
            {result.pairs.map((pair, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 dark:border-neutral-900 last:border-0 ${
                  pair.significant ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-neutral-200 whitespace-nowrap">
                  {pair.group_a} vs {pair.group_b}
                </td>
                {hasParametric && (
                  <>
                    <td className="text-right px-4 py-2.5 text-gray-600 dark:text-neutral-400 tabular-nums">
                      {pair.mean_a?.toFixed(2) ?? "—"}
                    </td>
                    <td className="text-right px-4 py-2.5 text-gray-600 dark:text-neutral-400 tabular-nums">
                      {pair.mean_b?.toFixed(2) ?? "—"}
                    </td>
                    <td className="text-right px-4 py-2.5 text-gray-600 dark:text-neutral-400 tabular-nums">
                      {pair.mean_diff !== null ? (pair.mean_diff >= 0 ? "+" : "") + pair.mean_diff.toFixed(2) : "—"}
                    </td>
                  </>
                )}
                <td className="text-right px-4 py-2.5 text-gray-500 dark:text-neutral-500 tabular-nums">
                  {formatP(pair.p_raw)}
                </td>
                <td className={`text-right px-4 py-2.5 tabular-nums font-medium ${
                  pair.significant ? "text-white" : "text-gray-500 dark:text-neutral-500"
                }`}>
                  {formatP(pair.p_adjusted)}
                </td>
                <td className="text-center px-4 py-2.5">
                  {pair.significant ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-800 text-white">
                      *
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-neutral-700 text-[11px]">n.s.</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 px-4 py-3 text-[13px] text-gray-600 dark:text-neutral-400">
        {result.interpretation}
      </div>
    </div>
  );
}

function formatP(p: number): string {
  if (p < 0.001) return "<0.001";
  return p.toFixed(3);
}
