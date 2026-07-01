'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { Droplets, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Badge,
} from '@/components/ui';
import { useFaucetStore, useTxStore } from '@/stores';
import { useNetwork } from '@/hooks/use-network';
import { getFaucetTokensByChain } from '@/config/faucet-tokens';
import { getTxUrl, formatDate, parseContractError } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkGuard } from '@/components/NetworkGuard';
import { parseUnits } from 'viem';
import type { FaucetToken } from '@/types';

const FAUCET_ABI = [
  {
    name: 'mint',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

type ClaimStatus = 'idle' | 'processing' | 'success' | 'error';

function FaucetCard({ token }: { token: FaucetToken }) {
  const { address, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { addClaim } = useFaucetStore();
  const { addTx, updateTx } = useTxStore();

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [amountError, setAmountError] = useState('');

  const { writeContractAsync } = useWriteContract();

  const { data: receipt, isSuccess: txSuccess, isError: txError } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    query: { enabled: !!txHash && status === 'processing' },
  });

  React.useEffect(() => {
    if (!txHash || status !== 'processing') return;
    if (txSuccess && receipt) {
      if (receipt.status === 'reverted') {
        setStatus('error');
        setErrorMsg('Transaction reverted on-chain.');
      } else {
        setStatus('success');
        addClaim({
          tokenAddress: token.address,
          txHash,
          claimedAt: Date.now(),
          amount: parseUnits(amount, token.decimals),
        });
        updateTx(txHash, { status: 'confirmed' });
      }
    }
    if (txError) {
      setStatus('error');
      setErrorMsg('Transaction failed on-chain.');
    }
  }, [txSuccess, txError, receipt, txHash, status]);

  function validateAmount(): boolean {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setAmountError('Enter a valid amount'); return false; }
    if (num > 10000) { setAmountError('Maximum is 10,000'); return false; }
    setAmountError('');
    return true;
  }

  async function handleClaim() {
    if (!address || !validateAmount()) return;
    setStatus('processing');
    setErrorMsg(null);
    setTxHash(undefined);
    try {
      const hash = await writeContractAsync({
        address: token.address,
        abi: FAUCET_ABI,
        functionName: 'mint',
        args: [address, parseUnits(amount, token.decimals)],
      });
      setTxHash(hash);
      addTx({
        hash,
        type: 'faucet',
        status: 'pending',
        timestamp: Date.now(),
        tokenSymbol: token.symbol,
        amount,
        chainId,
      });
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

  const explorerUrl = txHash ? getTxUrl(txHash, chainId) : undefined;

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300 shrink-0">
              {token.symbol.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-100">{token.name}</p>
                <Badge variant="secondary">{token.symbol}</Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 font-data">{token.address.slice(0, 18)}…</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-500">Max per claim</p>
            <p className="text-sm font-bold text-amber-400">10,000 {token.symbol}</p>
          </div>
        </div>

        {(status === 'idle' || status === 'error') && (
          <div className="space-y-1.5">
            <Label htmlFor={`amount-${token.address}`}>Amount to claim</Label>
            <Input id={`amount-${token.address}`} type="number" min="1" max="10000" value={amount} onChange={(e) => { setAmount(e.target.value); setAmountError(''); }} error={amountError} placeholder="100" />
          </div>
        )}

        {status === 'processing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3">
            <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Processing…</p>
              <p className="text-xs text-zinc-500 mt-0.5">Waiting for confirmation on Sepolia</p>
              {explorerUrl && <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-1">View on Etherscan <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">{amount} {token.symbol} claimed!</p>
              {explorerUrl && <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1 mt-1">View transaction <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Claim failed</p>
              {errorMsg && <p className="text-xs text-zinc-500 mt-0.5">{errorMsg}</p>}
            </div>
          </motion.div>
        )}

        {status === 'idle' && <Button className="w-full" onClick={handleClaim} disabled={!isConnected}>{!isConnected ? 'Connect wallet' : `Claim ${token.symbol}`}</Button>}
        {status === 'processing' && <Button className="w-full" disabled isLoading>Processing…</Button>}
        {status === 'success' && <Button variant="outline" className="w-full" onClick={() => { setStatus('idle'); setTxHash(undefined); setErrorMsg(null); }}>Claim more</Button>}
        {status === 'error' && <Button className="w-full" onClick={() => { setStatus('idle'); setErrorMsg(null); }}>Try again</Button>}
      </CardContent>
    </Card>
  );
}

export default function FaucetPage() {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const tokens = getFaucetTokensByChain(chainId);
  const { claims } = useFaucetStore();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Droplets className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-400 text-sm">Connect your wallet to claim testnet tokens</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Faucet Center</h2>
        <p className="text-sm text-zinc-500 mt-1">Claim mock ERC20 tokens on Sepolia. Max 10,000 per claim.</p>
      </div>

      <NetworkGuard />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokens.map((token) => <FaucetCard key={token.address} token={token} />)}
      </div>

      {tokens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Droplets className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">No faucet tokens configured for this network</p>
          </CardContent>
        </Card>
      )}

      {claims.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Claim History</CardTitle>
            <CardDescription>Your recent faucet claims</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {claims.slice(0, 10).map((claim, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2">
                <div>
                  <p className="text-xs font-data text-zinc-400">{claim.tokenAddress.slice(0, 18)}…</p>
                  <p className="text-xs text-zinc-600">{formatDate(claim.claimedAt)}</p>
                </div>
                <a href={`https://sepolia.etherscan.io/tx/${claim.txHash}`} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-amber-400">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}