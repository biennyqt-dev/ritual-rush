// Generated from contracts/src/RitualRush.sol by Foundry forge inspect.
// Do not edit manually; run contracts/scripts/export-frontend-abi.ps1 after contract changes.
export const RITUAL_RUSH_CONTRACT_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "GAME_NAME",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "GAME_URL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_METADATA_LENGTH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_NICKNAME_LENGTH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_SPEED_LEVEL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "RITUAL_CHAIN_ID",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "playerBestScore",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "playerRunCount",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "playerRunIdAt",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recordScore",
    "inputs": [
      {
        "name": "score",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "speedLevel",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "runDuration",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "runId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nickname",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "metadataURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "newPersonalBest",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "scoreRecord",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "runId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct RitualRush.ScoreRecord",
        "components": [
          {
            "name": "score",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "speedLevel",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "runDuration",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "timestamp",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "exists",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "nickname",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "metadataURI",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ScoreRecorded",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "score",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "speedLevel",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "runDuration",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "runId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "nickname",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "metadataURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "DuplicateRun",
    "inputs": [
      {
        "name": "player",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "runId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidRunDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRunId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidScore",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSpeedLevel",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MetadataTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NicknameTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RitualChainOnly",
    "inputs": [
      {
        "name": "actualChainId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  }
] as const;