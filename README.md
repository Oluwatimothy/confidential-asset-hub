# Confidential Asset Hub

A web application for the Zama Wrappers Registry ecosystem. It lets a user connect a wallet, browse the official ERC20 to ERC7984 wrapper pairs on Sepolia, wrap and unwrap between them, decrypt any ERC7984 balance using EIP-712 user decryption, transfer confidential registry tokens, claim testnet tokens from a faucet, and extend the registry with their own pairs either instantly and locally or permanently for everyone.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Powered by Zama](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-yellow)](https://zama.ai)

## Live deployment

https://confidential-asset-hub.vercel.app

## Why this exists

Zama's FHEVM brings fully homomorphic encryption on chain, and ERC7984 is the resulting standard for confidential tokens: balances and transfer amounts are stored as ciphertext handles rather than plaintext numbers. Zama maintains an official Wrappers Registry of ERC20 to ERC7984 pairs on Sepolia, but there was no single, polished frontend for actually using it. Without one, developers tend to spin up their own test tokens instead of the canonical ones, which fragments the ecosystem: every project ends up with a slightly different set of tokens that don't interoperate.

This app is a usable product built directly on top of that registry, so wrapping, unwrapping, decrypting, and transferring the official pairs is the easy path rather than something every team reimplements.

## Features

* **Registry Explorer** that reads the on chain Wrappers Registry and renders every pair with live token metadata and a recognizable logo per token
* **Wrap**: convert a registry ERC20 into its ERC7984 confidential equivalent, with exact-amount approvals, never an unlimited allowance
* **Unwrap**: convert an ERC7984 confidential token back to its ERC20 equivalent, including the finalize step once the Zama network has decrypted the request, with built in recovery if a browser tab is closed or refreshed mid-flow (see Error recovery below)
* **Decrypt**: reveal your own balance of any ERC7984 token via EIP-712 user decryption, either from the registry list or by pasting an arbitrary ERC7984 contract address, plus a Decrypt All action that covers every registry token in a single signature instead of one per token
* **Transfer**: send a registry confidential token to another address once your balance is decrypted, with a clear progress state while the amount is encrypted client side and the wallet is prompted to sign
* **Faucet**: claim each official Sepolia cTokenMock listed in the registry
* **Portfolio**: holdings across every registry pair, both official and custom
* **Analytics**: session level breakdown of registry composition (official, dev custom, local custom), pair validity, and transaction activity by type
* **Two ways to extend the registry**: add a pair locally in your own browser in seconds, or contribute a pair permanently for every user (see Adding a new pair below)
* **Network guard**: connecting on any chain other than Sepolia shows a banner with a one click switch action on every page that needs contract access, instead of silently failing
* **Idle wallet disconnect**: automatically disconnects after 30 minutes of inactivity, with a clear on screen notice explaining why
* **Per-wallet session state**: transaction history, decrypted balance caches, and analytics reset automatically when you disconnect or switch to a different wallet, so one browser never shows a mix of two wallets' activity

## Supported network

Sepolia only. The app deliberately does not attempt Ethereum Mainnet. If a wallet is connected to any other chain, every page that needs contract access shows a banner prompting a switch to Sepolia.

## How the registry is sourced

The registry is hybrid, combining two sources:

1. The official on chain Wrappers Registry contract, read directly via viem. This is the primary source of truth.
2. A local config file, `src/config/custom-pairs.ts`, for dev custom pairs: dev tokens, or pairs added ahead of an official listing, that ship with the deployed app.

A third, entirely separate source exists only in the browser: pairs added through the in app "Add Custom Pair Locally" flow, stored in that browser's local storage only (see below).

All applicable sources are fetched, merged, and deduplicated by chain ID and token address. When the same pair exists in more than one place, the official on chain entry always wins over dev custom, and both always win over a local pair. The merged result is cached for five minutes via React Query and exposed through the `useRegistry()` hook, which every page (Wrap, Unwrap, Decrypt, Transfer, Portfolio) reads from.

## Adding a new pair

There are two ways to add a pair, depending on whether it should be visible to everyone or just to you.

### 1. Add it locally (fastest, only visible to you)

No code change, no redeploy, nothing sent anywhere.

1. Open the **Add Custom Pair** page (sidebar).
2. In the **Add Custom Pair Locally** section, paste a valid ERC7984 confidential token address.
3. The app validates the contract on chain (an ERC7984 interface check), then reads its underlying ERC20 address, both tokens' name, symbol, and decimals, and the wrap rate, directly from the contracts. Nothing else needs to be filled in.
4. Click **Add Locally**. The pair appears immediately in Registry Explorer, Portfolio, Wrap, Unwrap, Decrypt, and Transfer.

This pair lives only in your browser's local storage. It persists across page refreshes, but not across browsers or devices, and can be removed at any time from the same page with one click.

### 2. Add it as a dev custom pair (visible to everyone)

This requires a code change and a redeploy, but once live, it appears for every visitor of the app, not just your own browser.

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

A note on `rate`: ERC7984 tokens always use 6 decimals. For an 18 decimal underlying token wrapped 1:1 in human terms, the rate is `10 ** (18 - 6)`, i.e. `1_000_000_000_000n`. For a 6 decimal underlying token, the rate is `1n`. The **Add Custom Pair** wizard on the same page can generate this snippet for you from a pasted address, using the same on chain reads as the local flow above.

3. Commit the change and push to main if you maintain this repository, or open a pull request against it if you don't.
4. Once merged, Vercel automatically builds and redeploys, no manual build step required. The pair then appears in Registry Explorer, Portfolio, Wrap, Unwrap, and Transfer for every visitor.

If a pair with the same `chainId` and token address is later added to the official on chain registry, that entry takes over automatically and the custom entry is ignored, so no cleanup is required.

## Core flows

### Wrap

The user picks a registry pair and an amount. The app checks the current ERC20 allowance for the wrapper contract; if it is insufficient, an approval transaction is sent for exactly the amount being wrapped, not an unlimited allowance. Once approved, the wrap transaction mints the confidential ERC7984 balance. Approval-related failures (insufficient allowance, including from contracts that revert with a custom error rather than a string reason) are caught and explained in plain language rather than surfacing a raw revert.

### Unwrap

This is a two step process required by the confidential token design. First, an unwrap request burns the encrypted amount and emits a request ID. The Zama network then decrypts that request off chain. Once that resolves, a second, separate finalize transaction releases the underlying ERC20 to the recipient.

**Error recovery**: because the two steps are separated by an off chain decryption delay, the app is built to survive a closed tab, a refresh, or a wallet switch in between:

* Any unfinalized unwrap for the currently connected wallet is detected automatically on page load, both from local history and by scanning the chain directly for `UnwrapRequested` events with no matching `UnwrapFinalized` event, and offered with a one click **Resume Finalize** button.
* If neither of those catches it (for example, the page was reloaded before the first transaction even finished submitting), a manual **paste transaction hash** option reads the real on chain receipt and extracts the request ID automatically, no need to dig through a block explorer by hand.
* A finalize attempt that fails because the network hasn't finished decrypting yet is treated as retryable, with an explanation, rather than presented as a dead end.
* Every recovery path checks that the connected wallet actually matches the original request's recipient before allowing a resume or finalize, so one wallet can never act on another wallet's pending unwrap even within the same browser.

### Decrypt

Balances are stored on chain as ciphertext handles, not numbers, so nothing about them is visible from a block explorer. To reveal one, the wallet signs an EIP-712 permit (no gas cost), which authorizes the Zama relayer to re-encrypt the balance so only that wallet can read it. This works for any ERC7984 token, not only ones in the registry: the Decrypt page has a Paste Address mode that reads token metadata directly from a pasted contract and runs the same permit and decrypt flow against it. A **Decrypt All** action requests a permit for every registry token in a single signature rather than one per token, without changing how the individual per-token flow behaves.

### Transfer

Once a registry confidential token's balance has been decrypted (so the sender knows what they are working with), an amount and recipient can be entered and sent via `confidentialTransfer`. The transferred amount is encrypted client side before it reaches the chain, and the button reflects that: it shows an encrypting state before the wallet prompt appears, since that step genuinely takes a moment, rather than looking frozen.

### Faucet

Lists each official cTokenMock from the Sepolia registry and lets a connected wallet claim a fixed test amount of each.

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

* All user supplied addresses (recipient in Transfer, pasted contract in Decrypt and in Add Custom Pair Locally) are validated with viem's `isAddress`, and any pasted ERC7984 address is additionally checked against the real interface before being trusted.
* Wrap approvals are for the exact amount being wrapped, never an unlimited allowance.
* Every unwrap recovery path (automatic resume or manual paste-hash) verifies the connected wallet matches the original request's recipient before allowing a finalize, so one wallet cannot act on another's pending unwrap.
* Locally added custom pairs are stored in the browser's local storage only; nothing is sent to a server or shared with other users.
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