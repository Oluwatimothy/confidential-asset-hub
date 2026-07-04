// ============================================================
// components/TokenIcon.tsx
//
// A colored initial badge per token, using each token's real,
// well-known brand color (not a reproduction of the actual logo
// artwork, which would need a licensed asset this app doesn't
// have, and can't fetch at build time in this environment either).
// Zama's is black-on-yellow, matching their actual brand mark.
// Unknown or custom tokens get a deterministic color derived from
// their symbol, so the same token always renders identically
// across the app instead of a random color per mount.
// ============================================================
'use client';

import React from 'react';

const KNOWN_TOKEN_COLORS: Record<string, { bg: string; text: string }> = {
  USDC: { bg: '#2775CA', text: '#FFFFFF' },
  USDT: { bg: '#26A17B', text: '#FFFFFF' },
  WETH: { bg: '#627EEA', text: '#FFFFFF' },
  ETH:  { bg: '#627EEA', text: '#FFFFFF' },
  ZAMA: { bg: '#FFD208', text: '#000000' }, // Zama brand: black on yellow
  XAUT: { bg: '#C9A227', text: '#000000' }, // Tether Gold, gold tone
  BRON: { bg: '#52525B', text: '#FFFFFF' },
  TGBP: { bg: '#3B5BDB', text: '#FFFFFF' },
};

function fallbackColor(symbol: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return { bg: `hsl(${hue}, 55%, 42%)`, text: '#FFFFFF' };
}

export function TokenIcon({
  symbol,
  size = 36,
  className = '',
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const key = (symbol || '?').toUpperCase();
  const colors = KNOWN_TOKEN_COLORS[key] ?? fallbackColor(key);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: Math.max(10, Math.round(size * 0.4)),
      }}
      title={symbol}
    >
      {key.charAt(0)}
    </div>
  );
}
