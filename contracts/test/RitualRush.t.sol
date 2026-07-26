// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RitualRush} from "../src/RitualRush.sol";

interface Vm {
    function chainId(uint256 newChainId) external;

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
    string private constant URI = "https://ritual-rush-eight.vercel.app/?score=run-one";

    event ScoreRecorded(
        address indexed player,
        uint256 score,
        uint32 speedLevel,
        uint32 runDuration,
        bytes32 indexed runId,
        string metadataURI,
        uint256 timestamp
    );

    function setUp() public {
        vm.chainId(1979);
        game = new RitualRush();
    }

    function testMetadataAndChain() public view {
        require(game.RITUAL_CHAIN_ID() == 1979, "wrong chain constant");
        require(
            keccak256(bytes(game.GAME_NAME())) == keccak256("Ritual Rush"),
            "wrong name"
        );
        require(
            keccak256(bytes(game.VERSION())) == keccak256("2.0.0"),
            "wrong version"
        );
        require(
            keccak256(bytes(game.symbol())) == keccak256("RITUAL-RUSH"),
            "wrong symbol"
        );
    }

    function testRecordScoreStoresEssentialDataAndEmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ScoreRecorded(address(this), 420, 4, 18, RUN_ID, "", 0);

        bool newBest = game.recordScore(420, 4, 18, RUN_ID, URI);
        require(newBest, "first score must be a best");

        RitualRush.ScoreRecord memory record = game.scoreRecord(
            address(this),
            RUN_ID
        );
        require(record.score == 420, "score not stored");
        require(record.speedLevel == 4, "speed level not stored");
        require(record.runDuration == 18, "duration not stored");
        require(record.timestamp > 0, "timestamp not stored");
        require(record.exists, "record missing");
        require(!record.minted, "record marked minted");
        require(
            keccak256(bytes(record.metadataURI)) == keccak256(bytes(URI)),
            "metadata URI not stored"
        );
        require(game.playerRunCount(address(this)) == 1, "run count wrong");
        require(game.playerRunIdAt(address(this), 0) == RUN_ID, "run id missing");
        require(game.playerBestScore(address(this)) == 420, "best score wrong");
    }

    function testLowerScoreDoesNotReplaceBest() public {
        game.recordScore(420, 4, 18, RUN_ID, URI);
        bool newBest = game.recordScore(120, 2, 9, keccak256("run-two"), "");
        require(!newBest, "lower score became a best");
        require(game.playerBestScore(address(this)) == 420, "best score changed");
    }

    function testDuplicateRunReverts() public {
        game.recordScore(100, 1, 5, RUN_ID, "");
        try game.recordScore(200, 2, 6, RUN_ID, "") {
            revert("duplicate run did not revert");
        } catch {}
    }

    function testRejectsInvalidInputs() public {
        try game.recordScore(0, 1, 5, keccak256("zero-score"), "") {
            revert("zero score did not revert");
        } catch {}

        try game.recordScore(100, 0, 5, keccak256("zero-speed"), "") {
            revert("zero speed did not revert");
        } catch {}

        try game.recordScore(100, 1, 0, keccak256("zero-duration"), "") {
            revert("zero duration did not revert");
        } catch {}

        try game.recordScore(100, 1, 5, bytes32(0), "") {
            revert("zero run id did not revert");
        } catch {}
    }

    function testMintScoreCardAndRejectDuplicateMint() public {
        game.recordScore(777, 6, 33, RUN_ID, URI);
        uint256 tokenId = game.mintScoreCard(RUN_ID);

        require(tokenId == 1, "wrong token id");
        require(game.ownerOf(tokenId) == address(this), "wrong token owner");
        require(game.balanceOf(address(this)) == 1, "wrong token balance");
        require(game.tokenIdForRun(address(this), RUN_ID) == tokenId, "token mapping missing");
        require(
            keccak256(bytes(game.tokenURI(tokenId))) == keccak256(bytes(URI)),
            "token URI missing"
        );

        RitualRush.ScoreRecord memory record = game.scoreRecord(
            address(this),
            RUN_ID
        );
        require(record.minted, "record not marked minted");

        try game.mintScoreCard(RUN_ID) {
            revert("duplicate mint did not revert");
        } catch {}
    }

    function testMintRequiresExistingRun() public {
        try game.mintScoreCard(keccak256("unknown")) {
            revert("unknown run did not revert");
        } catch {}
    }
}
