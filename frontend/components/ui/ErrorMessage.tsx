export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-[18px] text-red-700 dark:text-red-400">
      {message}
    </div>
  );
}
