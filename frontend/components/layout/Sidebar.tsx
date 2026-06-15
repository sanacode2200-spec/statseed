"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDataset } from "@/contexts/DataContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_GROUPS = [
  {
    label: "はじめる",
    items: [
      { href: "/dashboard", label: "ホーム", exact: true, icon: HomeIcon },
      { href: "/dashboard/data", label: "データを読み込む", exact: false, icon: FolderIcon },
      { href: "/dashboard/guide", label: "解析方法を選ぶ", exact: false, icon: CompassIcon },
    ],
  },
  {
    label: "解析する",
    items: [
      { href: "/dashboard/descriptive", label: "データを要約", exact: false, icon: ChartBarIcon },
      { href: "/dashboard/test", label: "群の差・関連", exact: false, icon: FlaskIcon },
      { href: "/dashboard/regression", label: "回帰分析", exact: false, icon: RegressionIcon },
      { href: "/dashboard/repeated", label: "反復測定", exact: false, icon: RepeatedIcon },
    ],
  },
  {
    label: "仕上げる",
    items: [
      { href: "/dashboard/table1", label: "背景特性表", exact: false, icon: TableIcon },
      { href: "/dashboard/graph", label: "グラフを作る", exact: false, icon: GraphIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { dataset, storageMode, clearDataset } = useDataset();
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;

    const focusable = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      // ドロワー内に Tab フォーカスを閉じ込める（背景の操作を防ぐ）
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !drawerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    // 開いたらドロワー内へフォーカスを移す
    focusable()[0]?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      // 閉じたらトリガー（ハンバーガー）へフォーカスを戻す
      trigger?.focus();
    };
  }, [mobileOpen]);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const renderSidebar = () => (
    <aside className="w-[240px] md:w-[200px] shrink-0 flex flex-col h-full md:h-screen md:sticky md:top-0
      bg-white dark:bg-black
      border-r border-gray-200 dark:border-neutral-900">

      {/* ロゴ / プロダクト名 */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-neutral-900
          hover:bg-gray-50 dark:hover:bg-neutral-950 transition-colors"
      >
        <div className="w-5 h-5 rounded-sm overflow-hidden shrink-0">
          <Image src="/sana2.png" alt="" width={20} height={20} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-gray-900 dark:text-white truncate leading-tight">
            Statseed
          </div>
          <div className="text-[11px] text-gray-400 dark:text-neutral-600 leading-tight">医療統計ツール</div>
        </div>
      </Link>

      {/* 読み込み中データ */}
      {dataset && (
        <div
          className="mx-3 mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-md
            bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800
            text-[11px]"
          title={dataset.filename}
        >
          <span className="text-emerald-500 dark:text-emerald-400 shrink-0">
            <DotIcon />
          </span>
          <Link href="/dashboard/data" className="min-w-0 flex-1 truncate text-gray-600 dark:text-neutral-400 hover:underline">
            {dataset.filename}
          </Link>
          <span
            className="shrink-0 rounded px-1 py-0.5 text-[10px] text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-900"
            title={storageMode === "persistent" ? "この端末に保存中" : "このタブ内だけに保存中"}
          >
            {storageMode === "persistent" ? "保存: 端末" : "保存: タブ内"}
          </span>
          <button
            type="button"
            onClick={clearDataset}
            className="shrink-0 text-gray-400 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400"
            title="データを今すぐ削除"
            aria-label="データを今すぐ削除"
          >
            ×
          </button>
        </div>
      )}

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
                        ? "bg-neutral-800 text-white font-medium"
                        : "text-gray-500 dark:text-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-950 hover:text-gray-800 dark:hover:text-neutral-300"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-gray-400 dark:text-neutral-600"}>
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
        <ThemeToggle className="min-h-7 min-w-7 border-0 bg-transparent dark:bg-transparent" />
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{renderSidebar()}</div>
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-3 dark:border-neutral-900 dark:bg-black md:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-600 dark:text-neutral-400"
          aria-label="メニューを開く"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
        >
          <MenuIcon />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 text-[13px] font-semibold text-gray-900 dark:text-white">
          <Image src="/sana2.png" alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-sm object-cover" />
          Statseed
        </Link>
        <ThemeToggle className="min-h-9 min-w-9 border-0 bg-transparent dark:bg-transparent" />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="メニューを閉じる"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="ナビゲーション"
            className="relative h-full w-[min(82vw,280px)] shadow-xl"
          >
            {renderSidebar()}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-md text-gray-500 dark:text-neutral-500"
              aria-label="メニューを閉じる"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
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

function RepeatedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function RegressionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="3" />
      <circle cx="6" cy="17" r="1.4" /><circle cx="10" cy="15" r="1.4" /><circle cx="14" cy="9" r="1.4" /><circle cx="18" cy="8" r="1.4" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
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

function DotIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
