import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import './globals.css';

// One family: the width axis carries the hierarchy (condensed scoreboard numerals, normal-width names)
const archivo = Archivo({
  variable: '--font-archivo',
  subsets:  ['latin', 'latin-ext'],
  axes:     ['wdth'],
});

export const metadata: Metadata = {
  title: 'Fixture',
  description: 'Upcoming fixtures and results for your favourite sports',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fixture',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a2230',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-screen bg-night font-sans antialiased text-chalk">
        <ServiceWorkerRegistration />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
