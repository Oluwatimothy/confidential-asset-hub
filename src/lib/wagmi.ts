// ============================================================
// lib/wagmi.ts — Wagmi + RainbowKit configuration
// ============================================================
'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName:     'Confidential Asset Hub',
  projectId:   process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo',
  chains:      [sepolia, mainnet],
  ssr:         true,
});
