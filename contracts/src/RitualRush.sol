// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Ritual Rush public testnet score registry
/// @notice Stores player-submitted score claims on Ritual Chain.
/// @dev Scores originate in the browser game and are not cryptographically verified.
contract RitualRush {
    uint256 public constant RITUAL_CHAIN_ID = 1979;
    string public constant GAME_NAME = "Ritual Rush";
    string public constant VERSION = "1.0.0";
    string public constant GAME_URL = "https://ritual-rush-eight.vercel.app";

    struct PlayerStats {
        uint64 bestClaimedScore;
        uint64 claimCount;
        uint64 lastClaimedAt;
    }

    mapping(address player => PlayerStats stats) private _playerStats;
    mapping(address player => mapping(bytes32 runId => bool claimed)) private _claimedRuns;

    error RitualChainOnly(uint256 actualChainId);
    error InvalidScore();
    error InvalidRunId();
    error DuplicateRun(address player, bytes32 runId);

    event ScoreClaimed(
        address indexed player,
        bytes32 indexed runId,
        uint64 score,
        bool newPersonalBest
    );

    constructor() {
        if (block.chainid != RITUAL_CHAIN_ID) {
            revert RitualChainOnly(block.chainid);
        }
    }

    /// @notice Records a score claim for the connected wallet.
    /// @param score Score produced by the browser game.
    /// @param runId Client-generated identifier used to prevent duplicate submissions.
    /// @return newPersonalBest True when this claim raises the wallet's stored best.
    function claimScore(
        uint64 score,
        bytes32 runId
    ) external returns (bool newPersonalBest) {
        if (score == 0) revert InvalidScore();
        if (runId == bytes32(0)) revert InvalidRunId();
        if (_claimedRuns[msg.sender][runId]) {
            revert DuplicateRun(msg.sender, runId);
        }

        _claimedRuns[msg.sender][runId] = true;

        PlayerStats storage stats = _playerStats[msg.sender];
        unchecked {
            stats.claimCount += 1;
        }
        stats.lastClaimedAt = uint64(block.timestamp);

        if (score > stats.bestClaimedScore) {
            stats.bestClaimedScore = score;
            newPersonalBest = true;
        }

        emit ScoreClaimed(msg.sender, runId, score, newPersonalBest);
    }

    function playerStats(
        address player
    ) external view returns (PlayerStats memory) {
        return _playerStats[player];
    }

    function hasClaimedRun(
        address player,
        bytes32 runId
    ) external view returns (bool) {
        return _claimedRuns[player][runId];
    }
}
