// ============================================================
// components/ui/index.tsx — shadcn-style UI primitives
// Yellow / Black / White / Grey palette
// ============================================================
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';
import * as RadixDialog from '@radix-ui/react-dialog';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import * as RadixSelect from '@radix-ui/react-select';
import * as RadixProgress from '@radix-ui/react-progress';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

// ── Button ─────────────────────────────────────────────────────
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
  {
    variants: {
      variant: {
        default:     'bg-amber-400 text-zinc-950 hover:bg-amber-300 active:bg-amber-500 shadow-sm',
        secondary:   'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
        outline:     'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
        ghost:       'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        link:        'text-amber-400 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-xs rounded-md',
        md:   'h-10 px-4',
        lg:   'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

// ── Badge ──────────────────────────────────────────────────────
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:   'border-amber-400/30 bg-amber-400/10 text-amber-300',
        secondary: 'border-zinc-600 bg-zinc-800 text-zinc-300',
        success:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        warning:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
        danger:    'border-red-500/30 bg-red-500/10 text-red-400',
        outline:   'border-zinc-600 text-zinc-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ── Card ───────────────────────────────────────────────────────
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold leading-none tracking-tight text-zinc-100', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-zinc-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}

// ── Input ──────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-40 transition-colors',
          error && 'border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  ),
);
Input.displayName = 'Input';

// ── Label ──────────────────────────────────────────────────────
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-sm font-medium text-zinc-300 leading-none', className)}
      {...props}
    />
  );
}

// ── Progress ───────────────────────────────────────────────────
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <RadixProgress.Root
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800', className)}
      value={value}
    >
      <RadixProgress.Indicator
        className="h-full bg-amber-400 transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </RadixProgress.Root>
  );
}

// ── Separator ─────────────────────────────────────────────────
export function Separator({ className, orientation = 'horizontal', ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      className={cn(
        'shrink-0 bg-zinc-800',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

// ── Tooltip ───────────────────────────────────────────────────
export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className="z-50 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 shadow-lg animate-fade-in"
            sideOffset={5}
          >
            {content}
            <RadixTooltip.Arrow className="fill-zinc-800" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

// ── Dialog / Modal ─────────────────────────────────────────────
export function Dialog({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </RadixDialog.Root>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl data-[state=open]:animate-fade-in',
          className,
        )}
      >
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description;
export const DialogClose = RadixDialog.Close;

// ── Select ────────────────────────────────────────────────────
export function Select({
  value,
  onValueChange,
  children,
  placeholder,
}: {
  value?: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger className="flex h-10 w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400">
        <RadixSelect.Value placeholder={placeholder} />
        <ChevronDownIcon className="h-4 w-4 text-zinc-400" />
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg animate-fade-in">
          <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1">
            <ChevronUpIcon className="h-4 w-4 text-zinc-400" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className="p-1">{children}</RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1">
            <ChevronDownIcon className="h-4 w-4 text-zinc-400" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <RadixSelect.Item
      value={value}
      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-200 outline-none hover:bg-zinc-800 focus:bg-zinc-800 data-[state=checked]:text-amber-400"
    >
      <RadixSelect.ItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-zinc-800', className)} />
  );
}

// ── EmptyState ─────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <Icon className="h-6 w-6 text-zinc-500" />
        </div>
      )}
      <h3 className="text-base font-medium text-zinc-300">{title}</h3>
      {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── StatusDot ─────────────────────────────────────────────────
export function StatusDot({ status }: { status: 'active' | 'warning' | 'error' | 'inactive' }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', {
        'bg-emerald-400 shadow-[0_0_6px_#34d399]': status === 'active',
        'bg-amber-400  shadow-[0_0_6px_#fbbf24]':  status === 'warning',
        'bg-red-500    shadow-[0_0_6px_#ef4444]':  status === 'error',
        'bg-zinc-600':                              status === 'inactive',
      })}
    />
  );
}
