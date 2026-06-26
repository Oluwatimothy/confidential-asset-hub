// ============================================================
// hooks/use-unwrap.ts — ERC7984 → ERC20 unwrap flow
// Two-step: unwrap (with SDK encrypted input) → finalizeUnwrap
// ============================================================
'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import type { Address } from 'viem';
import { ERC7984_ABI } from '@/contracts/erc7984-abi';
import { useTxStore } from '@/stores';
import { useNetwork } from './use-network';
import { parseContractError } from '@/utils';
import type { UnwrapStep } from '@/types';

export interface UseUnwrapParams {
  wrapperAddress: Address;
  decimals:       number;
  symbol:         string;
}

export interface UseUnwrapReturn {
  step:            UnwrapStep;
  txHash:          string | undefined;
  finalizeTxHash:  string | undefined;
  unwrapRequestId: string | undefined;
  error:           string | null;
  unwrap:          (encryptedAmount: `0x${string}`, inputProof: `0x${string}`) => Promise<void>;
  finalizeUnwrap:  (
    requestId: `0x${string}`,
    clearAmount: bigint,
    decryptionProof: `0x${string}`,
  ) => Promise<void>;
  reset:           () => void;
}

export function useUnwrap({
  wrapperAddress,
  decimals: _decimals,
  symbol,
}: UseUnwrapParams): UseUnwrapReturn {
  const { address }           = useAccount();
  const { chainId }           = useNetwork();
  const { addTx, updateTx }   = useTxStore();
  const { writeContractAsync }= useWriteContract();

  const [step, setStep]                       = useState<UnwrapStep>('idle');
  const [error, setError]                     = useState<string | null>(null);
  const [txHash, setTxHash]                   = useState<string | undefined>();
  const [finalizeTxHash, setFinalizeTxHash]   = useState<string | undefined>();
  const [unwrapRequestId, setUnwrapRequestId] = useState<string | undefined>();

  // Step 1: Submit unwrap request with SDK-generated encrypted amount
  const unwrap = useCallback(
    async (
      encryptedAmount: `0x${string}`,
      inputProof: `0x${string}`,
    ) => {
      if (!address) return;
      setError(null);

      try {
        setStep('awaiting-unwrap-signature');
        const hash = await writeContractAsync({
          address:      wrapperAddress,
          abi:          ERC7984_ABI,
          functionName: 'unwrap',
          args:         [address, address, encryptedAmount, inputProof],
        });
        setTxHash(hash);
        addTx({
          hash,
          type:        'unwrap',
          status:      'pending',
          timestamp:   Date.now(),
          tokenSymbol: symbol,
          chainId,
        });
        setStep('unwrap-pending');
        // Consumer watches receipt and extracts unwrapRequestId from event log
      } catch (err) {
        setError(parseContractError(err));
        setStep('error');
      }
    },
    [address, wrapperAddress, symbol, chainId, writeContractAsync, addTx],
  );

  // Step 2: Finalize after decryption proof is received
  const finalizeUnwrap = useCallback(
    async (
      requestId: `0x${string}`,
      clearAmount: bigint,
      decryptionProof: `0x${string}`,
    ) => {
      if (!address) return;
      setError(null);

      try {
        setUnwrapRequestId(requestId);
        setStep('finalizing');
        const hash = await writeContractAsync({
          address:      wrapperAddress,
          abi:          ERC7984_ABI,
          functionName: 'finalizeUnwrap',
          args:         [requestId, clearAmount, decryptionProof],
        });
        setFinalizeTxHash(hash);
        addTx({
          hash,
          type:        'unwrap',
          status:      'pending',
          timestamp:   Date.now(),
          tokenSymbol: symbol,
          chainId,
        });
        setStep('success');
        if (txHash) updateTx(txHash, { status: 'confirmed' });
        updateTx(hash, { status: 'confirmed' });
      } catch (err) {
        setError(parseContractError(err));
        setStep('error');
      }
    },
    [address, wrapperAddress, symbol, chainId, txHash, writeContractAsync, addTx, updateTx],
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(undefined);
    setFinalizeTxHash(undefined);
    setUnwrapRequestId(undefined);
  }, []);

  return {
    step,
    txHash,
    finalizeTxHash,
    unwrapRequestId,
    error,
    unwrap,
    finalizeUnwrap,
    reset,
  };
}
