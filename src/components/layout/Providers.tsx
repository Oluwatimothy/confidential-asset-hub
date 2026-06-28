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

// Override relayerUrl to route through our CORS proxy
const baseUrl = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';

const sepoliaWithProxy = {
  ...sepolia,
  relayerUrl: `${baseUrl}/api/relayer/sepolia`,
};

const mainnetWithProxy = {
  ...mainnet,
  relayerUrl: `${baseUrl}/api/relayer/mainnet`,
};
const zamaChains = [sepoliaWithProxy, mainnetWithProxy] as const;

const zamaConfig = createZamaConfig({
  wagmiConfig,
  chains: zamaChains,
  relayers: {
    [sepolia.id]: web(),
    [mainnet.id]: web(),
  },
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