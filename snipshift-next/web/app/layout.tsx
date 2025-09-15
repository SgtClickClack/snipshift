import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from 'react-query';

import { theme } from '../src/config/theme';
import { apolloClient } from '../src/config/apollo';
import { queryClient } from '../src/config/reactQuery';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';

import '../src/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SnipShift - Connect. Create. Collaborate.',
  description: 'The premier platform connecting barbering professionals, hubs, brands, and trainers in the creative industry.',
  keywords: ['barbering', 'salon', 'hair styling', 'professional network', 'job marketplace'],
  authors: [{ name: 'SnipShift Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#FF6B6B',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'SnipShift - Connect. Create. Collaborate.',
    description: 'The premier platform connecting barbering professionals, hubs, brands, and trainers.',
    url: 'https://www.snipshift.com.au',
    siteName: 'SnipShift',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SnipShift Platform',
      },
    ],
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnipShift - Connect. Create. Collaborate.',
    description: 'The premier platform connecting barbering professionals, hubs, brands, and trainers.',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <AuthProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
