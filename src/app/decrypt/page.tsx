'use client';

import React, { useState, Suspense } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Lock, Info, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import {
  useConfidentialBalance,
  useGrantPermit,
  useHasPermit,
} from '@zama-fhe/react-sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { useDecryptStore } from '@/stores';
import { formatTokenAmount, isValidAddress, timeAgo, shortAddress } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkGuard } from '@/components/NetworkGuard';
import { TokenIcon } from '@/components/TokenIcon';
import type { Address } from 'viem';
import type { RegistryPair } from '@/types';

const MAX_REAL_BALANCE = 10n ** 30n;

function isRealBalance(val: bigint | undefined): val is bigint {
  return val !== undefined && val < MAX_REAL_BALANCE;
}

function TokenDecryptCard({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const { isSepolia } = useNetwork();
  const { setResult } = useDecryptStore();
  const contractAddress = pair.confidentialToken.address;

  const { data: hasPermit, refetch: recheckPermit } = useHasPermit({
    contractAddresses: [contractAddress],
  });

  const {
    mutateAsync: grantPermit,
    isPending: granting,
    error: grantError,
    reset: resetGrant,
  } = useGrantPermit();
  const [networkError, setNetworkError] = useState('');

  const {
    data: rawBalance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
    error: balanceError,
  } = useConfidentialBalance(
    { address: contractAddress, account: address },
    { enabled: !!hasPermit && !!address },
  );

  const decryptedBalance = isRealBalance(rawBalance) ? rawBalance : undefined;

  React.useEffect(() => {
    if (decryptedBalance !== undefined && decryptedBalance > 0n) {
      setResult(contractAddress, {
        address: contractAddress,
        symbol: pair.confidentialToken.symbol,
        name: pair.confidentialToken.name,
        decryptedBalance,
        formattedBalance: formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals),
        decryptedAt: Date.now(),
      });
    }
  }, [decryptedBalance?.toString(), contractAddress]);

  const cachedResult = useDecryptStore(
    (s) => s.results[contractAddress.toLowerCase()],
  );

  async function handleGrantAndDecrypt() {
    if (!isSepolia) {
      setNetworkError('Decrypt only works on Sepolia right now. Switch to Sepolia above to decrypt.');
      return;
    }
    setNetworkError('');
    try {
      resetGrant();
      await grantPermit([contractAddress]);
      await recheckPermit();
      await refetchBalance();
    } catch {
      // error shown via grantError
    }
  }

  async function handleRefresh() {
    const permitResult = await recheckPermit();
    if (!permitResult.data) return; // no permit, nothing to refresh
    const result = await refetchBalance();
    if (result.data !== undefined && isRealBalance(result.data)) {
      setResult(contractAddress, {
        address: contractAddress,
        symbol: pair.confidentialToken.symbol,
        name: pair.confidentialToken.name,
        decryptedBalance: result.data,
        formattedBalance: formatTokenAmount(result.data, pair.confidentialToken.decimals),
        decryptedAt: Date.now(),
      });
    }
  }

  const error = networkError || grantError || balanceError;
  const isLoading = granting || balanceLoading;

  // Only show a balance (live or cached) if a permit currently exists.
  // This prevents stale cached numbers from appearing for a wallet/token
  // that hasn't actually signed a permit in this session.
  const displayBalance = !hasPermit
    ? undefined
    : decryptedBalance !== undefined
      ? formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals)
      : cachedResult?.formattedBalance;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <TokenIcon symbol={pair.token.symbol} size={36} />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900 bg-amber-400/20 text-[8px] font-bold text-amber-400">c</div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">{pair.confidentialToken.symbol}</p>
            <p className="text-xs text-zinc-600 font-data">{shortAddress(contractAddress)}</p>
          </div>
        </div>

        {displayBalance !== undefined ? (
          <div className="text-right shrink-0">
            <p className="font-data text-xl font-bold text-emerald-400">{displayBalance}</p>
            <p className="text-[10px] text-zinc-500">{pair.confidentialToken.symbol}</p>
            {cachedResult?.decryptedAt && (
              <p className="text-[10px] text-zinc-600">{timeAgo(cachedResult.decryptedAt)}</p>
            )}
          </div>
        ) : (
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-600">Sign permit to reveal</p>
          </div>
        )}
      </div>

      {hasPermit ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Permit active</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            isLoading={balanceLoading}
            disabled={balanceLoading}
          >
            Refresh Balance
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <KeyRound className="h-3.5 w-3.5" />
            <span>One-time EIP-712 signature — no gas, free</span>
          </div>
          <Button
            className="w-full"
            onClick={handleGrantAndDecrypt}
            isLoading={isLoading}
            disabled={!address || isLoading || !isSepolia}
          >
            {!isSepolia ? 'Switch to Sepolia to decrypt' : granting ? 'Sign in wallet…' : balanceLoading ? 'Decrypting…' : 'Sign Permit & Decrypt'}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{(typeof error === 'string' ? error : (error as Error).message)?.slice(0, 160)}</p>
        </div>
      )}
    </div>
  );
}

function PasteDecrypt() {
  const { address } = useAccount();
  const { isSepolia } = useNetwork();
  const [addr, setAddr] = useState('');
  const [addrError, setAddrError] = useState('');
  const [submitted, setSubmitted] = useState<Address | null>(null);
  const [networkErrorMsg, setNetworkErrorMsg] = useState('');

  const { data: tokenName } = useReadContract({
    address: submitted ?? '0x0000000000000000000000000000000000000000',
    abi: [{ name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
    functionName: 'name',
    query: { enabled: !!submitted },
  });

  const { data: tokenDecimals } = useReadContract({
    address: submitted ?? '0x0000000000000000000000000000000000000000',
    abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }] as const,
    functionName: 'decimals',
    query: { enabled: !!submitted },
  });

  const { data: tokenSymbol } = useReadContract({
    address: submitted ?? '0x0000000000000000000000000000000000000000',
    abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }] as const,
    functionName: 'symbol',
    query: { enabled: !!submitted },
  });

  const resolvedDecimals = (tokenDecimals as number | undefined) ?? 6;
  const resolvedSymbol = (tokenSymbol as string | undefined) ?? 'TOKEN';
  const resolvedName = (tokenName as string | undefined) ?? 'Custom Token';

  const { setResult } = useDecryptStore();

  const { data: hasPermit, refetch: recheckPermit } = useHasPermit({
    contractAddresses: submitted ? [submitted] : [],
  });

  const {
    mutateAsync: grantPermit,
    isPending: granting,
    error: grantError,
  } = useGrantPermit();

  const {
    data: rawBalance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useConfidentialBalance(
    {
      address: submitted ?? '0x0000000000000000000000000000000000000000',
      account: address,
    },
    { enabled: !!hasPermit && !!submitted && !!address },
  );

  const decryptedBalance = isRealBalance(rawBalance) ? rawBalance : undefined;

  React.useEffect(() => {
    if (decryptedBalance !== undefined && submitted) {
      setResult(submitted, {
        address: submitted,
        symbol: resolvedSymbol,
        name: resolvedName,
        decryptedBalance,
        formattedBalance: formatTokenAmount(decryptedBalance, resolvedDecimals),
        decryptedAt: Date.now(),
      });
    }
  }, [decryptedBalance?.toString(), submitted, resolvedSymbol, resolvedName, resolvedDecimals]);

  function handleLoad() {
    if (!isValidAddress(addr)) { setAddrError('Invalid Ethereum address'); return; }
    setAddrError('');
    setSubmitted(addr as Address);
  }

  async function handleGrantAndDecrypt() {
    if (!submitted) return;
    if (!isSepolia) {
      setNetworkErrorMsg('Decrypt only works on Sepolia. Zama\'s Mainnet relayer requires an authenticated API key this app does not have. Switch to Sepolia to decrypt.');
      return;
    }
    setNetworkErrorMsg('');
    try {
      await grantPermit([submitted]);
      await recheckPermit();
      const result = await refetchBalance();
      if (result.data !== undefined && isRealBalance(result.data)) {
        setResult(submitted, {
          address: submitted,
          symbol: resolvedSymbol,
          name: resolvedName,
          decryptedBalance: result.data,
          formattedBalance: formatTokenAmount(result.data, resolvedDecimals),
          decryptedAt: Date.now(),
        });
      }
    } catch { }
  }

  async function handleRefresh() {
    const permitResult = await recheckPermit();
    if (!permitResult.data) return;
    const result = await refetchBalance();
    if (result.data !== undefined && isRealBalance(result.data) && submitted) {
      setResult(submitted, {
        address: submitted,
        symbol: resolvedSymbol,
        name: resolvedName,
        decryptedBalance: result.data,
        formattedBalance: formatTokenAmount(result.data, resolvedDecimals),
        decryptedAt: Date.now(),
      });
    }
  }

  // Same permit-gating rule as TokenDecryptCard
  const displayBalance = !hasPermit
    ? undefined
    : decryptedBalance !== undefined
      ? formatTokenAmount(decryptedBalance, resolvedDecimals)
      : undefined;

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
            <Input
              placeholder="0x…"
              value={addr}
              onChange={(e) => { setAddr(e.target.value); setAddrError(''); }}
              error={addrError}
              className="font-data"
            />
            <Button onClick={handleLoad} variant="secondary">Load</Button>
          </div>
        </div>

        {submitted && (
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
              {resolvedName !== 'Custom Token' && (
                <div className="flex justify-between text-zinc-400">
                  <span>Token</span>
                  <span className="text-zinc-200 font-medium">{resolvedName} ({resolvedSymbol})</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Address</span>
                <span className="font-data">{shortAddress(submitted)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Permit</span>
                <span className={hasPermit ? 'text-emerald-400' : 'text-zinc-600'}>
                  {hasPermit ? 'active' : 'not signed'}
                </span>
              </div>
              {displayBalance !== undefined && (
                <div className="flex justify-between text-zinc-400">
                  <span>Balance</span>
                  <div className="text-right">
                    <span className="text-emerald-400 font-data font-semibold">
                      {displayBalance} {resolvedSymbol !== 'TOKEN' ? resolvedSymbol : ''}
                    </span>
                    {decryptedBalance !== undefined && decryptedBalance < 10n ** BigInt(resolvedDecimals) && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {decryptedBalance.toString()} raw units (ERC7984 always uses 6 decimals,
                        this is a genuinely decrypted value, not a failed read)
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {hasPermit ? (
              <Button className="w-full" onClick={handleRefresh} isLoading={balanceLoading}>
                Refresh Balance
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleGrantAndDecrypt}
                isLoading={granting || balanceLoading}
                disabled={!address || !isSepolia}
              >
                {granting ? 'Sign in wallet…' : 'Sign Permit & Decrypt'}
              </Button>
            )}

            {networkErrorMsg && (
              <p className="text-xs text-red-400">{networkErrorMsg}</p>
            )}

            {grantError && (
              <p className="text-xs text-red-400">{(grantError as Error).message?.slice(0, 120)}</p>
            )}
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

function DecryptAllPanel({ pairs, onSuccess }: { pairs: RegistryPair[]; onSuccess: () => void }) {
  const { address } = useAccount();
  const { isSepolia } = useNetwork();
  const { mutateAsync: grantPermit } = useGrantPermit();
  const [status, setStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handleDecryptAll() {
    if (!address || pairs.length === 0) return;
    if (!isSepolia) {
      setStatus('error');
      setErrorMsg('Decrypt only works on Sepolia right now. Switch to Sepolia above to decrypt.');
      return;
    }
    setStatus('signing');
    setErrorMsg('');
    setProgress({ done: 0, total: pairs.length });

    // Zama's relayer appears to require an authenticated API key specifically
    // for a single EIP-712 signature covering multiple contract addresses at
    // once, this app doesn't have one, that's an external access-tier limit,
    // not something fixable here. A single-address permit works fine though,
    // so this signs one per token, in sequence, instead of one for everyone.
    let failures = 0;
    for (const pair of pairs) {
      try {
        await grantPermit([pair.confidentialToken.address]);
      } catch {
        failures += 1;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    if (failures === pairs.length) {
      setStatus('error');
      setErrorMsg('Could not decrypt any balances. Check your wallet is connected and try again.');
      return;
    }

    setStatus('success');
    onSuccess();
  }

  if (pairs.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-xs text-zinc-400 min-w-0">
        <p className="font-medium text-amber-400">Decrypt all balances</p>
        <p className="mt-0.5">
          {status === 'signing'
            ? `Signing permit ${progress.done + 1} of ${progress.total}, one signature per token…`
            : 'Signs a permit for each registry token below, one at a time.'}
        </p>
        {status === 'error' && <p className="text-red-400 mt-1">{errorMsg}</p>}
        {status === 'success' && <p className="text-emerald-400 mt-1">Signed, balances below are decrypting…</p>}
      </div>
      <Button size="sm" onClick={handleDecryptAll} isLoading={status === 'signing'} disabled={status === 'signing' || !isSepolia}>
        {status === 'signing' ? `Signing… (${progress.done}/${progress.total})` : 'Decrypt All'}
      </Button>
    </div>
  );
}

function DecryptPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const [mode, setMode] = useState<'registry' | 'paste'>('registry');
  const [refreshKey, setRefreshKey] = useState(0);

  const activePairs = pairs.filter(
    (p) => p.isValid && Number(p.chainId) === Number(chainId),
  );

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
          Reveal your encrypted ERC7984 balance using EIP-712 user decryption.
        </p>
      </div>

      <NetworkGuard />

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
          <p className="font-medium text-amber-400">How it works</p>
          <p>
            Click <strong className="text-zinc-300">Sign Permit & Decrypt</strong> — your wallet
            signs an EIP-712 message (no gas). The Zama network re-encrypts your balance so only
            your browser can read it.
          </p>
        </div>
      </div>

      <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 gap-1">
        {(['registry', 'paste'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {m === 'registry' ? '📋 Registry Tokens' : '🔍 Paste Address'}
          </button>
        ))}
      </div>

      {mode === 'registry' && (
        <>
          <DecryptAllPanel pairs={activePairs} onSuccess={() => setRefreshKey((k) => k + 1)} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Confidential Tokens</CardTitle>
              <CardDescription>{activePairs.length} tokens on this network</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {activePairs.length === 0
                ? <p className="text-sm text-zinc-500 text-center py-4">No pairs found — make sure you are on Sepolia.</p>
                : activePairs.map((pair, i) => <TokenDecryptCard key={`${i}-${refreshKey}`} pair={pair} />)
              }
            </CardContent>
          </Card>
        </>
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