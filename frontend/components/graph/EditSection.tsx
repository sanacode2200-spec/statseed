"use client";

import { useState, type ReactNode } from "react";

/** グラフ編集サイドバーの折りたたみ可能なセクション。見出しクリックで開閉する。 */
export function EditSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 dark:border-neutral-800 pb-3 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">
          {title}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 shrink-0 text-gray-400 dark:text-neutral-600 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="mt-2 space-y-3.5">{children}</div>}
    </div>
  );
}
