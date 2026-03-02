import { getStatusColor, getStatusLabel } from "@/lib/utils";
import type { PollStatus } from "@/lib/graphql/types";

export function StatusBadge({ status }: { status: PollStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${getStatusColor(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
