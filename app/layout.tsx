import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WAVE — Ride the chart. Own the moment.',
  description:
    'Surf historic Stacks token price charts and mint your best runs as NFTs on Bitcoin via Stacks.',
  openGraph: {
    title: 'WAVE — Ride the chart. Own the moment.',
    description:
      'Surf historic Stacks token price charts and mint your best runs as NFTs on Bitcoin via Stacks.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
