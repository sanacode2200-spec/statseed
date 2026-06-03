"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import type { GuideRequest, GuideResponse, SuggestedTest } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

// --- ウィザードのステップ定義 ---

type Step =
  | "purpose"
  | "data_type"
  | "n_groups"
  | "paired"
  | "normal"
  | "result";

interface Choice {
  value: string;
  label: string;
  description: string;
  icon: string;
}

const STEPS: Record<
  Exclude<Step, "result">,
  { question: string; choices: Choice[] }
> = {
  purpose: {
    question: "何を調べたいですか？",
    choices: [
      {
        value: "compare",
        label: "群間比較",
        description: "2群以上のデータを比べたい（介入前後、治療群 vs 対照群など）",
        icon: "⚖️",
      },
      {
        value: "correlate",
        label: "相関・関連",
        description: "2つの変数の関係を調べたい（身長と体重、年齢とスコアなど）",
        icon: "📈",
      },
    ],
  },
  data_type: {
    question: "比較するデータはどちらですか？",
    choices: [
      {
        value: "continuous",
        label: "連続変数",
        description: "身長・体重・血圧・スコアなど数値で量を表すデータ",
        icon: "📏",
      },
      {
        value: "categorical",
        label: "カテゴリ変数",
        description: "性別・あり/なし・分類など、グループを表すデータ",
        icon: "🗂️",
      },
    ],
  },
  n_groups: {
    question: "比較する群の数はいくつですか？",
    choices: [
      {
        value: "2",
        label: "2群",
        description: "対照群と介入群、治療前後など2つのグループ",
        icon: "2️⃣",
      },
      {
        value: "3",
        label: "3群以上",
        description: "3つ以上のグループを一度に比較する",
        icon: "3️⃣",
      },
    ],
  },
  paired: {
    question: "2つのデータは「対応あり」ですか？",
    choices: [
      {
        value: "false",
        label: "対応なし（独立した2群）",
        description: "異なる人・患者同士を比べる（治療群 vs 対照群など）",
        icon: "👥",
      },
      {
        value: "true",
        label: "対応あり（同一対象の前後）",
        description: "同じ人の介入前後・左右差など",
        icon: "🔄",
      },
    ],
  },
  normal: {
    question: "データは正規分布に従いますか？",
    choices: [
      {
        value: "yes",
        label: "従う",
        description: "Shapiro-Wilk検定でp≥0.05、またはn≥30で分布が概ね釣り鐘型",
        icon: "🔔",
      },
      {
        value: "no",
        label: "従わない",
        description: "Shapiro-Wilk検定でp<0.05、または明らかに偏った分布",
        icon: "📊",
      },
      {
        value: "unknown",
        label: "わからない",
        description: "確認していない場合はノンパラメトリック検定を推奨します",
        icon: "❓",
      },
    ],
  },
};

// --- 回答の保持 ---

interface Answers {
  purpose?: "compare" | "correlate";
  data_type?: "continuous" | "categorical";
  n_groups?: 2 | 3;
  paired?: boolean;
  normal?: "yes" | "no" | "unknown";
}

function nextStep(step: Step, answers: Answers): Step {
  if (step === "purpose") {
    if (answers.purpose === "correlate") return "normal";
    return "data_type";
  }
  if (step === "data_type") {
    if (answers.data_type === "categorical") return "result";
    return "n_groups";
  }
  if (step === "n_groups") {
    if (answers.n_groups === 3) return "normal";
    return "paired";
  }
  if (step === "paired") return "normal";
  return "result";
}

// --- 結果カード ---

const ENDPOINT_LABELS: Record<string, string> = {
  "/api/test/ttest": "/dashboard/test",
  "/api/test/mannwhitney": "/dashboard/test",
  "/api/test/ttest-paired": "/dashboard/test",
  "/api/test/wilcoxon": "/dashboard/test",
  "/api/test/anova": "/dashboard/test",
  "/api/test/kruskal": "/dashboard/test",
  "/api/test/chisquare": "/dashboard/test",
  "/api/test/fisher": "/dashboard/test",
  "/api/test/correlation": "/dashboard/test",
};

function SuggestionCard({ s }: { s: SuggestedTest }) {
  const isRecommended = s.confidence === "推奨";
  return (
    <div
      className={`rounded-xl border p-5 ${
        isRecommended
          ? "border-blue-200 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
            isRecommended
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {s.confidence}
        </span>
        <h3 className="font-semibold text-gray-800">{s.test_name}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-2">{s.reason}</p>
      {s.caution && (
        <p className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1 mb-3">
          ⚠️ {s.caution}
        </p>
      )}
      <Link
        href={ENDPOINT_LABELS[s.endpoint] ?? "/dashboard/test"}
        className="inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        → この検定を実行する
      </Link>
    </div>
  );
}

// --- メインページ ---

export default function GuidePage() {
  const [step, setStep] = useState<Step>("purpose");
  const [answers, setAnswers] = useState<Answers>({});
  const [history, setHistory] = useState<Step[]>([]);
  const [result, setResult] = useState<GuideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChoice(value: string) {
    const next = { ...answers };

    if (step === "purpose") next.purpose = value as Answers["purpose"];
    else if (step === "data_type") next.data_type = value as Answers["data_type"];
    else if (step === "n_groups") next.n_groups = Number(value) as 2 | 3;
    else if (step === "paired") next.paired = value === "true";
    else if (step === "normal") next.normal = value as Answers["normal"];

    setAnswers(next);
    setHistory((h) => [...h, step]);

    const ns = nextStep(step, next);

    if (ns === "result") {
      setStep("result");
      setLoading(true);
      setError(null);
      try {
        const req: GuideRequest = {
          purpose: next.purpose!,
          data_type: next.data_type ?? "continuous",
          n_groups: next.n_groups ?? 2,
          paired: next.paired ?? false,
          normal: next.normal ?? "unknown",
        };
        setResult(await api.guideSuggest(req));
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました。");
      } finally {
        setLoading(false);
      }
    } else {
      setStep(ns);
    }
  }

  function handleBack() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setStep(prev);
    setResult(null);
    setError(null);
  }

  function handleReset() {
    setStep("purpose");
    setAnswers({});
    setHistory([]);
    setResult(null);
    setError(null);
  }

  const stepConfig = step !== "result" ? STEPS[step] : null;
  const totalSteps = 5;
  const currentIndex = history.length + 1;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-1">検定選択ガイド</h1>
      <p className="text-sm text-gray-500 mb-6">
        質問に答えるだけで、データに合った統計検定を提案します。
      </p>

      {/* プログレスバー */}
      {step !== "result" && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>ステップ {currentIndex}</span>
            <span>最大 {totalSteps} 問</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(currentIndex / totalSteps) * 100}%`,
                backgroundColor: "#0072B2",
              }}
            />
          </div>
        </div>
      )}

      {/* 質問ステップ */}
      {stepConfig && (
        <Card>
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            {stepConfig.question}
          </h2>
          <div className="space-y-3">
            {stepConfig.choices.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleChoice(c.value)}
                className="w-full text-left rounded-lg border border-gray-200 px-4 py-3.5 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800 group-hover:text-blue-700">
                      {c.label}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{c.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600"
            >
              ← 前の質問に戻る
            </button>
          )}
        </Card>
      )}

      {/* 結果 */}
      {step === "result" && (
        <div className="space-y-4">
          {loading && (
            <div className="text-center text-sm text-gray-500 py-8">提案を生成中...</div>
          )}
          {error && <ErrorMessage message={error} />}
          {result && (
            <>
              <Card>
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
              </Card>
              {result.suggestions.map((s) => (
                <SuggestionCard key={s.test_name} s={s} />
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 前の質問に戻る
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-blue-600 hover:underline"
                >
                  最初からやり直す
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
