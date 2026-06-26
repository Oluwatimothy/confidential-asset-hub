# Confidential Asset Hub

> **The Canonical Gateway to Confidential Assets on Zama**

[![CI](https://github.com/your-org/confidential-asset-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/confidential-asset-hub/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Powered by Zama](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-yellow)](https://zama.ai)

---

## Overview

Confidential Asset Hub is a **production-grade, open-source frontend** for the Zama Wrappers Registry ecosystem. It serves as a unified interface for interacting with ERC7984 confidential tokens — wrapping, unwrapping, decrypting, and exploring the official on-chain registry.

Built to a standard comparable to Vercel Dashboard, Alchemy, and Stripe — not a hackathon prototype.

### Live Demo

🔗 **[https://confidential-asset-hub.vercel.app](https://confidential-asset-hub.vercel.app)** *(placeholder)*

🎥 **[Demo Video](https://youtu.be/placeholder)** *(placeholder)*

---

## Problem Statement

Zama's FHEVM enables fully homomorphic encryption on-chain. ERC7984 confidential tokens bring encrypted balances and transfers to Ethereum. However, there has been no canonical, polished frontend for:

- Browsing the official on-chain Wrappers Registry
- Wrapping ERC20 tokens into their confidential counterparts
- Unwrapping confidential tokens back to ERC20
- Decrypting encrypted balances via EIP-712 user decryption
- Claiming testnet faucet tokens for development

Confidential Asset Hub fills this gap.

---

## Solution

A full-stack Next.js 15 application that integrates:

- **Zama FHEVM SDK** (`@zama-fhe/sdk`, `@zama-fhe/react-sdk`) for EIP-712 decryption and encrypted input generation
- **On-chain Registry** (`ConfidentialTokenWrappersRegistry`) read via viem
- **Hybrid Registry** — official on-chain pairs merged with local custom pairs
- **wagmi + RainbowKit** for type-safe Ethereum interaction
- **Yellow / Black / White / Grey** design system — distinctive, professional, zero AI-purple

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router                      │
│                                                                     │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │Dashboard │  │ Registry  │  │Portfolio│  │   Wrap / Unwrap  │  │
│  │          │  │ Explorer  │  │         │  │   Decrypt Faucet │  │
│  └──────────┘  └───────────┘  └─────────┘  └──────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      Service Layer                           │  │
│  │  RegistryService │ WrapService │ UnwrapService │ DecryptSvc │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 Blockchain Integration Layer                  │  │
│  │  wagmi hooks │ viem PublicClient │ Zama SDK │ RainbowKit     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              State (Zustand + React Query)                    │  │
│  │  registryStore │ decryptStore │ txStore │ faucetStore │ UI   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                     │
    Ethereum Mainnet     Sepolia Testnet       Zama Relayer
    (Registry, Tokens)   (Registry, Faucet)   (Decryption)
```

---

## Folder Structure

```
confidential-asset-hub/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard
│   │   ├── registry/           # Registry Explorer
│   │   ├── portfolio/          # Portfolio
│   │   ├── wrap/               # Wrap Center
│   │   ├── unwrap/             # Unwrap Center
│   │   ├── decrypt/            # Universal Decrypt
│   │   ├── faucet/             # Faucet Center
│   │   ├── analytics/          # Analytics
│   │   ├── add-pair/           # Add Custom Pair Wizard
│   │   ├── docs/               # In-app Documentation
│   │   ├── layout.tsx          # Root layout + providers
│   │   └── globals.css         # Design system CSS variables
│   │
│   ├── components/
│   │   ├── ui/                 # Primitives: Button, Card, Badge, Input…
│   │   └── layout/
│   │       ├── AppShell.tsx    # Sidebar + TopNav
│   │       └── Providers.tsx   # Wagmi, RainbowKit, QueryClient
│   │
│   ├── hooks/
│   │   ├── use-registry.ts     # Registry fetch + React Query
│   │   ├── use-wrap.ts         # Full ERC20→ERC7984 wrap flow
│   │   ├── use-unwrap.ts       # Two-step ERC7984→ERC20 unwrap
│   │   ├── use-decrypt.ts      # EIP-712 user decryption
│   │   ├── use-portfolio.ts    # Batch balance reads
│   │   ├── use-network.ts      # Chain detection + switching
│   │   └── use-token-metadata.ts
│   │
│   ├── services/
│   │   └── registry.ts         # On-chain registry fetching + merging
│   │
│   ├── contracts/
│   │   ├── registry-abi.ts     # ConfidentialTokenWrappersRegistry ABI
│   │   ├── erc20-abi.ts        # Standard ERC20 ABI
│   │   └── erc7984-abi.ts      # ERC7984 + ERC7984ERC20Wrapper ABI
│   │
│   ├── config/
│   │   ├── chains.ts           # Chain IDs, contract addresses, relayer URLs
│   │   ├── custom-pairs.ts     # ← ADD YOUR CUSTOM PAIRS HERE
│   │   └── faucet-tokens.ts    # Testnet faucet token config
│   │
│   ├── stores/
│   │   └── index.ts            # Zustand stores (registry, decrypt, tx, faucet, ui)
│   │
│   ├── types/
│   │   └── index.ts            # All TypeScript types
│   │
│   └── utils/
│       └── index.ts            # Shared utilities (formatting, parsing, etc.)
│
├── tests/
│   ├── unit/
│   │   └── registry.test.ts    # Unit tests for services + utils
│   └── setup.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD: lint, typecheck, test, build, deploy
│
├── .env.example                # Environment variable template
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Installation

### Prerequisites

- Node.js 20+
- npm 10+
- A [WalletConnect Cloud](https://cloud.walletconnect.com) Project ID

### Steps

```bash
# 1. Clone
git clone https://github.com/your-org/confidential-asset-hub.git
cd confidential-asset-hub

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 4. Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Optional | Custom Sepolia RPC (defaults to public) |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | Optional | Custom Mainnet RPC |
| `NEXT_PUBLIC_REGISTRY_ADDRESS_SEPOLIA` | Optional | Override Sepolia registry address |
| `NEXT_PUBLIC_REGISTRY_ADDRESS_MAINNET` | Optional | Override Mainnet registry address |
| `NEXT_PUBLIC_RELAYER_URL_SEPOLIA` | Optional | Override Sepolia relayer URL |
| `NEXT_PUBLIC_RELAYER_URL_MAINNET` | Optional | Override Mainnet relayer URL |

---

## Local Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Serve production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Vitest watch mode
npm run test:run     # Vitest one-shot
```

---

## Supported Networks

| Network | Chain ID | Registry | Faucet |
|---|---|---|---|
| Ethereum Mainnet | 1 | ✅ `0xeb5015fF…` | ❌ |
| Sepolia Testnet | 11155111 | ✅ `0xeb5015fF…` | ✅ |

The app defaults to Sepolia. Switch networks via your wallet — the UI updates automatically.

---

## Deployed Contract Addresses

### FHEVM — Ethereum Mainnet

| Contract | Address |
|---|---|
| ACL Contract | `0xcA2E8f1F656CD25C01F05d0b243Ab1ecd4a8ffb6` |
| FHEVM Executor | `0xD82385dADa1ae3E969447f20A3164F6213100e75` |
| KMS Verifier | `0x77627828a55156b04Ac0DC0eb30467f1a552BB03` |

### FHEVM — Sepolia Testnet

| Contract | Address |
|---|---|
| ACL Contract | `0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D` |
| FHEVM Executor | `0x92C920834Ec8941d2C77D188936E1f7A6f49c127` |
| KMS Verifier | `0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A` |
| Input Verifier | `0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0` |
| Decryption Address | `0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478` |

### Wrappers Registry (Both Networks)

| Contract | Address |
|---|---|
| ConfidentialTokenWrappersRegistry | `0xeb5015fF021DB115aCe010f23F55C2591059bBA0` |

---

## Registry Architecture

The registry uses a **hybrid** model:

```
┌─────────────────────────────┐
│  On-chain Registry Contract  │  ← primary source
│  getTokenConfidentialToken   │
│  Pairs() → pairs[]           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   src/config/custom-pairs.ts │  ← secondary source
│   CUSTOM_PAIRS[]             │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   mergeRegistries()          │  ← dedup by address+chainId
│   Unified pair list          │
└─────────────────────────────┘
```

Both sources are merged, deduplicated by `chainId:tokenAddress`, and cached for 5 minutes via React Query. Official pairs always take precedence over custom pairs with the same key.

---

## Wrap Flow

```
User selects pair + amount
         │
         ▼
Check ERC20 allowance
         │
    allowance < amount?
    ┌────┴────┐
   YES       NO
    │         │
    ▼         │
approve(wrapper, maxUint256)
    │         │
    └────┬────┘
         ▼
wrap(to, amount)  →  ERC7984 minted (encrypted)
         │
         ▼
Balance refreshed · success state
```

---

## Unwrap Flow

```
User selects wrapper + amount
         │
         ▼
SDK generates encrypted amount + inputProof
         │
         ▼
unwrap(from, to, encryptedAmount, inputProof)
→  emits UnwrapRequested(requestId)
         │
         ▼
Zama decryption network decrypts requestId
         │
         ▼
finalizeUnwrap(requestId, clearAmount, decryptionProof)
→  ERC20 released to recipient
```

---

## Decryption Flow (EIP-712)

```
User clicks "Decrypt Balance"
         │
         ▼
SDK generates EIP-712 typed-data struct
{ token, holder, expiry, publicKey }
         │
         ▼
Wallet signs the struct
         │
         ▼
Signed message + public key → Zama Relayer
         │
         ▼
Relayer re-encrypts balance under user's public key
         │
         ▼
SDK decrypts locally in browser
         │
         ▼
Plaintext balance displayed · cached in decryptStore
```

---

## Faucet Flow

```
User visits Faucet Center
         │
         ▼
Tokens loaded from config/faucet-tokens.ts
         │
         ▼
User clicks "Claim"
         │
         ▼
claim() called on mock ERC20 faucet contract
         │
         ▼
Transaction confirmed → 24h cooldown starts
         │
         ▼
Claim recorded in faucetStore (persisted to localStorage)
```

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| Invalid addresses | All user addresses validated with viem `isAddress()` before any contract call |
| Signature replay | EIP-712 decryption structs include an expiry timestamp |
| Unsafe ERC7984 addresses | `supportsInterface(0x4958f2a4)` verified before decrypt |
| User input validation | Zod schemas on all forms; server-side validation via smart contract |
| Infinite approval | Uses `maxUint256` approve with clear warning in UI; users can revoke via their wallet |
| RPC poisoning | All RPC calls use typed viem clients; no `eval` or dynamic code execution |
| Duplicate pairs | Registry merge deduplicates by address+chainId; duplicates silently dropped |
| Transaction ordering | Approval tx awaited (5s buffer) before wrap tx is submitted |

---

## Adding New Custom Pairs

### Via the UI Wizard

1. Open **Add Custom Pair** in the sidebar.
2. Fill in the ERC20 address, ERC7984 wrapper address, name, symbol, and decimals.
3. Review the confirmation screen.
4. Copy the generated code snippet.
5. Paste into `src/config/custom-pairs.ts` inside the `CUSTOM_PAIRS` array.
6. Rebuild: `npm run build`.

### Directly in Code

Edit `src/config/custom-pairs.ts`:

```typescript
export const CUSTOM_PAIRS: CustomPairEntry[] = [
  {
    token: {
      address:  '0xYourERC20Address',
      name:     'My Token',
      symbol:   'MYT',
      decimals: 18,
    },
    confidentialToken: {
      address:  '0xYourERC7984WrapperAddress',
      name:     'Confidential My Token',
      symbol:   'cMYT',
      decimals: 6,
    },
    rate:    1_000_000_000_000n, // 10^12 for 18→6 decimal conversion
    chainId: 11155111,           // Sepolia
    notes:   'My test pair',
    addedAt: Date.now(),
  },
];
```

The pair will appear automatically in:
- Registry Explorer
- Portfolio
- Wrap Center
- Unwrap Center

---

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set the following environment variables in your Vercel project settings:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- (Optional) `NEXT_PUBLIC_SEPOLIA_RPC_URL` (use Alchemy or Infura for production)
- (Optional) `NEXT_PUBLIC_MAINNET_RPC_URL`

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

### CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` handles:

1. **Lint + TypeCheck** — on every push/PR
2. **Unit Tests** — Vitest
3. **Production Build** — Next.js build verification
4. **Deploy Preview** — on every pull request (Vercel)
5. **Deploy Production** — on push to `main` (Vercel)

Required GitHub Secrets:

| Secret | Description |
|---|---|
| `WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud Project ID |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Your Vercel org ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS + CSS Variables |
| Components | Custom primitives (shadcn-pattern, Radix UI) |
| Web3 | wagmi v2 + viem v2 |
| Wallet UI | RainbowKit v2 |
| FHEVM | `@zama-fhe/sdk` + `@zama-fhe/react-sdk` |
| State | Zustand v5 (with persist middleware) |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts | Recharts |
| Testing | Vitest + @testing-library/react |

---

## Design System

**Palette:** Yellow (`#fbbf24` / amber-400) · Black (`#09090b` / zinc-950) · White (`#f4f4f5` / zinc-100) · Grey (zinc scale)

No purple. No blue. No AI-default aesthetics.

The design is intentionally inspired by developer-tool products (Vercel, Linear, Stripe) — monochromatic with amber accent, generous whitespace, subtle borders, zero decoration.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

Built for the **Zama Builder Track**. All cryptographic operations powered by [Zama's FHEVM](https://github.com/zama-ai/fhevm). Registry contract by Zama Protocol Apps team.

---

*Confidential Asset Hub — The canonical gateway to confidential assets on Zama.*
