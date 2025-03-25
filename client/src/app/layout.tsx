import { AuthProvider } from '@/lib/auth-context';
import './globals.css';
import type { Metadata } from 'next';
import ParticlesBackground from '@/components/BackGround/ParticlesBackground';
import CustomCursor from '@/components/UI/CustomCursor';

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
        <CustomCursor />
        <AuthProvider>
          <ParticlesBackground>
            {children}
          </ParticlesBackground>
        </AuthProvider>
      </body>
    </html>
  );
}