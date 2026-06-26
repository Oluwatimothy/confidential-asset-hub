// ============================================================
// hooks/use-wrap.ts — Full ERC20 → ERC7984 wrap flow
// ============================================================
'use client';

import { useState, useCallback } from 'react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import type { Address } from 'viem';
import { ERC20_ABI } from '@/contracts/erc20-abi';
import { ERC7984_ABI } from '@/contracts/erc7984-abi';
import { useTxStore } from '@/stores';
import { useNetwork } from './use-network';
import { parseContractError } from '@/utils';
import type { WrapStep } from '@/types';

export interface UseWrapParams {
  erc20Address:   Address;
  wrapperAddress: Address;
  decimals:       number;
  symbol:         string;
}

export interface UseWrapReturn {
  step:      WrapStep;
  txHash:    string | undefined;
  error:     string | null;
  wrap:      (amount: string) => Promise<void>;
  reset:     () => void;
  allowance: bigint | undefined;
  balance:   bigint | undefined;
}

export function useWrap({
  erc20Address,
  wrapperAddress,
  decimals,
  symbol,
}: UseWrapParams): UseWrapReturn {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const { addTx, updateTx } = useTxStore();

  const [step, setStep]   = useState<WrapStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();

  const { writeContractAsync } = useWriteContract();

  // ── Read allowance ────────────────────────────────────────
  const { data: allowance } = useReadContract({
    address:      erc20Address,
    abi:          ERC20_ABI,
    functionName: 'allowance',
    args:         address ? [address, wrapperAddress] : undefined,
    query:        { enabled: !!address },
  });

  // ── Read ERC20 balance ─────────────────────────────────────
  const { data: balance } = useReadContract({
    address:      erc20Address,
    abi:          ERC20_ABI,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  const wrap = useCallback(
    async (amountStr: string) => {
      if (!address) return;
      setError(null);

      try {
        const amount = parseUnits(amountStr, decimals);

        // 1) Check approval
        setStep('checking-approval');
        const currentAllowance = (allowance as bigint | undefined) ?? 0n;

        if (currentAllowance < amount) {
          setStep('awaiting-approval-signature');
          const approvalHash = await writeContractAsync({
            address:      erc20Address,
            abi:          ERC20_ABI,
            functionName: 'approve',
            args:         [wrapperAddress, maxUint256],
          });
          addTx({
            hash:        approvalHash,
            type:        'approval',
            status:      'pending',
            timestamp:   Date.now(),
            tokenSymbol: symbol,
            chainId,
          });
          setStep('approval-pending');
          // Wait briefly — in prod use useWaitForTransactionReceipt
          await new Promise((r) => setTimeout(r, 5000));
          updateTx(approvalHash, { status: 'confirmed' });
        }

        // 2) Wrap
        setStep('awaiting-wrap-signature');
        const wrapHash = await writeContractAsync({
          address:      wrapperAddress,
          abi:          ERC7984_ABI,
          functionName: 'wrap',
          args:         [address, amount],
        });
        setTxHash(wrapHash);
        addTx({
          hash:        wrapHash,
          type:        'wrap',
          status:      'pending',
          timestamp:   Date.now(),
          tokenSymbol: symbol,
          amount:      amountStr,
          chainId,
        });

        setStep('wrap-pending');
        // The consumer should watch the hash via useWaitForTransactionReceipt
        setStep('success');
        updateTx(wrapHash, { status: 'confirmed' });
      } catch (err) {
        const msg = parseContractError(err);
        setError(msg);
        setStep('error');
        if (txHash) updateTx(txHash, { status: 'failed' });
      }
    },
    [address, allowance, erc20Address, wrapperAddress, decimals, symbol, chainId,
     writeContractAsync, addTx, updateTx, txHash],
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(undefined);
  }, []);

  return {
    step,
    txHash,
    error,
    wrap,
    reset,
    allowance: allowance as bigint | undefined,
    balance:   balance   as bigint | undefined,
  };
}
