"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "votes", label: "Votes" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
        active
          ? "text-text-primary"
          : "text-text-tertiary hover:text-text-secondary"
      }`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-px bg-lp-green" />
      )}
    </button>
  );
}

export function PollTabs({
  votesContent,
  proposalBody,
  resultsCard,
}: {
  votesContent: ReactNode;
  proposalBody: string | null;
  resultsCard: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div>
      <nav className="flex border-b border-border-default mb-4">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          />
        ))}
      </nav>

      {activeTab === "overview" && (
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
      )}

      {activeTab === "votes" && votesContent}
    </div>
  );
}
