// ============================================================
// app/wrap/page.tsx — Wrap Center
// ============================================================
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  ArrowUpCircle, CheckCircle2, Clock, AlertCircle,
  ExternalLink, ArrowRight, Loader2,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Button, Input, Label, Separator,
} from '@/components/ui';
import { useWrap } from '@/hooks/use-wrap';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, getTxUrl, parseContractError } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

// ── Step indicator ─────────────────────────────────────────────
const STEPS = [
  { key: 'checking-approval', label: 'Check Approval' },
  { key: 'awaiting-approval-signature', label: 'Approve Token' },
  { key: 'approval-pending', label: 'Confirming Approval' },
  { key: 'awaiting-wrap-signature', label: 'Sign Wrap' },
  { key: 'wrap-pending', label: 'Wrap Pending' },
  { key: 'success', label: 'Complete' },
];

function StepIndicator({ currentStep }: { currentStep: string }) {
  return (
    <div className="space-y-2">
      {STEPS.map((s, i) => {
        const idx = STEPS.findIndex((x) => x.key === currentStep);
        const done = i < idx || currentStep === 'success';
        const active = s.key === currentStep && currentStep !== 'success';
        return (
          <div
            key={s.key}
            className={`step-item ${done ? 'step-item-done' : active ? 'step-item-active' : 'step-item-pending'}`}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : active ? (
                <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
              ) : (
                <span className="text-zinc-600">{i + 1}</span>
              )}
            </div>
            <span className={`text-sm ${done ? 'text-emerald-400' : active ? 'text-amber-400' : 'text-zinc-600'}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pair selector ──────────────────────────────────────────────
function PairSelector({
  pairs,
  selected,
  onSelect,
}: {
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
              {pair.token.symbol}
              <ArrowRight className="h-3 w-3 text-zinc-600" />
              <span className="text-amber-400">{pair.confidentialToken.symbol}</span>
            </div>
            <p className="text-xs text-zinc-500 truncate">{pair.token.name}</p>
          </div>
          {selected?.token.address === pair.token.address && (
            <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

function WrapPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get('token') as Address | null;

  const validPairs = pairs.filter((p) => p.isValid && p.chainId === chainId);

  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  // Pre-select from URL param
  useEffect(() => {
    if (presetToken && validPairs.length > 0) {
      const found = validPairs.find(
        (p) => p.token.address.toLowerCase() === presetToken.toLowerCase(),
      );
      if (found) setSelectedPair(found);
    }
  }, [presetToken, validPairs.length]);

  const { step, txHash, error, wrap, reset, allowance, balance } = useWrap(
    selectedPair
      ? {
        erc20Address: selectedPair.token.address,
        wrapperAddress: selectedPair.confidentialToken.address,
        decimals: selectedPair.token.decimals,
        symbol: selectedPair.token.symbol,
      }
      : {
        erc20Address: '0x0000000000000000000000000000000000000000',
        wrapperAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: '',
      },
  );

  const { explorerUrl } = useNetwork();

  function validateAmount(): boolean {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Enter an amount greater than 0');
      return false;
    }
    setAmountError('');
    return true;
  }

  async function handleWrap() {
    if (!selectedPair || !validateAmount()) return;
    await wrap(amount);
  }

  const isIdle = step === 'idle' || step === 'error';
  const isPending = !isIdle && step !== 'success';
  const isSuccess = step === 'success';

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ArrowUpCircle className="h-12 w-12 text-zinc-700" />
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: pair + amount */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Pair</CardTitle>
              <CardDescription>Choose a registry-verified wrapper pair</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {validPairs.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No valid pairs found on this network.
                </p>
              ) : (
                <PairSelector
                  pairs={validPairs}
                  selected={selectedPair}
                  onSelect={(p) => { setSelectedPair(p); reset(); setAmount(''); }}
                />
              )}
            </CardContent>
          </Card>

          {selectedPair && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Amount</CardTitle>
                <CardDescription>
                  Balance:{' '}
                  {balance !== undefined
                    ? `${formatTokenAmount(balance, selectedPair.token.decimals)} ${selectedPair.token.symbol}`
                    : '—'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Label htmlFor="wrap-amount">{selectedPair.token.symbol} to wrap</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wrap-amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                      error={amountError}
                      disabled={isPending}
                    />
                    {balance !== undefined && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setAmount(
                            (Number(balance) / 10 ** selectedPair.token.decimals).toString(),
                          )
                        }
                      >
                        Max
                      </Button>
                    )}
                  </div>
                </div>

                {allowance !== undefined && (
                  <p className="text-xs text-zinc-500">
                    Approval: {formatTokenAmount(allowance, selectedPair.token.decimals)}{' '}
                    {selectedPair.token.symbol}
                    {allowance === 0n && (
                      <span className="ml-1 text-amber-400">(approval required)</span>
                    )}
                  </p>
                )}

                {/* Rate info */}
                <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Conversion rate</span>
                    <span>1:{selectedPair.rate.toString()}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Wrapper decimals</span>
                    <span>{selectedPair.confidentialToken.decimals}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>You receive</span>
                    <span className="text-amber-400">
                      {amount && parseFloat(amount) > 0
                        ? `~${(parseFloat(amount) / Number(selectedPair.rate)).toFixed(selectedPair.confidentialToken.decimals)} ${selectedPair.confidentialToken.symbol}`
                        : '—'}
                    </span>
                  </div>
                </div>

                {isSuccess ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { reset(); setAmount(''); }}
                  >
                    Wrap more
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleWrap}
                    disabled={!amount || isPending}
                    isLoading={isPending}
                  >
                    {isPending ? 'Wrapping…' : 'Wrap Tokens'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: step indicator */}
        {selectedPair && (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isIdle && step !== 'error' ? (
                  <p className="text-xs text-zinc-500">Steps appear when wrapping starts.</p>
                ) : (
                  <StepIndicator currentStep={step} />
                )}

                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Wrap complete</span>
                    </div>
                    {txHash && (
                      <a
                        href={getTxUrl(txHash, chainId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400"
                      >
                        View transaction
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Transaction failed</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{error}</p>
                        <button
                          onClick={reset}
                          className="mt-2 text-xs text-amber-400 hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-zinc-400">About Wrapping</p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Wrapping deposits your ERC20 into the wrapper contract and mints
                  an equivalent ERC7984 confidential token. Your balance is encrypted
                  on-chain using FHE — only you can decrypt it.
                </p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Excess tokens (due to decimal rounding) are refunded to your wallet.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
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
