// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Ritual Rush score registry and optional score-card collectible
/// @notice Records wallet-submitted run claims on Ritual public testnet.
/// @dev Claims are intentionally unverified; this contract has no owner, fees, or withdrawal path.
contract RitualRush {
    uint256 public constant RITUAL_CHAIN_ID = 1979;
    string public constant GAME_NAME = "Ritual Rush";
    string public constant VERSION = "2.0.0";
    string public constant GAME_URL = "https://ritual-rush-eight.vercel.app";
    uint256 public constant MAX_METADATA_LENGTH = 256;

    string public constant name = "Ritual Rush Score Card";
    string public constant symbol = "RITUAL-RUSH";

    struct ScoreRecord {
        uint256 score;
        uint32 speedLevel;
        uint32 runDuration;
        uint64 timestamp;
        bool exists;
        bool minted;
        string metadataURI;
    }

    mapping(address player => mapping(bytes32 runId => ScoreRecord record))
        private _scores;
    mapping(address player => bytes32[] runIds) private _playerRunIds;
    mapping(address player => uint256 bestScore) private _bestScores;
    mapping(address player => mapping(bytes32 runId => uint256 tokenId))
        private _tokenByRun;

    uint256 private _nextTokenId = 1;
    mapping(uint256 tokenId => address owner) private _owners;
    mapping(address owner => uint256 balance) private _balances;
    mapping(uint256 tokenId => address player) private _tokenPlayers;
    mapping(uint256 tokenId => bytes32 runId) private _tokenRunIds;
    mapping(uint256 tokenId => address approved) private _tokenApprovals;
    mapping(address owner => mapping(address operator => bool approved))
        private _operatorApprovals;

    error RitualChainOnly(uint256 actualChainId);
    error InvalidScore();
    error InvalidSpeedLevel();
    error InvalidRunDuration();
    error InvalidRunId();
    error DuplicateRun(address player, bytes32 runId);
    error UnknownRun(address player, bytes32 runId);
    error AlreadyMinted(address player, bytes32 runId);
    error MetadataTooLong();
    error NonexistentToken(uint256 tokenId);
    error NotAuthorized();
    error InvalidRecipient();

    event ScoreRecorded(
        address indexed player,
        uint256 score,
        uint32 speedLevel,
        uint32 runDuration,
        bytes32 indexed runId,
        string metadataURI,
        uint256 timestamp
    );

    event ScoreCardMinted(
        address indexed player,
        bytes32 indexed runId,
        uint256 indexed tokenId,
        string metadataURI
    );

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    constructor() {
        if (block.chainid != RITUAL_CHAIN_ID) {
            revert RitualChainOnly(block.chainid);
        }
    }

    /// @notice Records a completed run for the connected wallet.
    /// @dev The transaction itself is the only cost; the contract never accepts application fees.
    function recordScore(
        uint256 score,
        uint32 speedLevel,
        uint32 runDuration,
        bytes32 runId,
        string calldata metadataURI
    ) external returns (bool newPersonalBest) {
        if (score == 0 || score > type(uint64).max) revert InvalidScore();
        if (speedLevel == 0 || speedLevel > 12) revert InvalidSpeedLevel();
        if (runDuration == 0 || runDuration > 86_400) {
            revert InvalidRunDuration();
        }
        if (runId == bytes32(0)) revert InvalidRunId();
        if (_scores[msg.sender][runId].exists) {
            revert DuplicateRun(msg.sender, runId);
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
            minted: false,
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
            metadataURI,
            block.timestamp
        );
    }

    /// @notice Mints a lightweight ERC-721 score card for a previously recorded run.
    function mintScoreCard(bytes32 runId) external returns (uint256 tokenId) {
        ScoreRecord storage record = _scores[msg.sender][runId];
        if (!record.exists) revert UnknownRun(msg.sender, runId);
        if (record.minted) revert AlreadyMinted(msg.sender, runId);

        tokenId = _nextTokenId++;
        record.minted = true;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _tokenPlayers[tokenId] = msg.sender;
        _tokenRunIds[tokenId] = runId;
        _tokenByRun[msg.sender][runId] = tokenId;

        emit Transfer(address(0), msg.sender, tokenId);
        emit ScoreCardMinted(msg.sender, runId, tokenId, record.metadataURI);
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

    function tokenIdForRun(
        address player,
        bytes32 runId
    ) external view returns (uint256) {
        return _tokenByRun[player][runId];
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert InvalidRecipient();
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonexistentToken(tokenId);
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        address player = _tokenPlayers[tokenId];
        if (player == address(0)) revert NonexistentToken(tokenId);
        return _scores[player][_tokenRunIds[tokenId]].metadataURI;
    }

    function approve(address approved, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert NotAuthorized();
        }
        _tokenApprovals[tokenId] = approved;
        emit Approval(owner, approved, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        if (operator == msg.sender) revert NotAuthorized();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        if (owner != from) revert NotAuthorized();
        if (to == address(0)) revert InvalidRecipient();
        if (
            msg.sender != owner &&
            msg.sender != _tokenApprovals[tokenId] &&
            !_operatorApprovals[owner][msg.sender]
        ) {
            revert NotAuthorized();
        }

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata
    ) external {
        transferFrom(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 ||
            interfaceId == 0x80ac58cd ||
            interfaceId == 0x5b5e139f;
    }
}
