// ============================================================
// services/registry.ts — Registry fetching and merging
// ============================================================

import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { REGISTRY_ABI } from '@/contracts/registry-abi';
import { ERC20_ABI } from '@/contracts/erc20-abi';
import { ERC7984_ABI } from '@/contracts/erc7984-abi';
import { REGISTRY_ADDRESSES, CHAIN_IDS } from '@/config/chains';
import { buildCustomRegistryPairs } from '@/config/custom-pairs';
import type { RegistryPair, TokenInfo, TokenWrapperPair, SupportedChainId } from '@/types';
import type { Address } from 'viem';

// ── Client factory ────────────────────────────────────────────
export function getPublicClient(chainId: SupportedChainId): PublicClient {
  const chain = chainId === CHAIN_IDS.MAINNET ? mainnet : sepolia;
  const network = chainId === CHAIN_IDS.MAINNET ? 'mainnet' : 'sepolia';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const rpcUrl = `${baseUrl}/api/rpc/${network}`;
  return createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;
}

// ── Fetch raw pairs from on-chain registry ────────────────────
async function fetchOnChainPairs(
  chainId: SupportedChainId,
): Promise<TokenWrapperPair[]> {
  const client = getPublicClient(chainId);
  const address = REGISTRY_ADDRESSES[chainId];

  const raw = await client.readContract({
    address,
    abi: REGISTRY_ABI,
    functionName: 'getTokenConfidentialTokenPairs',
  });

  return (raw as Array<{ tokenAddress: Address; confidentialTokenAddress: Address; isValid: boolean }>).map(
    (p) => ({
      tokenAddress: p.tokenAddress,
      confidentialTokenAddress: p.confidentialTokenAddress,
      isValid: p.isValid,
    }),
  );
}

// ── Resolve ERC20 metadata ────────────────────────────────────
async function resolveERC20Metadata(
  address: Address,
  client: PublicClient,
): Promise<TokenInfo> {
  try {
    const [name, symbol, decimals] = await Promise.all([
      client.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
      client.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
      client.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
    ]);
    return {
      address,
      name: name as string,
      symbol: symbol as string,
      decimals: Number(decimals),
    };
  } catch {
    return { address, name: 'Unknown', symbol: '???', decimals: 18 };
  }
}

// ── Resolve ERC7984 metadata + rate ──────────────────────────
async function resolveERC7984Metadata(
  address: Address,
  client: PublicClient,
): Promise<{ info: TokenInfo; rate: bigint }> {
  try {
    const [name, symbol, decimals, rate] = await Promise.all([
      client.readContract({ address, abi: ERC7984_ABI, functionName: 'name' }),
      client.readContract({ address, abi: ERC7984_ABI, functionName: 'symbol' }),
      client.readContract({ address, abi: ERC7984_ABI, functionName: 'decimals' }),
      client.readContract({ address, abi: ERC7984_ABI, functionName: 'rate' }),
    ]);
    return {
      info: {
        address,
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
      },
      rate: rate as bigint,
    };
  } catch {
    return {
      info: { address, name: 'Unknown', symbol: 'c???', decimals: 6 },
      rate: 1n,
    };
  }
}

// ── Fetch full registry ───────────────────────────────────────
export async function fetchOfficialRegistry(
  chainId: SupportedChainId,
): Promise<RegistryPair[]> {
  const client = getPublicClient(chainId);
  const rawPairs = await fetchOnChainPairs(chainId);

  const pairs = await Promise.all(
    rawPairs.map(async (pair): Promise<RegistryPair> => {
      const [token, confidentialData] = await Promise.all([
        resolveERC20Metadata(pair.tokenAddress, client),
        resolveERC7984Metadata(pair.confidentialTokenAddress, client),
      ]);
      return {
        token,
        confidentialToken: confidentialData.info,
        rate: confidentialData.rate,
        isValid: pair.isValid,
        source: 'official',
        chainId,
        addedAt: Date.now(),
      };
    }),
  );

  return pairs;
}

// ── Merge official + custom, deduplicate ──────────────────────
export function mergeRegistries(
  official: RegistryPair[],
  custom: RegistryPair[],
): RegistryPair[] {
  const seen = new Set<string>();
  const merged: RegistryPair[] = [];

  for (const pair of [...official, ...custom]) {
    const key = `${pair.chainId}:${pair.token.address.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(pair);
    }
  }

  return merged;
}

// ── Full registry fetch (official + custom) ───────────────────
export async function fetchFullRegistry(
  chainId: SupportedChainId,
): Promise<RegistryPair[]> {
  // Always start with hardcoded pairs so UI is never empty
  const custom = buildCustomRegistryPairs().filter((p) => p.chainId === chainId);

  try {
    const official = await fetchOfficialRegistry(chainId);
    // Merge: official on-chain pairs take precedence, then fill with custom
    return mergeRegistries(official, custom);
  } catch {
    // If RPC fails, return the hardcoded pairs so UI still works
    console.warn(`On-chain registry fetch failed for chain ${chainId}, using hardcoded pairs`);
    return custom;
  }
}

// ── Get single pair by ERC20 address ─────────────────────────
export async function fetchRegistryPair(
  erc20Address: Address,
  chainId: SupportedChainId,
): Promise<RegistryPair | null> {
  try {
    const client = getPublicClient(chainId);
    const [isValid, confidentialTokenAddress] = (await client.readContract({
      address: REGISTRY_ADDRESSES[chainId],
      abi: REGISTRY_ABI,
      functionName: 'getConfidentialTokenAddress',
      args: [erc20Address],
    })) as [boolean, Address];

    if (!confidentialTokenAddress || confidentialTokenAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    const [token, confidentialData] = await Promise.all([
      resolveERC20Metadata(erc20Address, client),
      resolveERC7984Metadata(confidentialTokenAddress, client),
    ]);

    return {
      token,
      confidentialToken: confidentialData.info,
      rate: confidentialData.rate,
      isValid,
      source: 'official',
      chainId,
      addedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ── Validate ERC7984 address ──────────────────────────────────
export async function validateERC7984Address(
  address: Address,
  chainId: SupportedChainId,
): Promise<boolean> {
  try {
    const client = getPublicClient(chainId);
    const supported = await client.readContract({
      address,
      abi: ERC7984_ABI,
      functionName: 'supportsInterface',
      args: ['0x4958f2a4'],
    });
    return supported as boolean;
  } catch {
    return false;
  }
}
