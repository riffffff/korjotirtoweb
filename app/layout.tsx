import "./globals.css";
import { ThemeModeScript } from 'flowbite-react';
import { Inter, Poppins } from 'next/font/google';

// Font untuk body text
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Font untuk heading/judul
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
        {/* Main Content */}
        <main className="min-h-screen p-4">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-primary-800 text-white text-center p-4">
          <p className="text-primary-200">© 2025 Korjo Tirto - Sukorejo</p>
        </footer>
      </body>
    </html>
  );
}
