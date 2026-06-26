// ============================================================
// hooks/use-registry.ts
// ============================================================
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFullRegistry } from '@/services/registry';
import { useRegistryStore } from '@/stores';
import { useNetwork } from './use-network';
import type { RegistryPair } from '@/types';

export interface UseRegistryReturn {
  pairs:           RegistryPair[];
  isLoading:       boolean;
  isError:         boolean;
  error:           Error | null;
  refetch:         () => void;
  lastSyncedAt:    number | null;
  isSyncing:       boolean;
}

export function useRegistry(): UseRegistryReturn {
  const { chainId } = useNetwork();
  const { setPairs, setLastSynced } = useRegistryStore();

  const query = useQuery({
    queryKey:    ['registry', chainId],
    queryFn:     async () => {
      const pairs = await fetchFullRegistry(chainId);
      setPairs(pairs);
      setLastSynced(Date.now());
      return pairs;
    },
    staleTime:   5 * 60 * 1000, // 5 minutes
    gcTime:      30 * 60 * 1000,
    retry:       3,
    retryDelay:  (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  });

  const storedPairs = useRegistryStore((s) => s.pairs);
  const lastSyncedAt = useRegistryStore((s) => s.lastSyncedAt);

  return {
    pairs:        query.data ?? storedPairs,
    isLoading:    query.isLoading,
    isError:      query.isError,
    error:        query.error,
    refetch:      query.refetch,
    lastSyncedAt,
    isSyncing:    query.isFetching,
  };
}
