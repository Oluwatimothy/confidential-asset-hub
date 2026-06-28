'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CheckCircle2, AlertCircle, ArrowRight, Info, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import { useUnshield, useConfidentialBalance, useGrantPermit, useHasPermit } from '@zama-fhe/react-sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, parseContractError } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

const MAX_REAL_BALANCE = 10n ** 30n;
function isRealBalance(val: bigint | undefined): val is bigint {
  return val !== undefined && val < MAX_REAL_BALANCE;
}

type UnwrapStatus = 'idle' | 'processing' | 'success' | 'error';

function UnwrapForm({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [status, setStatus] = useState<UnwrapStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

  const unshield = useUnshield(pair.confidentialToken.address);

  useEffect(() => {
    if (unshield.isSuccess) setStatus('success');
  }, [unshield.isSuccess]);

  useEffect(() => {
    if (unshield.isError) {
      const msg = parseContractError(unshield.error);
      if (msg.includes('rejected')) {
        setStatus('idle');
      } else {
        setStatus('error');
        setErrorMsg(msg);
      }
    }
  }, [unshield.isError]);

  async function handleDecryptBalance() {
    try {
      await grantPermit([pair.confidentialToken.address]);
      await recheckPermit();
      await refetchBalance();
    } catch { }
  }

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
    if (decryptedBalance !== undefined &&
      parseUnits(amount, pair.confidentialToken.decimals) > decryptedBalance) {
      setAmountError('Exceeds your balance');
      return false;
    }
    setAmountError('');
    return true;
  }

  async function handleUnshield() {
    if (!validate()) return;
    setErrorMsg('');
    setStatus('processing');
    try {
      await unshield.mutateAsync({
        amount: parseUnits(amount, pair.confidentialToken.decimals),
      });
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
    unshield.reset();
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
            : 'Decrypt balance to see available amount'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Decrypt balance button */}
        {!hasPermit && (
          <Button variant="outline" className="w-full" onClick={handleDecryptBalance} isLoading={granting || balanceLoading}>
            {granting ? 'Sign in wallet…' : 'Sign Permit & Decrypt Balance'}
          </Button>
        )}

        {hasPermit && decryptedBalance === undefined && (
          <Button variant="outline" className="w-full" onClick={() => refetchBalance()} isLoading={balanceLoading}>
            Refresh Balance
          </Button>
        )}

        {/* Amount input */}
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
        {(status === 'idle' || status === 'error') && (
          <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>You receive</span>
              <span className="text-emerald-400">
                {amount && parseFloat(amount) > 0 ? `${amount} ${pair.token.symbol}` : '—'}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Process</span>
              <span>Auto-finalized by SDK</span>
            </div>
          </div>
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Unwrapping on-chain…</p>
              <p className="text-xs text-zinc-500 mt-0.5">Waiting for confirmation on Sepolia</p>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                Unwrapped {amount} {pair.confidentialToken.symbol} successfully
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Your {pair.token.symbol} has been returned to your wallet.
            </p>
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
          <Button className="w-full" onClick={handleUnshield} disabled={!amount}>
            Unwrap {pair.confidentialToken.symbol}
          </Button>
        )}
        {status === 'processing' && (
          <Button className="w-full" disabled isLoading>Unwrapping…</Button>
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

  const validPairs = pairs.filter(
    (p) => p.isValid && Number(p.chainId) === Number(chainId),
  );
  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);

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
          Convert confidential ERC7984 tokens back to public ERC20.
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          The SDK encrypts your unwrap amount, submits the request, waits for the Zama
          decryption network, then finalizes automatically in one transaction.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Wrapper</CardTitle>
          <CardDescription>{validPairs.length} valid pairs on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {validPairs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No valid pairs found. Make sure you are on Sepolia.
            </p>
          ) : (
            validPairs.map((pair, i) => (
              <button
                key={i}
                onClick={() => setSelectedPair(pair)}
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
            ))
          )}
        </CardContent>
      </Card>

      {selectedPair && <UnwrapForm pair={selectedPair} />}
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