// ============================================================
// config/chains.ts — Chain and contract address config
// ============================================================

import type { SupportedChainId } from '@/types';

// ── Chain IDs ─────────────────────────────────────────────────
export const CHAIN_IDS = {
  MAINNET: 1 as const,
  SEPOLIA: 11155111 as const,
} as const;

// ── Zama FHEVM Contract Addresses — Mainnet ───────────────────
export const MAINNET_FHEVM = {
  ACL_CONTRACT:             '0xcA2E8f1F656CD25C01F05d0b243Ab1ecd4a8ffb6' as `0x${string}`,
  FHEVM_EXECUTOR_CONTRACT:  '0xD82385dADa1ae3E969447f20A3164F6213100e75' as `0x${string}`,
  KMS_VERIFIER_CONTRACT:    '0x77627828a55156b04Ac0DC0eb30467f1a552BB03' as `0x${string}`,
} as const;

// ── Zama FHEVM Contract Addresses — Sepolia ───────────────────
export const SEPOLIA_FHEVM = {
  ACL_CONTRACT:                      '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D' as `0x${string}`,
  FHEVM_EXECUTOR_CONTRACT:           '0x92C920834Ec8941d2C77D188936E1f7A6f49c127' as `0x${string}`,
  KMS_VERIFIER_CONTRACT:             '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A' as `0x${string}`,
  HCU_LIMIT_CONTRACT:                '0xa10998783c8CF88D886Bc30307e631D6686F0A22' as `0x${string}`,
  INPUT_VERIFIER_CONTRACT:           '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0' as `0x${string}`,
  DECRYPTION_ADDRESS:                '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478' as `0x${string}`,
  INPUT_VERIFICATION_ADDRESS:        '0x483b9dE06E4E4C7D35CCf5837A1668487406D955' as `0x${string}`,
} as const;

// ── Registry Addresses ─────────────────────────────────────────
export const REGISTRY_ADDRESSES: Record<SupportedChainId, `0x${string}`> = {
  [CHAIN_IDS.MAINNET]: '0xeb5015fF021DB115aCe010f23F55C2591059bBA0',
  // Sepolia registry — same proxy as mainnet; update if Zama publishes a separate Sepolia address
  [CHAIN_IDS.SEPOLIA]: '0xeb5015fF021DB115aCe010f23F55C2591059bBA0',
};

// ── Relayer URLs ──────────────────────────────────────────────
export const RELAYER_URLS: Record<SupportedChainId, string> = {
  [CHAIN_IDS.MAINNET]: 'https://relayer.zama.org',
  [CHAIN_IDS.SEPOLIA]: 'https://relayer.testnet.zama.org',
};

// ── Gateway Chain IDs ─────────────────────────────────────────
export const GATEWAY_CHAIN_IDS: Record<SupportedChainId, number> = {
  [CHAIN_IDS.MAINNET]: 10901,
  [CHAIN_IDS.SEPOLIA]: 10901,
};

// ── Block Explorer URLs ───────────────────────────────────────
export const BLOCK_EXPLORERS: Record<SupportedChainId, string> = {
  [CHAIN_IDS.MAINNET]: 'https://etherscan.io',
  [CHAIN_IDS.SEPOLIA]: 'https://sepolia.etherscan.io',
};

export function getTxUrl(hash: string, chainId: SupportedChainId): string {
  return `${BLOCK_EXPLORERS[chainId]}/tx/${hash}`;
}

export function getAddressUrl(address: string, chainId: SupportedChainId): string {
  return `${BLOCK_EXPLORERS[chainId]}/address/${address}`;
}

// ── Chain Names ───────────────────────────────────────────────
export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  [CHAIN_IDS.MAINNET]: 'Ethereum',
  [CHAIN_IDS.SEPOLIA]: 'Sepolia',
};

export const DEFAULT_CHAIN_ID: SupportedChainId = CHAIN_IDS.SEPOLIA;
