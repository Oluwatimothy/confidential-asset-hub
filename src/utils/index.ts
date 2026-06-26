// ============================================================
// utils/index.ts — Shared utility functions
// ============================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatUnits, isAddress } from 'viem';
import type { Address } from 'viem';

// ── Tailwind class merge ──────────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Address formatting ────────────────────────────────────────
export function shortAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function isValidAddress(value: string): value is Address {
  return isAddress(value);
}

// ── Token amount formatting ───────────────────────────────────
export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  maxFractionDigits = 6,
): string {
  const formatted = formatUnits(raw, decimals);
  const num = parseFloat(formatted);
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  return num.toLocaleString('en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function formatUSD(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  return Intl.NumberFormat('en', { notation: 'compact' }).format(value);
}

// ── Time formatting ───────────────────────────────────────────
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Cooldown helpers ──────────────────────────────────────────
export function cooldownRemaining(lastClaimedAt: number, cooldownSeconds: number): number {
  const elapsed = Math.floor((Date.now() - lastClaimedAt) / 1000);
  return Math.max(0, cooldownSeconds - elapsed);
}

export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Error parsing ─────────────────────────────────────────────
export function parseContractError(error: unknown): string {
  if (!error) return 'Unknown error';
  const msg = (error as { message?: string; shortMessage?: string }).shortMessage
    ?? (error as { message?: string }).message
    ?? String(error);
  if (msg.includes('User rejected')) return 'Transaction rejected by user.';
  if (msg.includes('insufficient funds')) return 'Insufficient ETH for gas.';
  if (msg.includes('execution reverted')) {
    const revertMatch = msg.match(/reverted: (.+)/);
    return revertMatch ? `Contract error: ${revertMatch[1]}` : 'Transaction reverted.';
  }
  if (msg.includes('network')) return 'Network error — please try again.';
  return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
}

// ── LocalStorage helpers (safe) ───────────────────────────────
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeLocalStorageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or SSR
  }
}

// ── Block explorer URL helpers (re-exported from chains) ────
export { getTxUrl, getAddressUrl } from '@/config/chains';
