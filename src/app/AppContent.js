"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  sign,
} from "@solana/web3.js";
import { getMint, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import WalletStatus from "../components/WalletStatus";
import PoolInfo from "../components/PoolInfo";

import { Buffer } from "buffer";
import Script from "next/script";
import Image from "next/image";
import { TOKEN_LIST, BACKEND_TOKEN_LIST_TO_MINT_ADDRESS, mintAddressToDecimals } from "../components/tokens";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import bs58 from 'bs58';



const GPOOL_AUTHORITY = new PublicKey("gpoo1atPkrKnfxQ4Qt214ErbgBBJeiksL1EjqBHynbo");
const boostProgramId = new PublicKey("boostmPwypNUQu8qZ8RoWt5DXyYSVYxnBXqbbrGjecc");
const poolProgramId = new PublicKey("poo1sKMYsZtDDS7og73L68etJQYyn6KXhXTLz1hizJc");

const getTokenProgramId = () =>
  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function getBoostPda(mint) { 
  return PublicKey.findProgramAddressSync(
    [Buffer.from("boost"), mint.toBuffer()],
    boostProgramId
  )[0];
}

function getPoolPda(authority) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), authority.toBuffer()],
    poolProgramId
  )[0];
}

function getSharePda(authority, pool, mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("share"), authority.toBuffer(), pool.toBuffer(), mint.toBuffer()],
    poolProgramId
  );
}

function getStakePda(authority, boost) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), authority.toBuffer(), boost.toBuffer()],
    boostProgramId
  )[0];
}
function getMemberPda(authority, pool) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("member"), authority.toBuffer(), pool.toBuffer()],
    poolProgramId
  );
}

function AppContent() {
  const { publicKey, sendTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [mintAddress, setMintAddress] = useState(
    "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
  );
  const [decimals, setDecimals] = useState(11);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStakeActive, setIsStakeActive] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [activeBoosts, setActiveBoosts] = useState([]);
  const [selectedClaimToken, setSelectedClaimToken] = useState("ORE");

  const connection = useMemo(
    () => new Connection(process.env.NEXT_PUBLIC_RPC_URL),
    []
  );

  const miner = useMemo(
    () => new PublicKey("mineXqpDeBeMR8bPQCyy9UneJZbjFywraS3koWZ8SSH"),
    []
  );

  useEffect(() => {
    const fetchDecimals = async () => {
      try {
        if (!mintAddress) {
          setDecimals(9);
          return;
        }
        const mintPubKey = new PublicKey(mintAddress);
        const mintInfo = await getMint(connection, mintPubKey);
        setDecimals(mintInfo.decimals);
      } catch (error) {
        console.error("Error fetching mint decimals:", error);
        setDecimals(11);
      }
    };
    fetchDecimals();
  }, [mintAddress, connection]);

  useEffect(() => {
      const fetchActiveBoosts = async () => {
        try {
          const response = await fetch('/api/active-boosts', {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const boosts = await response.json();
          // convert to mint addresses
          const mintAddresses = boosts.map(name => {
            const token = BACKEND_TOKEN_LIST_TO_MINT_ADDRESS[name];
            return token ? token : null;
          });
          setActiveBoosts(mintAddresses);
        } catch (error) {
          console.error('Error fetching active boosts:', error);
          toast.error('Failed to fetch active boosts');
        }
      };
  
      fetchActiveBoosts();
      const interval = setInterval(fetchActiveBoosts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }, []);

  const isBoostActive = useMemo(() => {
    return activeBoosts.includes(mintAddress);
  }, [activeBoosts, mintAddress]);

  const handleBalanceClick = useCallback((tokenName, balance) => {
    const selectedToken = TOKEN_LIST.find((token) => token.name === tokenName);
    if (selectedToken && selectedToken.mintAddress) {
      setAmount(balance.toString());
      setMintAddress(selectedToken.mintAddress);
    }
  }, []);

  const getDelegatedBoostAddress = useCallback(
    async (staker, mint) => {
      const programId = new PublicKey(
        "J6XAzG8S5KmoBM8GcCFfF8NmtzD7U3QPnbhNiYwsu9we"
      );

      const managed_proof_address = PublicKey.findProgramAddressSync(
        [Buffer.from("managed-proof-account"), miner.toBuffer()],
        programId
      )[0];

      const delegated_boost_address = PublicKey.findProgramAddressSync(
        [
          Buffer.from("v2-delegated-boost"),
          staker.toBuffer(),
          mint.toBuffer(),
          managed_proof_address.toBuffer(),
        ],
        programId
      )[0];

      return delegated_boost_address;
    },
    [miner]
  );

  const handleStakeBoost = useCallback(async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    const stakeAmountFloat = parseFloat(amount);
    if (isNaN(stakeAmountFloat) || stakeAmountFloat <= 0) {
      toast.error("Please enter a valid amount to stake.");
      return;
    }

    try {
      setIsProcessing(true);
      const transaction = new Transaction();
      const staker = publicKey;
      const mint = new PublicKey(mintAddress);
      const lp_decimals = mintAddressToDecimals[mintAddress] || 11;
      const stakeAmount = BigInt(Math.floor(stakeAmountFloat * 10 ** lp_decimals));
      const pool = getPoolPda(GPOOL_AUTHORITY);
      const [share_pda, share_bump] = getSharePda(staker, pool, mint);
      const [member_pda, member_bump] = getMemberPda(staker, pool);

      const memberAccountInfo = await connection.getAccountInfo(member_pda);
      if (!memberAccountInfo) {
        const createMemberInstruction = await createPoolMemberInstruction(staker);
        transaction.add(createMemberInstruction);
        toast.info("Pool Member NOT found, adding create member instruction");
      } else {
        toast.info("Pool Member found");
      }

      // Check if the share account exists
      const PoolShareAccountInfo = await connection.getAccountInfo(share_pda);
      if (!PoolShareAccountInfo) {
        const openShareInstruction = await createPoolOpenShareInstruction(
          staker,
          mint
        );
        transaction.add(openShareInstruction);
        toast.info("Pool Share NOT found, adding open share instruction");
      } else {
        toast.info("Pool Share found");
      }

      const stakeInstruction = await createPoolStakeInstruction(
        staker,
        mint,
        stakeAmount
      );
      transaction.add(stakeInstruction);

      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash
      }, "confirmed");

      toast.success("Boost account initialized and stake transaction sent successfully!");
    } catch (error) {
      console.error("Error staking boost:", error);
      toast.error(`Error staking boost: ${error.message || error}`);
    } finally {
      setIsProcessing(false);
    }
  }, [
    publicKey,
    sendTransaction,
    amount,
    mintAddress,
    decimals,
    miner,
    connection,
    getDelegatedBoostAddress,
  ]);

  const handleUnstakeBoost = useCallback(async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    const unstakeAmountFloat = parseFloat(amount);
    if (isNaN(unstakeAmountFloat) || unstakeAmountFloat <= 0) {
      toast.error("Please enter a valid amount to unstake.");
      return;
    }

    try {
      setIsProcessing(true);
      const transaction = new Transaction();
      const staker = publicKey;
      const mint = new PublicKey(mintAddress);
      const unstakeAmount = BigInt(
        Math.round(unstakeAmountFloat * 10 ** decimals)
      );

      const ataAddress = getAssociatedTokenAddressSync(mint, staker, true);
      // check if ataAddress has been created
      const ataAccountInfo = await connection.getAccountInfo(ataAddress);
      if (!ataAccountInfo) {
        console.log("ATA NOT found, adding create ata instruction");
        const createAtaInstruction = createAssociatedTokenAccountInstruction(staker, ataAddress, staker, mint);
        transaction.add(createAtaInstruction);
      }
      // for debug add unstake instruction here as well
      const unstakeInstruction = await createPoolUnstakeInstruction(
        staker,
        mint,
        unstakeAmount
      );
      transaction.add(unstakeInstruction);

      const signature = await sendTransaction(transaction, connection);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash
      }, "confirmed");

      toast.success("Unstake transaction sent successfully!");
    } catch (error) {
      console.error("Error unstaking boost:", error);
      toast.error("Error confirming unstaking boost. Please review totals for confirmation.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    publicKey,
    sendTransaction,
    amount,
    mintAddress,
    decimals,
    miner,
    connection,
  ]);

  const MIN_BALANCE = 5_000_000_000;


  const createUnstakeBoostInstruction = async (staker, miner, mint, amount) => {
    try {
      const programId = new PublicKey(
        "J6XAzG8S5KmoBM8GcCFfF8NmtzD7U3QPnbhNiYwsu9we"
      );
      const boostProgramId = new PublicKey(
        "boostmPwypNUQu8qZ8RoWt5DXyYSVYxnBXqbbrGjecc"
      );

      const TOKEN_PROGRAM_ID = getTokenProgramId();
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
        "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
      );

      const managed_proof_address = PublicKey.findProgramAddressSync(
        [Buffer.from("managed-proof-account"), miner.toBuffer()],
        programId
      )[0];

      const delegated_boost_address = PublicKey.findProgramAddressSync(
        [
          Buffer.from("v2-delegated-boost"),
          staker.toBuffer(),
          mint.toBuffer(),
          managed_proof_address.toBuffer(),
        ],
        programId
      )[0];

      const boost_pda = PublicKey.findProgramAddressSync(
        [Buffer.from("boost"), mint.toBuffer()],
        boostProgramId
      )[0];

      const stake_pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("stake"),
          managed_proof_address.toBuffer(),
          boost_pda.toBuffer(),
        ],
        boostProgramId
      )[0];

      const managed_proof_token_account = getAssociatedTokenAddressSync(
        mint,
        managed_proof_address,
        true
      );
      const staker_token_account = getAssociatedTokenAddressSync(mint, staker);
      const boost_tokens_address = getAssociatedTokenAddressSync(
        mint,
        boost_pda,
        true
      );
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(amount);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: staker, isSigner: true, isWritable: true },
          { pubkey: miner, isSigner: false, isWritable: false },
          { pubkey: managed_proof_address, isSigner: false, isWritable: true },
          {
            pubkey: managed_proof_token_account,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: delegated_boost_address,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: boost_pda, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: staker_token_account, isSigner: false, isWritable: true },
          { pubkey: boost_tokens_address, isSigner: false, isWritable: true },
          { pubkey: stake_pda, isSigner: false, isWritable: true },
          { pubkey: boostProgramId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: Buffer.concat([Buffer.from([10]), amountBuffer]),
      });

      return instruction;
    } catch (error) {
      throw error;
    }
  };

  const createPoolOpenShareInstruction = async (
    staker,
    mint
  ) => {
    const boost = getBoostPda(mint);
    const pool = getPoolPda(GPOOL_AUTHORITY);
    const [share, share_bump] = getSharePda(staker, pool, mint);
    const stake = getStakePda(pool, boost);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: staker, isSigner: true, isWritable: true },
        { pubkey: boost, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false }, 
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: share, isSigner: false, isWritable: true },
        { pubkey: stake, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: poolProgramId,
      data: Buffer.concat([Buffer.from([2]), Buffer.from([share_bump])]) // OPEN_SHARE instruction
    });

    return instruction;
  }

  const createPoolMemberInstruction = async (memberAuthority) => {
    const pool = getPoolPda(GPOOL_AUTHORITY);
    const [member, member_bump] = getMemberPda(memberAuthority, pool);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: memberAuthority, isSigner: true, isWritable: true },
        { pubkey: memberAuthority, isSigner: false, isWritable: false },
        { pubkey: member, isSigner: false, isWritable: true },
        { pubkey: pool, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: poolProgramId,
      data: Buffer.concat([Buffer.from([1]), Buffer.from([member_bump])]) // JOIN instruction

    });

    return instruction;
  };

  const createPoolStakeInstruction = async (
    memberAuthority,
    mint,
    amount
  ) => {
    const pool = getPoolPda(GPOOL_AUTHORITY);
    const poolTokens = getAssociatedTokenAddressSync(mint, pool, true);
    const [member, member_bump] = getMemberPda(memberAuthority, pool);
    const [share, share_bump] = getSharePda(memberAuthority, pool, mint);
    const sender = getAssociatedTokenAddressSync(mint, memberAuthority);

    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigInt64LE(BigInt(amount));

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: memberAuthority, isSigner: true, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: member, isSigner: false, isWritable: false },
        { pubkey: pool, isSigner: false, isWritable: true },
        { pubkey: poolTokens, isSigner: false, isWritable: true },
        { pubkey: sender, isSigner: false, isWritable: true },
        { pubkey: share, isSigner: false, isWritable: true },
        { pubkey: getTokenProgramId(), isSigner: false, isWritable: false },
      ],
      programId: poolProgramId,
      data: Buffer.concat([Buffer.from([3]), amountBuffer]) // 3 = STAKE instruction
    });

    return instruction;
  };
  const createPoolUnstakeInstruction = async (
    memberAuthority,
    mint,
    amount
  ) => {
    const pool = getPoolPda(GPOOL_AUTHORITY);
    const poolTokens = getAssociatedTokenAddressSync(mint, pool, true);
    const [member, member_bump] = getMemberPda(memberAuthority, pool);
    const [share, share_bump] = getSharePda(memberAuthority, pool, mint);
    const recipient = getAssociatedTokenAddressSync(mint, memberAuthority);
    const boost_pda = getBoostPda(mint);
    const boost_tokens = getAssociatedTokenAddressSync(
      mint,
      boost_pda,
      true
    );
    const stake_pda = getStakePda(pool, boost_pda);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigInt64LE(BigInt(amount));

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: memberAuthority, isSigner: true, isWritable: true },
        { pubkey: boost_pda, isSigner: false, isWritable: true },
        { pubkey: boost_tokens, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: member, isSigner: false, isWritable: false },
        { pubkey: pool, isSigner: false, isWritable: true },
        { pubkey: poolTokens, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
        { pubkey: share, isSigner: false, isWritable: true },
        { pubkey: stake_pda, isSigner: false, isWritable: true },
        { pubkey: getTokenProgramId(), isSigner: false, isWritable: false },
        { pubkey: boostProgramId, isSigner: false, isWritable: false },
      ],
      programId: poolProgramId,
      data: Buffer.concat([Buffer.from([4]), amountBuffer]) // 4 = UNSTAKE instruction
    });

    return instruction;
  };
  const formatBalanceApp = (balance) => {
    const num = Number(balance);
    return !isNaN(num) ? num.toFixed(2) : "0.00";
  };

  const handleClaim = useCallback(async (tokenType) => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    const claimAmountFloat = parseFloat(claimAmount);
    if (isNaN(claimAmountFloat) || claimAmountFloat <= 0) {
      toast.error("Please enter a valid amount to claim.");
      return;
    }

    try {
      setIsProcessing(true);
      setSelectedClaimToken(tokenType);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const message = new TextEncoder().encode(`Claim ${claimAmountFloat} ${tokenType} for ${publicKey} at timestamp: ${timestamp}`);
      
      let signature;
      try {
        signature = await window.solana.signMessage(message, "utf8");
      } catch (err) {
        console.error("Error signing message:", err);
        toast.error("Failed to sign message with wallet");
        return;
      }

      const signatureString = bs58.encode(signature.signature);

      const claimData = {
        pubkey: publicKey.toString(),
        timestamp: timestamp,
        amount: claimAmountFloat,
        token_id: tokenType === "ORE" ? "0" : "1",
        signature: signatureString
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch('/api/claim_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process claim');
      }

      const result = await response.json();
      if (result.success) {
        toast.success(result.message || "Claim processed successfully!");
      } else {
        toast.error(result.message || "Failed to process claim");
      }
      setClaimAmount("");
      
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error(`Error claiming rewards: ${error.message || error}`);
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, claimAmount]);

  const handleClaimClick = useCallback((tokenName, amount) => {
    setClaimAmount(amount.toString());
  }, []);

  return (
    <>
      {/* <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-Y6S4ZYT334"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-Y6S4ZYT334');
        `}
      </Script> */}

      <div className="container">
        <header className="header">
          <div className="logo-title-container">
            <div className="logo-container">
              <Image
                src="/gpool-logo-no-text-small-transparent.png"
                alt="GPool Logo"
                width={150}
                height={50}
                className="logo"
              />
            </div>
            <h1 className="site-title">
              <span>GPool Staking UI</span>
            </h1>
          </div>
        </header>

        <div className="dashboard-link">
          <a
            href="https://dashboard.gpool.cloud/"
            className="nav-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dashboard & Rewards
          </a>
        </div>
        <div className="pool-info">
          <PoolInfo 
            connection={connection}
          />
        </div>

        <div className="balances-section">
          <WalletStatus
            connection={connection}
            onBalanceClick={handleBalanceClick}
            onClaimClick={handleClaimClick}
            isProcessing={isProcessing}
          />

          <hr className="separator" />
        </div>
        <div className="card">
          {/* Staking Section */}
          <div className="staking-section">
            <h3 className="section-title">Stake/Unstake</h3>
            <div className="input-group">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="amount-input"
                min="0"
                step="any"
                disabled={isProcessing && !isStakeActive}
              />
            </div>

            <div className="input-group">
              <select
                value={mintAddress || ""}
                onChange={(e) => setMintAddress(e.target.value || null)}
                className="select-token"
              >
                {TOKEN_LIST.filter((token) => token.mintAddress).map((token) => (
                  <option key={token.name} value={token.mintAddress}>
                    {token.name}
                  </option>
                ))}
              </select>
            </div>

            {publicKey ? (
              <div className="button-group">
                <button
                  onClick={handleStakeBoost}
                  className={`button stake-button ${isBoostActive ? "active" : "inactive"}`}
                  disabled={!isBoostActive || isProcessing}
                >
                  {isProcessing ? "Processing..." : "Stake Boost"}
                </button>
                {!isBoostActive && (
                  <div className="boost-inactive-hint">
                    This boost is not enabled in the pool, so no staking is allowed
                  </div>
                )}
                <button
                  onClick={handleUnstakeBoost}
                  className="button unstake-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Unstake Boost"}
                </button>
              </div>
            ) : (
              <p className="connect-wallet-message">
                Please connect your wallet to stake or unstake.
              </p>
            )}
          </div>

          <hr className="section-separator" />

          {/* Claiming Section */}
          <div className="claiming-section">
            <h3 className="section-title">Claim Rewards</h3>
            <div className="input-group claim-input-group">
              <input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder="Claim amount"
                className="claim-input"
                min="0"
                step="any"
                disabled={isProcessing}
              />
            </div>
            {publicKey && (
              <div className="claim-buttons">
                <button
                  onClick={() => handleClaim("ORE")}
                  className="button claim-button"
                  disabled={isProcessing || !claimAmount}
                >
                  {isProcessing && selectedClaimToken === "ORE" ? "Processing..." : "Claim ORE"}
                </button>
                <button
                  onClick={() => handleClaim("COAL")}
                  className="button claim-button"
                  disabled={isProcessing || !claimAmount}
                >
                  {isProcessing && selectedClaimToken === "COAL" ? "Processing..." : "Claim COAL"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer
        position="bottom-left"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        theme="color"
      />
    </>
  );
}

export default AppContent;
export { getBoostPda, getPoolPda, getSharePda, getStakePda, GPOOL_AUTHORITY };