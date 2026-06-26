// ============================================================
// app/layout.tsx — Root Next.js layout
// ============================================================
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers }  from '@/components/layout/Providers';
import { AppShell }   from '@/components/layout/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title:       'Confidential Asset Hub | Zama',
  description: 'The canonical gateway to confidential assets on Zama — wrap, unwrap, decrypt, and explore ERC7984 tokens.',
  keywords:    ['Zama', 'FHE', 'ERC7984', 'FHEVM', 'confidential tokens', 'privacy'],
  openGraph: {
    title:       'Confidential Asset Hub',
    description: 'Wrap · Unwrap · Decrypt confidential ERC7984 tokens on Zama',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-zinc-950 antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
