import "./globals.css";
import { ThemeModeScript } from 'flowbite-react';
import { Inter, Poppins } from 'next/font/google';
import { SidebarProvider } from '@/components/layout/AppLayout';
import type { Metadata, Viewport } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Korjo Tirto - Sistem Pembayaran Air',
  description: 'Sistem Pembayaran Air HIPPAM Sukorejo',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Korjo Tirto',
  },
};

export const viewport: Viewport = {
  themeColor: '#0288d1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <ThemeModeScript />

      </head>
      <body className="font-sans">
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
