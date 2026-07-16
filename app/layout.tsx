import type { Metadata } from 'next';
import { Figtree, Outfit, DM_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Grouv. Your chapter. Your circle.',
  description: 'A small circle of people in the same chapter as you.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${outfit.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          try {
            var stored = localStorage.getItem('grove-theme');
            var t = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', t);
            // If no stored value, keep following system (don't set grove-theme-manual)
            if (!stored) localStorage.setItem('grove-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
