// ============================================================
// config/custom-pairs.ts
// Hardcoded Sepolia pairs sourced from official Zama docs as fallback.
// These are merged with the live on-chain registry.
// ============================================================

import type { RegistryPair, SupportedChainId } from '@/types';
import { CHAIN_IDS } from './chains';

export interface CustomPairEntry
  extends Omit<RegistryPair, 'source' | 'rate' | 'isValid' | 'chainId'> {
  chainId: SupportedChainId;
  rate: bigint;
}

// Official Sepolia testnet pairs — from docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia
// These are seeded as 'custom' source and will be overridden if the on-chain registry also returns them
export const CUSTOM_PAIRS: CustomPairEntry[] = [
  {
    token: {
      address: '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF',
      name: 'USDC (Mock)',
      symbol: 'USDC',
      decimals: 6,
    },
    confidentialToken: {
      address: '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639',
      name: 'Confidential USDC (Mock)',
      symbol: 'cUSDCMock',
      decimals: 6,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0',
      name: 'USD Tether (Mock)',
      symbol: 'USDT',
      decimals: 6,
    },
    confidentialToken: {
      address: '0x4E7B06D78965594eB5EF5414c357ca21E1554491',
      name: 'Confidential USDT (Mock)',
      symbol: 'cUSDTMock',
      decimals: 6,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0xff54739b16576FA5402F211D0b938469Ab9A5f3F',
      name: 'Wrapped Ether (Mock)',
      symbol: 'WETH',
      decimals: 18,
    },
    confidentialToken: {
      address: '0x46208622DA27d91db4f0393733C8BA082ed83158',
      name: 'Confidential WETH (Mock)',
      symbol: 'cWETHMock',
      decimals: 18,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0xFf021fB13cA64e5354c62c954b949a88cfDEb25E',
      name: 'BRON (Mock)',
      symbol: 'BRON',
      decimals: 18,
    },
    confidentialToken: {
      address: '0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891',
      name: 'Confidential BRON (Mock)',
      symbol: 'cBRONMock',
      decimals: 18,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57',
      name: 'ZAMA (Mock)',
      symbol: 'ZAMA',
      decimals: 18,
    },
    confidentialToken: {
      address: '0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB',
      name: 'Confidential ZAMA (Mock)',
      symbol: 'cZAMAMock',
      decimals: 18,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0x93c931278A2aad1916783F952f94276eA5111442',
      name: 'tGBP (Mock)',
      symbol: 'tGBP',
      decimals: 18,
    },
    confidentialToken: {
      address: '0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC',
      name: 'Confidential tGBP (Mock)',
      symbol: 'ctGBPMock',
      decimals: 18,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0x24377AE4AA0C45ecEe71225007f17c5D423dd940',
      name: 'XAUt (Mock)',
      symbol: 'XAUt',
      decimals: 6,
    },
    confidentialToken: {
      address: '0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7',
      name: 'Confidential XAUt (Mock)',
      symbol: 'cXAUtMock',
      decimals: 6,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet mock — public mint up to 1M',
    addedAt: 1719360000000,
  },
  {
    token: {
      address: '0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3',
      name: 'tGBP',
      symbol: 'tGBP',
      decimals: 18,
    },
    confidentialToken: {
      address: '0x167DC962808B32CFFFc7e14B5018c0bE06A3A208',
      name: 'Confidential tGBP',
      symbol: 'ctGBP',
      decimals: 18,
    },
    rate: 1n,
    chainId: CHAIN_IDS.SEPOLIA,
    notes: 'Official Sepolia testnet — restricted mint',
    addedAt: 1719360000000,
  },
];

export function buildCustomRegistryPairs(): RegistryPair[] {
  return CUSTOM_PAIRS.map((entry) => ({
    ...entry,
    source: 'custom' as const,
    isValid: true,
  }));
}