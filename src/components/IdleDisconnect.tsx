// ============================================================
// components/IdleDisconnect.tsx
//
// Auto-disconnects the wallet after a period of inactivity.
// No real industry "standard" exists for this in DeFi apps, most
// (Uniswap etc.) deliberately don't do it and just rely on the
// wallet's own session. 30 minutes here is a reasonable default,
// tune IDLE_TIMEOUT_MS below if a different window is wanted.
// ============================================================
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { Clock } from 'lucide-react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function IdleDisconnect() {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showNotice, setShowNotice] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!isConnected) return;

    function resetTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        disconnect();
        setShowNotice(true);
        noticeTimeoutRef.current = setTimeout(() => setShowNotice(false), 6000);
      }, IDLE_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isConnected, disconnect]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  if (!showNotice) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-zinc-900 px-4 py-3 text-xs text-zinc-300 shadow-lg">
      <Clock className="h-4 w-4 text-amber-400 shrink-0" />
      Disconnected after 30 minutes of inactivity. Reconnect your wallet to continue.
    </div>
  );
}
