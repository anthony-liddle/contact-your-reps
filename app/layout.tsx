import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Contact Your Representatives | Civic Engagement Tool',
  description:
    'Contact your U.S. Senators and House Representative about the issues that matter to you. Free, open-source, and privacy-focused.',
  keywords: [
    'contact representatives',
    'contact congress',
    'civic engagement',
    'U.S. senators',
    'house representative',
    'constituent message',
    'democracy',
    'civic action',
  ],
  authors: [{ name: 'Contact Your Rep Contributors' }],
  openGraph: {
    title: 'Contact Your Representatives',
    description:
      'Make your voice heard. Contact your federal representatives about the issues that matter to you.',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
