'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { ZamaProvider } from '@zama-fhe/react-sdk';
import { createConfig as createZamaConfig } from '@zama-fhe/react-sdk/wagmi';
import { web } from '@zama-fhe/sdk/web';
import { sepolia, mainnet } from '@zama-fhe/sdk/chains';
import { indexedDBStorage } from '@zama-fhe/sdk';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const rainbowTheme = darkTheme({
  accentColor: '#fbbf24',
  accentColorForeground: '#09090b',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Zama config — uses wagmi for signing, web() relayer for browser FHE
const zamaConfig = createZamaConfig({
  wagmiConfig,
  chains: [sepolia, mainnet],
  relayers: {
    [sepolia.id]: web(),
    [mainnet.id]: web(),
  },
  storage: typeof window !== 'undefined' ? indexedDBStorage : undefined,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} initialChain={11155111}>
          <ZamaProvider config={zamaConfig}>
            {children}
          </ZamaProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}