"use client";

import "../styles.css";
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { TOKEN_LIST } from "./tokens";
import { toast } from "react-toastify";
import { getPoolPda, getSharePda, GPOOL_AUTHORITY } from "../app/AppContent";
import dynamic from "next/dynamic";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");



const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const ReactUIWalletDisconnectButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
);


const formatPubkey = (pubkey) => {
  if (!pubkey || pubkey.length < 8) return pubkey;
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
};

const formatBalance = (balance) => {
  const num = Number(balance);
    return !isNaN(num) && num !== 0 ? num.toFixed(3) : "0.00";
};

const WalletBalances = memo(({ publicKey, connection, onBalanceClick, refreshCount }) => {
  const [balances, setBalances] = useState({});
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (publicKey && connection) {
      try {
        // Prepare accounts to fetch
        const accountsToFetch = [];
        const accountMapping = {};
        
        // Add SOL account
        accountsToFetch.push(publicKey);
        accountMapping[publicKey.toString()] = 'SOL';
        
        // Add token accounts
        TOKEN_LIST.forEach((token) => {
          if (token.name !== 'SOL') {
            const mintPublicKey = new PublicKey(token.mintAddress);
            const tokenAccount = getAssociatedTokenAddressSync(
              mintPublicKey,
              publicKey,
              false,
              TOKEN_PROGRAM_ID
            );
            accountsToFetch.push(tokenAccount);
            accountMapping[tokenAccount.toString()] = token.name;
          }
        });
  
        // Fetch all accounts in one RPC call
        const accountInfos = await connection.getMultipleAccountsInfo(accountsToFetch);
        
        // Process results
        const balancesObj = {};
        accountInfos.forEach((accountInfo, index) => {
          const account = accountsToFetch[index];
          const tokenName = accountMapping[account.toString()];
          
          if (tokenName === 'SOL') {
            const balanceSOL = (accountInfo?.lamports || 0) / 1e9;
            balancesObj[tokenName] = balanceSOL;
          } else {
            if (!accountInfo) {
              balancesObj[tokenName] = "0.00";
            } else {
              // Parse SPL token account data
              const data = accountInfo.data;
              const amount = data.readBigUInt64LE(64); // Amount is stored at offset 64
              const decimals = TOKEN_LIST.find(t => t.name === tokenName)?.decimals || 9;
              balancesObj[tokenName] = Number(amount) / Math.pow(10, decimals);
            }
          }
        });
  
        setBalances((prevBalances) => {
          const prev = JSON.stringify(prevBalances);
          const current = JSON.stringify(balancesObj);
          if (prev !== current) {
            if (isFirstLoad) setIsFirstLoad(false);
            return balancesObj;
          }
          return prevBalances;
        });
      } catch (error) {
        console.error("Error fetching balances:", error);
        toast.error("Error fetching balances");
        setBalances({});
      }
    } else {
      setBalances({});
    }
  }, [publicKey, connection, isFirstLoad, refreshCount]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]); 

  const handleClick = (tokenName) => {
    const selectedToken = TOKEN_LIST.find((token) => token.name === tokenName);
    if (selectedToken && selectedToken.mintAddress) {
      const balance = balances[tokenName];
      if (balance !== undefined && balance !== null) {
        onBalanceClick(tokenName, balance);
      }
    }
  };

  return (
    <div className="balances">
      <h3 className="large-heading">Wallet Balance:</h3>
      {isFirstLoad && Object.keys(balances).length === 0 ? (
        <p className="loading-text">Loading balances...</p>
      ) : (
        <ul className="balance-list">
          {TOKEN_LIST.map((token) => (
            balances[token.name] !== undefined && balances[token.name] !== null && balances[token.name] != 0 ? (
              <li
                key={token.name}
                onClick={() => handleClick(token.name)}
                className={`balance-item ${!token.mintAddress ? "disabled" : ""}`}
                title={token.mintAddress ? "Click to use this balance" : "Cannot stake SOL"}
              >
                <span className="token-name">{token.name}:</span>
                <span className="token-balance">
                  {formatBalance(balances[token.name])}
                </span>
              </li>
            ) : null
          ))}
        </ul>
      )}
    </div>
  );
});

WalletBalances.displayName = "WalletBalances";

const StakedBalances = memo(({ publicKey, connection, onBalanceClick, refreshCount }) => {
  const [stakedBalances, setStakedBalances] = useState([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const mintAddresses = useMemo(() => {
    return TOKEN_LIST.filter((token) => token.mintAddress).reduce(
      (acc, token) => {
        acc[token.name] = token.mintAddress;
        return acc;
      },
      {}
    );
  }, []);

  const formatFullPrecision = (number) => {
    const str = number.toString();
    const [integerPart, decimalPart] = str.split(".");
    return decimalPart && decimalPart.length > 11
      ? `${integerPart}.${decimalPart.slice(0, 11)}`
      : str;
  };

  const fetchStakedBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
  
    try {
      // Prepare all PDAs to fetch in a single request
      const accountsToFetch = TOKEN_LIST.reduce((acc, token) => {
        if (!token.mintAddress) return acc;
        
        const mint = new PublicKey(token.mintAddress);
        const pool = getPoolPda(GPOOL_AUTHORITY);
        const [sharePda] = getSharePda(publicKey, pool, mint);
        
        acc.push({
          pubkey: sharePda,
          token: token
        });
        return acc;
      }, []);
  
      // Fetch all accounts in one RPC call
      const accountInfos = await connection.getMultipleAccountsInfo(
        accountsToFetch.map(item => item.pubkey)
      );
  
      // Process results
      const validBalances = accountInfos
        .map((accountInfo, index) => {
          if (!accountInfo) return null;
          
          const token = accountsToFetch[index].token;
          
          // Skip discriminator (8 bytes) and parse the data
          const data = accountInfo.data.slice(8);
          
          // Parse account data according to the PoolStakeShare layout
          // authority (32) + balance (8) + mint (32) + pool (32)
          const balance = data.slice(32, 40); // Get the 8 bytes after authority
          const balanceNum = Number(balance.readBigUInt64LE(0));
          
          return {
            tokenName: token.name,
            mintAddress: token.mintAddress,
            stakedBalance: balanceNum / (10 ** (token.decimals || 11))
          };
        })
        .filter(result => result !== null && result.stakedBalance > 0);
      console.log(validBalances);
      setStakedBalances(validBalances);
      setIsFirstLoad(false);
      
    } catch (error) {
      console.error("Error fetching staked balances:", error);
      setIsFirstLoad(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchStakedBalances();
  }, [fetchStakedBalances]);

  const handleClick = (tokenName, stakedBalance) => {
    if (onBalanceClick) {
      onBalanceClick(tokenName, stakedBalance);
    }
  };

  return (
    <div className="staked-balances">
      <h3 className="large-heading">Staked Balance:</h3>      
      {isFirstLoad ? (
        <p className="loading-text">Loading staked balances...</p>
      ) : (
        <>
          <div className="balance-header">
            <span className="header-token-name">Token</span>
            <span className="header-staked">Staked</span>
          </div>
          <ul className="balance-list">
            {stakedBalances.length > 0 ? (
              stakedBalances.map(({ tokenName, stakedBalance, rewardsBalance }) => (
                <li
                  key={tokenName}
                  onClick={() => handleClick(tokenName, stakedBalance)}
                  className="balance-item"
                  title="Click to use this staked balance"
                >
                  <span className="token-name">{tokenName}</span>
                  <span className="token-balance">{stakedBalance}</span>
                </li>
              ))
            ) : (
              <li className="balance-item">
                <span className="token-name">No staked balances</span>
                <span className="token-balance">-</span>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
});

StakedBalances.displayName = "StakedBalances";

const ClaimableBalances = memo(({ publicKey, onClaimClick, refreshCount }) => {
  const [claimableBalances, setClaimableBalances] = useState({
    earned: 0,
    claimed: 0,
    earned_coal: 0,
    claimed_coal: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchClaimableBalances = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`/api/balance?pubkey=${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch claimable balances');
      
      const data = await response.json();
      data.earned = data.earned / 1e11;
      data.claimed = data.claimed / 1e11;
      data.earned_coal = data.earned_coal / 1e11;
      data.claimed_coal = data.claimed_coal / 1e11;
      setClaimableBalances(data);
    } catch (error) {
      console.error("Error fetching claimable balances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchClaimableBalances();
  }, [fetchClaimableBalances, refreshCount]);

  const handleClick = async (tokenName, amount) => {
    if (!amount || amount <= 0) {
      toast.warn("No balance available to claim");
      return;
    }

    try {
      // First check if wallet is properly connected
      if (!window.solana?.isConnected) {
        toast.error("Please ensure your wallet is properly connected");
        return;
      }

      if (onClaimClick) {
        await onClaimClick(tokenName, amount);
      }
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error(
        error.message.includes("authorized") 
          ? "Please authorize the transaction in your wallet" 
          : "Failed to process claim. Please try reconnecting your wallet."
      );
    }
  };

  return (
    <div className="claimable-balances-section">
      <h3 className="large-heading">Claimable Balance:</h3>
      {isLoading ? (
        <p className="loading-text">Loading claimable balances...</p>
      ) : (
        <ul className="balance-list">
          <li 
            className="balance-item"
            onClick={() => handleClick('ORE', claimableBalances.earned - claimableBalances.claimed)}
            title="Click to claim ORE"
          >
            <span className="token-name">Available ORE:</span>
            <span className="token-balance">
              {formatBalance(claimableBalances.earned - claimableBalances.claimed)}
            </span>
          </li>
          <li 
            className="balance-item"
            onClick={() => handleClick('COAL', claimableBalances.earned_coal - claimableBalances.claimed_coal)}
            title="Click to claim COAL"
          >
            <span className="token-name">Available COAL:</span>
            <span className="token-balance">
              {formatBalance(claimableBalances.earned_coal - claimableBalances.claimed_coal)}
            </span>
          </li>
          <li className="balance-item disabled">
            <span className="token-name">Total earned ORE:</span>
            <span className="token-balance">{formatBalance(claimableBalances.earned)}</span>
          </li>
          <li className="balance-item disabled">
            <span className="token-name">Total earned COAL:</span>
            <span className="token-balance">{formatBalance(claimableBalances.earned_coal)}</span>
          </li>
        </ul>
      )}
    </div>
  );
});

ClaimableBalances.displayName = "ClaimableBalances";

const WalletStatus = memo(({ connection, onBalanceClick, onClaimClick, isProcessing }) => {
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = useCallback(() => {
    if (publicKey) {
      navigator.clipboard
        .writeText(publicKey.toString())
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy!", err);
        });
    }
  }, [publicKey]);

  const handleRefresh = () => {
    if (!publicKey) return;
    setIsRefreshing(true);
    setRefreshCount((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="wallet-status">
      {publicKey ? (
        <>
          <div className="wallet-address-container">
            <span>Connected:</span>
            <p className="wallet-address">{formatPubkey(publicKey.toString())}</p>
            <button
              className="copy-button"
              onClick={handleCopy}
              aria-label="Copy wallet address"
            >
              📜
            </button>
            {copied && <span className="copy-feedback">Copied!</span>}
            <button
              className="refresh-button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh balances"
              style={{ marginLeft: "10px" }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh 🔄"}
            </button>
          </div>
          <ReactUIWalletDisconnectButtonDynamic />
          <br />
          <p className="no-margin">(Click the individual line to pre-populate totals):</p>
          <WalletBalances
            publicKey={publicKey}
            connection={connection}
            onBalanceClick={onBalanceClick}
            refreshCount={refreshCount}
          />
          <hr className="separator" />
          <StakedBalances
            publicKey={publicKey}
            connection={connection}
            onBalanceClick={onBalanceClick}
            refreshCount={refreshCount}
          />
          <hr className="separator" />
          <ClaimableBalances
            publicKey={publicKey}
            onClaimClick={onClaimClick}
            refreshCount={refreshCount}
          />
          {/* <div className="lp-links">
            <button
              onClick={() => window.open("https://jup.ag/swap/SOL-ORE", "_blank")}
              className="button lp-button"
            >
              Buy ORE
            </button>
            <button
              onClick={() => window.open("https://app.meteora.ag/pools/GgaDTFbqdgjoZz3FP7zrtofGwnRS4E6MCzmmD5Ni1Mxj", "_blank")}
              className="button lp-button"
            >
              Buy ORE-SOL (Meteora) LP
            </button>
            <button
              onClick={() => window.open("https://app.meteora.ag/pools/2vo5uC7jbmb1zNqYpKZfVyewiQmRmbJktma4QHuGNgS5", "_blank")}
              className="button lp-button"
            >
              Buy ORE-ISC (Meteora) LP
            </button>
            <button
              onClick={() => window.open("https://app.kamino.finance/liquidity/6TFdY15Mxty9sRCtzMXG8eHSbZy4oiAEQUvLQdz9YwEn", "_blank")}
              className="button lp-button"
            >
              Buy ORE-SOL (Kamino) LP
            </button>
            <button
              onClick={() => window.open("https://app.kamino.finance/liquidity/9XsAPjk1yp4U6hKZj9r9szhcxBi3RidGuyxiC2Y8JtAe", "_blank")}
              className="button lp-button"
            >
              Buy ORE-HNT (Kamino) LP
            </button>
          </div> */}
        </>
      ) : (
        <WalletMultiButton className="wallet-adapter-button" />
      )}
    </div>
  );
});

WalletStatus.displayName = "WalletStatus";

export default memo(WalletStatus);
