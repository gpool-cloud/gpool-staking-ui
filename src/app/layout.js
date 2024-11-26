import { Montserrat } from 'next/font/google';
import './globals.css';
import '../styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

export const metadata = {
  title: 'GPool Stake',
  description: 'A website to stake tokens in GPool.',
};

const montserrat = Montserrat({ 
  subsets: ['latin'],
  display: 'swap',
});


export default function RootLayout({ children }) {
  return (
    <html lang="en" className={montserrat.className}>
      <body>{children}</body>
    </html>
  );
}
