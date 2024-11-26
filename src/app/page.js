// App.js
"use client";

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import AppContent from './AppContent';
import '../styles.css';

function App() {
    const wallets = useMemo(
        () => [

        ],
        []
    );

    // Use the environment variable for the network
    const network = process.env.NEXT_PUBLIC_RPC_URL;

    return (
        <ConnectionProvider endpoint={network}>
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>
                    <AppContent />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default App;
