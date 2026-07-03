'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { CheckCircle2, AlertCircle, ArrowRight, Info, Loader2, ExternalLink } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import { useShield, useApproveUnderlying, useUnderlyingAllowance } from '@zama-fhe/react-sdk';
import { useTxStore } from '@/stores';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, parseContractError, getTxUrl } from '@/utils';
import { ERC20_ABI } from '@/contracts/erc20-abi';
import { NetworkGuard } from '@/components/NetworkGuard';
import { BalanceLabel } from '@/components/BalanceLabel';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

type WrapStatus = 'idle' | 'approving' | 'approved' | 'wrapping' | 'success' | 'error';

function PairSelector({ pairs, selected, onSelect }: {
  pairs: RegistryPair[];
  selected: RegistryPair | null;
  onSelect: (p: RegistryPair) => void;
}) {
  return (
    <div className="grid gap-2">
      {pairs.map((pair, i) => (
        <button
          key={i}
          onClick={() => onSelect(pair)}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${selected?.token.address === pair.token.address
            ? 'border-amber-400/50 bg-amber-400/5'
            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 shrink-0">
            {pair.token.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
              {pair.token.symbol}
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <span className="text-amber-400">{pair.confidentialToken.symbol}</span>
            </div>
            <p className="text-xs text-zinc-500 truncate">{pair.token.name}</p>
          </div>
          {selected?.token.address === pair.token.address && (
            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 ml-auto" />
          )}
        </button>
      ))}
    </div>
  );
}

function WrapForm({ pair, onReset }: { pair: RegistryPair; onReset: () => void }) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [status, setStatus] = useState<WrapStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [approveTxHash, setApproveTxHash] = useState<string | undefined>();
  const [wrapTxHash, setWrapTxHash] = useState<string | undefined>();

  const { data: allowance, refetch: refetchAllowance } = useUnderlyingAllowance({
    address: pair.confidentialToken.address,
    owner: address,
  });

  const { data: tokenBalance } = useReadContract({
    address: pair.token.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const approve = useApproveUnderlying(pair.confidentialToken.address);
  const shield = useShield({ address: pair.confidentialToken.address, optimistic: true });
  const { addTx } = useTxStore();

  // Human readable rate
  const rateDisplay = (() => {
    if (pair.rate <= 1n) return '1:1';
    // rate = underlying units per confidential unit
    // e.g. 1_000_000_000_000 means 1 cToken = 10^12 underlying units
    // which for 18 decimal token = 1 underlying token per 1 cToken
    const decimalDiff = pair.token.decimals - pair.confidentialToken.decimals;
    if (decimalDiff > 0) {
      return `1:1 (rate adjusted for decimals)`;
    }
    return `${pair.rate.toString()}:1`;
  })();

  function validate(): boolean {
    const num = parseFloat(amount);
    if (!amount || isNaN(num)) { setAmountError('Enter an amount'); return false; }
    if (num <= 0) { setAmountError('Amount must be greater than 0'); return false; }
    if (tokenBalance !== undefined &&
      parseUnits(amount, pair.token.decimals) > (tokenBalance as bigint)) {
      setAmountError('Exceeds your balance');
      return false;
    }
    setAmountError('');
    return true;
  }

  const needsApproval = (() => {
    if (!amount || parseFloat(amount) <= 0 || allowance === undefined) return false;
    try {
      return allowance < parseUnits(amount, pair.token.decimals);
    } catch {
      return false;
    }
  })();

  async function handleApprove() {
    if (!validate()) return;
    setErrorMsg('');
    setStatus('approving');
    try {
      const result = await approve.mutateAsync({
        amount: parseUnits(amount, pair.token.decimals),
      });
      setApproveTxHash((result as { txHash?: string })?.txHash);
      await refetchAllowance();
      setStatus('approved');
    } catch (err) {
      const msg = parseContractError(err);
      if (msg.includes('rejected')) {
        setStatus('idle');
      } else {
        setStatus('error');
        setErrorMsg(msg);
      }
    }
  }

  async function handleWrap() {
    if (!validate()) return;
    setErrorMsg('');
    setStatus('wrapping');
    try {
      const result = await shield.mutateAsync({
        amount: parseUnits(amount, pair.token.decimals),
      });
      setWrapTxHash(result.txHash);
      addTx({
        hash: result.txHash,
        type: 'wrap',
        status: 'confirmed',
        timestamp: Date.now(),
        tokenSymbol: pair.token.symbol,
        amount,
        chainId,
      });
      setStatus('success');
    } catch (err) {
      const msg = parseContractError(err);
      if (msg.includes('rejected')) {
        setStatus(needsApproval ? 'idle' : 'approved');
      } else {
        setStatus('error');
        setErrorMsg(msg);
      }
    }
  }

  function handleReset() {
    setStatus('idle');
    setErrorMsg('');
    setAmount('');
    setApproveTxHash(undefined);
    setWrapTxHash(undefined);
    approve.reset();
    shield.reset();
    onReset();
  }

  // What you receive — account for rate
  const receiveAmount = (() => {
    if (!amount || parseFloat(amount) <= 0) return '—';
    if (pair.rate <= 1n) return `${amount} ${pair.confidentialToken.symbol}`;
    try {
      const rawIn = parseUnits(amount, pair.token.decimals);
      const rawOut = rawIn / pair.rate;
      const formatted = formatUnits(rawOut, pair.confidentialToken.decimals);
      return `${parseFloat(formatted).toFixed(6)} ${pair.confidentialToken.symbol}`;
    } catch {
      return `${amount} ${pair.confidentialToken.symbol}`;
    }
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Wrap {pair.token.symbol} to {pair.confidentialToken.symbol}
        </CardTitle>
        <CardDescription>
          Balance:{' '}
          <BalanceLabel
            raw={tokenBalance as bigint | undefined}
            decimals={pair.token.decimals}
            symbol={pair.token.symbol}
            className="text-zinc-200 font-medium"
          />
          {allowance !== undefined && allowance > 0n && (
            <span className="ml-3 text-zinc-600 text-xs">
              approved: {formatTokenAmount(allowance, pair.token.decimals)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Amount input */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-1.5">
            <Label>{pair.token.symbol} amount to wrap</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (parseFloat(val) < 0) return;
                  setAmount(val);
                  setAmountError('');
                }}
                error={amountError}
              />
              {tokenBalance !== undefined && (tokenBalance as bigint) > 0n && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(
                    formatTokenAmount(tokenBalance as bigint, pair.token.decimals).replace(/,/g, '')
                  )}
                >
                  Max
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Rate info */}
        {(status === 'idle' || status === 'error') && amount && parseFloat(amount) > 0 && (
          <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>You receive</span>
              <span className="text-amber-400">{receiveAmount} (encrypted)</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Steps needed</span>
              <span>{needsApproval ? '2 (approve + wrap)' : '1 (wrap only)'}</span>
            </div>
          </div>
        )}

        {/* Step progress */}
        {status !== 'idle' && status !== 'error' && (
          <div className="space-y-2">
            {/* Step 1 — Approve (only if needed) */}
            {(approveTxHash || status === 'approving') && (
              <div className={`flex items-center gap-3 rounded-lg p-3 ${status === 'approving'
                ? 'border border-amber-400/30 bg-amber-400/5'
                : 'border border-emerald-500/20 bg-emerald-500/5'
                }`}>
                {status === 'approving'
                  ? <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${status === 'approving' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {status === 'approving' ? 'Step 1: Approving…' : 'Step 1: Approved'}
                  </p>
                  {approveTxHash && (
                    <a href={getTxUrl(approveTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-0.5">
                      View on Etherscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Wrap step */}
            {(status === 'approved' || status === 'wrapping' || status === 'success') && (
              <div className={`flex items-center gap-3 rounded-lg p-3 ${status === 'wrapping'
                ? 'border border-amber-400/30 bg-amber-400/5'
                : status === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/5'
                  : 'border border-zinc-700 bg-zinc-900'
                }`}>
                {status === 'wrapping'
                  ? <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                  : status === 'success'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border border-zinc-600 shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${status === 'wrapping' ? 'text-amber-400' :
                    status === 'success' ? 'text-emerald-400' :
                      'text-zinc-400'
                    }`}>
                    {status === 'wrapping'
                      ? `${approveTxHash ? 'Step 2' : 'Step 1'}: Wrapping on-chain…`
                      : status === 'success'
                        ? `Wrapped ${amount} ${pair.token.symbol} successfully`
                        : `${approveTxHash ? 'Step 2' : 'Step 1'}: Ready to wrap`}
                  </p>
                  {wrapTxHash && (
                    <a href={getTxUrl(wrapTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-0.5">
                      View on Etherscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Wrapping only (no approve needed) */}
            {status === 'wrapping' && !approveTxHash && (
              <div className="flex items-center gap-3 rounded-lg p-3 border border-amber-400/30 bg-amber-400/5">
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                <p className="text-sm font-medium text-amber-400">Wrapping on-chain…</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Buttons */}
        {status === 'idle' && (
          <Button className="w-full" onClick={needsApproval ? handleApprove : handleWrap} disabled={!amount}>
            {needsApproval ? `Approve ${pair.token.symbol}` : `Wrap ${pair.token.symbol}`}
          </Button>
        )}
        {status === 'approving' && (
          <Button className="w-full" disabled isLoading>Approving…</Button>
        )}
        {status === 'approved' && (
          <Button className="w-full" onClick={handleWrap}>
            Wrap {pair.token.symbol}
          </Button>
        )}
        {status === 'wrapping' && (
          <Button className="w-full" disabled isLoading>Wrapping…</Button>
        )}
        {status === 'success' && (
          <Button variant="outline" className="w-full" onClick={handleReset}>
            Wrap more
          </Button>
        )}
        {status === 'error' && (
          <Button className="w-full" onClick={() => { setStatus('idle'); setErrorMsg(''); }}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function WrapPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get('token') as Address | null;

  const validPairs = pairs.filter(
    (p) => p.isValid && Number(p.chainId) === Number(chainId),
  );
  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (presetToken && validPairs.length > 0 && !selectedPair) {
      const found = validPairs.find(
        (p) => p.token.address.toLowerCase() === presetToken.toLowerCase(),
      );
      if (found) setSelectedPair(found);
    }
  }, [presetToken, validPairs.length]);

  function handleSelectPair(p: RegistryPair) {
    setSelectedPair(p);
    setFormKey((k) => k + 1); // force WrapForm to remount = reset all state
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-zinc-400 text-sm">Connect your wallet to wrap tokens</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Wrap Assets</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Convert public ERC20 tokens into encrypted ERC7984 confidential tokens.
        </p>
      </div>

      <NetworkGuard />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Pair</CardTitle>
          <CardDescription>{validPairs.length} valid pairs on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {validPairs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No valid pairs found. Make sure you are on Sepolia.</p>
          ) : (
            <PairSelector pairs={validPairs} selected={selectedPair} onSelect={handleSelectPair} />
          )}
        </CardContent>
      </Card>

      {selectedPair && (
        <WrapForm
          key={formKey}
          pair={selectedPair}
          onReset={() => setFormKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

export default function WrapPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500 text-sm">Loading…</div>}>
      <WrapPageInner />
    </Suspense>
  );
}