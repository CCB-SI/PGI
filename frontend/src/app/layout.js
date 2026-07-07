import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import BottomNav from '@/components/BottomNav';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import './globals.css';
import './stitch-tailwind.css';

export const metadata = {
  title: 'PGRI Santa Isabel – Gestão Regional Integrada',
  description: 'PGRI - Plataforma de Gestão Regional Integrada da Regional SAI (Santa Isabel, Arujá e Igaratá). Informações técnicas, calendário de ensaios e suporte aos músicos, instrutores e examinadoras.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <Header />
            {/* Added bottom padding (pb-20) to prevent content being hidden behind the new BottomNav */}
            <main className="container pb-20 lg:pb-0" style={{ minHeight: '80vh', paddingTop: '20px' }}>
              {children}
            </main>
            <Footer />
            <BottomNav />
            <ScrollToTop />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
