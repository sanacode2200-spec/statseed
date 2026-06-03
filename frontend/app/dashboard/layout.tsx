import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "ホーム", icon: "🏠" },
  { href: "/dashboard/descriptive", label: "記述統計", icon: "📋" },
  { href: "/dashboard/test", label: "統計検定", icon: "🔬" },
  { href: "/dashboard/graph", label: "グラフ", icon: "📊" },
  { href: "/dashboard/guide", label: "検定ガイド", icon: "🗺️" },
  { href: "/dashboard/data", label: "データ読み込み", icon: "📂" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-bold" style={{ color: "#0072B2" }}>
          Statseed
        </Link>
        <span className="text-gray-300">|</span>
        <nav className="flex gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">{children}</main>
    </div>
  );
}
