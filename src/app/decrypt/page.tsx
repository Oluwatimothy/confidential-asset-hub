// ============================================================
// app/decrypt/page.tsx — Universal ERC7984 Decrypt Center
// ============================================================
'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Lock, Unlock, AlertCircle, CheckCircle2, Search, Loader2, Info } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Badge, Separator, EmptyState,
} from '@/components/ui';
import { useDecrypt } from '@/hooks/use-decrypt';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { useDecryptStore } from '@/stores';
import { formatTokenAmount, isValidAddress, timeAgo, shortAddress } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { Address } from 'viem';

// ── Decrypted balance card ─────────────────────────────────────
function DecryptedCard({ address }: { address: string }) {
  const result = useDecryptStore((s) => s.results[address.toLowerCase()]);
  if (!result) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-1">{result.name} ({result.symbol})</p>
          <p className="text-2xl font-bold font-data text-emerald-400">
            {result.formattedBalance}
            <span className="text-sm font-normal text-zinc-500 ml-1.5">{result.symbol}</span>
          </p>
        </div>
        <Unlock className="h-8 w-8 text-emerald-400/40" />
      </div>
      <p className="text-xs text-zinc-600 mt-2">Decrypted {timeAgo(result.decryptedAt)}</p>
    </motion.div>
  );
}

// ── Registry token list ─────────────────────────────────────────
function RegistryTokenList({ onSelect }: { onSelect: (address: Address) => void }) {
  const { pairs } = useRegistry();
  const { chainId } = useNetwork();
  const results = useDecryptStore((s) => s.results);

  const activePairs = pairs.filter((p) => p.isValid && p.chainId === chainId);

  if (activePairs.length === 0) return null;

  return (
    <div className="space-y-2">
      {activePairs.map((pair, i) => {
        const addr = pair.confidentialToken.address.toLowerCase();
        const cached = results[addr];
        return (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-xs font-bold text-amber-400 shrink-0">
                c
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200">{pair.confidentialToken.symbol}</p>
                <p className="text-xs text-zinc-600 font-data">{shortAddress(pair.confidentialToken.address)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cached && (
                <span className="font-data text-xs text-emerald-400">
                  {cached.formattedBalance}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(pair.confidentialToken.address)}
              >
                Decrypt
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DecryptPageInner() {
  const { isConnected } = useAccount();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get('token') as Address | null;

  const [mode, setMode] = useState<'paste' | 'registry'>('registry');
  const [pastedAddr, setPastedAddr] = useState(presetToken ?? '');
  const [addrError, setAddrError] = useState('');

  const { step, result, error, decrypt, reset } = useDecrypt();

  const isPending = ['validating', 'awaiting-signature', 'decrypting'].includes(step);
  const isSuccess = step === 'success';

  function validateAddress(): Address | null {
    if (!isValidAddress(pastedAddr)) {
      setAddrError('Invalid Ethereum address');
      return null;
    }
    setAddrError('');
    return pastedAddr as Address;
  }

  async function handleDecrypt(addr: Address) {
    reset();
    await decrypt(addr, '???', 'Unknown Token', 6);
  }

  async function handlePastedDecrypt() {
    const addr = validateAddress();
    if (addr) await handleDecrypt(addr);
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Lock className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-400 text-sm">Connect your wallet to decrypt balances</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Decrypt Balance</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Reveal your encrypted ERC7984 balance using EIP-712 user decryption. Works with any ERC7984 token.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-400">EIP-712 User Decryption</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your wallet signs an EIP-712 typed message authorizing re-encryption of
              your balance under your local public key. The Zama Relayer re-encrypts
              the ciphertext, and your browser decrypts it locally. No one else sees
              the plaintext — not even the relayer.
            </p>
          </div>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 gap-1">
        {(['registry', 'paste'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === m
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            {m === 'registry' ? '📋 Registry Tokens' : '🔍 Paste Address'}
          </button>
        ))}
      </div>

      {/* Registry mode */}
      {mode === 'registry' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Known ERC7984 Tokens</CardTitle>
            <CardDescription>Tokens registered in the official registry</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <RegistryTokenList onSelect={handleDecrypt} />
          </CardContent>
        </Card>
      )}

      {/* Paste mode */}
      {mode === 'paste' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Any ERC7984 Token</CardTitle>
            <CardDescription>Paste any ERC7984-compatible contract address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5">
              <Label>ERC7984 Contract Address</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x…"
                  value={pastedAddr}
                  onChange={(e) => { setPastedAddr(e.target.value); setAddrError(''); }}
                  error={addrError}
                  className="font-data"
                />
                <Button
                  onClick={handlePastedDecrypt}
                  disabled={!pastedAddr || isPending}
                  isLoading={isPending}
                >
                  Decrypt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {step === 'validating' ? 'Validating token…' :
                step === 'awaiting-signature' ? 'Awaiting wallet signature…' :
                  'Decrypting balance…'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {step === 'awaiting-signature' && 'Please sign the EIP-712 message in your wallet.'}
            </p>
          </div>
        </motion.div>
      )}

      {isSuccess && result && (
        <DecryptedCard address={result.address} />
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Decryption failed</p>
            <p className="text-xs text-zinc-500 mt-0.5">{error}</p>
            <button onClick={reset} className="mt-2 text-xs text-amber-400 hover:underline">
              Try again
            </button>
          </div>
        </motion.div>
      )}

      {/* All decrypted results */}
      <AllResults />
    </div>
  );
}
export default function DecryptPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500 text-sm">Loading…</div>}>
      <DecryptPageInner />
    </Suspense>
  );
}

function AllResults() {
  const results = useDecryptStore((s) => s.results);
  const entries = Object.values(results);
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Decrypted Balances</CardTitle>
        <CardDescription>Cached results from this session</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {entries.map((r) => (
          <div
            key={r.address}
            className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-300">{r.symbol}</p>
              <p className="text-[10px] text-zinc-600 font-data">{shortAddress(r.address)}</p>
            </div>
            <div className="text-right">
              <p className="font-data text-sm font-semibold text-emerald-400">{r.formattedBalance}</p>
              <p className="text-[10px] text-zinc-600">{timeAgo(r.decryptedAt)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
