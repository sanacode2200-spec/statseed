import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto bg-gray-50 dark:bg-[#0a0a0a]">
        {/* トップバー */}
        <div className="border-b border-gray-200 dark:border-neutral-900 px-8 py-2.5 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 dark:text-neutral-600">Statseed</span>
          <span className="text-[11px] text-gray-300 dark:text-neutral-800">/</span>
          <span className="text-[11px] text-gray-600 dark:text-neutral-400">Dashboard</span>
        </div>
        <div className="px-8 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
