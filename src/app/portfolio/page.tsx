// ============================================================
// app/portfolio/page.tsx — Confidential Portfolio
// ============================================================
'use client';

import React from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Briefcase, ArrowUpCircle, ArrowDownCircle, Lock, RefreshCw } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton, EmptyState,
} from '@/components/ui';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useDecryptStore } from '@/stores';
import { formatTokenAmount, shortAddress } from '@/utils';
import { TokenIcon } from '@/components/TokenIcon';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { entries, isLoading } = usePortfolio();
  const results = useDecryptStore((s) => s.results);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Briefcase className="h-12 w-12 text-zinc-700" />
        <p className="text-zinc-400 text-sm">Connect your wallet to view your portfolio</p>
        <ConnectButton />
      </div>
    );
  }

  const nonZeroEntries = entries.filter((e) => e.erc20Balance.rawBalance > 0n);
  const totalERC20 = entries.reduce((sum, e) => sum + e.erc20Balance.rawBalance, 0n);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Portfolio</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Your ERC20 and ERC7984 holdings across all registry pairs
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Registry Pairs</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">With Balance</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{nonZeroEntries.length}</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-1 col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Decrypted</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {Object.keys(results).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Token Holdings</CardTitle>
          <CardDescription>
            Showing {entries.length} pairs · ERC7984 balances encrypted on-chain
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No pairs found"
              description="Sync the registry to see your holdings."
            />
          ) : (
            <div className="space-y-2">
              {entries.map((entry, i) => {
                const decrypted = results[entry.pair.confidentialToken.address.toLowerCase()];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    {/* Token info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <TokenIcon symbol={entry.pair.token.symbol} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-zinc-100">{entry.pair.token.symbol}</span>
                          <span className="text-zinc-600">→</span>
                          <span className="text-sm font-semibold text-amber-400">{entry.pair.confidentialToken.symbol}</span>
                          <Badge variant={entry.pair.source === 'official' ? 'default' : 'secondary'} className="ml-1">
                            {entry.pair.source}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-600 font-data truncate">
                          {shortAddress(entry.pair.token.address)}
                        </p>
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-2 gap-4 sm:w-auto">
                      <div className="text-right sm:text-right text-left">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">ERC20</p>
                        <p className="font-data text-sm font-semibold text-zinc-200">
                          {entry.erc20Balance.rawBalance === 0n
                            ? <span className="text-zinc-600">0</span>
                            : formatTokenAmount(entry.erc20Balance.rawBalance, entry.pair.token.decimals)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Confidential</p>
                        {decrypted ? (
                          <p className="font-data text-sm font-semibold text-emerald-400">
                            {decrypted.formattedBalance}
                          </p>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Lock className="h-3 w-3 text-amber-400/50" />
                            <span className="text-xs text-zinc-600">encrypted</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/wrap?token=${entry.pair.token.address}`}>
                        <Button variant="ghost" size="icon" title="Wrap">
                          <ArrowUpCircle className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/unwrap?token=${entry.pair.confidentialToken.address}`}>
                        <Button variant="ghost" size="icon" title="Unwrap">
                          <ArrowDownCircle className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/decrypt?token=${entry.pair.confidentialToken.address}`}>
                        <Button variant="ghost" size="icon" title="Decrypt balance">
                          <Lock className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
