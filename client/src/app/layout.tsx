import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My SaaS Application',
  description: 'A modern SaaS application built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}