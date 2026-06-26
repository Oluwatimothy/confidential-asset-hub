// ============================================================
// hooks/use-portfolio.ts
// ============================================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContracts } from 'wagmi';
import { ERC20_ABI } from '@/contracts/erc20-abi';
import { useRegistry } from './use-registry';
import { useNetwork } from './use-network';
import { formatTokenAmount } from '@/utils';
import type { PortfolioEntry } from '@/types';

export function usePortfolio() {
  const { address }  = useAccount();
  const { chainId }  = useNetwork();
  const { pairs }    = useRegistry();

  const activePairs = pairs.filter(
    (p) => p.chainId === chainId && p.isValid,
  );

  // Batch-read all ERC20 balances
  const erc20Contracts = activePairs.map((p) => ({
    address:      p.token.address,
    abi:          ERC20_ABI,
    functionName: 'balanceOf' as const,
    args:         [address!] as [`0x${string}`],
  }));

  const { data: erc20Balances, isLoading } = useReadContracts({
    contracts: address ? erc20Contracts : [],
    query:     { enabled: !!address && activePairs.length > 0 },
  });

  const entries: PortfolioEntry[] = activePairs.map((pair, i) => {
    const rawBalance = (erc20Balances?.[i]?.result as bigint | undefined) ?? 0n;

    return {
      pair,
      erc20Balance: {
        address:          pair.token.address,
        symbol:           pair.token.symbol,
        name:             pair.token.name,
        decimals:         pair.token.decimals,
        rawBalance,
        formattedBalance: formatTokenAmount(rawBalance, pair.token.decimals),
      },
      erc7984Balance: {
        address:        pair.confidentialToken.address,
        symbol:         pair.confidentialToken.symbol,
        name:           pair.confidentialToken.name,
        decimals:       pair.confidentialToken.decimals,
        isDecrypting:   false,
      },
    };
  });

  return {
    entries,
    isLoading: !address ? false : isLoading,
    isConnected: !!address,
  };
}
