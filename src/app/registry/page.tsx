// ============================================================
// app/registry/page.tsx — Registry Explorer
// ============================================================
'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ExternalLink, Search, RefreshCw, Filter, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Badge, Button, Input, Skeleton, EmptyState, Separator, Tooltip,
} from '@/components/ui';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { shortAddress, getAddressUrl } from '@/utils';
import type { RegistryPair } from '@/types';

type FilterMode = 'all' | 'official' | 'custom' | 'valid' | 'revoked';

function PairRow({ pair }: { pair: RegistryPair }) {
  const { chainId, explorerUrl } = useNetwork();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
    >
      {/* Token pair header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Token avatars */}
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
              {pair.token.symbol.slice(0, 2)}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900 bg-amber-400/20 text-[8px] font-bold text-amber-400">
              c
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-100">{pair.token.name}</span>
              <span className="text-zinc-600 text-xs">→</span>
              <span className="text-sm font-semibold text-amber-400">{pair.confidentialToken.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-medium text-zinc-400">{pair.token.symbol}</span>
              <span className="text-zinc-700">·</span>
              <span className="text-xs font-medium text-amber-400/70">{pair.confidentialToken.symbol}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
          <Badge variant={pair.isValid ? 'success' : 'danger'}>
            {pair.isValid ? 'valid' : 'revoked'}
          </Badge>
          <Badge variant={pair.source === 'official' ? 'default' : 'secondary'}>
            {pair.source}
          </Badge>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">ERC20 Token</p>
          <div className="flex items-center gap-1.5">
            <span className="font-data text-xs text-zinc-400">{shortAddress(pair.token.address, 6)}</span>
            <a
              href={getAddressUrl(pair.token.address, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-amber-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[10px] text-zinc-600">{pair.token.decimals} decimals</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">ERC7984 Wrapper</p>
          <div className="flex items-center gap-1.5">
            <span className="font-data text-xs text-amber-400/70">{shortAddress(pair.confidentialToken.address, 6)}</span>
            <a
              href={getAddressUrl(pair.confidentialToken.address, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-amber-400 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[10px] text-zinc-600">
            {pair.confidentialToken.decimals} decimals · rate {pair.rate.toString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      {pair.isValid && (
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/wrap?token=${pair.token.address}`}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Wrap
            </Button>
          </Link>
          <Link href={`/unwrap?token=${pair.confidentialToken.address}`}>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
              <ArrowDownCircle className="h-3.5 w-3.5" />
              Unwrap
            </Button>
          </Link>
          <Link href={`/decrypt?token=${pair.confidentialToken.address}`}>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
              Decrypt Balance
            </Button>
          </Link>
          {pair.notes && (
            <Tooltip content={pair.notes}>
              <span>
                <Info className="h-3.5 w-3.5 text-zinc-600 ml-1 cursor-help" />
              </span>
            </Tooltip>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function RegistryPage() {
  const { pairs, isLoading, refetch, isSyncing, lastSyncedAt } = useRegistry();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterMode>('all');

  const filtered = useMemo(() => {
    let result = pairs;
    if (filter === 'official') result = result.filter((p) => p.source === 'official');
    if (filter === 'custom')   result = result.filter((p) => p.source === 'custom');
    if (filter === 'valid')    result = result.filter((p) => p.isValid);
    if (filter === 'revoked')  result = result.filter((p) => !p.isValid);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.token.symbol.toLowerCase().includes(q) ||
          p.token.name.toLowerCase().includes(q) ||
          p.token.address.toLowerCase().includes(q) ||
          p.confidentialToken.symbol.toLowerCase().includes(q) ||
          p.confidentialToken.address.toLowerCase().includes(q),
      );
    }
    return result;
  }, [pairs, filter, search]);

  const filters: { label: string; value: FilterMode }[] = [
    { label: 'All',      value: 'all'     },
    { label: 'Official', value: 'official'},
    { label: 'Custom',   value: 'custom'  },
    { label: 'Valid',    value: 'valid'   },
    { label: 'Revoked',  value: 'revoked' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Registry Explorer</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {pairs.length} pairs registered ·{' '}
            {pairs.filter((p) => p.isValid).length} valid ·{' '}
            {pairs.filter((p) => p.source === 'official').length} official
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isSyncing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by name, symbol, or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-zinc-600">
          Showing {filtered.length} of {pairs.length} pairs
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Pairs list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={search ? 'No matching pairs' : 'No pairs registered'}
          description={
            search
              ? `Try a different search term or clear filters.`
              : 'The on-chain registry has no pairs yet, or sync failed.'
          }
          action={
            search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : (
              <Button size="sm" onClick={() => refetch()}>
                Retry sync
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((pair, i) => (
            <PairRow key={`${pair.token.address}-${i}`} pair={pair} />
          ))}
        </div>
      )}
    </div>
  );
}
