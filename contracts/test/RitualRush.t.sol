// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RitualRush} from "../src/RitualRush.sol";

interface Vm {
    function chainId(uint256 newChainId) external;
}

contract RitualRushPlayer {
    function claim(
        RitualRush game,
        uint64 score,
        bytes32 runId
    ) external returns (bool) {
        return game.claimScore(score, runId);
    }
}

contract RitualRushTest {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    RitualRush private game;
    RitualRushPlayer private player;

    function setUp() public {
        vm.chainId(1979);
        game = new RitualRush();
        player = new RitualRushPlayer();
    }

    function testMetadata() public view {
        require(game.RITUAL_CHAIN_ID() == 1979, "wrong chain constant");
        require(
            keccak256(bytes(game.GAME_NAME())) == keccak256("Ritual Rush"),
            "wrong name"
        );
        require(
            keccak256(bytes(game.VERSION())) == keccak256("1.0.0"),
            "wrong version"
        );
    }

    function testClaimRecordsPlayerStats() public {
        bytes32 runId = keccak256("run-one");
        bool newBest = player.claim(game, 420, runId);
        require(newBest, "first claim must be a best");

        RitualRush.PlayerStats memory stats = game.playerStats(address(player));
        require(stats.bestClaimedScore == 420, "best score not recorded");
        require(stats.claimCount == 1, "claim count not recorded");
        require(stats.lastClaimedAt > 0, "timestamp not recorded");
        require(
            game.hasClaimedRun(address(player), runId),
            "run id not recorded"
        );
    }

    function testLowerClaimDoesNotReplaceBest() public {
        player.claim(game, 420, keccak256("run-one"));
        bool newBest = player.claim(game, 120, keccak256("run-two"));
        require(!newBest, "lower score cannot be a best");

        RitualRush.PlayerStats memory stats = game.playerStats(address(player));
        require(stats.bestClaimedScore == 420, "best score changed");
        require(stats.claimCount == 2, "second claim not counted");
    }

    function testDuplicateRunReverts() public {
        bytes32 runId = keccak256("same-run");
        player.claim(game, 100, runId);

        try player.claim(game, 200, runId) {
            revert("duplicate claim did not revert");
        } catch {}
    }

    function testRejectsZeroScore() public {
        try player.claim(game, 0, keccak256("zero-score")) {
            revert("zero score did not revert");
        } catch {}
    }

    function testRejectsZeroRunId() public {
        try player.claim(game, 100, bytes32(0)) {
            revert("zero run id did not revert");
        } catch {}
    }
}
