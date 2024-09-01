import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Figtree } from 'next/font/google';
import Providers from '@/components/organisms/ProgressBarProvider';

const inter = Inter({ subsets: ['latin'] });
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});
export const metadata: Metadata = {
  title: 'Lawyers',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        <link
          rel='stylesheet'
          href='https://cdn-uicons.flaticon.com/uicons-regular-rounded/css/uicons-regular-rounded.css'
        />
        <link
          rel='stylesheet'
          href='https://cdn-uicons.flaticon.com/2.1.0/uicons-regular-rounded/css/uicons-regular-rounded.css'
        />
      </head>
      <body className={figtree.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
