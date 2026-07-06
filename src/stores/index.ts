// ============================================================
// stores/index.ts — Zustand global stores
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RegistryPair,
  TxRecord,
  DecryptionResult,
  FaucetClaimRecord,
  RegistryStats,
  SupportedChainId,
} from '@/types';
import type { Address } from 'viem';

// ── BigInt-safe storage ───────────────────────────────────────
const bigintSafeStorage = (name: string) => ({
  getItem: (key: string) => {
    const str = localStorage.getItem(key);
    if (!str) return null;
    return JSON.parse(str);
  },
  setItem: (key: string, value: unknown) => {
    localStorage.setItem(
      key,
      JSON.stringify(value, (_k, val) =>
        typeof val === 'bigint' ? val.toString() : val,
      ),
    );
  },
  removeItem: (key: string) => localStorage.removeItem(key),
});

// ── Registry Store ─────────────────────────────────────────────
interface RegistryStore {
  pairs: RegistryPair[];
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
  setPairs: (pairs: RegistryPair[]) => void;
  setIsSyncing: (v: boolean) => void;
  setSyncError: (e: string | null) => void;
  setLastSynced: (ts: number) => void;
  getStats: (chainId: SupportedChainId) => RegistryStats;
}

export const useRegistryStore = create<RegistryStore>()((set, get) => ({
  pairs: [],
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,
  setPairs: (pairs) => set({ pairs }),
  setIsSyncing: (v) => set({ isSyncing: v }),
  setSyncError: (e) => set({ syncError: e }),
  setLastSynced: (ts) => set({ lastSyncedAt: ts }),
  getStats: (chainId) => {
    const pairs = get().pairs.filter((p) => p.chainId === chainId);
    return {
      totalPairs: pairs.length,
      validPairs: pairs.filter((p) => p.isValid).length,
      revokedPairs: pairs.filter((p) => !p.isValid).length,
      officialPairs: pairs.filter((p) => p.source === 'official').length,
      customPairs: pairs.filter((p) => p.source === 'custom').length,
      lastSyncedAt: get().lastSyncedAt ?? 0,
      chainId,
    };
  },
}));

// ── Local Custom Pairs Store (persisted, browser-only) ─────────
// Distinct from src/config/custom-pairs.ts (the "dev" mechanism, which
// requires a code change and redeploy to appear for everyone). Pairs
// added here live only in this browser's localStorage, added and
// removed instantly with no deploy, and are invisible to anyone else.
interface LocalPairsStore {
  pairs: RegistryPair[];
  addPair: (pair: RegistryPair) => void;
  removePair: (confidentialTokenAddress: Address, chainId: SupportedChainId) => void;
}

export const useLocalPairsStore = create<LocalPairsStore>()(
  persist(
    (set) => ({
      pairs: [],
      addPair: (pair) =>
        set((s) => ({
          pairs: [
            ...s.pairs.filter(
              (p) =>
                !(p.confidentialToken.address.toLowerCase() === pair.confidentialToken.address.toLowerCase() &&
                  Number(p.chainId) === Number(pair.chainId)),
            ),
            pair,
          ],
        })),
      removePair: (confidentialTokenAddress, chainId) =>
        set((s) => ({
          pairs: s.pairs.filter(
            (p) =>
              !(p.confidentialToken.address.toLowerCase() === confidentialTokenAddress.toLowerCase() &&
                Number(p.chainId) === Number(chainId)),
          ),
        })),
    }),
    {
      name: 'cah-local-custom-pairs',
      storage: bigintSafeStorage('cah-local-custom-pairs'),
    },
  ),
);

// ── Decrypt Store ──────────────────────────────────────────────
interface DecryptStore {
  results: Record<string, DecryptionResult>;
  setResult: (address: string, result: DecryptionResult) => void;
  clearAll: () => void;
}

export const useDecryptStore = create<DecryptStore>()((set) => ({
  results: {},
  setResult: (address, result) =>
    set((s) => ({ results: { ...s.results, [address.toLowerCase()]: result } })),
  clearAll: () => set({ results: {} }),
}));

// ── Transaction Store (persisted) ─────────────────────────────
interface TxStore {
  records: TxRecord[];
  addTx: (tx: TxRecord) => void;
  updateTx: (hash: string, update: Partial<TxRecord>) => void;
  clearAll: () => void;
}

export const useTxStore = create<TxStore>()(
  persist(
    (set) => ({
      records: [],
      addTx: (tx) =>
        set((s) => ({
          records: [tx, ...s.records].slice(0, 100),
        })),
      updateTx: (hash, update) =>
        set((s) => ({
          records: s.records.map((r) => (r.hash === hash ? { ...r, ...update } : r)),
        })),
      clearAll: () => set({ records: [] }),
    }),
    {
      name: 'cah-transactions',
      storage: bigintSafeStorage('cah-transactions'),
    },
  ),
);

// ── Faucet Store (persisted) ──────────────────────────────────
interface FaucetStore {
  claims: FaucetClaimRecord[];
  addClaim: (claim: FaucetClaimRecord) => void;
  getLastClaim: (tokenAddress: Address) => FaucetClaimRecord | undefined;
}

export const useFaucetStore = create<FaucetStore>()(
  persist(
    (set, get) => ({
      claims: [],
      addClaim: (claim) =>
        set((s) => ({
          claims: [
            {
              ...claim,
              amount: claim.amount.toString() as unknown as bigint,
            },
            ...s.claims,
          ].slice(0, 200),
        })),
      getLastClaim: (tokenAddress) =>
        get().claims.find(
          (c) => c.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
        ),
    }),
    {
      name: 'cah-faucet-claims',
      storage: bigintSafeStorage('cah-faucet-claims'),
    },
  ),
);

// ── UI Store ──────────────────────────────────────────────────
interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));