// ============================================================
// components/NetworkGuard.tsx — Reusable "wrong network" banner
// with an actual switch-network action, not just a warning message.
// ============================================================
'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { useNetwork } from '@/hooks/use-network';

/**
 * Drop this at the top of any page that reads/writes registry contracts.
 * Renders nothing when the wallet is already on Sepolia.
 * Shows a red "unsupported network" banner (any chain besides Sepolia/Mainnet)
 * or an amber "wrong network, this app runs on Sepolia" banner (e.g. connected
 * to Mainnet) — both with a working one-click "Switch to Sepolia" button.
 */
export function NetworkGuard({ className = '' }: { className?: string }) {
  const { isSepolia, isSupported, chainName, switchToSepolia } = useNetwork();

  if (isSepolia) return null;

  const isUnsupported = !isSupported;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 ${
        isUnsupported
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-amber-400/30 bg-amber-400/5'
      } ${className}`}
    >
      <AlertCircle className={`h-5 w-5 shrink-0 ${isUnsupported ? 'text-red-400' : 'text-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isUnsupported ? 'text-red-400' : 'text-amber-400'}`}>
          {isUnsupported ? 'Unsupported network' : 'Wrong network'}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {isUnsupported
            ? `${chainName} isn't supported. Switch to Sepolia to continue.`
            : `You're connected to ${chainName}. This app runs on Sepolia testnet.`}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={switchToSepolia} className="shrink-0">
        <RefreshCw className="h-3.5 w-3.5" />
        Switch to Sepolia
      </Button>
    </div>
  );
}
