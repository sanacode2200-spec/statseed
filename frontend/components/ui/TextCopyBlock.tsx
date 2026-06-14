"use client";

import { useState } from "react";

/** 図注・方法文などのテキストをコピーボタン付きで表示するブロック。 */
export function TextCopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-gray-600 dark:text-neutral-400">{title}</p>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            })
          }
          className="text-[11px] text-gray-500 hover:underline"
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-gray-600 dark:text-neutral-400">{text}</p>
    </div>
  );
}
