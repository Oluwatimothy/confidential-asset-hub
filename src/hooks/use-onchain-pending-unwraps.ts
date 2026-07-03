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
// Public RPC endpoints (this app defaults to publicnode's free
// Sepolia endpoint unless SEPOLIA_RPC_URL is set) cap how many
// blocks a single eth_getLogs call can span, often a few thousand.
// Asking for a huge range in one call gets silently rejected by
// some providers, so the range is chunked into smaller windows.
// ============================================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { getPublicClient } from '@/services/registry';
import { ERC7984_ABI } from '@/contracts/erc7984-abi';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';
import type { SupportedChainId } from '@/types';

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

// Roughly 4 days of Sepolia blocks (~12s block time) total lookback.
// Generous for catching a recently stuck unwrap without generating so
// many chunked requests across every registry pair that the free RPC
// starts rate-limiting the burst instead.
const TOTAL_BLOCK_LOOKBACK = 30_000n;
// Public RPC endpoints commonly cap eth_getLogs at a few thousand
// blocks per call. 5,000 is conservative enough to work against most
// free providers, including publicnode.
const CHUNK_SIZE = 5_000n;

export interface OnChainPendingUnwrap {
  pairAddress: Address;
  unwrapRequestId: `0x${string}`;
  tokenSymbol: string;
  txHash: `0x${string}`;
}

type Log = Awaited<ReturnType<ReturnType<typeof getPublicClient>['getLogs']>>[number];

async function getLogsChunked(
  client: ReturnType<typeof getPublicClient>,
  address: Address,
  event: typeof UNWRAP_REQUESTED_EVENT | typeof UNWRAP_FINALIZED_EVENT,
  account: Address,
  fromBlock: bigint,
  toBlock: bigint,
  label: string,
): Promise<Log[]> {
  const chunks: Array<{ from: bigint; to: bigint }> = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
    chunks.push({ from: start, to: end });
  }

  const results: Log[] = [];
  // Sequential, not parallel: free RPC endpoints often rate-limit bursts
  // of concurrent requests from the same client harder than they limit
  // range size, so this trades a bit of speed for actually working.
  for (const { from, to } of chunks) {
    try {
      const logs = await client.getLogs({
        address,
        event,
        args: { receiver: account },
        fromBlock: from,
        toBlock: to,
      });
      results.push(...logs);
    } catch (err) {
      // Now actually visible instead of silently vanishing, open devtools
      // console if the scan seems to be missing something.
      console.error(`[onchain-pending-unwraps] ${label} chunk ${from}-${to} for ${address} failed:`, err);
    }
  }
  return results;
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
      let latest: bigint;
      try {
        latest = await client.getBlockNumber();
      } catch (err) {
        console.error('[onchain-pending-unwraps] could not get latest block:', err);
        return [];
      }
      const fromBlock = latest > TOTAL_BLOCK_LOOKBACK ? latest - TOTAL_BLOCK_LOOKBACK : 0n;

      const found: OnChainPendingUnwrap[] = [];

      await Promise.all(
        pairs.map(async (pair) => {
          const [requested, finalized] = await Promise.all([
            getLogsChunked(client, pair.confidentialToken.address, UNWRAP_REQUESTED_EVENT, account, fromBlock, latest, 'UnwrapRequested'),
            getLogsChunked(client, pair.confidentialToken.address, UNWRAP_FINALIZED_EVENT, account, fromBlock, latest, 'UnwrapFinalized'),
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
        }),
      );

      return found;
    },
    enabled: !!account && pairs.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });
}