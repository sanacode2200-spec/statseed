// 解析系ページ共通のフォーム用 Tailwind クラス。
// 各ページでコピペされていた input / textarea のスタイルを一元化する。
// （Vercel 風ミニマル：アクセントカラーなし・ダーク既定・neutral 階調のみ）

const FIELD_BASE =
  "rounded-md border border-gray-200 dark:border-neutral-800 text-[16px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

/** 幅いっぱいの input / select 用。 */
export const inputCls = `w-full px-3 py-1.5 ${FIELD_BASE}`;

/** 幅をコンテナに合わせる input 用（グラフページなど、幅を個別指定する箇所）。 */
export const inputAutoCls = `px-3 py-1.5 ${FIELD_BASE}`;

/** 複数行入力（数値・カテゴリの貼り付け）用。 */
export const textareaCls = `w-full px-3 py-2 font-mono ${FIELD_BASE} resize-y`;
