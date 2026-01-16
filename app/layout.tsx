import "./globals.css";
import { ThemeModeScript } from 'flowbite-react';
import { Inter, Poppins } from 'next/font/google';
import { SidebarProvider } from '@/components/layout/AppLayout';

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
