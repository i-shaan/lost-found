import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LostFound - Reunite with Your Lost Items',
  description: 'A modern platform to help you find lost items and return found items to their rightful owners.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main>
                {children}
              </main>
            </div>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}