// ============================================================
// hooks/use-token-metadata.ts
// ============================================================
'use client';

import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { ERC20_ABI } from '@/contracts/erc20-abi';

export function useTokenMetadata(address: Address | undefined) {
  const { data, isLoading, isError } = useReadContracts({
    contracts: address
      ? [
          { address, abi: ERC20_ABI, functionName: 'name'     as const },
          { address, abi: ERC20_ABI, functionName: 'symbol'   as const },
          { address, abi: ERC20_ABI, functionName: 'decimals' as const },
        ]
      : [],
    query: { enabled: !!address },
  });

  return {
    name:      (data?.[0]?.result as string  | undefined) ?? undefined,
    symbol:    (data?.[1]?.result as string  | undefined) ?? undefined,
    decimals:  (data?.[2]?.result as number  | undefined) ?? undefined,
    isLoading,
    isError,
  };
}
