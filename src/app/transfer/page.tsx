'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { Send, CheckCircle2, AlertCircle, Info, KeyRound, ExternalLink } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Select, SelectItem, EmptyState,
} from '@/components/ui';
import {
  useConfidentialTransfer,
  useConfidentialBalance,
  useGrantPermit,
  useHasPermit,
} from '@zama-fhe/react-sdk';
import { useTxStore } from '@/stores';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { formatTokenAmount, isValidAddress, parseContractError, getTxUrl } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkGuard } from '@/components/NetworkGuard';
import { parseUnits } from 'viem';
import type { RegistryPair } from '@/types';
import type { Address } from 'viem';

const MAX_REAL_BALANCE = 10n ** 30n;
function isRealBalance(val: bigint | undefined): val is bigint {
  return val !== undefined && val < MAX_REAL_BALANCE;
}

type TransferStatus = 'idle' | 'transferring' | 'success' | 'error';

function TransferForm({ pair }: { pair: RegistryPair }) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const contractAddress = pair.confidentialToken.address;

  const [recipient, setRecipient] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transferTxHash, setTransferTxHash] = useState<string | undefined>();

  // Same permit-gated decrypt flow as the Decrypt / Unwrap pages —
  // you need to know your confidential balance before you can pick an amount to send.
  const { data: hasPermit, refetch: recheckPermit } = useHasPermit({
    contractAddresses: [contractAddress],
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
    { address: contractAddress, account: address },
    { enabled: !!hasPermit && !!address },
  );

  const decryptedBalance = isRealBalance(rawBalance) ? rawBalance : undefined;

  const transfer = useConfidentialTransfer({ address: contractAddress });
  const { addTx } = useTxStore();

  async function handleGrantAndDecrypt() {
    try {
      await grantPermit([contractAddress]);
      await recheckPermit();
      await refetchBalance();
    } catch {
      // error surfaced via grantError
    }
  }

  function validate(): boolean {
    let ok = true;

    if (!recipient || !isValidAddress(recipient)) {
      setRecipientError('Enter a valid recipient address');
      ok = false;
    } else if (address && recipient.toLowerCase() === address.toLowerCase()) {
      setRecipientError('Cannot transfer to your own address');
      ok = false;
    } else {
      setRecipientError('');
    }

    const num = parseFloat(amount);
    if (!amount || isNaN(num)) {
      setAmountError('Enter an amount');
      ok = false;
    } else if (num <= 0) {
      setAmountError('Amount must be greater than 0');
      ok = false;
    } else if (
      decryptedBalance !== undefined &&
      parseUnits(amount, pair.confidentialToken.decimals) > decryptedBalance
    ) {
      setAmountError('Exceeds your decrypted balance');
      ok = false;
    } else {
      setAmountError('');
    }

    return ok;
  }

  async function handleTransfer() {
    if (!validate()) return;
    setErrorMsg('');
    setStatus('transferring');
    try {
      const result = await transfer.mutateAsync({
        to: recipient as Address,
        amount: parseUnits(amount, pair.confidentialToken.decimals),
      });
      setTransferTxHash(result.txHash);
      addTx({
        hash: result.txHash,
        type: 'transfer',
        status: 'confirmed',
        timestamp: Date.now(),
        tokenSymbol: pair.confidentialToken.symbol,
        amount,
        chainId,
      });
      await refetchBalance();
      setStatus('success');
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

  function handleReset() {
    setStatus('idle');
    setErrorMsg('');
    setAmount('');
    setRecipient('');
    setRecipientError('');
    setAmountError('');
    setTransferTxHash(undefined);
    transfer.reset();
  }

  // Gate: must sign the permit and decrypt the balance before a transfer amount means anything.
  if (!hasPermit) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <KeyRound className="h-3.5 w-3.5" />
          <span>Decrypt your {pair.confidentialToken.symbol} balance first — one-time EIP-712 signature, no gas</span>
        </div>
        <Button
          className="w-full"
          onClick={handleGrantAndDecrypt}
          isLoading={granting || balanceLoading}
          disabled={!address || granting || balanceLoading}
        >
          {granting ? 'Sign in wallet…' : balanceLoading ? 'Decrypting…' : 'Sign Permit & Decrypt Balance'}
        </Button>
        {grantError && (
          <p className="text-xs text-red-400">{(grantError as Error).message?.slice(0, 120)}</p>
        )}
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-4 text-center py-4">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
        <div>
          <p className="text-sm font-medium text-zinc-200">Transfer sent</p>
          <p className="text-xs text-zinc-500 mt-1">
            {amount} {pair.confidentialToken.symbol} → {recipient.slice(0, 6)}…{recipient.slice(-4)}
          </p>
        </div>
        {transferTxHash && (
          <a
            href={getTxUrl(transferTxHash, chainId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
          >
            View on explorer <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button variant="outline" className="w-full" onClick={handleReset}>
          Send Another Transfer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Decrypted balance</span>
        <span className="font-data text-emerald-400 font-semibold">
          {decryptedBalance !== undefined
            ? `${formatTokenAmount(decryptedBalance, pair.confidentialToken.decimals)} ${pair.confidentialToken.symbol}`
            : '—'}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label>Recipient address</Label>
        <Input
          placeholder="0x…"
          value={recipient}
          onChange={(e) => { setRecipient(e.target.value); setRecipientError(''); }}
          error={recipientError}
          className="font-data"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{pair.confidentialToken.symbol} amount to transfer</Label>
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

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleTransfer}
        isLoading={status === 'transferring'}
        disabled={status === 'transferring' || !address}
      >
        <Send className="h-4 w-4" />
        {status === 'transferring' ? 'Transferring…' : `Transfer ${pair.confidentialToken.symbol}`}
      </Button>
    </div>
  );
}

function TransferPageInner() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { pairs } = useRegistry();
  const [selected, setSelected] = useState<RegistryPair | null>(null);

  // Registry pairs only — this is confidential-token-to-confidential-token
  // transfer, not the underlying ERC-20 mocks, so only valid pairs on the
  // current chain are offered.
  const activePairs = useMemo(
    () => pairs.filter((p) => p.isValid && Number(p.chainId) === Number(chainId)),
    [pairs, chainId],
  );

  const selectedPair = useMemo(
    () => activePairs.find((p) => p.confidentialToken.address === selected?.confidentialToken.address) ?? null,
    [activePairs, selected],
  );

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Send className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-400 text-sm">Connect your wallet to transfer confidential tokens</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Transfer Confidential Token</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Send an ERC-7984 confidential balance to another address — amount and balance stay encrypted onchain.
        </p>
      </div>

      <NetworkGuard />

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 leading-relaxed space-y-1">
          <p className="font-medium text-amber-400">How it works</p>
          <p>
            Pick a registry cToken below, decrypt your balance so you know what you have to send,
            then enter a recipient and amount. The transferred amount is encrypted client-side —
            only you and the recipient can ever see it.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select cToken</CardTitle>
          <CardDescription>Registry-listed confidential tokens on this network</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {activePairs.length === 0 ? (
            <EmptyState
              title="No registry cTokens found"
              description="Make sure you're connected to Sepolia."
            />
          ) : (
            <div className="space-y-1.5">
              <Label>cToken</Label>
              <Select
                value={selectedPair?.confidentialToken.address}
                onValueChange={(val) => {
                  const pair = activePairs.find((p) => p.confidentialToken.address === val) ?? null;
                  setSelected(pair);
                }}
                placeholder="Select a confidential token to transfer"
              >
                {activePairs.map((pair, i) => (
                  <SelectItem key={i} value={pair.confidentialToken.address}>
                    {pair.confidentialToken.symbol} — {pair.confidentialToken.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          {selectedPair && <TransferForm key={selectedPair.confidentialToken.address} pair={selectedPair} />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransferPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500 text-sm">Loading…</div>}>
      <TransferPageInner />
    </Suspense>
  );
}
