"use client";

import "../styles.css";
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { TOKEN_LIST } from "./tokens";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";

// const POOL_ADDRESS = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export const poolNameToAddress = {
    "GPool": new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    "Eclipse (beta)": new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    // "gpool-usdc": new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
}

const PoolInfo = memo(({ connection }) => {
    return (
        <div className="pool-info">
            <ul>
                <li>1. Connect your wallet</li>
                <li>2. Click on LP token you want to stake in Wallet Balance section</li>
                <li>3. Click "Stake Boost" button and sign the transaction</li>
            </ul>

            <p>To view your rewards and claim it use <a href="https://dashboard.gpool.cloud/" target="_blank" rel="noopener noreferrer" className="nav-link">Dashboard & Rewards</a></p>

        </div>
    );
});

export default memo(PoolInfo);
