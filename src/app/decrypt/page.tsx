'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Lock, AlertCircle, Info } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import { useConfidentialBalance, useDecryptValues } from '@zama-fhe/react-sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { useDecryptStore } from '@/stores';
import { formatTokenAmount, isValidAddress, timeAgo, shortAddress } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { Address } from 'viem';
import type { RegistryPair } from '@/types';

function bigintToHex(val: bigint): `0x${string}` {
  return `0x${val.toString(16).padStart(64, '0')}` as `0x${string}`;
}

function TokenDecryptCard({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const { setResult } = useDecryptStore();

  const { data: balanceHandle } = useConfidentialBalance({
    address: pair.confidentialToken.address,
    account: address,
  });

  const hasBalance = balanceHandle !== undefined && balanceHandle !== 0n;
  const hexHandle = hasBalance ? bigintToHex(balanceHandle) : undefined;

  const encryptedInputs = hasBalance && hexHandle
    ? [{ encryptedValue: hexHandle, contractAddress: pair.confidentialToken.address }]
    : [];

  const { data: decrypted, isLoading: decrypting, error, refetch } =
    useDecryptValues(encryptedInputs, { enabled: false });

  const cachedResult = useDecryptStore(
    (s) => s.results[pair.confidentialToken.address.toLowerCase()],
  );

  async function handleDecrypt() {
    const result = await refetch();
    if (result.data && hexHandle) {
      const clearValue = result.data[hexHandle];
      if (clearValue !== undefined) {
        const balance = BigInt(clearValue.toString());
        setResult(pair.confidentialToken.address, {
          address: pair.confidentialToken.address,
          symbol: pair.confidentialToken.symbol,
          name: pair.confidentialToken.name,
          decryptedBalance: balance,
          formattedBalance: formatTokenAmount(balance, pair.confidentialToken.decimals),
          decryptedAt: Date.now(),
        });
      }
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/10 text-xs font-bold text-amber-400 shrink-0">c</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200">{pair.confidentialToken.symbol}</p>
          <p className="text-xs text-zinc-600 font-data">{shortAddress(pair.confidentialToken.address)}</p>
          <p className="text-[10px] mt-0.5">
            {hasBalance
              ? <span className="text-amber-400/60">encrypted balance detected</span>
              : <span className="text-zinc-700">no balance</span>
            }
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {cachedResult && (
          <div className="text-right">
            <p className="font-data text-sm font-semibold text-emerald-400">{cachedResult.formattedBalance}</p>
            <p className="text-[10px] text-zinc-600">{timeAgo(cachedResult.decryptedAt)}</p>
          </div>
        )}
        {error && <p className="text-xs text-red-400 max-w-[120px] text-right">{(error as Error).message?.slice(0, 60)}</p>}
        <Button
          size="sm"
          variant={cachedResult ? 'outline' : 'default'}
          onClick={handleDecrypt}
          disabled={!address || decrypting || !hasBalance}
          isLoading={decrypting}
        >
          {cachedResult ? 'Refresh' : 'Decrypt'}
        </Button>
      </div>
    </div>
  );
}

function PasteDecrypt() {
  const { address } = useAccount();
  const [addr, setAddr] = useState('');
  const [addrError, setAddrError] = useState('');
  const [submitted, setSubmitted] = useState<Address | null>(null);
  const { setResult } = useDecryptStore();

  const { data: balanceHandle } = useConfidentialBalance({
    address: submitted ?? '0x0000000000000000000000000000000000000000',
    account: address,
  });

  const hasBalance = balanceHandle !== undefined && balanceHandle !== 0n;
  const hexHandle = hasBalance ? bigintToHex(balanceHandle) : undefined;

  const encryptedInputs = hasBalance && hexHandle && submitted
    ? [{ encryptedValue: hexHandle, contractAddress: submitted }]
    : [];

  const { data: decrypted, isLoading: decrypting, error, refetch } =
    useDecryptValues(encryptedInputs, { enabled: false });

  function handleSubmit() {
    if (!isValidAddress(addr)) { setAddrError('Invalid Ethereum address'); return; }
    setAddrError('');
    setSubmitted(addr as Address);
  }

  async function handleDecrypt() {
    if (!submitted || !hexHandle) return;
    const result = await refetch();
    if (result.data) {
      const clearValue = result.data[hexHandle];
      if (clearValue !== undefined) {
        const balance = BigInt(clearValue.toString());
        setResult(submitted, {
          address: submitted,
          symbol: 'TOKEN',
          name: 'Custom Token',
          decryptedBalance: balance,
          formattedBalance: formatTokenAmount(balance, 18),
          decryptedAt: Date.now(),
        });
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Any ERC7984 Token</CardTitle>
        <CardDescription>Paste any ERC7984-compatible contract address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-1.5">
          <Label>ERC7984 Contract Address</Label>
          <div className="flex gap-2">
            <Input placeholder="0x…" value={addr} onChange={(e) => { setAddr(e.target.value); setAddrError(''); }} error={addrError} className="font-data" />
            <Button onClick={handleSubmit} variant="secondary">Load</Button>
          </div>
        </div>

        {submitted && (
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Address</span>
                <span className="font-data">{shortAddress(submitted)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Encrypted handle</span>
                <span className="font-data">
                  {balanceHandle === undefined ? 'loading…' : balanceHandle === 0n ? 'zero / no balance' : shortAddress(hexHandle ?? '')}
                </span>
              </div>
            </div>
            <Button className="w-full" onClick={handleDecrypt} disabled={decrypting || !hasBalance} isLoading={decrypting}>
              Decrypt Balance
            </Button>
            {error && <p className="text-xs text-red-400">{(error as Error).message}</p>}
          </div>
        )}
      </CardContent>
    </Card>
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
          <div key={r.address} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2.5">
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

function DecryptPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const [mode, setMode] = useState<'registry' | 'paste'>('registry');

  const activePairs = pairs.filter((p) => p.isValid && Number(p.chainId) === Number(chainId));

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
        <p className="text-sm text-zinc-500 mt-1">Reveal your encrypted ERC7984 balance using EIP-712 user decryption.</p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          Your wallet signs an EIP-712 message. The Zama relayer re-encrypts your balance under your local key and returns it to your browser. Nobody else sees the plaintext.
        </p>
      </div>

      <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 gap-1">
        {(['registry', 'paste'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {m === 'registry' ? '📋 Registry Tokens' : '🔍 Paste Address'}
          </button>
        ))}
      </div>

      {mode === 'registry' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Confidential Tokens</CardTitle>
            <CardDescription>{activePairs.length} tokens on this network</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {activePairs.length === 0
              ? <p className="text-sm text-zinc-500 text-center py-4">No pairs found — make sure you are on Sepolia and the registry has synced.</p>
              : activePairs.map((pair, i) => <TokenDecryptCard key={i} pair={pair} />)
            }
          </CardContent>
        </Card>
      )}

      {mode === 'paste' && <PasteDecrypt />}
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