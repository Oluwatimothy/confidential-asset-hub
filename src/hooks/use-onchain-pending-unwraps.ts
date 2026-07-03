// ============================================================
// hooks/use-onchain-pending-unwraps.ts
//
// Local storage only knows about unwrap requests that finished
// executing in this browser. If the tab was reloaded mid-signature,
// nothing ever got the chance to save the request, even though it
// genuinely went through on-chain. This hook closes that gap by
// asking the chain directly: for the connected wallet, which
// UnwrapRequested events have no matching UnwrapFinalized event?
//
// Deliberately defensive: any RPC failure here just yields an empty
// result, it never throws into the page, and it never touches any
// other hook, store, or flow. Safe to add without risking anything
// that already works.
// ============================================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicClient } from '@/services/registry';
import { ERC7984_ABI } from '@/contracts/erc7984-abi';

const UNWRAP_REQUESTED_EVENT = ERC7984_ABI.find(
  (i) => i.type === 'event' && i.name === 'UnwrapRequested',
) as {
  type: 'event';
  name: 'UnwrapRequested';
  inputs: readonly [
    { name: 'receiver'; type: 'address'; indexed: true },
    { name: 'unwrapRequestId'; type: 'bytes32'; indexed: true },
    { name: 'amount'; type: 'bytes32'; indexed: false },
  ];
};

const UNWRAP_FINALIZED_EVENT = ERC7984_ABI.find(
  (i) => i.type === 'event' && i.name === 'UnwrapFinalized',
) as {
  type: 'event';
  name: 'UnwrapFinalized';
  inputs: readonly [
    { name: 'receiver'; type: 'address'; indexed: true },
    { name: 'unwrapRequestId'; type: 'bytes32'; indexed: true },
    { name: 'encryptedAmount'; type: 'bytes32'; indexed: false },
    { name: 'cleartextAmount'; type: 'uint64'; indexed: false },
  ];
};

import type { RegistryPair } from '@/types';
import type { Address } from 'viem';
import type { SupportedChainId } from '@/types';

// Roughly 14 days of Sepolia blocks (~12s block time). Unwrap requests
// should finalize within minutes to hours in normal operation, this is
// a generous safety window without risking an unbounded getLogs call,
// which public RPC endpoints commonly reject or rate limit hard.
const BLOCK_LOOKBACK = 100_000n;

export interface OnChainPendingUnwrap {
  pairAddress: Address;
  unwrapRequestId: `0x${string}`;
  tokenSymbol: string;
  txHash: `0x${string}`;
}

export function useOnChainPendingUnwraps(
  account: Address | undefined,
  pairs: RegistryPair[],
  chainId: SupportedChainId,
) {
  return useQuery({
    queryKey: ['onchain-pending-unwraps', account, chainId, pairs.map((p) => p.confidentialToken.address).join(',')],
    queryFn: async (): Promise<OnChainPendingUnwrap[]> => {
      if (!account || pairs.length === 0) return [];

      const client = getPublicClient(chainId);
      let fromBlock = 0n;
      try {
        const latest = await client.getBlockNumber();
        fromBlock = latest > BLOCK_LOOKBACK ? latest - BLOCK_LOOKBACK : 0n;
      } catch {
        return []; // Can't even get a block number, RPC is having a bad time, bail quietly.
      }

      const found: OnChainPendingUnwrap[] = [];

      await Promise.all(
        pairs.map(async (pair) => {
          try {
            const [requested, finalized] = await Promise.all([
              client.getLogs({
                address: pair.confidentialToken.address,
                event: UNWRAP_REQUESTED_EVENT,
                args: { receiver: account },
                fromBlock,
              }),
              client.getLogs({
                address: pair.confidentialToken.address,
                event: UNWRAP_FINALIZED_EVENT,
                args: { receiver: account },
                fromBlock,
              }),
            ]);

            const finalizedIds = new Set(
              finalized.map((log) => (log as unknown as { args: { unwrapRequestId: string } }).args.unwrapRequestId),
            );

            for (const log of requested) {
              const requestId = (log as unknown as { args: { unwrapRequestId: `0x${string}` } }).args.unwrapRequestId;
              const txHash = (log as unknown as { transactionHash: `0x${string}` }).transactionHash;
              if (requestId && !finalizedIds.has(requestId)) {
                found.push({
                  pairAddress: pair.confidentialToken.address,
                  unwrapRequestId: requestId,
                  tokenSymbol: pair.confidentialToken.symbol,
                  txHash,
                });
              }
            }
          } catch {
            // One pair's RPC call failing shouldn't take down the others.
          }
        }),
      );

      return found;
    },
    enabled: !!account && pairs.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });
}