"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "概要", exact: true, icon: HomeIcon },
    ],
  },
  {
    label: "解析",
    items: [
      { href: "/dashboard/descriptive", label: "記述統計", exact: false, icon: ChartBarIcon },
      { href: "/dashboard/test", label: "統計検定", exact: false, icon: FlaskIcon },
      { href: "/dashboard/graph", label: "グラフ", exact: false, icon: GraphIcon },
      { href: "/dashboard/guide", label: "検定ガイド", exact: false, icon: CompassIcon },
    ],
  },
  {
    label: "データ",
    items: [
      { href: "/dashboard/data", label: "データ読み込み", exact: false, icon: FolderIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-screen sticky top-0
      bg-white dark:bg-black
      border-r border-gray-200 dark:border-neutral-900">

      {/* アカウント / ロゴ */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-neutral-900">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md
          hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-left">
          <Image src="/sana2.png" alt="Statseed" width={20} height={20} className="rounded-sm shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-tight">
              sana's projects
            </div>
            <div className="text-[11px] text-gray-400 dark:text-neutral-600 leading-tight">Statseed</div>
          </div>
          <ChevronDown />
        </button>
      </div>

      {/* 検索風バー */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-900">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md
          bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800
          text-gray-400 dark:text-neutral-600 text-[12px]">
          <SearchIcon />
          <span>検索...</span>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <div className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, exact, icon: Icon }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-2 py-[6px] rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-white font-medium"
                        : "text-gray-500 dark:text-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-950 hover:text-gray-800 dark:hover:text-neutral-300"
                    }`}
                  >
                    <span className={active ? "text-gray-700 dark:text-neutral-300" : "text-gray-400 dark:text-neutral-600"}>
                      <Icon />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* フッター */}
      <div className="px-3 py-2.5 border-t border-gray-100 dark:border-neutral-900
        flex items-center justify-between">
        <span className="text-[11px] text-gray-300 dark:text-neutral-700">v1.0</span>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-400 dark:text-neutral-600
            hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
          title={dark ? "ライトモード" : "ダークモード"}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </aside>
  );
}

/* ── SVG アイコン ── */

function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6m-6 0v7L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 10V3" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="text-gray-300 dark:text-neutral-700 shrink-0">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
