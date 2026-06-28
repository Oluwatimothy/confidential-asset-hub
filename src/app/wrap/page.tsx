'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import { useShield, useApproveUnderlying, useUnderlyingAllowance } from '@zama-fhe/react-sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, parseContractError } from '@/utils';
import { ERC20_ABI } from '@/contracts/erc20-abi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

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

type WrapStatus = 'idle' | 'approving' | 'processing' | 'success' | 'error';

function WrapForm({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [status, setStatus] = useState<WrapStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: allowance } = useUnderlyingAllowance({
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

  // Watch for success/error from mutations
  useEffect(() => {
    if (shield.isSuccess) setStatus('success');
  }, [shield.isSuccess]);

  useEffect(() => {
    if (approve.isError) {
      setStatus('error');
      setErrorMsg(parseContractError(approve.error));
    }
    if (shield.isError) {
      setStatus('error');
      setErrorMsg(parseContractError(shield.error));
    }
  }, [approve.isError, shield.isError]);

  function validate(): boolean {
    const num = parseFloat(amount);
    if (!amount || isNaN(num)) {
      setAmountError('Enter an amount');
      return false;
    }
    if (num <= 0) {
      setAmountError('Amount must be greater than 0');
      return false;
    }
    if (tokenBalance !== undefined && parseUnits(amount, pair.token.decimals) > (tokenBalance as bigint)) {
      setAmountError('Exceeds your balance');
      return false;
    }
    setAmountError('');
    return true;
  }

  async function handleAction() {
    if (!validate()) return;
    setErrorMsg('');

    const parsed = parseUnits(amount, pair.token.decimals);
    const needsApproval = allowance !== undefined && allowance < parsed;

    try {
      if (needsApproval) {
        setStatus('approving');
        await approve.mutateAsync({ amount: parsed });
      }
      setStatus('processing');
      await shield.mutateAsync({ amount: parsed });
    } catch (err) {
      const msg = parseContractError(err);
      if (!msg.includes('rejected')) {
        setStatus('error');
        setErrorMsg(msg);
      } else {
        setStatus('idle');
      }
    }
  }

  function handleReset() {
    setStatus('idle');
    setErrorMsg('');
    setAmount('');
    shield.reset();
    approve.reset();
  }

  const formattedBalance = tokenBalance !== undefined
    ? formatTokenAmount(tokenBalance as bigint, pair.token.decimals)
    : '—';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Wrap {pair.token.symbol} to {pair.confidentialToken.symbol}
        </CardTitle>
        <CardDescription>
          Balance:{' '}
          <span className="text-zinc-200 font-medium">
            {formattedBalance} {pair.token.symbol}
          </span>
          {allowance !== undefined && allowance > 0n && (
            <span className="ml-3 text-zinc-600 text-xs">
              approved: {formatTokenAmount(allowance, pair.token.decimals)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Amount input — only show when idle or error */}
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
        {(status === 'idle' || status === 'error') && (
          <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>You receive</span>
              <span className="text-amber-400">
                {amount && parseFloat(amount) > 0
                  ? `${amount} ${pair.confidentialToken.symbol} (encrypted)`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Rate</span>
              <span>{pair.rate.toString()}:1</span>
            </div>
          </div>
        )}

        {/* Processing state */}
        {(status === 'approving' || status === 'processing') && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                {status === 'approving' ? 'Approving token…' : 'Wrapping on-chain…'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {status === 'approving'
                  ? 'Confirm approval in your wallet'
                  : 'Waiting for confirmation on Sepolia'}
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Wrapped {amount} {pair.token.symbol} successfully
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Your {pair.confidentialToken.symbol} balance is now encrypted on-chain.
              Go to Decrypt Balance to reveal it.
            </p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Action buttons */}
        {status === 'idle' && (
          <Button className="w-full" onClick={handleAction} disabled={!amount}>
            {allowance !== undefined && amount && parseFloat(amount) > 0 &&
              allowance < parseUnits(amount || '0', pair.token.decimals)
              ? `Approve ${pair.token.symbol}`
              : `Wrap ${pair.token.symbol}`}
          </Button>
        )}
        {(status === 'approving' || status === 'processing') && (
          <Button className="w-full" disabled isLoading>
            {status === 'approving' ? 'Approving…' : 'Wrapping…'}
          </Button>
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

  useEffect(() => {
    if (presetToken && validPairs.length > 0 && !selectedPair) {
      const found = validPairs.find(
        (p) => p.token.address.toLowerCase() === presetToken.toLowerCase(),
      );
      if (found) setSelectedPair(found);
    }
  }, [presetToken, validPairs.length]);

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Pair</CardTitle>
          <CardDescription>{validPairs.length} valid pairs on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {validPairs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No valid pairs found. Make sure you are on Sepolia.
            </p>
          ) : (
            <PairSelector
              pairs={validPairs}
              selected={selectedPair}
              onSelect={(p) => setSelectedPair(p)}
            />
          )}
        </CardContent>
      </Card>

      {selectedPair && <WrapForm pair={selectedPair} />}
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