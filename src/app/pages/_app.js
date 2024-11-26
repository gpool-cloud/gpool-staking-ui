import "../src/app/styles.css";
import { WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css'; // Import wallet adapter styles

function MyApp({ Component, pageProps }) {
  return (
    <WalletProvider /* ...wallet configurations */>
      <WalletModalProvider>
        <Component {...pageProps} />
      </WalletModalProvider>
    </WalletProvider>
  );
}

export default MyApp;