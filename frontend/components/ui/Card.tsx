export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
