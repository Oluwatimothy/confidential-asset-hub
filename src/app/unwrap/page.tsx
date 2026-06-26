// ============================================================
// app/unwrap/page.tsx — Unwrap Center
// ============================================================
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  ArrowDownCircle, CheckCircle2, AlertCircle,
  ExternalLink, ArrowRight, Info, Loader2,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Separator,
} from '@/components/ui';
import { useUnwrap } from '@/hooks/use-unwrap';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { getTxUrl } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

const STEPS = [
  { key: 'encrypting-amount', label: 'Encrypt Amount (SDK)' },
  { key: 'awaiting-unwrap-signature', label: 'Sign Unwrap Request' },
  { key: 'unwrap-pending', label: 'Unwrap Pending' },
  { key: 'awaiting-decryption', label: 'Await Decryption Proof' },
  { key: 'finalizing', label: 'Finalize Unwrap' },
  { key: 'success', label: 'Complete' },
];

function StepIndicator({ currentStep }: { currentStep: string }) {
  return (
    <div className="space-y-2">
      {STEPS.map((s, i) => {
        const idx = STEPS.findIndex((x) => x.key === currentStep);
        const done = i < idx || currentStep === 'success';
        const active = s.key === currentStep;
        return (
          <div key={s.key} className={`step-item ${done ? 'step-item-done' : active ? 'step-item-active' : 'step-item-pending'}`}>
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

function UnwrapPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get('token') as Address | null;

  const validPairs = pairs.filter((p) => p.isValid && p.chainId === chainId);
  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (presetToken && validPairs.length > 0) {
      const found = validPairs.find(
        (p) => p.confidentialToken.address.toLowerCase() === presetToken.toLowerCase(),
      );
      if (found) setSelectedPair(found);
    }
  }, [presetToken, validPairs.length]);

  const { step, txHash, finalizeTxHash, error, unwrap, finalizeUnwrap, reset } = useUnwrap(
    selectedPair
      ? {
        wrapperAddress: selectedPair.confidentialToken.address,
        decimals: selectedPair.confidentialToken.decimals,
        symbol: selectedPair.confidentialToken.symbol,
      }
      : {
        wrapperAddress: '0x0000000000000000000000000000000000000000',
        decimals: 6,
        symbol: '',
      },
  );

  const isIdle = step === 'idle' || step === 'error';
  const isPending = !isIdle && step !== 'success';
  const isSuccess = step === 'success';

  // For the demo, we initiate with placeholder encrypted values.
  // In production: use @zama-fhe/react-sdk's useWrappedToken().unshield()
  async function handleUnwrap() {
    if (!selectedPair || !amount) return;
    // SDK would encrypt the amount here; we pass placeholder bytes
    await unwrap('0x0000000000000000000000000000000000000000000000000000000000000001', '0x');
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ArrowDownCircle className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-400 text-sm">Connect your wallet to unwrap tokens</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Unwrap Assets</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Convert confidential ERC7984 tokens back to public ERC20. A two-step process.
        </p>
      </div>

      {/* Two-step explanation */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-400">Two-step unwrap process</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Step 1: Submit an unwrap request — your encrypted balance is burned. <br />
              Step 2: After the Zama decryption network processes the request,
              call <code className="font-data text-amber-400/70">finalizeUnwrap</code> with
              the cleartext amount and proof to receive your ERC20 tokens.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Pair select */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Wrapper</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {validPairs.map((pair, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPair(pair); reset(); }}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${selectedPair?.confidentialToken.address === pair.confidentialToken.address
                    ? 'border-amber-400/50 bg-amber-400/5'
                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-xs font-bold text-amber-400 shrink-0">
                    c
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                      <span className="text-amber-400">{pair.confidentialToken.symbol}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-600" />
                      {pair.token.symbol}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{pair.confidentialToken.name}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedPair && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Unwrap Amount</CardTitle>
                <CardDescription>
                  Decrypt your balance first on the{' '}
                  <a href="/decrypt" className="text-amber-400 hover:underline">
                    Decrypt page
                  </a>{' '}
                  to know your available balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                  <Label>{selectedPair.confidentialToken.symbol} to unwrap</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                {isSuccess ? (
                  <div className="space-y-2">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">Unwrap finalized</span>
                      </div>
                      {finalizeTxHash && (
                        <a
                          href={getTxUrl(finalizeTxHash, chainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400"
                        >
                          View finalize tx <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </motion.div>
                    <Button variant="outline" className="w-full" onClick={() => { reset(); setAmount(''); }}>
                      Unwrap more
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={handleUnwrap}
                      disabled={!amount || isPending}
                      isLoading={isPending && ['encrypting-amount', 'awaiting-unwrap-signature', 'unwrap-pending'].includes(step)}
                    >
                      Step 1 — Request Unwrap
                    </Button>
                    {txHash && (
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() =>
                          finalizeUnwrap(
                            '0x0000000000000000000000000000000000000000000000000000000000000001',
                            BigInt(Math.floor(parseFloat(amount || '0') * 10 ** selectedPair.confidentialToken.decimals)),
                            '0x',
                          )
                        }
                        disabled={step !== 'awaiting-finalize'}
                        isLoading={step === 'finalizing'}
                      >
                        Step 2 — Finalize Unwrap
                      </Button>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-red-400">{error}</p>
                        <button onClick={reset} className="mt-1 text-xs text-amber-400 hover:underline">
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Steps */}
        {selectedPair && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isIdle && step !== 'error' ? (
                  <p className="text-xs text-zinc-500">Steps appear when unwrapping starts.</p>
                ) : (
                  <StepIndicator currentStep={step} />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
export default function UnwrapPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500 text-sm">Loading…</div>}>
      <UnwrapPageInner />
    </Suspense>
  );
}
