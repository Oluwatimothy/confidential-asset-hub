'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTxStore, useDecryptStore } from '@/stores';

export function WalletResetWatcher() {
    const { address, isConnected } = useAccount();
    const prevAddress = useRef<string | undefined>(address);

    useEffect(() => {
        const changedWallet = prevAddress.current && address && prevAddress.current !== address;
        const disconnected = prevAddress.current && !isConnected;

        if (changedWallet || disconnected) {
            useTxStore.getState().clearAll();
            useDecryptStore.getState().clearAll();
        }

        prevAddress.current = address;
    }, [address, isConnected]);

    return null;
}