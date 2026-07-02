// ============================================================
// app/docs/page.tsx — In-app Documentation
// ============================================================
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, Separator } from '@/components/ui';
import { cn } from '@/utils';

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

function AccordionItem({ section }: { section: DocSection }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-zinc-200 hover:text-zinc-100 transition-colors"
      >
        {section.title}
        {open
          ? <ChevronDown className="h-4 w-4 text-amber-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
        }
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-4 text-sm text-zinc-400 leading-relaxed space-y-3"
        >
          {section.content}
        </motion.div>
      )}
    </div>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="font-data text-amber-400/80 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs">
    {children}
  </code>
);

const SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'What is Confidential Asset Hub?',
    content: (
      <div className="space-y-2">
        <p>
          Confidential Asset Hub is a production-grade frontend for the Zama Wrappers Registry ecosystem.
          It enables users to wrap public ERC20 tokens into encrypted ERC7984 confidential tokens,
          unwrap them back, decrypt balances using EIP-712, and explore the official on-chain registry.
        </p>
        <p>
          Built on Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine), ERC7984 tokens keep
          balances and transfers encrypted on-chain — only the token holder can decrypt their own balance.
        </p>
      </div>
    ),
  },
  {
    id: 'erc7984',
    title: 'What is ERC7984?',
    content: (
      <div className="space-y-2">
        <p>
          ERC-7984 is a token standard for confidential tokens on FHE-enabled blockchains.
          All balances and transfer amounts are stored as FHE ciphertexts. The interface ID is{' '}
          <Code>0x4958f2a4</Code>.
        </p>
        <p>
          <Code>ERC7984ERC20Wrapper</Code> is the reference implementation: it accepts a plain ERC20,
          wraps it at a defined rate, and mints encrypted ERC7984 tokens. The <Code>wrap()</Code> function
          accepts a public amount; the <Code>unwrap()</Code> function takes an encrypted amount generated
          by the Zama SDK so that the amount is never revealed on-chain.
        </p>
      </div>
    ),
  },
  {
    id: 'wrap-flow',
    title: 'How does wrapping work?',
    content: (
      <div className="space-y-2">
        <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
          <li>User selects an ERC20 ↔ ERC7984 pair from the registry.</li>
          <li>App checks the current ERC20 allowance for the wrapper contract.</li>
          <li>If allowance is insufficient, an <Code>approve(wrapper, maxUint256)</Code> transaction is submitted.</li>
          <li>Once approved, <Code>wrap(to, amount)</Code> is called on the ERC7984 wrapper.</li>
          <li>The wrapper transfers the ERC20 in, rounds to the nearest rate, and mints encrypted tokens.</li>
          <li>Any excess ERC20 (from rounding) is returned to the caller.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'unwrap-flow',
    title: 'How does unwrapping work?',
    content: (
      <div className="space-y-2">
        <p>Unwrapping is a two-step process:</p>
        <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
          <li>
            <strong className="text-zinc-300">Step 1 — Request:</strong>{' '}
            The Zama SDK encrypts your desired unwrap amount using the FHEVM input proof system.
            The encrypted amount and its proof are passed to <Code>unwrap(from, to, encryptedAmount, inputProof)</Code>.
            This burns the encrypted tokens and emits an <Code>UnwrapRequested</Code> event.
          </li>
          <li>
            <strong className="text-zinc-300">Step 2 — Finalize:</strong>{' '}
            Zama's decryption network detects the event, decrypts the amount, and calls
            (or the user calls) <Code>finalizeUnwrap(requestId, clearAmount, proof)</Code>.
            The wrapper releases the corresponding ERC20 to the recipient.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: 'decrypt-flow',
    title: 'How does balance decryption work?',
    content: (
      <div className="space-y-2">
        <p>
          Balance decryption uses EIP-712 typed-data signatures to authorize a re-encryption under
          your wallet's public key. The flow:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
          <li>The app uses <Code>@zama-fhe/sdk</Code> to generate an EIP-712 typed-data struct containing the token address, your address, and an expiry.</li>
          <li>Your wallet signs the struct — this authorizes re-encryption only for you.</li>
          <li>The signed message is sent to the Zama Relayer, which re-encrypts the ciphertext under your public key.</li>
          <li>The re-encrypted ciphertext is returned to your browser and decrypted locally using the SDK.</li>
          <li>The plaintext balance is displayed. No one else — including the relayer — can see it.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'registry',
    title: 'How does the registry work?',
    content: (
      <div className="space-y-2">
        <p>
          The app reads the official <Code>ConfidentialTokenWrappersRegistry</Code> contract via
          <Code>getTokenConfidentialTokenPairs()</Code>. Each entry contains the ERC20 address,
          the ERC7984 wrapper address, and a validity flag (revoked pairs remain visible but marked).
        </p>
        <p>
          Local custom pairs from <Code>src/config/custom-pairs.ts</Code> are merged after deduplication.
          The combined list is cached via React Query and refreshed every 5 minutes.
        </p>
      </div>
    ),
  },
  {
    id: 'faucet',
    title: 'How does the faucet work?',
    content: (
      <p>
        The Faucet Center lists mock ERC20 tokens deployed on Sepolia testnet. Each token exposes a
        <Code>claim()</Code> function that mints a fixed amount to the caller. A 24-hour cooldown
        is enforced locally; the contract itself may enforce an independent cooldown.
        After claiming, wrap the tokens to obtain confidential ERC7984 equivalents.
      </p>
    ),
  },
  {
    id: 'custom-pairs',
    title: 'How do I add a custom pair?',
    content: (
      <div className="space-y-2">
        <p>Use the <strong className="text-zinc-200">Add Custom Pair</strong> wizard (sidebar), or edit directly:</p>
        <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
          <li>Open <Code>src/config/custom-pairs.ts</Code> in your editor.</li>
          <li>Add an entry to the <Code>CUSTOM_PAIRS</Code> array following the example structure.</li>
          <li>Commit the change and push to the repository's main branch (or merge a pull request into it).</li>
          <li>Vercel automatically builds and redeploys on push. Once that deploy finishes, the pair appears in Registry Explorer, Portfolio, Wrap Center, and Unwrap Center.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'sdk',
    title: 'Which SDKs are used?',
    content: (
      <div className="space-y-2">
        <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
          <li><Code>@zama-fhe/sdk</Code> — Core FHEVM SDK: instance creation, EIP-712 decryption, encrypted input generation.</li>
          <li><Code>@zama-fhe/react-sdk</Code> — React hooks wrapping the SDK: <Code>ZamaProvider</Code>, <Code>useWrappedToken</Code>.</li>
          <li><Code>wagmi</Code> / <Code>viem</Code> — Ethereum wallet and contract interaction.</li>
          <li><Code>@rainbow-me/rainbowkit</Code> — Wallet connection UI.</li>
          <li><Code>@tanstack/react-query</Code> — Server-state caching and synchronization.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Security considerations',
    content: (
      <div className="space-y-2">
        <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
          <li>All user inputs are validated with Zod before any contract call.</li>
          <li>ERC7984 interface support is verified via <Code>supportsInterface(0x4958f2a4)</Code> before decryption.</li>
          <li>Address validation uses viem's <Code>isAddress()</Code> — no manual regex.</li>
          <li>Decryption signatures include an expiry to prevent replay attacks.</li>
          <li>Wallet approvals use <Code>maxUint256</Code> to avoid repeated approvals; users can revoke at any time.</li>
          <li>No private keys or mnemonics are ever stored or transmitted.</li>
        </ul>
      </div>
    ),
  },
];

const LINKS = [
  { label: 'Zama Protocol Docs', href: 'https://docs.zama.org/protocol' },
  { label: 'FHEVM Documentation', href: 'https://docs.zama.org/fhevm' },
  { label: 'ERC-7984 Specification', href: 'https://eips.ethereum.org/EIPS/eip-7984' },
  { label: 'Zama GitHub', href: 'https://github.com/zama-ai' },
  { label: 'Official Wrappers Registry', href: 'https://github.com/zama-ai/protocol-apps' },
];

export default function DocsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Documentation</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Technical reference for Confidential Asset Hub
        </p>
      </div>

      <Card>
        <CardContent className="p-6 divide-y divide-zinc-800">
          {SECTIONS.map((section) => (
            <AccordionItem key={section.id} section={section} />
          ))}
        </CardContent>
      </Card>

      {/* External links */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-medium text-zinc-300 mb-3">Official Resources</p>
          <div className="space-y-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-zinc-900 transition-colors group"
              >
                <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {link.label}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
