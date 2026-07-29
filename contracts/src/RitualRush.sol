// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Ritual Rush onchain score registry
/// @notice Permissionless score records for Ritual Rush on Ritual Testnet.
/// @dev A record is a public wallet claim. The contract has no owner, fee, or privileged path.
contract RitualRush {
    uint256 public constant RITUAL_CHAIN_ID = 1979;
    uint32 public constant MAX_SPEED_LEVEL = 100;
    uint256 public constant MAX_METADATA_LENGTH = 256;
    uint256 public constant MAX_NICKNAME_LENGTH = 72;
    string public constant GAME_NAME = "Ritual Rush";
    string public constant VERSION = "3.0.0";
    string public constant GAME_URL = "https://ritual-rush-eight.vercel.app";

    struct ScoreRecord {
        uint256 score;
        uint32 speedLevel;
        uint32 runDuration;
        uint64 timestamp;
        bool exists;
        string nickname;
        string metadataURI;
    }

    mapping(address player => mapping(bytes32 runId => ScoreRecord record))
        private _scores;
    mapping(address player => bytes32[] runIds) private _playerRunIds;
    mapping(address player => uint256 bestScore) private _bestScores;

    error RitualChainOnly(uint256 actualChainId);
    error InvalidScore();
    error InvalidSpeedLevel();
    error InvalidRunDuration();
    error InvalidRunId();
    error DuplicateRun(address player, bytes32 runId);
    error MetadataTooLong();
    error NicknameTooLong();

    event ScoreRecorded(
        address indexed player,
        uint256 score,
        uint32 speedLevel,
        uint32 runDuration,
        bytes32 indexed runId,
        string nickname,
        string metadataURI,
        uint256 timestamp
    );

    constructor() {
        if (block.chainid != RITUAL_CHAIN_ID) {
            revert RitualChainOnly(block.chainid);
        }
    }

    /// @notice Records a completed run for the connected wallet.
    /// @dev The transaction itself is the only cost; callers pay normal Ritual gas.
    function recordScore(
        uint256 score,
        uint32 speedLevel,
        uint32 runDuration,
        bytes32 runId,
        string calldata nickname,
        string calldata metadataURI
    ) external returns (bool newPersonalBest) {
        if (score == 0 || score > type(uint64).max) revert InvalidScore();
        if (speedLevel == 0 || speedLevel > MAX_SPEED_LEVEL) {
            revert InvalidSpeedLevel();
        }
        if (runDuration == 0 || runDuration > 86_400) {
            revert InvalidRunDuration();
        }
        if (runId == bytes32(0)) revert InvalidRunId();
        if (_scores[msg.sender][runId].exists) {
            revert DuplicateRun(msg.sender, runId);
        }
        if (bytes(nickname).length > MAX_NICKNAME_LENGTH) {
            revert NicknameTooLong();
        }
        if (bytes(metadataURI).length > MAX_METADATA_LENGTH) {
            revert MetadataTooLong();
        }

        _scores[msg.sender][runId] = ScoreRecord({
            score: score,
            speedLevel: speedLevel,
            runDuration: runDuration,
            timestamp: uint64(block.timestamp),
            exists: true,
            nickname: nickname,
            metadataURI: metadataURI
        });
        _playerRunIds[msg.sender].push(runId);

        if (score > _bestScores[msg.sender]) {
            _bestScores[msg.sender] = score;
            newPersonalBest = true;
        }

        emit ScoreRecorded(
            msg.sender,
            score,
            speedLevel,
            runDuration,
            runId,
            nickname,
            metadataURI,
            block.timestamp
        );
    }

    function scoreRecord(
        address player,
        bytes32 runId
    ) external view returns (ScoreRecord memory) {
        return _scores[player][runId];
    }

    function playerRunCount(address player) external view returns (uint256) {
        return _playerRunIds[player].length;
    }

    function playerRunIdAt(
        address player,
        uint256 index
    ) external view returns (bytes32) {
        return _playerRunIds[player][index];
    }

    function playerBestScore(address player) external view returns (uint256) {
        return _bestScores[player];
    }
}
