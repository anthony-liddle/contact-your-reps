import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SITE_URL } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Contact Your Representatives | Civic Engagement Tool',
  description:
    'Find your representative by zip code and write to your senator or congressman. Contact my congressman, write to Congress, and make your voice heard on the issues that matter. Free, open-source, and privacy-focused.',
  keywords: [
    'contact representatives',
    'contact congress',
    'contact my congressman',
    'find my representative by zip code',
    'write to my senator',
    'write to congress',
    'find my congressman',
    'who is my representative',
    'civic engagement',
    'U.S. senators',
    'house representative',
    'constituent message',
    'democracy',
    'civic action',
  ],
  authors: [{ name: 'Contact Your Rep Contributors' }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Contact Your Representatives',
    description:
      'Find your representative by zip code and write to your senator or congressman. Make your voice heard on the issues that matter.',
    type: 'website',
    locale: 'en_US',
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact Your Representatives - Find and write to your senators and congressman',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Your Representatives',
    description:
      'Find your representative by zip code and write to your senator or congressman. Make your voice heard.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Contact Your Representatives',
  description:
    'Find your representative by zip code and write to your senator or congressman about the issues that matter to you.',
  url: SITE_URL,
  applicationCategory: 'GovernmentApplication',
  operatingSystem: 'All',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
