// ============================================================
// contracts/registry-abi.ts — ConfidentialTokenWrappersRegistry ABI
// Source: https://github.com/zama-ai/protocol-apps
// ============================================================

export const REGISTRY_ABI = [
  // ── View functions ─────────────────────────────────────────
  {
    name: 'getTokenConfidentialTokenPairs',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'tokenAddress',             type: 'address' },
          { name: 'confidentialTokenAddress', type: 'address' },
          { name: 'isValid',                  type: 'bool'    },
        ],
      },
    ],
  },
  {
    name: 'getTokenConfidentialTokenPairsLength',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getTokenConfidentialTokenPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenAddress',             type: 'address' },
          { name: 'confidentialTokenAddress', type: 'address' },
          { name: 'isValid',                  type: 'bool'    },
        ],
      },
    ],
  },
  {
    name: 'getTokenConfidentialTokenPairsSlice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'fromIndex', type: 'uint256' },
      { name: 'toIndex',   type: 'uint256' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'tokenAddress',             type: 'address' },
          { name: 'confidentialTokenAddress', type: 'address' },
          { name: 'isValid',                  type: 'bool'    },
        ],
      },
    ],
  },
  {
    name: 'getConfidentialTokenAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'erc20TokenAddress', type: 'address' }],
    outputs: [
      { name: 'isValid',           type: 'bool'    },
      { name: 'confidentialToken', type: 'address' },
    ],
  },
  {
    name: 'getTokenAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'confidentialWrapperAddress', type: 'address' }],
    outputs: [
      { name: 'isValid', type: 'bool'    },
      { name: 'token',   type: 'address' },
    ],
  },
  {
    name: 'isConfidentialTokenValid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'confidentialWrapperAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getTokenIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddress', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    name: 'ConfidentialTokenRegistered',
    type: 'event',
    inputs: [
      { name: 'tokenAddress',             type: 'address', indexed: true },
      { name: 'confidentialTokenAddress', type: 'address', indexed: true },
    ],
  },
  {
    name: 'ConfidentialTokenRevoked',
    type: 'event',
    inputs: [
      { name: 'tokenAddress',             type: 'address', indexed: true },
      { name: 'confidentialTokenAddress', type: 'address', indexed: true },
    ],
  },
] as const;

export type RegistryAbi = typeof REGISTRY_ABI;
