// ============================================================
// app/analytics/page.tsx — Registry Analytics
// ============================================================
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton,
} from '@/components/ui';
import { useRegistry } from '@/hooks/use-registry';
import { useNetwork } from '@/hooks/use-network';
import { useTxStore } from '@/stores';
import { timeAgo } from '@/utils';

const COLORS = ['#fbbf24', '#52525b', '#34d399', '#ef4444', '#3b82f6'];

export default function AnalyticsPage() {
  const { pairs, isLoading, refetch, isSyncing, lastSyncedAt } = useRegistry();
  const { chainId } = useNetwork();
  const records = useTxStore((s) => s.records);

  const chainPairs = pairs.filter((p) => p.chainId === chainId);

  const validPairs = chainPairs.filter((p) => p.isValid).length;
  const revokedPairs = chainPairs.filter((p) => !p.isValid).length;
  const officialPairs = chainPairs.filter((p) => p.source === 'official').length;
  const customPairs = chainPairs.filter((p) => p.source === 'custom').length;

  const pieData = [
    { name: 'Official', value: officialPairs },
    { name: 'Custom', value: customPairs },
  ].filter((d) => d.value > 0);

  const statusData = [
    { name: 'Valid', value: validPairs },
    { name: 'Revoked', value: revokedPairs },
  ].filter((d) => d.value > 0);

  // Tx distribution
  const txTypes = ['wrap', 'unwrap', 'transfer', 'decrypt', 'faucet', 'approval'] as const;
  const txData = txTypes.map((t) => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    count: records.filter((r) => r.type === t).length,
  })).filter((d) => d.count > 0);

  // Unique tokens in registry
  const uniqueTokens = new Set(chainPairs.map((p) => p.token.address)).size;
  const uniqueWrappers = new Set(chainPairs.map((p) => p.confidentialToken.address)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Analytics</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Registry health, metrics, and transaction overview
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isSyncing}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pairs', value: chainPairs.length, accent: true },
          { label: 'Valid Pairs', value: validPairs, accent: false },
          { label: 'Unique Tokens', value: uniqueTokens, accent: false },
          { label: 'Tx This Session', value: records.length, accent: false },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className={stat.accent ? 'border-amber-400/30' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.accent ? 'text-amber-400' : 'text-zinc-100'}`}>
                  {isLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pair Sources</CardTitle>
            <CardDescription>Official vs custom registry entries</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
                No data yet — sync the registry
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa' }}
                    itemStyle={{ color: '#f4f4f5' }}
                  />
                  <Legend
                    formatter={(v) => <span style={{ color: '#a1a1aa', fontSize: '12px' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pair Status</CardTitle>
            <CardDescription>Valid vs revoked wrappers</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <Cell fill="#fbbf24" />
                    <Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction breakdown */}
      {txData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction Activity</CardTitle>
            <CardDescription>Distribution by type this session</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={txData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ReTooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  cursor={{ fill: '#27272a' }}
                />
                <Bar dataKey="count" fill="#fbbf24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Registry health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registry Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Sync status', value: isSyncing ? 'Syncing…' : lastSyncedAt ? `Last synced ${timeAgo(lastSyncedAt)}` : 'Not synced', ok: !!lastSyncedAt },
            { label: 'Valid pair ratio', value: chainPairs.length ? `${Math.round((validPairs / chainPairs.length) * 100)}%` : 'N/A', ok: validPairs === chainPairs.length },
            { label: 'Official source', value: `${officialPairs} / ${chainPairs.length}`, ok: officialPairs > 0 },
            { label: 'Registry contract', value: 'UUPS Upgradeable proxy', ok: true },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
              <span className="text-sm text-zinc-400">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-200">{row.value}</span>
                <span className={`h-2 w-2 rounded-full ${row.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
