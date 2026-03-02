"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Address } from "@/components/ui/address";
import { formatStake } from "@/lib/utils";
import type { NonVoter } from "@/lib/graphql/types";

type SortField = "voter" | "totalStake";
type SortDir = "asc" | "desc";

export function NonVoterTable({ nonVoters }: { nonVoters: NonVoter[] }) {
  const [sortField, setSortField] = useState<SortField>("totalStake");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return nonVoters;
    const lower = search.toLowerCase();
    return nonVoters.filter(
      (nv) =>
        nv.address.toLowerCase().includes(lower) ||
        (nv.ensName && nv.ensName.toLowerCase().includes(lower))
    );
  }, [nonVoters, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "totalStake":
          cmp = parseFloat(a.totalStake) - parseFloat(b.totalStake);
          break;
        case "voter":
          cmp = (a.ensName ?? a.address).localeCompare(
            b.ensName ?? b.address
          );
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
              <tr
                key={nv.address}
                className="hover:bg-surface-raised/50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/orchestrators/${nv.address}`}
                    className="hover:underline"
                  >
                    <Address address={nv.address} ensName={nv.ensName} ensAvatar={nv.ensAvatar} />
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-[13px] text-text-secondary">
                  {formatStake(nv.totalStake)}
                </td>
              </tr>
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
