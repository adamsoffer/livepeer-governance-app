import { formatStake } from "@/lib/utils";

export function VoteResultsBar({
  yesPercentage,
  noPercentage,
  yesStake,
  noStake,
  compact = false,
}: {
  yesPercentage: number;
  noPercentage: number;
  yesStake: string;
  noStake: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div
        className={`flex w-full overflow-hidden rounded-full bg-surface-overlay ${compact ? "h-1.5" : "h-2.5"}`}
      >
        {yesPercentage > 0 && (
          <div
            className="bg-vote-yes transition-all duration-500"
            style={{ width: `${yesPercentage}%` }}
          />
        )}
        {noPercentage > 0 && (
          <div
            className="bg-vote-no transition-all duration-500"
            style={{ width: `${noPercentage}%` }}
          />
        )}
      </div>
      {!compact && (
        <div className="flex justify-between text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-vote-yes" />
            <span className="font-medium text-vote-yes">
              {yesPercentage.toFixed(1)}%
            </span>
            <span className="text-text-tertiary">
              {formatStake(yesStake)} LPT
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">
              {formatStake(noStake)} LPT
            </span>
            <span className="font-medium text-vote-no">
              {noPercentage.toFixed(1)}%
            </span>
            <span className="inline-block h-2 w-2 rounded-full bg-vote-no" />
          </div>
        </div>
      )}
    </div>
  );
}
