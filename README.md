# Confidential Asset Hub

A web application for the Zama Wrappers Registry ecosystem. It lets a user connect a wallet, browse the official ERC20 to ERC7984 wrapper pairs on Sepolia, wrap and unwrap between them, decrypt any ERC7984 balance using EIP-712 user decryption, transfer confidential registry tokens, and claim testnet tokens from a faucet.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Powered by Zama](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-yellow)](https://zama.ai)

## Live deployment

https://confidential-asset-hub.vercel.app

## Why this exists

Zama's FHEVM brings fully homomorphic encryption on chain, and ERC7984 is the resulting standard for confidential tokens: balances and transfer amounts are stored as ciphertext handles rather than plaintext numbers. Zama maintains an official Wrappers Registry of ERC20 to ERC7984 pairs on Sepolia, but there was no single, polished frontend for actually using it. Without one, developers tend to spin up their own test tokens instead of the canonical ones, which fragments the ecosystem: every project ends up with a slightly different set of tokens that don't interoperate.

This app is a usable product built directly on top of that registry, so wrapping, unwrapping, decrypting, and transferring the official pairs is the easy path rather than something every team reimplements.

## Features

* Registry Explorer that reads the on chain Wrappers Registry and renders every pair with live token metadata
* Wrap: convert a registry ERC20 into its ERC7984 confidential equivalent
* Unwrap: convert an ERC7984 confidential token back to its ERC20 equivalent, including the finalize step once the Zama network has decrypted the request
* Decrypt: reveal your own balance of any ERC7984 token via EIP-712 user decryption, either from the registry list or by pasting an arbitrary ERC7984 contract address
* Transfer: send a registry confidential token to another address once your balance is decrypted
* Faucet: claim each official Sepolia cTokenMock listed in the registry
* Portfolio view across all registry pairs
* A working network guard: connecting on any chain other than Sepolia shows a banner with a one click switch action, instead of silently failing

## Supported network

Sepolia only. The app deliberately does not attempt Ethereum Mainnet. If a wallet is connected to any other chain, every page that needs contract access shows a banner prompting a switch to Sepolia.

## How the registry is sourced

The registry is hybrid, combining two sources:

1. The official on chain Wrappers Registry contract, read directly via viem. This is the primary source of truth.
2. A local config file, `src/config/custom-pairs.ts`, for pairs that are not (yet) in the official registry: dev tokens, or pairs added ahead of an official listing.

Both sources are fetched, merged, and deduplicated by chain ID and token address. When the same pair exists in both places, the official on chain entry always wins. The merged result is cached for five minutes via React Query and exposed through the `useRegistry()` hook, which every page (Wrap, Unwrap, Decrypt, Transfer, Portfolio) reads from.

## Adding a new pair

There is no admin UI or on chain registration flow for this; new pairs are added to the local config and shipped with the app. This keeps the mechanism simple, reviewable in a pull request, and clearly separated from the official registry.

1. Open `src/config/custom-pairs.ts`.
2. Add an entry to the `CUSTOM_PAIRS` array:

```typescript
export const CUSTOM_PAIRS: CustomPairEntry[] = [
  // ...existing entries
  {
    token: {
      address: '0xYourERC20Address',
      name: 'My Token',
      symbol: 'MYT',
      decimals: 18,
    },
    confidentialToken: {
      address: '0xYourERC7984WrapperAddress',
      name: 'Confidential My Token',
      symbol: 'cMYT',
      decimals: 6,
    },
    rate: 1_000_000_000_000n, // underlying units per confidential unit, see note below
    chainId: 11155111, // Sepolia
    notes: 'Description of this pair',
    addedAt: Date.now(),
  },
];
```

A note on `rate`: ERC7984 tokens always use 6 decimals. For an 18 decimal underlying token wrapped 1:1 in human terms, the rate is `10 ** (18 - 6)`, i.e. `1_000_000_000_000n`. For a 6 decimal underlying token, the rate is `1n`.

3. Rebuild and redeploy. The pair then appears automatically in the Registry Explorer, Portfolio, Wrap, Unwrap, and Transfer pages, since all of them read from the same merged registry.

If a pair with the same `chainId` and token address is later added to the official on chain registry, that entry takes over automatically and the custom entry is ignored, so no cleanup is required.

## Core flows

### Wrap

The user picks a registry pair and an amount. The app checks the current ERC20 allowance for the wrapper contract; if it is insufficient, an approval transaction is sent for exactly the amount being wrapped, not an unlimited allowance. Once approved, the wrap transaction mints the confidential ERC7984 balance.

### Unwrap

This is a two step process required by the confidential token design. First, an unwrap request burns the encrypted amount and emits a request ID. The Zama network then decrypts that request off chain. Once that resolves, a second, separate finalize transaction releases the underlying ERC20 to the recipient.

### Decrypt

Balances are stored on chain as ciphertext handles, not numbers, so nothing about them is visible from a block explorer. To reveal one, the wallet signs an EIP-712 permit (no gas cost), which authorizes the Zama relayer to re-encrypt the balance so only that wallet can read it. This works for any ERC7984 token, not only ones in the registry: the Decrypt page has a Paste Address mode that reads token metadata directly from a pasted contract and runs the same permit and decrypt flow against it.

### Transfer

Once a registry confidential token's balance has been decrypted (so the sender knows what they are working with), an amount and recipient can be entered and sent via `confidentialTransfer`. The transferred amount is encrypted client side before it reaches the chain.

### Faucet

Lists each official cTokenMock from the Sepolia registry and lets a connected wallet claim a fixed test amount of each.

## Project structure

```
src/
  app/                     Next.js App Router pages
    page.tsx               Dashboard
    registry/               Registry Explorer
    portfolio/               Portfolio
    wrap/                     Wrap
    unwrap/                   Unwrap
    decrypt/                  Decrypt (registry and paste address modes)
    transfer/                 Transfer
    faucet/                   Faucet
    add-pair/                 Custom pair wizard
    docs/                     In app documentation
    api/rpc/[network]/        Server side RPC proxy
    api/relayer/[...path]/    Server side relayer proxy
  components/
    ui/                      Shared UI primitives
    layout/                  App shell, sidebar, providers
    NetworkGuard.tsx         Wrong network banner and switch action
  hooks/                    useRegistry, useNetwork, usePortfolio, useTokenMetadata
  services/registry.ts      On chain registry read, merge, and dedup logic
  contracts/                 ABIs: registry, ERC20, ERC7984
  config/                    Chain IDs, contract addresses, custom pairs, faucet tokens
  stores/                    Zustand stores (registry, decrypt results, transactions, faucet claims, UI)
  types/                    Shared TypeScript types
  utils/                    Formatting, validation, and error parsing helpers
```

## Getting started

Prerequisites: Node.js 20 or later, and a WalletConnect Cloud project ID from https://cloud.walletconnect.com.

```bash
git clone <this-repo-url>
cd confidential-asset-hub
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local
npm run dev
```

Then open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID used by RainbowKit. Falls back to a demo ID if unset, which is not suitable for production use. |
| `SEPOLIA_RPC_URL` | No | Overrides the default public Sepolia RPC endpoint used by the server side RPC proxy at `app/api/rpc/[network]`. |
| `MAINNET_RPC_URL` | No | Overrides the default public Mainnet RPC endpoint used by the same proxy. Not exercised by the current UI since the app is Sepolia only. |

RPC and relayer requests are proxied through the app's own API routes rather than calling public endpoints directly from the browser, so no RPC provider key is ever exposed client side.

## Available scripts

```bash
npm run dev          # Start the dev server
npm run build         # Production build
npm run start          # Serve the production build
npm run lint             # ESLint
npm run typecheck         # tsc --noEmit
npm run test                # Vitest, watch mode
npm run test:run             # Vitest, single run
npm run test:ui               # Vitest UI
```

## Deployed contract addresses (Sepolia)

| Contract | Address |
|---|---|
| Wrappers Registry | `0x2f0750Bbb0A246059d80e94c454586a7F27a128e` |
| ACL Contract | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| FHEVM Executor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMS Verifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| Input Verifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| Decryption Address | `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478` |

The official Sepolia cTokenMock addresses claimable from the faucet, and their corresponding wrapper addresses, are listed in `src/config/faucet-tokens.ts`.

## Security notes

* All user supplied addresses (recipient in Transfer, pasted contract in Decrypt) are validated with viem's `isAddress` before use.
* Wrap approvals are for the exact amount being wrapped, never an unlimited allowance.
* RPC and relayer calls go through server side proxy routes, so no provider API key is exposed to the browser.
* EIP-712 permit signing and balance decryption are handled by the Zama SDK (`@zama-fhe/react-sdk`); this app does not implement its own cryptography.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | Custom primitives on Radix UI |
| Web3 | wagmi, viem |
| Wallet UI | RainbowKit |
| Confidential tokens | `@zama-fhe/sdk`, `@zama-fhe/react-sdk` |
| State | Zustand |
| Server state | TanStack Query |
| Testing | Vitest |

## License

MIT. See `LICENSE`.
