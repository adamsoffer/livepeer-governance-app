"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Address } from "@/components/ui/address";
import { formatStake } from "@/lib/utils";
import { useEnsProfiles } from "@/hooks/use-ens-profiles";
import type { NonVoter } from "@/lib/graphql/types";

type SortField = "voter" | "totalStake";
type SortDir = "asc" | "desc";

interface EnsProfile {
  name: string | null;
  avatar: string | null;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function NonVoterRow({
  nonVoter,
  expanded,
  onToggle,
  ensProfiles,
}: {
  nonVoter: NonVoter;
  expanded: boolean;
  onToggle: () => void;
  ensProfiles: Map<string, EnsProfile>;
}) {
  const hasOverrides = nonVoter.delegatorOverrides.length > 0;
  const profile = ensProfiles.get(nonVoter.address.toLowerCase());

  return (
    <>
      <tr className="hover:bg-surface-raised/50 transition-colors">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Link
              href={`/orchestrators/${nonVoter.address}`}
              className="hover:underline"
            >
              <Address
                address={nonVoter.address}
                ensName={profile?.name ?? nonVoter.ensName}
                ensAvatar={profile?.avatar ?? nonVoter.ensAvatar}
              />
            </Link>
            {hasOverrides && (
              <button
                onClick={onToggle}
                className="flex items-center gap-0.5 text-[10px] font-sans text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                <span>
                  {nonVoter.delegatorOverrides.length} override
                  {nonVoter.delegatorOverrides.length > 1 ? "s" : ""}
                </span>
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
          </div>
        </td>
        <td className="px-4 py-2.5 text-right font-mono text-[13px] text-text-secondary">
          {formatStake(nonVoter.totalStake)}
        </td>
      </tr>
      {expanded &&
        nonVoter.delegatorOverrides.map((override) => {
          const oProfile = ensProfiles.get(override.voter.toLowerCase());
          return (
            <tr key={override.voter} className="bg-white/[0.04]">
              <td className="pl-8 pr-4 py-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/orchestrators/${override.voter}`}
                    className="hover:underline"
                  >
                    <Address
                      address={override.voter}
                      ensName={oProfile?.name ?? override.ensName}
                      ensAvatar={oProfile?.avatar ?? override.ensAvatar}
                    />
                  </Link>
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-surface-overlay text-text-tertiary border border-border-default">
                    Delegator
                  </span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      override.choiceID === "Yes"
                        ? "bg-vote-yes/10 text-vote-yes"
                        : "bg-vote-no/10 text-vote-no"
                    }`}
                  >
                    {override.choiceID}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-right font-mono text-[12px] text-text-tertiary">
                {formatStake(override.voteStake)}
              </td>
            </tr>
          );
        })}
    </>
  );
}

export function NonVoterTable({ nonVoters }: { nonVoters: NonVoter[] }) {
  const [sortField, setSortField] = useState<SortField>("totalStake");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [expandedVoters, setExpandedVoters] = useState<Set<string>>(
    new Set()
  );

  const allAddresses = useMemo(() => {
    const addrs: string[] = [];
    for (const nv of nonVoters) {
      addrs.push(nv.address);
      for (const o of nv.delegatorOverrides) {
        addrs.push(o.voter);
      }
    }
    return addrs;
  }, [nonVoters]);
  const ensProfiles = useEnsProfiles(allAddresses);

  const toggleExpanded = (address: string) => {
    setExpandedVoters((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!search) return nonVoters;
    const lower = search.toLowerCase();
    return nonVoters.filter((nv) => {
      const profile = ensProfiles.get(nv.address.toLowerCase());
      const ensName = profile?.name ?? nv.ensName;
      return (
        nv.address.toLowerCase().includes(lower) ||
        (ensName && ensName.toLowerCase().includes(lower))
      );
    });
  }, [nonVoters, search, ensProfiles]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "totalStake":
          cmp = parseFloat(a.totalStake) - parseFloat(b.totalStake);
          break;
        case "voter": {
          const aName = ensProfiles.get(a.address.toLowerCase())?.name ?? a.ensName ?? a.address;
          const bName = ensProfiles.get(b.address.toLowerCase())?.name ?? b.ensName ?? b.address;
          cmp = aName.localeCompare(bName);
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortField, sortDir, ensProfiles]);

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
            placeholder="Filter orchestrators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md border border-border-default bg-surface-base pl-9 pr-3 py-1.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-lp-green/50 focus:outline-none focus:ring-1 focus:ring-lp-green/30 transition-colors"
          />
        </div>
        <span className="text-[12px] text-text-tertiary">
          {sorted.length} orchestrators haven&apos;t voted
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className="w-full">
          <thead className="border-b border-border-default bg-surface-raised">
            <tr>
              <SortHeader field="voter">Address</SortHeader>
              <SortHeader field="totalStake" className="text-right">
                Total Stake
              </SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.map((nv) => (
              <NonVoterRow
                key={nv.address}
                nonVoter={nv}
                expanded={expandedVoters.has(nv.address)}
                onToggle={() => toggleExpanded(nv.address)}
                ensProfiles={ensProfiles}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-8 text-center text-[13px] text-text-tertiary"
                >
                  {search
                    ? "No matching orchestrators found"
                    : "All orchestrators have voted"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
