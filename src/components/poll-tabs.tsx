"use client";

import { type ReactNode, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "votes", label: "Voters" },
  { key: "non-voters", label: "Nonvoters" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
        active
          ? "text-text-primary"
          : "text-text-tertiary hover:text-text-secondary"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] h-[18px] text-[10px] font-semibold tabular-nums ${
            active
              ? "bg-lp-green/15 text-lp-green"
              : "bg-surface-overlay text-text-tertiary"
          }`}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-px bg-lp-green" />
      )}
    </button>
  );
}

export function PollTabs({
  voterCount,
  nonVoterCount,
  votesContent,
  nonVotersContent,
  proposalBody,
  resultsCard,
}: {
  voterCount: number;
  nonVoterCount: number;
  votesContent: ReactNode;
  nonVotersContent: ReactNode;
  proposalBody: string | null;
  resultsCard: ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey =
    tabParam === "votes"
      ? "votes"
      : tabParam === "non-voters"
        ? "non-voters"
        : "overview";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTabClick = (key: TabKey) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    if (key === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", key);
    }
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div>
      <nav className="flex border-b border-border-default mb-4">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            label={tab.label}
            count={
              tab.key === "votes"
                ? voterCount
                : tab.key === "non-voters"
                  ? nonVoterCount
                  : undefined
            }
            active={activeTab === tab.key}
            onClick={() => handleTabClick(tab.key)}
          />
        ))}
      </nav>

      <div hidden={activeTab !== "overview"}>
        <div className="space-y-6">
          {resultsCard}
          {proposalBody && (
            <div className="rounded-lg border border-border-default bg-surface-card p-5">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {proposalBody}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      <div hidden={activeTab !== "votes"}>{votesContent}</div>

      <div hidden={activeTab !== "non-voters"}>{nonVotersContent}</div>
    </div>
  );
}
