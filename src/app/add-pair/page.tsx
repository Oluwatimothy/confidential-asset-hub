// ============================================================
// app/add-pair/page.tsx — Add Custom Pair Wizard
// ============================================================
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle, CheckCircle2, AlertCircle, ArrowRight,
  Info, ExternalLink, ChevronRight,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Label, Badge, Separator,
} from '@/components/ui';
import { useNetwork } from '@/hooks/use-network';
import { useRegistryStore } from '@/stores';
import { isValidAddress } from '@/utils';
import { CUSTOM_PAIRS } from '@/config/custom-pairs';
import type { CustomPairEntry } from '@/config/custom-pairs';
import type { SupportedChainId } from '@/types';

// ── Zod schema ─────────────────────────────────────────────────
const schema = z.object({
  erc20Address: z
    .string()
    .min(1, 'Required')
    .refine(isValidAddress, 'Not a valid Ethereum address'),
  erc7984Address: z
    .string()
    .min(1, 'Required')
    .refine(isValidAddress, 'Not a valid Ethereum address'),
  name:     z.string().min(1, 'Required').max(64),
  symbol:   z.string().min(1, 'Required').max(16),
  decimals: z.coerce.number().int().min(0).max(18),
  notes:    z.string().max(256).optional(),
});

type FormValues = z.infer<typeof schema>;

type WizardStep = 'form' | 'confirm' | 'success';

// ── Step dots ─────────────────────────────────────────────────
function WizardSteps({ step }: { step: WizardStep }) {
  const steps = ['form', 'confirm', 'success'] as WizardStep[];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              s === step
                ? 'bg-amber-400 text-zinc-950'
                : steps.indexOf(step) > i
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {steps.indexOf(step) > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 transition-colors ${steps.indexOf(step) > i ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AddPairPage() {
  const { chainId } = useNetwork();
  const { pairs }   = useRegistryStore();

  const [wizardStep, setWizardStep] = useState<WizardStep>('form');
  const [pendingEntry, setPendingEntry] = useState<CustomPairEntry | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { decimals: 6 },
  });

  // Check for duplicate before showing confirm
  function onFormSubmit(data: FormValues) {
    setDuplicateWarning(null);

    const existsInRegistry = pairs.some(
      (p) =>
        p.token.address.toLowerCase() === data.erc20Address.toLowerCase() ||
        p.confidentialToken.address.toLowerCase() === data.erc7984Address.toLowerCase(),
    );
    const existsInCustom = CUSTOM_PAIRS.some(
      (p) =>
        p.token.address.toLowerCase() === data.erc20Address.toLowerCase() ||
        p.confidentialToken.address.toLowerCase() === data.erc7984Address.toLowerCase(),
    );

    if (existsInRegistry) {
      setDuplicateWarning('This ERC20 or ERC7984 address already exists in the official registry.');
    }
    if (existsInCustom) {
      setDuplicateWarning('This pair already exists in your local custom pairs config.');
    }

    const entry: CustomPairEntry = {
      token: {
        address:  data.erc20Address as `0x${string}`,
        name:     data.name,
        symbol:   data.symbol,
        decimals: data.decimals,
      },
      confidentialToken: {
        address:  data.erc7984Address as `0x${string}`,
        name:     `Confidential ${data.name}`,
        symbol:   `c${data.symbol}`,
        decimals: data.decimals,
      },
      rate:     1n,
      chainId:  chainId as SupportedChainId,
      notes:    data.notes,
      addedAt:  Date.now(),
    };

    setPendingEntry(entry);
    setWizardStep('confirm');
  }

  function onConfirm() {
    // In production, write to persistent storage or localStorage.
    // For file-based custom pairs, the user copies the snippet into custom-pairs.ts
    setWizardStep('success');
  }

  function onReset() {
    resetForm();
    setPendingEntry(null);
    setDuplicateWarning(null);
    setWizardStep('form');
  }

  const codeSnippet = pendingEntry
    ? `  {
    token: {
      address: '${pendingEntry.token.address}',
      name: '${pendingEntry.token.name}',
      symbol: '${pendingEntry.token.symbol}',
      decimals: ${pendingEntry.token.decimals},
    },
    confidentialToken: {
      address: '${pendingEntry.confidentialToken.address}',
      name: '${pendingEntry.confidentialToken.name}',
      symbol: '${pendingEntry.confidentialToken.symbol}',
      decimals: ${pendingEntry.confidentialToken.decimals},
    },
    rate: 1n,
    chainId: ${pendingEntry.chainId},
    notes: '${pendingEntry.notes ?? ''}',
    addedAt: ${pendingEntry.addedAt},
  },`
    : '';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Add Custom Pair</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Register an ERC20 ↔ ERC7984 pair that isn't in the official on-chain registry.
        </p>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-zinc-400 leading-relaxed">
            <p className="font-medium text-amber-400">How custom pairs work</p>
            <p>
              Custom pairs live in <code className="font-data text-amber-400/70">src/config/custom-pairs.ts</code>{' '}
              and are merged with the official on-chain registry at build time.
              After completing this wizard, copy the generated snippet into that file
              and rebuild the app.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <WizardSteps step={wizardStep} />

          <AnimatePresence mode="wait">
            {/* ── Step 1: Form ── */}
            {wizardStep === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="erc20Address">ERC20 Token Address *</Label>
                    <Input
                      id="erc20Address"
                      placeholder="0x…"
                      className="font-data"
                      error={errors.erc20Address?.message}
                      {...register('erc20Address')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="erc7984Address">ERC7984 Wrapper Address *</Label>
                    <Input
                      id="erc7984Address"
                      placeholder="0x…"
                      className="font-data"
                      error={errors.erc7984Address?.message}
                      {...register('erc7984Address')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Token Name *</Label>
                      <Input
                        id="name"
                        placeholder="My Token"
                        error={errors.name?.message}
                        {...register('name')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="symbol">Symbol *</Label>
                      <Input
                        id="symbol"
                        placeholder="MYT"
                        error={errors.symbol?.message}
                        {...register('symbol')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="decimals">Decimals *</Label>
                    <Input
                      id="decimals"
                      type="number"
                      min={0}
                      max={18}
                      error={errors.decimals?.message}
                      {...register('decimals')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Any additional context…"
                      {...register('notes')}
                    />
                  </div>

                  {duplicateWarning && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400">{duplicateWarning}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── Step 2: Confirm ── */}
            {wizardStep === 'confirm' && pendingEntry && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  {[
                    { label: 'ERC20 Address',   value: pendingEntry.token.address       },
                    { label: 'ERC7984 Address',  value: pendingEntry.confidentialToken.address },
                    { label: 'Name',             value: pendingEntry.token.name          },
                    { label: 'Symbol',           value: pendingEntry.token.symbol        },
                    { label: 'Decimals',         value: pendingEntry.token.decimals.toString() },
                    { label: 'Chain',            value: `Chain ID ${pendingEntry.chainId}` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-3 py-1.5 border-b border-zinc-800">
                      <span className="text-xs text-zinc-500 shrink-0 w-32">{row.label}</span>
                      <span className="text-xs font-data text-zinc-200 text-right break-all">{row.value}</span>
                    </div>
                  ))}
                </div>

                {duplicateWarning && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">{duplicateWarning} Proceeding may create a duplicate entry.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setWizardStep('form')}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={onConfirm}>
                    Confirm &amp; Generate
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Success ── */}
            {wizardStep === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium text-sm">Entry generated</span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Copy the snippet below into{' '}
                  <code className="font-data text-amber-400/80">src/config/custom-pairs.ts</code>{' '}
                  inside the <code className="font-data text-amber-400/80">CUSTOM_PAIRS</code> array,
                  then rebuild the app. The pair will appear in all views automatically.
                </p>

                <div className="relative rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <pre className="text-xs font-data text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {codeSnippet}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(codeSnippet)}
                    className="absolute top-3 right-3 text-xs text-zinc-500 hover:text-amber-400 transition-colors bg-zinc-900 px-2 py-1 rounded border border-zinc-800"
                  >
                    Copy
                  </button>
                </div>

                <Button variant="outline" className="w-full" onClick={onReset}>
                  Add another pair
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Existing custom pairs */}
      {CUSTOM_PAIRS.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Existing Custom Pairs</CardTitle>
            <CardDescription>Configured in custom-pairs.ts</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {CUSTOM_PAIRS.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">custom</Badge>
                  <span className="text-sm text-zinc-300">{p.token.symbol}</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                  <span className="text-sm text-amber-400">{p.confidentialToken.symbol}</span>
                </div>
                <span className="text-xs text-zinc-600">Chain {p.chainId}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
