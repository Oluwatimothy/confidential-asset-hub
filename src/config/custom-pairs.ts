// ============================================================
// config/custom-pairs.ts — Local custom pair registry
//
// Add your own ERC20 ↔ ERC7984 pairs here.
// These are merged with the official on-chain registry.
//
// HOW TO ADD A PAIR:
// 1. Deploy (or obtain) an ERC7984ERC20Wrapper contract wrapping your ERC20.
// 2. Add the pair below following the CustomPairEntry structure.
// 3. Rebuild the app — the pair will appear in the Registry Explorer,
//    Portfolio, Wrap Center, and Unwrap Center automatically.
// ============================================================

import type { RegistryPair, SupportedChainId } from '@/types';
import { CHAIN_IDS } from './chains';

export interface CustomPairEntry
  extends Omit<RegistryPair, 'source' | 'rate' | 'isValid' | 'chainId'> {
  chainId: SupportedChainId;
  /** Conversion rate: underlying units per confidential unit. 
   *  e.g. 1_000_000_000_000n for 18-decimal underlying → 6-decimal wrapper */
  rate: bigint;
}

// ── ADD YOUR CUSTOM PAIRS BELOW ───────────────────────────────
export const CUSTOM_PAIRS: CustomPairEntry[] = [
  // Example — remove or replace with real addresses:
  // {
  //   token: {
  //     address: '0xYourERC20Address',
  //     name: 'My Token',
  //     symbol: 'MYT',
  //     decimals: 18,
  //   },
  //   confidentialToken: {
  //     address: '0xYourERC7984WrapperAddress',
  //     name: 'Confidential My Token',
  //     symbol: 'cMYT',
  //     decimals: 6,
  //   },
  //   rate: 1_000_000_000_000n,  // 10^12 for 18→6 decimals
  //   chainId: CHAIN_IDS.SEPOLIA,
  //   notes: 'My custom test token pair',
  //   addedAt: Date.now(),
  // },
];

/** Build RegistryPair objects from custom entries. */
export function buildCustomRegistryPairs(): RegistryPair[] {
  return CUSTOM_PAIRS.map((entry) => ({
    ...entry,
    source: 'custom' as const,
    isValid: true,
  }));
}
