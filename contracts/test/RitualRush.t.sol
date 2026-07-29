// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RitualRush} from "../src/RitualRush.sol";

interface Vm {
    function chainId(uint256 newChainId) external;
    function prank(address sender) external;

    function expectEmit(
        bool checkTopic1,
        bool checkTopic2,
        bool checkTopic3,
        bool checkData
    ) external;
}

contract RitualRushTest {
    Vm private constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    RitualRush private game;
    bytes32 private constant RUN_ID = keccak256("run-one");
    string private constant NICKNAME = unicode"Rush #100! 🚀";
    string private constant URI = "https://ritual-rush-eight.vercel.app/?score=run-one";

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

    function setUp() public {
        vm.chainId(1979);
        game = new RitualRush();
    }

    function testMetadataAndChain() public view {
        require(game.RITUAL_CHAIN_ID() == 1979, "wrong chain constant");
        require(game.MAX_SPEED_LEVEL() == 100, "wrong speed ceiling");
        require(
            keccak256(bytes(game.GAME_NAME())) == keccak256("Ritual Rush"),
            "wrong name"
        );
        require(
            keccak256(bytes(game.VERSION())) == keccak256("3.0.0"),
            "wrong version"
        );
    }

    function testRecordScoreStoresEssentialDataAndEmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ScoreRecorded(
            address(this),
            420,
            100,
            18,
            RUN_ID,
            NICKNAME,
            URI,
            0
        );

        bool newBest = game.recordScore(420, 100, 18, RUN_ID, NICKNAME, URI);
        require(newBest, "first score must be a best");

        RitualRush.ScoreRecord memory record = game.scoreRecord(
            address(this),
            RUN_ID
        );
        require(record.score == 420, "score not stored");
        require(record.speedLevel == 100, "speed level not stored");
        require(record.runDuration == 18, "duration not stored");
        require(record.timestamp > 0, "timestamp not stored");
        require(record.exists, "record missing");
        require(
            keccak256(bytes(record.nickname)) == keccak256(bytes(NICKNAME)),
            "nickname not stored"
        );
        require(
            keccak256(bytes(record.metadataURI)) == keccak256(bytes(URI)),
            "metadata URI not stored"
        );
        require(game.playerRunCount(address(this)) == 1, "run count wrong");
        require(game.playerRunIdAt(address(this), 0) == RUN_ID, "run id missing");
        require(game.playerBestScore(address(this)) == 420, "best score wrong");
    }

    function testLowerScoreDoesNotReplaceBest() public {
        game.recordScore(420, 4, 18, RUN_ID, NICKNAME, URI);
        bool newBest = game.recordScore(
            120,
            2,
            9,
            keccak256("run-two"),
            "Runner",
            ""
        );
        require(!newBest, "lower score became a best");
        require(game.playerBestScore(address(this)) == 420, "best score changed");
    }

    function testAnyWalletCanRecord() public {
        address secondWallet = address(0xBEEF);
        vm.prank(secondWallet);
        game.recordScore(77, 1, 3, keccak256("second-wallet"), "Second", "");
        require(game.playerBestScore(secondWallet) == 77, "wallet could not record");
    }

    function testDuplicateRunReverts() public {
        game.recordScore(100, 1, 5, RUN_ID, NICKNAME, "");
        try game.recordScore(200, 2, 6, RUN_ID, NICKNAME, "") {
            revert("duplicate run did not revert");
        } catch {}
    }

    function testRejectsInvalidInputs() public {
        try game.recordScore(0, 1, 5, keccak256("zero-score"), "Runner", "") {
            revert("zero score did not revert");
        } catch {}

        try game.recordScore(100, 0, 5, keccak256("zero-speed"), "Runner", "") {
            revert("zero speed did not revert");
        } catch {}

        try game.recordScore(100, 101, 5, keccak256("high-speed"), "Runner", "") {
            revert("high speed did not revert");
        } catch {}

        try game.recordScore(100, 1, 0, keccak256("zero-duration"), "Runner", "") {
            revert("zero duration did not revert");
        } catch {}

        try game.recordScore(100, 1, 5, bytes32(0), "Runner", "") {
            revert("zero run id did not revert");
        } catch {}
    }
}
