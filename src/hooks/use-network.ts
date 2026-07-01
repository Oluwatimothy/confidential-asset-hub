// ============================================================
// hooks/use-network.ts
// ============================================================
'use client';

import { useChainId, useSwitchChain } from 'wagmi';
import { CHAIN_IDS, CHAIN_NAMES, BLOCK_EXPLORERS } from '@/config/chains';
import type { SupportedChainId } from '@/types';

export interface UseNetworkReturn {
  chainId: SupportedChainId;
  chainName: string;
  isSepolia: boolean;
  isMainnet: boolean;
  isSupported: boolean;
  explorerUrl: string;
  switchToSepolia: () => void;
  switchToMainnet: () => void;
}

export function useNetwork(): UseNetworkReturn {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const supportedId: SupportedChainId =
    chainId === CHAIN_IDS.MAINNET ? CHAIN_IDS.MAINNET : CHAIN_IDS.SEPOLIA;

  const isSupported = chainId === CHAIN_IDS.SEPOLIA;

  return {
    chainId: supportedId,
    chainName: CHAIN_NAMES[supportedId] ?? 'Unknown',
    isSepolia: chainId === CHAIN_IDS.SEPOLIA,
    isMainnet: chainId === CHAIN_IDS.MAINNET,
    isSupported,
    explorerUrl: BLOCK_EXPLORERS[supportedId],
    switchToSepolia: () => switchChain({ chainId: CHAIN_IDS.SEPOLIA }),
    switchToMainnet: () => switchChain({ chainId: CHAIN_IDS.MAINNET }),
  };
}
