export const TOKEN_LIST = [
    { name: "SOL", mintAddress: null },
    { name: "ORE", mintAddress: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp", decimals: 11 },
    { name: "ORE-SOL (Meteora) LP", mintAddress: "DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN", decimals: 11 },
    { name: "ORE-ISC (Meteora) LP", mintAddress: "meUwDp23AaxhiNKaQCyJ2EAF2T4oe1gSkEkGXSRVdZb", decimals: 11 },
    { name: "ORE-SOL (Kamino) LP", mintAddress: "8H8rPiWW4iTFCfEkSnf7jpqeNpFfvdH9gLouAL3Fe2Zx", decimals: 6 },
  ];

export const BACKEND_TOKEN_LIST_TO_MINT_ADDRESS = {
  "ORE": "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
  "ORE_SOL": "DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN",
  "ORE_ISC": "meUwDp23AaxhiNKaQCyJ2EAF2T4oe1gSkEkGXSRVdZb",
  "ORE_SOL_KAMINO": "8H8rPiWW4iTFCfEkSnf7jpqeNpFfvdH9gLouAL3Fe2Zx"
}
  
export const mintAddressToTokenName = {
  "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp": "ORE",
  "DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN": "ORE-SOL (Meteora) LP",
  "meUwDp23AaxhiNKaQCyJ2EAF2T4oe1gSkEkGXSRVdZb": "ORE-ISC (Meteora) LP",
  "8H8rPiWW4iTFCfEkSnf7jpqeNpFfvdH9gLouAL3Fe2Zx": "ORE-SOL (Kamino) LP"
};

export const mintAddressToDecimals = {
  "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp": 11,
  "DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN": 11,
  "meUwDp23AaxhiNKaQCyJ2EAF2T4oe1gSkEkGXSRVdZb": 11,
  "8H8rPiWW4iTFCfEkSnf7jpqeNpFfvdH9gLouAL3Fe2Zx": 6, // kamino uses less decimals
};

export const tokenNameToMintAddress = {
  "ORE": "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
  "ORE-SOL (Meteora) LP": "DrSS5RM7zUd9qjUEdDaf31vnDUSbCrMto6mjqTrHFifN",
  "ORE-ISC (Meteora) LP": "meUwDp23AaxhiNKaQCyJ2EAF2T4oe1gSkEkGXSRVdZb",
  "ORE-SOL (Kamino) LP": "8H8rPiWW4iTFCfEkSnf7jpqeNpFfvdH9gLouAL3Fe2Zx"
};
