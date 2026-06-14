"use client";

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex max-w-full flex-wrap gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-neutral-900 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded px-3 py-1 text-[12px] font-medium transition-colors ${
            value === option.value
              ? "bg-white text-black shadow-sm dark:bg-neutral-800 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
