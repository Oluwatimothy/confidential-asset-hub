// ============================================================
// components/BalanceLabel.tsx
//
// Wraps formatTokenAmount for every place the app shows someone
// "how much you have". Confidential tokens are always 6 decimals,
// underlying ERC20s vary. Either way, if a raw amount was minted
// as a plain human number instead of being scaled by the token's
// actual decimals (an easy, common mistake when deploying a test
// token), the resulting balance displays as a tiny fraction, which
// reads as "the app is broken" if there's nothing to explain it.
//
// This shows the true raw integer underneath whenever the display
// value is under one whole token, so a small number is legible as
// "this really is what's on-chain" instead of an unexplained bug.
// ============================================================
'use client';

import React from 'react';
import { formatTokenAmount } from '@/utils';

export function BalanceLabel({
  raw,
  decimals,
  symbol,
  className,
  hintClassName,
}: {
  raw: bigint | undefined;
  decimals: number;
  symbol: string;
  className?: string;
  hintClassName?: string;
}) {
  if (raw === undefined) {
    return <span className={className}>—</span>;
  }

  const display = formatTokenAmount(raw, decimals);
  const isSmall = raw > 0n && raw < 10n ** BigInt(decimals);

  return (
    <span className={className}>
      {display} {symbol}
      {isSmall && (
        <span className={hintClassName ?? 'block text-[10px] text-zinc-600 font-normal mt-0.5'}>
          {raw.toString()} raw base units at {decimals} decimals. If this looks smaller than
          expected, it usually means the token was minted with a human-sized number instead of
          one scaled to its decimals, the value shown here is genuinely what's on-chain.
        </span>
      )}
    </span>
  );
}
