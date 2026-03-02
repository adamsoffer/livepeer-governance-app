"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Address } from "@/components/ui/address";
import { formatStake } from "@/lib/utils";
import type { VoteWithStake } from "@/lib/graphql/types";

type SortField = "stake" | "choice" | "voter" | "time";
type SortDir = "asc" | "desc";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function VoteRow({
  vote,
  expanded,
  onToggle,
}: {
  vote: VoteWithStake;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasOverrides = vote.delegatorOverrides.length > 0;

  return (
    <>
      <tr className="hover:bg-surface-raised/50 transition-colors">
        <td className="px-4 py-2.5">
          <Link
            href={`/orchestrators/${vote.voter}`}
            className="hover:underline"
          >
            <Address address={vote.voter} ensName={vote.ensName} ensAvatar={vote.ensAvatar} />
          </Link>
          {hasOverrides && (
            <button
              onClick={onToggle}
              className="flex items-center gap-0.5 text-[10px] font-sans text-amber-400 hover:text-amber-300 transition-colors mt-0.5"
            >
              <span>{vote.delegatorOverrides.length} override{vote.delegatorOverrides.length > 1 ? "s" : ""}</span>
              <svg
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </td>
        <td className="px-4 py-2.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
              vote.registeredTranscoder
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "bg-surface-overlay text-text-tertiary border border-border-default"
            }`}
          >
            {vote.registeredTranscoder ? "Orchestrator" : "Delegator"}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              vote.choiceID === "Yes"
                ? "bg-vote-yes/10 text-vote-yes"
                : "bg-vote-no/10 text-vote-no"
            }`}
          >
            {vote.choiceID}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-[13px] text-text-secondary whitespace-nowrap">
          {formatStake(vote.voteStake)}
        </td>
        <td className="px-4 py-2.5 text-right text-[12px] text-text-tertiary whitespace-nowrap">
          {vote.timestamp ? formatTimestamp(vote.timestamp) : "—"}
        </td>
      </tr>
      {expanded &&
        vote.delegatorOverrides.map((override) => (
          <tr
            key={override.voter}
            className="bg-white/[0.04]"
          >
            <td className="pl-8 pr-4 py-2">
              <Link
                href={`/orchestrators/${override.voter}`}
                className="hover:underline"
              >
                <Address
                  address={override.voter}
                  ensName={override.ensName}
                  ensAvatar={override.ensAvatar}
                />
              </Link>
            </td>
            <td className="px-4 py-2">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-surface-overlay text-text-tertiary border border-border-default">
                Delegator
              </span>
            </td>
            <td className="px-4 py-2">
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  override.choiceID === "Yes"
                    ? "bg-vote-yes/10 text-vote-yes"
                    : "bg-vote-no/10 text-vote-no"
                }`}
              >
                {override.choiceID}
              </span>
            </td>
            <td className="px-4 py-2 text-right font-mono text-[12px] text-text-tertiary">
              {formatStake(override.voteStake)}
            </td>
            <td className="px-4 py-2 text-right text-[12px] text-text-tertiary whitespace-nowrap">
              {override.timestamp ? formatTimestamp(override.timestamp) : "—"}
            </td>
          </tr>
        ))}
    </>
  );
}

export function VoterTable({ votes }: { votes: VoteWithStake[] }) {
  const [sortField, setSortField] = useState<SortField>("stake");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [expandedVoters, setExpandedVoters] = useState<Set<string>>(
    new Set()
  );

  const toggleExpanded = (voter: string) => {
    setExpandedVoters((prev) => {
      const next = new Set(prev);
      if (next.has(voter)) {
        next.delete(voter);
      } else {
        next.add(voter);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!search) return votes;
    const lower = search.toLowerCase();
    return votes.filter(
      (v) =>
        v.voter.toLowerCase().includes(lower) ||
        (v.ensName && v.ensName.toLowerCase().includes(lower))
    );
  }, [votes, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "stake":
          cmp = parseFloat(a.voteStake) - parseFloat(b.voteStake);
          break;
        case "choice":
          cmp = a.choiceID.localeCompare(b.choiceID);
          break;
        case "voter":
          cmp = (a.ensName ?? a.voter).localeCompare(b.ensName ?? b.voter);
          break;
        case "time":
          cmp = (a.timestamp ?? 0) - (b.timestamp ?? 0);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer select-none px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-lp-green">
            {sortDir === "desc" ? "↓" : "↑"}
          </span>
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Filter voters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-border-default bg-surface-base pl-9 pr-3 py-1.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-lp-green/50 focus:outline-none focus:ring-1 focus:ring-lp-green/30 transition-colors"
          />
        </div>
        <span className="text-[12px] text-text-tertiary">
          {sorted.length} voters
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full">
          <thead className="border-b border-border-default bg-surface-raised">
            <tr>
              <SortHeader field="voter">Address</SortHeader>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                Type
              </th>
              <SortHeader field="choice">Vote</SortHeader>
              <SortHeader field="stake" className="text-right">
                Vote Weight
              </SortHeader>
              <SortHeader field="time" className="text-right">
                Date
              </SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.map((vote) => (
              <VoteRow
                key={vote.id}
                vote={vote}
                expanded={expandedVoters.has(vote.voter)}
                onToggle={() => toggleExpanded(vote.voter)}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[13px] text-text-tertiary"
                >
                  {search ? "No matching voters found" : "No votes cast"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
