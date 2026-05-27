"use client";

type FormalEventBadgeProps = {
  title: string;
  subtitle: string;
  meta?: string;
  status?: string;
  statusTone?: "default" | "full" | "signed";
  onClick: () => void;
};

export function FormalEventBadge({
  title,
  subtitle,
  meta,
  status,
  statusTone = "default",
  onClick,
}: FormalEventBadgeProps) {
  const statusClass =
    statusTone === "full"
      ? "bg-zinc-200 text-zinc-700"
      : statusTone === "signed"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-violet-100 text-violet-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-left transition hover:border-violet-400 hover:shadow-sm dark:border-violet-800 dark:bg-violet-950/30"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{title}</p>
        {status && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {status}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      {meta && <p className="mt-1 text-xs text-zinc-500">{meta}</p>}
    </button>
  );
}
