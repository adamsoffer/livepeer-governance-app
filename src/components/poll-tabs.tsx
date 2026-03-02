"use client";

import { type ReactNode } from "react";
import Link from "next/link";
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
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
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
    </Link>
  );
}

export function PollTabs({
  votesContent,
  nonVotersContent,
  proposalBody,
  resultsCard,
}: {
  votesContent: ReactNode;
  nonVotersContent: ReactNode;
  proposalBody: string | null;
  resultsCard: ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabKey =
    tabParam === "votes"
      ? "votes"
      : tabParam === "non-voters"
        ? "non-voters"
        : "overview";

  return (
    <div>
      <nav className="flex border-b border-border-default mb-4">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            href={tab.key === "overview" ? "?" : `?tab=${tab.key}`}
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

      {activeTab === "non-voters" && nonVotersContent}
    </div>
  );
}
