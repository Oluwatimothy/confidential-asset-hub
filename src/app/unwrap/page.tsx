'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CheckCircle2, AlertCircle, ArrowRight, Info } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label,
} from '@/components/ui';
import { useUnshield, useConfidentialBalance, useDecryptValues } from '@zama-fhe/react-sdk';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, parseContractError } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

function UnwrapForm({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  // Returns bigint (the encrypted handle as a bigint) or undefined
  const { data: balanceHandle } = useConfidentialBalance({
    address: pair.confidentialToken.address,
    account: address,
  });

  const hasBalance = balanceHandle !== undefined && balanceHandle !== 0n;

  // useDecryptValues takes EncryptedInput[] — shape: { encryptedValue: `0x${string}`, contractAddress: Address }
  // balanceHandle is bigint so convert to hex
  const encryptedInputs = hasBalance
    ? [{ encryptedValue: `0x${balanceHandle.toString(16).padStart(64, '0')}` as `0x${string}`, contractAddress: pair.confidentialToken.address }]
    : [];

  const { data: decryptedData, refetch: refetchBalance, isLoading: decrypting } =
    useDecryptValues(encryptedInputs, { enabled: false });

  const decryptedBalance: bigint | undefined = decryptedData && hasBalance
    ? (() => {
      const hexHandle = `0x${balanceHandle.toString(16).padStart(64, '0')}` as `0x${string}`;
      const val = decryptedData[hexHandle];
      return val !== undefined ? BigInt(val.toString()) : undefined;
    })()
    : undefined;

  const unshield = useUnshield(pair.confidentialToken.address);

  async function handleUnshield() {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError('Enter an amount greater than 0');
      return;
    }
    setAmountError('');
    await unshield.mutateAsync({ amount: parseUnits(amount, pair.confidentialToken.decimals) });
  }

  if (unshield.isSuccess) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Unwrapped successfully</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => { unshield.reset(); setAmount(''); }}>
            Unwrap more
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Unwrap {pair.confidentialToken.symbol} to {pair.token.symbol}</CardTitle>
        <CardDescription>
          {decryptedBalance !== undefined
            ? `Available: ${formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals)} ${pair.confidentialToken.symbol}`
            : 'Decrypt your balance first to see available amount'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Button variant="outline" size="sm" onClick={() => refetchBalance()} isLoading={decrypting} className="w-full">
          {decryptedBalance !== undefined ? 'Refresh Balance' : 'Decrypt Balance to Check Available'}
        </Button>

        <div className="space-y-1.5">
          <Label>{pair.confidentialToken.symbol} amount to unwrap</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
              error={amountError}
              disabled={unshield.isPending}
            />
            {decryptedBalance !== undefined && decryptedBalance > 0n && (
              <Button variant="outline" size="sm" onClick={() => setAmount(formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals).replace(/,/g, ''))}>
                Max
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
          <div className="flex justify-between text-zinc-400">
            <span>You receive</span>
            <span className="text-emerald-400">{amount && parseFloat(amount) > 0 ? `${amount} ${pair.token.symbol}` : '—'}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Process</span>
            <span>Single tx (auto-finalized by SDK)</span>
          </div>
        </div>

        <Button className="w-full" onClick={handleUnshield} disabled={!amount || unshield.isPending} isLoading={unshield.isPending}>
          {unshield.isPending ? 'Unwrapping…' : `Unwrap ${pair.confidentialToken.symbol}`}
        </Button>

        {unshield.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-400">{parseContractError(unshield.error)}</p>
              <button onClick={() => unshield.reset()} className="mt-1 text-xs text-amber-400 hover:underline">Reset</button>
            </div>
          </div>
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

  const validPairs = pairs.filter((p) => p.isValid && Number(p.chainId) === Number(chainId));
  const [selectedPair, setSelectedPair] = useState<RegistryPair | null>(null);

  useEffect(() => {
    if (presetToken && validPairs.length > 0 && !selectedPair) {
      const found = validPairs.find((p) => p.confidentialToken.address.toLowerCase() === presetToken.toLowerCase());
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
        <p className="text-sm text-zinc-500 mt-1">Convert confidential ERC7984 tokens back to public ERC20.</p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          The SDK encrypts your unwrap amount, submits the request, waits for the Zama decryption network, then finalizes — all in one call.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Wrapper</CardTitle>
          <CardDescription>{validPairs.length} valid pairs on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {validPairs.length === 0
            ? <p className="text-sm text-zinc-500 text-center py-4">No valid pairs found. Make sure you are on Sepolia.</p>
            : validPairs.map((pair, i) => (
              <button key={i} onClick={() => setSelectedPair(pair)} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${selectedPair?.confidentialToken.address === pair.confidentialToken.address ? 'border-amber-400/50 bg-amber-400/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}>
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
          }
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