"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-md px-3 py-1.5 text-[16px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed sm:min-h-0";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
      : "border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-neutral-900";

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${styles} ${className}`}
    >
      {loading && (
        <svg className="mr-1.5 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
