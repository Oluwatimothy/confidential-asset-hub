// ============================================================
// config/faucet-tokens.ts — Sepolia testnet mock tokens
// Underlying tokens have public mint(address, uint256) limited to 1,000,000 per call
// We claim 10 tokens each for a clean UX
// ============================================================

import type { FaucetToken } from '@/types';
import { CHAIN_IDS } from './chains';

export const FAUCET_TOKENS: FaucetToken[] = [
  {
    address:              '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF',
    name:                 'USD Coin (Mock)',
    symbol:               'USDC',
    decimals:             6,
    claimAmount:          10_000_000n, // 10 USDC (6 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639',
  },
  {
    address:              '0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0',
    name:                 'USD Tether (Mock)',
    symbol:               'USDT',
    decimals:             6,
    claimAmount:          10_000_000n, // 10 USDT (6 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0x4E7B06D78965594eB5EF5414c357ca21E1554491',
  },
  {
    address:              '0xff54739b16576FA5402F211D0b938469Ab9A5f3F',
    name:                 'Wrapped Ether (Mock)',
    symbol:               'WETH',
    decimals:             18,
    claimAmount:          10_000_000_000_000_000_000n, // 10 WETH (18 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0x46208622DA27d91db4f0393733C8BA082ed83158',
  },
  {
    address:              '0xFf021fB13cA64e5354c62c954b949a88cfDEb25E',
    name:                 'BRON (Mock)',
    symbol:               'BRON',
    decimals:             18,
    claimAmount:          10_000_000_000_000_000_000n, // 10 BRON (18 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0xaa5612FA27c927a0c7961f5AEFEE5ba3A0F9C891',
  },
  {
    address:              '0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57',
    name:                 'ZAMA (Mock)',
    symbol:               'ZAMA',
    decimals:             18,
    claimAmount:          10_000_000_000_000_000_000n, // 10 ZAMA (18 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB',
  },
  {
    address:              '0x93c931278A2aad1916783F952f94276eA5111442',
    name:                 'tGBP (Mock)',
    symbol:               'tGBP',
    decimals:             18,
    claimAmount:          10_000_000_000_000_000_000n, // 10 tGBP (18 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC',
  },
  {
    address:              '0x24377AE4AA0C45ecEe71225007f17c5D423dd940',
    name:                 'XAUt (Mock)',
    symbol:               'XAUt',
    decimals:             6,
    claimAmount:          10_000_000n, // 10 XAUt (6 decimals)
    formattedClaimAmount: '10',
    cooldownSeconds:      0,
    chainId:              CHAIN_IDS.SEPOLIA,
    wrapperAddress:       '0xe4FcF848739845BC81Dee1d5352cf3844F0a60C7',
  },
];

export function getFaucetTokensByChain(chainId: number): FaucetToken[] {
  return FAUCET_TOKENS.filter((t) => t.chainId === chainId);
}
