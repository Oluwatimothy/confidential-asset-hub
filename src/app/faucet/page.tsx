// ============================================================
// app/faucet/page.tsx — Faucet Center
// ============================================================
'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { Droplets, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
} from '@/components/ui';
import { useFaucetStore } from '@/stores';
import { useNetwork } from '@/hooks/use-network';
import { getFaucetTokensByChain } from '@/config/faucet-tokens';
import { getTxUrl, formatDate, cooldownRemaining, formatCooldown } from '@/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { FaucetToken } from '@/types';

// Minimal faucet ABI — cTokenMock exposes public mint(address, uint256)
const FAUCET_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

function FaucetCard({ token }: { token: FaucetToken }) {
  const { address, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { addClaim, getLastClaim } = useFaucetStore();

  const [txHash, setTxHash] = useState<string | undefined>();
  const [isClaming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const lastClaim = getLastClaim(token.address);
  const cooldownLeft = lastClaim
    ? cooldownRemaining(lastClaim.claimedAt, token.cooldownSeconds)
    : 0;
  const canClaim = cooldownLeft === 0;

  async function handleClaim() {
    if (!address || !canClaim) return;
    setError(null);
    setIsClaiming(true);
    try {
      const hash = await writeContractAsync({
        address: token.address,
        abi: FAUCET_ABI,
        functionName: 'mint',
        args: [address, token.claimAmount],
      });
      setTxHash(hash);
      addClaim({
        tokenAddress: token.address,
        txHash: hash,
        claimedAt: Date.now(),
        amount: token.claimAmount,
      });
    } catch (err) {
      const msg = (err as { shortMessage?: string }).shortMessage ?? 'Claim failed';
      if (msg.includes('User rejected')) {
        setError('Transaction rejected.');
      } else {
        setError(msg);
      }
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-5">
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
              <p className="text-xs text-zinc-500 mt-0.5 font-data">{token.address.slice(0, 16)}…</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-zinc-500">Claim amount</p>
            <p className="text-sm font-bold text-amber-400">
              {token.formattedClaimAmount} {token.symbol}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isTxConfirmed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">Claimed successfully</span>
              {txHash && (
                <a
                  href={getTxUrl(txHash, chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-zinc-500 hover:text-amber-400"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </motion.div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {!canClaim && (
            <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
              <Clock className="h-4 w-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">
                Next claim in {formatCooldown(cooldownLeft)}
              </span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleClaim}
            disabled={!isConnected || !canClaim || isClaming}
            isLoading={isClaming}
            variant={canClaim ? 'default' : 'secondary'}
          >
            {!isConnected ? 'Connect wallet' :
              !canClaim ? 'On cooldown' :
                isClaming ? 'Minting…' :
                  `Claim ${token.formattedClaimAmount} ${token.symbol}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FaucetPage() {
  const { isConnected } = useAccount();
  const { chainId, isSepolia } = useNetwork();
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
        <p className="text-sm text-zinc-500 mt-1">
          Claim mock ERC20 tokens on Sepolia to test wrapping and confidential transfers.
        </p>
      </div>

      {!isSepolia && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="text-sm text-amber-400 font-medium">Switch to Sepolia</p>
          <p className="text-xs text-zinc-400 mt-1">
            Faucet tokens are only available on Sepolia testnet.
          </p>
        </div>
      )}

      {/* Faucet tokens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tokens.map((token) => (
          <FaucetCard key={token.address} token={token} />
        ))}
      </div>

      {tokens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Droplets className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">No faucet tokens configured</p>
            <p className="text-xs text-zinc-600 mt-1">
              Update <code className="font-data text-amber-400/70">config/faucet-tokens.ts</code> with
              testnet token addresses.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Claim history */}
      {claims.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Claim History</CardTitle>
            <CardDescription>Your recent faucet claims</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {claims.slice(0, 10).map((claim, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-data text-zinc-400">{claim.tokenAddress.slice(0, 16)}…</p>
                  <p className="text-xs text-zinc-600">{formatDate(claim.claimedAt)}</p>
                </div>
                <a
                  href={`https://sepolia.etherscan.io/tx/${claim.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-amber-400"
                >
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
