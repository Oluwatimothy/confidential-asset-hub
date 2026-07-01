// ============================================================
// app/page.tsx — Dashboard
// ============================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Zap, BookOpen, ArrowUpCircle, ArrowDownCircle,
  Lock, RefreshCw, Activity, Clock, AlertCircle,
  Layers, Shield,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Button, Skeleton, StatusDot,
} from '@/components/ui';
import { useRegistry } from '@/hooks/use-registry';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useNetwork } from '@/hooks/use-network';
import { useTxStore } from '@/stores';
import { shortAddress, timeAgo } from '@/utils';

// ── Fade-in animation ──────────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  title, value, subtitle, icon: Icon, accent, i,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  i: number;
}) {
  return (
    <motion.div custom={i} initial="hidden" animate="visible" variants={fadeIn}>
      <Card className={accent ? 'border-amber-400/30 bg-amber-400/5 glow-amber' : ''}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{title}</p>
              <div className={`text-2xl font-bold tracking-tight ${accent ? 'text-amber-400' : 'text-zinc-100'}`}>
                {value}
              </div>
              {subtitle && <p className="text-xs text-zinc-600">{subtitle}</p>}
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent ? 'bg-amber-400/20' : 'bg-zinc-800'}`}>
              <Icon className={`h-4 w-4 ${accent ? 'text-amber-400' : 'text-zinc-400'}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Quick Action ───────────────────────────────────────────────
function QuickAction({
  href, icon: Icon, title, description, color,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="transition-all duration-200 group-hover:border-zinc-600 group-hover:bg-zinc-900/80">
        <CardContent className="flex items-center gap-4 p-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-zinc-950" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">{title}</p>
            <p className="text-xs text-zinc-500 truncate">{description}</p>
          </div>
          <ArrowUpCircle className="ml-auto h-4 w-4 text-zinc-700 group-hover:text-zinc-400 rotate-90 shrink-0 transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { chainName, isSepolia, isSupported } = useNetwork();
  const { pairs, isLoading: registryLoading, lastSyncedAt, isSyncing } = useRegistry();
  const { entries, isLoading: portfolioLoading } = usePortfolio();
  const records = useTxStore((s) => s.records);

  const validPairs = pairs.filter((p) => p.isValid).length;
  const officialPairs = pairs.filter((p) => p.source === 'official').length;
  const customPairs = pairs.filter((p) => p.source === 'custom').length;

  const recentTxs = records.slice(0, 5);

  const totalERC20Held = entries.filter(
    (e) => e.erc20Balance.rawBalance > 0n,
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-400">
              <Zap className="h-3.5 w-3.5 text-zinc-950" />
            </span>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Confidential Asset Hub
            </h2>
          </div>
          <p className="text-sm text-zinc-500">
            {isConnected
              ? `Connected as ${shortAddress(address!)}`
              : 'Connect your wallet to get started'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <StatusDot status={isSupported ? (isSepolia ? 'warning' : 'active') : 'error'} />
          <span className="text-zinc-400">{chainName}</span>
          {isSepolia && <Badge variant="warning">testnet</Badge>}
          {!isSupported && <Badge variant="danger">unsupported</Badge>}
        </div>
      </motion.div>

      {/* Unsupported network warning */}
      {!isSupported && isConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Unsupported network</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Please switch to Ethereum Mainnet or Sepolia testnet.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          i={0}
          title="Registry Pairs"
          value={registryLoading ? <Skeleton className="h-7 w-12" /> : validPairs}
          subtitle={`${officialPairs} official · ${customPairs} custom`}
          icon={BookOpen}
          accent
        />
        <StatCard
          i={1}
          title="ERC20 Holdings"
          value={portfolioLoading ? <Skeleton className="h-7 w-12" /> : (isConnected ? totalERC20Held : '—')}
          subtitle={isConnected ? 'tokens with balance' : 'Connect wallet'}
          icon={Layers}
        />
        <StatCard
          i={2}
          title="Transactions"
          value={records.length}
          subtitle="in this session"
          icon={Activity}
        />
        <StatCard
          i={3}
          title="Sync Status"
          value={isSyncing
            ? <span className="text-amber-400">Syncing</span>
            : lastSyncedAt
              ? <span className="text-emerald-400">Live</span>
              : '—'
          }
          subtitle={lastSyncedAt ? `Last: ${timeAgo(lastSyncedAt)}` : 'Not synced'}
          icon={RefreshCw}
        />
      </div>

      {/* Quick actions + recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeIn}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Jump directly to common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <QuickAction
                href="/wrap"
                icon={ArrowUpCircle}
                title="Wrap ERC20 → Confidential"
                description="Convert public tokens to encrypted ERC7984"
                color="bg-amber-400"
              />
              <QuickAction
                href="/unwrap"
                icon={ArrowDownCircle}
                title="Unwrap Confidential → ERC20"
                description="Redeem ERC7984 tokens back to public ERC20"
                color="bg-zinc-600"
              />
              <QuickAction
                href="/decrypt"
                icon={Lock}
                title="Decrypt Balance"
                description="Reveal your encrypted balance with EIP-712"
                color="bg-zinc-700"
              />
              <QuickAction
                href="/faucet"
                icon={Shield}
                title="Claim Faucet Tokens"
                description="Get testnet mock tokens on Sepolia"
                color="bg-zinc-800"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeIn}>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Your last 5 transactions</CardDescription>
              </div>
              {address && (
                <Link href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {recentTxs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Clock className="h-8 w-8 text-zinc-700 mb-2" />
                  <p className="text-sm text-zinc-500">No transactions yet</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Activity appears here as you use the app
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTxs.map((tx) => (
                    <div
                      key={tx.hash}
                      className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${tx.status === 'confirmed' ? 'bg-emerald-400' :
                          tx.status === 'failed' ? 'bg-red-400' :
                            'bg-amber-400 animate-pulse'
                          }`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-300 capitalize truncate">
                            {tx.type} {tx.tokenSymbol}
                            {tx.amount && <span className="text-zinc-500"> · {tx.amount}</span>}
                          </p>
                          <p className="text-[10px] text-zinc-600 font-data">{shortAddress(tx.hash)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0 ml-2">{timeAgo(tx.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Registry preview */}
      {pairs.length > 0 && (
        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeIn}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Registry Preview</CardTitle>
                <CardDescription>Latest {Math.min(pairs.length, 4)} registered wrapper pairs</CardDescription>
              </div>
              <Link href="/registry">
                <Button variant="outline" size="sm">
                  <BookOpen className="h-3.5 w-3.5" />
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {pairs.slice(0, 4).map((pair, i) => (
                  <div
                    key={`${pair.token.address}-${i}`}
                    className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 shrink-0">
                        {pair.token.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-200">{pair.token.symbol}</span>
                          <span className="text-zinc-600 text-xs">→</span>
                          <span className="text-xs font-medium text-amber-400">{pair.confidentialToken.symbol}</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 font-data truncate">
                          {shortAddress(pair.confidentialToken.address)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={pair.isValid ? 'success' : 'danger'}>
                        {pair.isValid ? 'valid' : 'revoked'}
                      </Badge>
                      <Badge variant={pair.source === 'official' ? 'default' : 'secondary'}>
                        {pair.source}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
