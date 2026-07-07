'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useZamaSDK } from '@zama-fhe/react-sdk';

/**
 * Silently "warms up" the Zama FHE SDK (WASM compile + relayer key-material
 * fetch) as soon as a wallet connects, instead of making the user eat that
 * cost inline on their first Decrypt/Wrap/Unwrap/Transfer click.
 *
 * Renders nothing. Never throws. If this doesn't finish in time (or fails),
 * the action buttons fall back to exactly the behavior they have today —
 * this is a pure head-start, not a dependency.
 */
export function ZamaWarmup() {
    const { isConnected, chainId } = useAccount();
    const zamaSDK = useZamaSDK();
    const warmedFor = useRef<number | null>(null);

    useEffect(() => {
        if (!isConnected || !chainId || !zamaSDK) return;
        if (warmedFor.current === chainId) return; // already warmed for this chain/session

        warmedFor.current = chainId;

        Promise.resolve()
            .then(() => zamaSDK)
            .catch(() => {
                // Best-effort only — swallow errors, don't surface anything to the user.
                warmedFor.current = null; // allow a retry on next render if this failed
            });
    }, [isConnected, chainId, zamaSDK]);

    return null;
}