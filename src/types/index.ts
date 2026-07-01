// ============================================================
// types/index.ts — Core application types
// ============================================================

import type { Address } from 'viem';

// ── Chain support ─────────────────────────────────────────────
export const SUPPORTED_CHAIN_IDS = [1, 11155111] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

// ── Registry ─────────────────────────────────────────────────
export type RegistrySource = 'official' | 'custom';

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoUri?: string;
}

export interface RegistryPair {
  /** ERC-20 underlying token */
  token: TokenInfo;
  /** ERC-7984 confidential wrapper */
  confidentialToken: TokenInfo;
  /** Rate: underlying units per confidential unit */
  rate: bigint;
  isValid: boolean;
  source: RegistrySource;
  chainId: SupportedChainId;
  addedAt?: number;
  notes?: string;
}

export interface TokenWrapperPair {
  tokenAddress: Address;
  confidentialTokenAddress: Address;
  isValid: boolean;
}

// ── Portfolio ─────────────────────────────────────────────────
export interface TokenBalance {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  rawBalance: bigint;
  formattedBalance: string;
  usdValue?: number;
}

export interface ConfidentialTokenBalance {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  encryptedBalanceHandle?: string;
  decryptedBalance?: bigint;
  formattedDecryptedBalance?: string;
  lastDecryptedAt?: number;
  isDecrypting: boolean;
}

export interface PortfolioEntry {
  pair: RegistryPair;
  erc20Balance: TokenBalance;
  erc7984Balance: ConfidentialTokenBalance;
}

// ── Wrap / Unwrap ─────────────────────────────────────────────
export type WrapStep =
  | 'idle'
  | 'checking-approval'
  | 'awaiting-approval-signature'
  | 'approval-pending'
  | 'awaiting-wrap-signature'
  | 'wrap-pending'
  | 'confirming'
  | 'success'
  | 'error';

export type UnwrapStep =
  | 'idle'
  | 'encrypting-amount'
  | 'awaiting-unwrap-signature'
  | 'unwrap-pending'
  | 'awaiting-finalize'
  | 'awaiting-decryption'
  | 'finalizing'
  | 'success'
  | 'error';

export interface WrapState {
  step: WrapStep;
  txHash?: string;
  error?: string;
  amount?: string;
}

export interface UnwrapState {
  step: UnwrapStep;
  txHash?: string;
  finalizeTxHash?: string;
  unwrapRequestId?: string;
  error?: string;
  amount?: string;
}

// ── Decrypt ──────────────────────────────────────────────────
export interface DecryptionResult {
  address: Address;
  symbol: string;
  name: string;
  decryptedBalance: bigint;
  formattedBalance: string;
  decryptedAt: number;
}

export type DecryptStep =
  | 'idle'
  | 'validating'
  | 'awaiting-signature'
  | 'decrypting'
  | 'success'
  | 'error';

// ── Faucet ───────────────────────────────────────────────────
export interface FaucetToken {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  claimAmount: bigint;
  formattedClaimAmount: string;
  cooldownSeconds: number;
  chainId: SupportedChainId;
  wrapperAddress?: Address;
}

export interface FaucetClaimRecord {
  tokenAddress: Address;
  txHash: string;
  claimedAt: number;
  amount: bigint;
}

// ── Transaction ───────────────────────────────────────────────
export interface TxRecord {
  hash: string;
  type: 'wrap' | 'unwrap' | 'transfer' | 'decrypt' | 'faucet' | 'approval';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  tokenSymbol: string;
  amount?: string;
  chainId: SupportedChainId;
  /** Set on unwrap records only, needed to resume a not-yet-finalized unwrap. */
  unwrapRequestId?: `0x${string}`;
  /** ERC7984 wrapper address, needed to re-select the correct pair on resume. */
  pairAddress?: Address;
}

// ── Analytics ────────────────────────────────────────────────
export interface RegistryStats {
  totalPairs: number;
  validPairs: number;
  revokedPairs: number;
  officialPairs: number;
  customPairs: number;
  lastSyncedAt: number;
  chainId: SupportedChainId;
}

// ── Custom pair form ──────────────────────────────────────────
export interface CustomPairFormValues {
  erc20Address: string;
  erc7984Address: string;
  name: string;
  symbol: string;
  decimals: number;
  notes?: string;
}

// ── UI ────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';

export type NavRoute =
  | '/'
  | '/registry'
  | '/portfolio'
  | '/wrap'
  | '/unwrap'
  | '/decrypt'
  | '/transfer'
  | '/faucet'
  | '/analytics'
  | '/add-pair';
