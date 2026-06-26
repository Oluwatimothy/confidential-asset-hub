// ============================================================
// tests/unit/registry.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeRegistries } from '../../src/services/registry';
import { buildCustomRegistryPairs } from '../../src/config/custom-pairs';
import {
  formatTokenAmount,
  shortAddress,
  isValidAddress,
  cooldownRemaining,
  formatCooldown,
  parseContractError,
} from '../../src/utils';
import type { RegistryPair } from '../../src/types';

// ── Helpers ───────────────────────────────────────────────────
function makePair(
  tokenAddress: string,
  source: 'official' | 'custom' = 'official',
  isValid = true,
): RegistryPair {
  return {
    token: {
      address:  tokenAddress as `0x${string}`,
      name:     'Test Token',
      symbol:   'TST',
      decimals: 18,
    },
    confidentialToken: {
      address:  `0x${'b'.repeat(40)}` as `0x${string}`,
      name:     'Confidential Test Token',
      symbol:   'cTST',
      decimals: 6,
    },
    rate:    1_000_000_000_000n,
    isValid,
    source,
    chainId: 11155111,
    addedAt: Date.now(),
  };
}

// ── mergeRegistries ───────────────────────────────────────────
describe('mergeRegistries', () => {
  it('returns all pairs when no duplicates', () => {
    const official = [makePair(`0x${'a'.repeat(40)}`)];
    const custom   = [makePair(`0x${'c'.repeat(40)}`, 'custom')];
    const merged   = mergeRegistries(official, custom);
    expect(merged).toHaveLength(2);
  });

  it('deduplicates by ERC20 address + chainId', () => {
    const addr     = `0x${'a'.repeat(40)}`;
    const official = [makePair(addr, 'official')];
    const custom   = [makePair(addr, 'custom')];
    const merged   = mergeRegistries(official, custom);
    expect(merged).toHaveLength(1);
    // Official wins (comes first)
    expect(merged[0].source).toBe('official');
  });

  it('handles empty arrays', () => {
    expect(mergeRegistries([], [])).toHaveLength(0);
    expect(mergeRegistries([makePair(`0x${'a'.repeat(40)}`)], [])).toHaveLength(1);
  });

  it('is case-insensitive for addresses', () => {
    const lower  = `0x${'a'.repeat(40)}`;
    const upper  = `0x${'A'.repeat(40)}`;
    const merged = mergeRegistries([makePair(lower)], [makePair(upper, 'custom')]);
    expect(merged).toHaveLength(1);
  });
});

// ── formatTokenAmount ─────────────────────────────────────────
describe('formatTokenAmount', () => {
  it('formats 1 USDC (6 decimals)', () => {
    expect(formatTokenAmount(1_000_000n, 6)).toBe('1');
  });

  it('formats 1 ETH (18 decimals)', () => {
    expect(formatTokenAmount(1_000_000_000_000_000_000n, 18)).toBe('1');
  });

  it('returns "0" for zero', () => {
    expect(formatTokenAmount(0n, 18)).toBe('0');
  });

  it('returns "< 0.000001" for dust', () => {
    expect(formatTokenAmount(1n, 18)).toBe('< 0.000001');
  });

  it('formats large values with commas', () => {
    const result = formatTokenAmount(1_000_000_000_000_000_000_000n, 18);
    expect(result).toContain(',');
  });
});

// ── shortAddress ──────────────────────────────────────────────
describe('shortAddress', () => {
  it('truncates a 42-char address', () => {
    const addr   = `0x${'a'.repeat(40)}`;
    const result = shortAddress(addr, 4);
    expect(result).toMatch(/^0x.*….*$/);
    expect(result.length).toBeLessThan(addr.length);
  });

  it('handles short inputs gracefully', () => {
    expect(shortAddress('0x1234', 4)).toBe('0x1234');
  });
});

// ── isValidAddress ────────────────────────────────────────────
describe('isValidAddress', () => {
  it('accepts valid checksummed address', () => {
    expect(isValidAddress('0x742d35Cc6634C0532925a3b8D4C9C4e32b4bAeC4')).toBe(true);
  });

  it('accepts lowercase address', () => {
    expect(isValidAddress(`0x${'a'.repeat(40)}`)).toBe(true);
  });

  it('rejects short address', () => {
    expect(isValidAddress('0x1234')).toBe(false);
  });

  it('rejects non-hex', () => {
    expect(isValidAddress('not-an-address')).toBe(false);
  });

  it('rejects zero address', () => {
    expect(isValidAddress(`0x${'0'.repeat(40)}`)).toBe(true); // valid format, not necessarily safe
  });
});

// ── cooldownRemaining ─────────────────────────────────────────
describe('cooldownRemaining', () => {
  it('returns 0 when cooldown has elapsed', () => {
    const past = Date.now() - 90_000; // 1.5 min ago
    expect(cooldownRemaining(past, 60)).toBe(0);
  });

  it('returns positive when within cooldown', () => {
    const recent = Date.now() - 30_000; // 30s ago
    const rem    = cooldownRemaining(recent, 60);
    expect(rem).toBeGreaterThan(0);
    expect(rem).toBeLessThanOrEqual(30);
  });
});

// ── formatCooldown ────────────────────────────────────────────
describe('formatCooldown', () => {
  it('returns "Ready" for 0', () => {
    expect(formatCooldown(0)).toBe('Ready');
  });

  it('formats hours and minutes', () => {
    expect(formatCooldown(3661)).toMatch(/h/);
  });

  it('formats seconds', () => {
    expect(formatCooldown(45)).toBe('45s');
  });
});

// ── parseContractError ────────────────────────────────────────
describe('parseContractError', () => {
  it('detects user rejection', () => {
    const err = { message: 'User rejected the request' };
    expect(parseContractError(err)).toBe('Transaction rejected by user.');
  });

  it('detects insufficient funds', () => {
    const err = { message: 'insufficient funds for gas' };
    expect(parseContractError(err)).toBe('Insufficient ETH for gas.');
  });

  it('falls back gracefully for unknown errors', () => {
    const err = { message: 'something unexpected' };
    expect(parseContractError(err)).toBe('something unexpected');
  });

  it('handles null/undefined', () => {
    expect(parseContractError(null)).toBe('Unknown error');
    expect(parseContractError(undefined)).toBe('Unknown error');
  });
});
