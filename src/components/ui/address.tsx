"use client";

import { truncateAddress } from "@/lib/utils";
import { useState } from "react";
import { AddressAvatar } from "./address-avatar";

export function Address({
  address,
  ensName,
  ensAvatar,
}: {
  address: string;
  ensName?: string | null;
  ensAvatar?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group/addr inline-flex items-center gap-1.5 font-mono text-[13px] text-text-secondary hover:text-lp-green transition-colors max-w-full"
      title={`${address}\nClick to copy`}
    >
      <AddressAvatar address={address} ensAvatar={ensAvatar} size={16} />
      {ensName ? (
        <span className="truncate min-w-0">
          <span className="font-sans font-medium text-text-primary">
            {ensName}
          </span>
          <span className="text-text-tertiary ml-1.5">
            {truncateAddress(address)}
          </span>
        </span>
      ) : (
        truncateAddress(address)
      )}
      <span className="text-[11px] text-text-tertiary opacity-0 group-hover/addr:opacity-100 transition-opacity flex-shrink-0">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
