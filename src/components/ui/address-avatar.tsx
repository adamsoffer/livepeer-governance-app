"use client";

/**
 * Generates a deterministic gradient avatar from an Ethereum address.
 * Uses address bytes to pick two colors and a gradient angle.
 */
function addressToGradient(address: string): string {
  const hex = address.toLowerCase().replace("0x", "");

  // Use different parts of the address for different color components
  const r1 = parseInt(hex.slice(0, 2), 16);
  const g1 = parseInt(hex.slice(2, 4), 16);
  const b1 = parseInt(hex.slice(4, 6), 16);

  const r2 = parseInt(hex.slice(6, 8), 16);
  const g2 = parseInt(hex.slice(8, 10), 16);
  const b2 = parseInt(hex.slice(10, 12), 16);

  const angle = parseInt(hex.slice(12, 14), 16) * 1.41; // 0-360

  // Boost saturation by pushing colors apart from gray
  const boost = (v: number) => Math.round(v * 0.7 + 80);

  const c1 = `rgb(${boost(r1)}, ${boost(g1)}, ${boost(b1)})`;
  const c2 = `rgb(${boost(r2)}, ${boost(g2)}, ${boost(b2)})`;

  return `linear-gradient(${Math.round(angle)}deg, ${c1}, ${c2})`;
}

export function AddressAvatar({
  address,
  ensAvatar,
  size = 16,
  className = "",
}: {
  address: string;
  ensAvatar?: string | null;
  size?: number;
  className?: string;
}) {
  if (ensAvatar) {
    return (
      <img
        src={ensAvatar}
        alt=""
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: addressToGradient(address),
      }}
    />
  );
}
