export function ProgressBar({
  percentage,
  color = "emerald",
}: {
  percentage: number;
  color?: "emerald" | "rose";
}) {
  const bg = color === "emerald" ? "bg-emerald-500" : "bg-rose-500";
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${bg} transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}
