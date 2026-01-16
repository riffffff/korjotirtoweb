import "./globals.css";
import { ThemeModeScript } from 'flowbite-react';
import { Inter, Poppins } from 'next/font/google';

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

// Inline script to set sidebar state before React hydration to prevent flash
const sidebarScript = `
(function() {
  try {
    var collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === null) collapsed = 'true';
    document.documentElement.setAttribute('data-sidebar-collapsed', collapsed);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <ThemeModeScript />
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body className="font-sans bg-neutral-50 min-h-screen">
        {children}
        <footer className="bg-neutral-800 text-white text-center py-3 text-sm">
          <p className="text-neutral-400">© 2025 Korjo Tirto - Sukorejo</p>
        </footer>
      </body>
    </html>
  );
}
