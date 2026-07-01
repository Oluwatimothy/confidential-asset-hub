// ============================================================
// contracts/erc7984-abi.ts — ERC7984 + ConfidentialWrapper ABI
// Covers: ERC7984ERC20Wrapper (wrap, unwrap, finalizeUnwrap)
// Source: OpenZeppelin Confidential Contracts + Zama Protocol Apps
// ERC-7984 interface ID: 0x4958f2a4
// ============================================================

export const ERC7984_ABI = [
  // ── ERC7984 base ───────────────────────────────────────────
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'contractURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'confidentialTotalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }], // euint64 ciphertext handle
  },
  {
    name: 'inferredTotalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'maxTotalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'supportsInterface',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ type: 'bool' }],
  },
  // ── ERC7984ERC20Wrapper ─────────────────────────────────────
  {
    name: 'underlying',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'rate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  // wrap(address to, uint256 amount)
  {
    name: 'wrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  // unwrap with input proof (encrypted amount from SDK)
  {
    name: 'unwrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from',            type: 'address' },
      { name: 'to',              type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' }, // externalEuint64
      { name: 'inputProof',      type: 'bytes'   },
    ],
    outputs: [],
  },
  // finalizeUnwrap
  {
    name: 'finalizeUnwrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'unwrapRequestId',      type: 'bytes32' },
      { name: 'unwrapAmountCleartext',type: 'uint64'  },
      { name: 'decryptionProof',      type: 'bytes'   },
    ],
    outputs: [],
  },
  // unwrapAmount(bytes32 unwrapRequestId)
  {
    name: 'unwrapAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'unwrapRequestId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32' }], // euint64
  },
  // unwrapRequester(bytes32 unwrapRequestId)
  {
    name: 'unwrapRequester',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'unwrapRequestId', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
  },
  // confidentialTransfer(address to, externalEuint64 encryptedAmount, bytes inputProof)
  {
    name: 'confidentialTransfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',              type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' }, // externalEuint64
      { name: 'inputProof',      type: 'bytes'   },
    ],
    outputs: [{ type: 'bytes32' }], // euint64 transferred-amount handle
  },
  // Operator system
  {
    name: 'setOperator',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator',        type: 'address' },
      { name: 'validUntilEpoch', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isOperator',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'holder',  type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
  // ── Events ─────────────────────────────────────────────────
  {
    name: 'Wrap',
    type: 'event',
    inputs: [
      { name: 'to',                      type: 'address', indexed: true  },
      { name: 'roundedAmount',           type: 'uint256', indexed: false },
      { name: 'encryptedWrappedAmount',  type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'UnwrapRequested',
    type: 'event',
    inputs: [
      { name: 'receiver',        type: 'address', indexed: true  },
      { name: 'unwrapRequestId', type: 'bytes32', indexed: true  },
      { name: 'amount',          type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'UnwrapFinalized',
    type: 'event',
    inputs: [
      { name: 'receiver',          type: 'address', indexed: true  },
      { name: 'unwrapRequestId',   type: 'bytes32', indexed: true  },
      { name: 'encryptedAmount',   type: 'bytes32', indexed: false },
      { name: 'cleartextAmount',   type: 'uint64',  indexed: false },
    ],
  },
  {
    name: 'ConfidentialTransfer',
    type: 'event',
    inputs: [
      { name: 'from',            type: 'address', indexed: true  },
      { name: 'to',              type: 'address', indexed: true  },
      { name: 'encryptedAmount', type: 'bytes32', indexed: false },
    ],
  },
] as const;

export type ERC7984Abi = typeof ERC7984_ABI;

// ERC-7984 interface selector
export const ERC7984_INTERFACE_ID = '0x4958f2a4' as const;
