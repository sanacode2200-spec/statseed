import { Sidebar } from "@/components/layout/Sidebar";
import { DataProvider } from "@/contexts/DataContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto bg-gray-50 pt-12 dark:bg-[#0a0a0a] md:pt-0">
          {/* トップバー */}
          <div className="hidden md:flex border-b border-gray-200 dark:border-neutral-900 px-8 py-2.5 items-center gap-2">
            <span className="text-[12px] text-gray-400 dark:text-neutral-600">Statseed</span>
            <span className="text-[12px] text-gray-300 dark:text-neutral-800">/</span>
            <span className="text-[12px] text-gray-600 dark:text-neutral-400">ホーム</span>
          </div>
          <div className="px-3 py-5 sm:px-5 md:px-8 md:py-7">
            {children}
          </div>
        </main>
      </div>
    </DataProvider>
  );
}
