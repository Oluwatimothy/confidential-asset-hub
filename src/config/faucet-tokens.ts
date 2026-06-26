// ============================================================
// config/faucet-tokens.ts — Faucet token registry
// Source: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia
// ============================================================

import type { FaucetToken } from '@/types';
import { CHAIN_IDS } from './chains';

export const FAUCET_TOKENS: FaucetToken[] = [
  {
    address: '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF',
    name: 'USD Coin (Mock)',
    symbol: 'USDC',
    decimals: 6,
    claimAmount: 1_000_000_000n, // 1,000 USDC
    formattedClaimAmount: '1,000',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0',
    name: 'USD Tether (Mock)',
    symbol: 'USDT',
    decimals: 6,
    claimAmount: 1_000_000_000n, // 1,000 USDT
    formattedClaimAmount: '1,000',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0xff54739b16576FA5402F211D0b938469Ab9A5f3F',
    name: 'Wrapped ETH (Mock)',
    symbol: 'WETH',
    decimals: 18,
    claimAmount: 1_000_000_000_000_000_000n, // 1 WETH
    formattedClaimAmount: '1',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0xFf021fB13cA64e5354c62c954b949a88cfDEb25E',
    name: 'BRON (Mock)',
    symbol: 'BRON',
    decimals: 18,
    claimAmount: 1_000_000_000_000_000_000_000n, // 1,000 BRON
    formattedClaimAmount: '1,000',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57',
    name: 'ZAMA (Mock)',
    symbol: 'ZAMA',
    decimals: 18,
    claimAmount: 1_000_000_000_000_000_000_000n, // 1,000 ZAMA
    formattedClaimAmount: '1,000',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0x93c931278A2aad1916783F952f94276eA5111442',
    name: 'tGBP (Mock)',
    symbol: 'tGBP',
    decimals: 18,
    claimAmount: 1_000_000_000_000_000_000_000n, // 1,000 tGBP
    formattedClaimAmount: '1,000',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
  {
    address: '0x24377AE4AA0C45ecEe71225007f17c5D423dd940',
    name: 'XAUt (Mock)',
    symbol: 'XAUt',
    decimals: 18,
    claimAmount: 1_000_000_000_000_000_000n, // 1 XAUt
    formattedClaimAmount: '1',
    cooldownSeconds: 86400,
    chainId: CHAIN_IDS.SEPOLIA,
  },
];

export function getFaucetTokensByChain(chainId: number): FaucetToken[] {
  return FAUCET_TOKENS.filter((t) => t.chainId === chainId);
}