// ============================================================
// components/layout/AppShell.tsx — Main application shell
// ============================================================
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  ArrowUpCircle,
  ArrowDownCircle,
  Lock,
  Droplets,
  BarChart3,
  PlusCircle,
  FileText,
  Menu,
  X,
  Zap,
  Send,
  ChevronRight,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { cn } from '@/utils';
import { useUIStore, useRegistryStore } from '@/stores';
import { useNetwork } from '@/hooks/use-network';
import { StatusDot, Badge, Tooltip } from '@/components/ui';
import { timeAgo } from '@/utils';

// ── Nav items ─────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/registry',  label: 'Registry',         icon: BookOpen        },
  { href: '/portfolio', label: 'Portfolio',        icon: Briefcase       },
  null, // divider
  { href: '/wrap',      label: 'Wrap Assets',      icon: ArrowUpCircle   },
  { href: '/unwrap',    label: 'Unwrap Assets',    icon: ArrowDownCircle },
  { href: '/decrypt',   label: 'Decrypt Balance',  icon: Lock            },
  { href: '/transfer',  label: 'Transfer cToken',  icon: Send            },
  null,
  { href: '/faucet',    label: 'Faucet',           icon: Droplets        },
  { href: '/analytics', label: 'Analytics',        icon: BarChart3       },
  { href: '/add-pair',  label: 'Add Custom Pair',  icon: PlusCircle      },
  null,
  { href: '/docs',      label: 'Documentation',    icon: FileText        },
] as const;

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const pathname      = usePathname();
  const { chainName, isSepolia, isSupported } = useNetwork();
  const lastSyncedAt  = useRegistryStore((s) => s.lastSyncedAt);
  const isSyncing     = useRegistryStore((s) => s.isSyncing);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 overflow-hidden z-30"
    >
      {/* Logo / brand */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400">
              <Zap className="h-4 w-4 text-zinc-950" />
            </span>
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">
              Confidential<br />
              <span className="text-amber-400">Asset Hub</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 mx-auto">
            <Zap className="h-4 w-4 text-zinc-950" />
          </Link>
        )}
        <button
          onClick={onCollapse}
          className={cn(
            'p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors',
            collapsed && 'mx-auto mt-2 block',
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map((item, i) => {
          if (item === null) {
            return <div key={`div-${i}`} className="my-2 h-px bg-zinc-800 mx-2" />;
          }
          const Icon     = item.icon;
          const isActive = pathname === item.href;
          return (
            <Tooltip key={item.href} content={collapsed ? item.label : ''}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors group',
                  isActive
                    ? 'bg-amber-400/10 text-amber-400 font-medium'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-amber-400')} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* Footer — network + sync status */}
      {!collapsed && (
        <div className="shrink-0 border-t border-zinc-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <StatusDot status={isSupported ? (isSepolia ? 'warning' : 'active') : 'error'} />
              <span className="text-zinc-400">{chainName}</span>
              {isSepolia && <Badge variant="warning" className="text-[10px] py-0 px-1">testnet</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            {isSyncing
              ? <><RefreshCw className="h-3 w-3 animate-spin text-amber-400" /><span className="text-amber-400/70">Syncing…</span></>
              : lastSyncedAt
              ? <><Activity className="h-3 w-3" /><span>Synced {timeAgo(lastSyncedAt)}</span></>
              : <><Activity className="h-3 w-3" /><span>Not synced</span></>
            }
          </div>
        </div>
      )}
    </motion.aside>
  );
}

// ── Top navigation ────────────────────────────────────────────
function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  // Derive page title
  const pageTitle = (() => {
    const found = NAV_ITEMS.find((i) => i && i.href === pathname);
    return found ? found.label : 'Confidential Asset Hub';
  })();

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-medium text-zinc-300">{pageTitle}</h1>
      </div>

      {/* RainbowKit connect button */}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
      />
    </header>
  );
}

// ── App Shell ─────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar collapsed={!sidebarOpen} onCollapse={toggleSidebar} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 z-50 h-screen md:hidden"
            >
              <Sidebar collapsed={false} onCollapse={() => setMobileSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="mx-auto max-w-6xl p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
