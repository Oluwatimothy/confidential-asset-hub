'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CheckCircle2, AlertCircle, ArrowRight, Info, Loader2, ExternalLink } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import {
  useUnwrap,
  useFinalizeUnwrap,
  useConfidentialBalance,
  useGrantPermit,
  useHasPermit,
} from '@zama-fhe/react-sdk';
import { useTxStore } from '@/stores';
import { findUnwrapRequested } from '@zama-fhe/sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, parseContractError, getTxUrl } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkGuard } from '@/components/NetworkGuard';
import { parseUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

const MAX_REAL_BALANCE = 10n ** 30n;
function isRealBalance(val: bigint | undefined): val is bigint {
  return val !== undefined && val < MAX_REAL_BALANCE;
}

type UnwrapStatus =
  | 'idle'
  | 'unwrapping'
  | 'awaiting-finalize'
  | 'finalizing'
  | 'success'
  | 'error';

function UnwrapForm({
  pair,
  initialUnwrapRequestId,
  initialUnwrapTxHash,
  initialAmount,
}: {
  pair: RegistryPair;
  initialUnwrapRequestId?: `0x${string}`;
  initialUnwrapTxHash?: string;
  initialAmount?: string;
}) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [amountError, setAmountError] = useState('');
  const [status, setStatus] = useState<UnwrapStatus>(
    initialUnwrapRequestId ? 'awaiting-finalize' : 'idle',
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [unwrapTxHash, setUnwrapTxHash] = useState<string | undefined>(initialUnwrapTxHash);
  const [finalizeTxHash, setFinalizeTxHash] = useState<string | undefined>();
  const [unwrapRequestId, setUnwrapRequestId] = useState<`0x${string}` | undefined>(
    initialUnwrapRequestId,
  );
  const [showManualResume, setShowManualResume] = useState(false);
  const [manualRequestId, setManualRequestId] = useState('');
  const [manualError, setManualError] = useState('');

  // Permit + balance
  const { data: hasPermit, refetch: recheckPermit } = useHasPermit({
    contractAddresses: [pair.confidentialToken.address],
  });
  const { mutateAsync: grantPermit, isPending: granting } = useGrantPermit();
  const { data: rawBalance, isLoading: balanceLoading, refetch: refetchBalance } =
    useConfidentialBalance(
      { address: pair.confidentialToken.address, account: address },
      { enabled: !!hasPermit && !!address },
    );
  const decryptedBalance = isRealBalance(rawBalance) ? rawBalance : undefined;

  // Step 1 — unwrap
  const unwrap = useUnwrap(pair.confidentialToken.address);

  // Step 2 — finalize
  const finalizeUnwrap = useFinalizeUnwrap(pair.confidentialToken.address);
  const { addTx, updateTx } = useTxStore();

  async function handleDecryptBalance() {
    try {
      await grantPermit([pair.confidentialToken.address]);
      await recheckPermit();
      await refetchBalance();
    } catch { }
  }

  function validate(): boolean {
    const num = parseFloat(amount);
    if (!amount || isNaN(num)) { setAmountError('Enter an amount'); return false; }
    if (num <= 0) { setAmountError('Amount must be greater than 0'); return false; }
    if (parseFloat(amount) < 0) { setAmountError('Amount cannot be negative'); return false; }
    if (decryptedBalance !== undefined &&
      parseUnits(amount, pair.confidentialToken.decimals) > decryptedBalance) {
      setAmountError('Exceeds your balance');
      return false;
    }
    setAmountError('');
    return true;
  }

  async function handleUnwrap() {
    if (!validate()) return;
    setErrorMsg('');
    setStatus('unwrapping');
    try {
      const result = await unwrap.mutateAsync({
        amount: parseUnits(amount, pair.confidentialToken.decimals),
      });

      setUnwrapTxHash(result.txHash);

      // Extract unwrapRequestId from receipt logs
      const event = findUnwrapRequested(result.receipt.logs);
      const requestId = event?.unwrapRequestId as `0x${string}` | undefined;
      if (requestId) setUnwrapRequestId(requestId);

      // Your encrypted balance is already burned on-chain at this point,
      // regardless of what happens next. Persist it now, not on finalize,
      // so a closed tab or a cancelled finalize doesn't strand the request
      // with no record anywhere that it exists.
      addTx({
        hash: result.txHash,
        type: 'unwrap',
        status: 'pending',
        timestamp: Date.now(),
        tokenSymbol: pair.confidentialToken.symbol,
        amount,
        chainId,
        unwrapRequestId: requestId,
        pairAddress: pair.confidentialToken.address,
      });

      setStatus('awaiting-finalize');
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

  async function handleFinalize() {
    if (!unwrapRequestId) {
      setErrorMsg('No unwrap request ID found. Check Etherscan for the request ID.');
      return;
    }
    setErrorMsg('');
    setStatus('finalizing');
    try {
      const result = await finalizeUnwrap.mutateAsync({
        unwrapRequestId,
      });
      setFinalizeTxHash(result.txHash);
      if (unwrapTxHash) {
        updateTx(unwrapTxHash, { status: 'confirmed' });
      }
      setStatus('success');
    } catch (err) {
      console.error('[finalize] failed:', err);
      const msg = parseContractError(err);
      // Finalize can only succeed once Zama's network has actually decrypted
      // the unwrap request off-chain. Right after step 1 (or right after a
      // resume) that may not have happened yet, so treat any finalize
      // failure as retryable rather than a dead end: keep the request alive
      // and stay on the Finalize button instead of bouncing back to the
      // amount-input screen, which would risk a second, duplicate unwrap.
      setStatus('awaiting-finalize');
      setErrorMsg(
        msg.includes('rejected')
          ? ''
          : `${msg} This can happen if the network hasn't finished decrypting the request yet. Wait a moment and try Finalize again.`
      );
    }
  }

  function handleLoadManualRequestId() {
    const trimmed = manualRequestId.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
      setManualError('Not a valid request ID. It should look like a 0x-prefixed 32-byte hex value, copy it from the UnwrapRequested event on Etherscan.');
      return;
    }
    setManualError('');
    setUnwrapRequestId(trimmed as `0x${string}`);
    setUnwrapTxHash(undefined);
    setErrorMsg('');
    setStatus('awaiting-finalize');
    setShowManualResume(false);
  }

  function handleReset() {
    setStatus('idle');
    setErrorMsg('');
    setAmount('');
    setUnwrapTxHash(undefined);
    setFinalizeTxHash(undefined);
    setUnwrapRequestId(undefined);
    unwrap.reset();
    finalizeUnwrap.reset();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Unwrap {pair.confidentialToken.symbol} to {pair.token.symbol}
        </CardTitle>
        <CardDescription>
          {decryptedBalance !== undefined
            ? <>Available: <span className="text-zinc-200 font-medium">{formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals)} {pair.confidentialToken.symbol}</span></>
            : 'Sign permit to see your balance'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Permit / balance section */}
        {!hasPermit && (
          <Button variant="outline" className="w-full" onClick={handleDecryptBalance} isLoading={granting || balanceLoading}>
            {granting ? 'Sign in wallet…' : 'Sign Permit & Check Balance'}
          </Button>
        )}
        {hasPermit && decryptedBalance === undefined && (
          <Button variant="outline" className="w-full" onClick={() => refetchBalance()} isLoading={balanceLoading}>
            Refresh Balance
          </Button>
        )}

        {/* Manual recovery, for requests our own tracking never saw
            (e.g. page was reloaded before a signature resolved) */}
        {(status === 'idle' || status === 'error') && (
          <div>
            <button
              type="button"
              onClick={() => setShowManualResume((v) => !v)}
              className="text-xs text-zinc-500 hover:text-amber-400 underline underline-offset-2"
            >
              Already have an unwrap request ID for this token?
            </button>
            {showManualResume && (
              <div className="mt-2 space-y-1.5">
                <Label>Unwrap request ID</Label>
                <Input
                  placeholder="0x…"
                  value={manualRequestId}
                  onChange={(e) => { setManualRequestId(e.target.value); setManualError(''); }}
                  error={manualError}
                  className="font-data"
                />
                <p className="text-[10px] text-zinc-600">
                  Find this on Etherscan: open your unwrap transaction, Logs tab,
                  the UnwrapRequested event's unwrapRequestId field.
                </p>
                <Button size="sm" variant="outline" onClick={handleLoadManualRequestId}>
                  Load and Finalize
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Amount input — only when idle or error */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-1.5">
            <Label>{pair.confidentialToken.symbol} amount to unwrap</Label>
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
              {decryptedBalance !== undefined && decryptedBalance > 0n && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(
                    formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals).replace(/,/g, '')
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
              <span className="text-emerald-400">{amount} {pair.token.symbol}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Steps</span>
              <span>2 transactions required</span>
            </div>
          </div>
        )}

        {/* Step progress */}
        {status !== 'idle' && status !== 'error' && (
          <div className="space-y-2">
            {/* Step 1 */}
            <div className={`flex items-center gap-3 rounded-lg p-3 ${status === 'unwrapping'
              ? 'border border-amber-400/30 bg-amber-400/5'
              : 'border border-emerald-500/20 bg-emerald-500/5'
              }`}>
              {status === 'unwrapping'
                ? <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                : <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              }
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${status === 'unwrapping' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {status === 'unwrapping' ? 'Step 1: Submitting unwrap request…' : 'Step 1: Unwrap request submitted'}
                </p>
                {unwrapTxHash && (
                  <a href={getTxUrl(unwrapTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-0.5">
                    View on Etherscan <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Step 2 */}
            {(status === 'awaiting-finalize' || status === 'finalizing' || status === 'success') && (
              <div className={`flex items-center gap-3 rounded-lg p-3 ${status === 'finalizing'
                ? 'border border-amber-400/30 bg-amber-400/5'
                : status === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/5'
                  : 'border border-zinc-700 bg-zinc-900'
                }`}>
                {status === 'finalizing'
                  ? <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                  : status === 'success'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border border-zinc-600 shrink-0" />
                }
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${status === 'finalizing' ? 'text-amber-400' :
                    status === 'success' ? 'text-emerald-400' :
                      'text-zinc-400'
                    }`}>
                    {status === 'finalizing'
                      ? 'Step 2: Finalizing unwrap…'
                      : status === 'success'
                        ? 'Step 2: Unwrap finalized'
                        : 'Step 2: Ready to finalize'}
                  </p>
                  {finalizeTxHash && (
                    <a href={getTxUrl(finalizeTxHash, chainId)} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-0.5">
                      View on Etherscan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success message */}
        {status === 'success' && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="text-xs text-emerald-400">
              {amount} {pair.token.symbol} has been returned to your wallet.
            </p>
          </div>
        )}

        {/* Error */}
        {(status === 'error' || status === 'awaiting-finalize') && errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Action buttons */}
        {status === 'idle' && (
          <Button className="w-full" onClick={handleUnwrap} disabled={!amount}>
            Unwrap {pair.confidentialToken.symbol}
          </Button>
        )}
        {status === 'unwrapping' && (
          <Button className="w-full" disabled isLoading>
            Submitting unwrap…
          </Button>
        )}
        {status === 'awaiting-finalize' && (
          <Button className="w-full" onClick={handleFinalize}>
            Finalize Unwrap
          </Button>
        )}
        {status === 'finalizing' && (
          <Button className="w-full" disabled isLoading>
            Finalizing…
          </Button>
        )}
        {status === 'success' && (
          <Button variant="outline" className="w-full" onClick={handleReset}>
            Unwrap more
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

function UnwrapPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const searchParams = useSearchParams();
  const presetToken = searchParams.get('token') as Address | null;
  const records = useTxStore((s) => s.records);

  const validPairs = pairs.filter(
    (p) => p.isValid && Number(p.chainId) === Number(chainId),
  );
  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [resumeInfo, setResumeInfo] = useState<
    { unwrapRequestId?: `0x${string}`; unwrapTxHash?: string; amount?: string } | undefined
  >();

  const pendingUnwraps = records.filter(
    (r) => r.type === 'unwrap' && r.status === 'pending' && Number(r.chainId) === Number(chainId),
  );

  function handleResume(record: typeof pendingUnwraps[number]) {
    const pair = validPairs.find(
      (p) => p.confidentialToken.address.toLowerCase() === record.pairAddress?.toLowerCase(),
    );
    if (!pair) return;
    setSelectedPair(pair);
    setResumeInfo({ unwrapRequestId: record.unwrapRequestId, unwrapTxHash: record.hash, amount: record.amount });
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    if (presetToken && validPairs.length > 0 && !selectedPair) {
      const found = validPairs.find(
        (p) => p.confidentialToken.address.toLowerCase() === presetToken.toLowerCase(),
      );
      if (found) setSelectedPair(found);
    }
  }, [presetToken, validPairs.length]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
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
          Convert confidential ERC7984 tokens back to public ERC20. Two transactions required.
        </p>
      </div>

      <NetworkGuard />

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
          <p className="font-medium text-amber-400">Two-step process</p>
          <p><strong className="text-zinc-300">Step 1:</strong> Submit unwrap request — signs and burns your encrypted tokens.</p>
          <p><strong className="text-zinc-300">Step 2:</strong> Finalize — after the Zama network decrypts the amount, click Finalize to receive your ERC20.</p>
        </div>
      </div>

      {pendingUnwraps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Unwraps</CardTitle>
            <CardDescription>
              Balance already burned on-chain, waiting on finalize. Safe to resume anytime.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {pendingUnwraps.map((record) => {
              const pair = validPairs.find(
                (p) => p.confidentialToken.address.toLowerCase() === record.pairAddress?.toLowerCase(),
              );
              return (
                <div
                  key={record.hash}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200">
                      {record.amount} {record.tokenSymbol}
                    </p>
                    <a
                      href={getTxUrl(record.hash, chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-0.5"
                    >
                      View unwrap tx <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResume(record)}
                    disabled={!pair}
                  >
                    {pair ? 'Resume Finalize' : 'Pair not found'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Wrapper</CardTitle>
          <CardDescription>{validPairs.length} valid pairs on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {validPairs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No valid pairs found. Make sure you are on Sepolia.</p>
          ) : (
            validPairs.map((pair, i) => (
              <button
                key={i}
                onClick={() => { setSelectedPair(pair); setResumeInfo(undefined); setFormKey((k) => k + 1); }}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${selectedPair?.confidentialToken.address === pair.confidentialToken.address
                  ? 'border-amber-400/50 bg-amber-400/5'
                  : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-xs font-bold text-amber-400 shrink-0">c</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                    <span className="text-amber-400">{pair.confidentialToken.symbol}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    {pair.token.symbol}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{pair.confidentialToken.name}</p>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {selectedPair && (
        <UnwrapForm
          key={formKey}
          pair={selectedPair}
          initialUnwrapRequestId={resumeInfo?.unwrapRequestId}
          initialUnwrapTxHash={resumeInfo?.unwrapTxHash}
          initialAmount={resumeInfo?.amount}
        />
      )}
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