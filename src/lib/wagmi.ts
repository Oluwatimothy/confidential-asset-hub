'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const getBase = () =>
  typeof window === 'undefined' ? 'http://localhost:3000' : '';

export const wagmiConfig = getDefaultConfig({
  appName: 'Confidential Asset Hub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(`${getBase()}/api/rpc/sepolia`),
    [mainnet.id]: http(`${getBase()}/api/rpc/mainnet`),
  },
  ssr: true,
});