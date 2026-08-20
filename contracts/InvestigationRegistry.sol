// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InvestigationRegistry
 * @notice Anchors AI Wallet Investigator report hashes to the BOT Chain and
 * lets users MINT timestamped snapshot NFTs of an investigation.
 *
 * Anchoring: anyone can store a keccak256 hash of a report for a wallet
 * address. The block timestamp proves the report existed at a point in time.
 *
 * Snapshots: a soulbound (non-transferable) token is minted to the wallet
 * holding the summary hash, the exact block timestamp, and an optional data
 * reference (e.g. the full report). tokenURI() returns the metadata as a data
 * URI so it works even with no explorer. getSnapshotAtOrBefore(timestamp)
 * lets a "timestamp page" show what was known at any point in the past.
 */
contract InvestigationRegistry {
    // ------------------------------------------------------------------
    // Report anchoring
    // ------------------------------------------------------------------

    struct Report {
        bytes32 summaryHash;
        uint256 timestamp;
        address investigator;
    }

    event ReportAnchored(
        address indexed wallet,
        bytes32 indexed summaryHash,
        uint256 timestamp,
        address indexed investigator
    );

    mapping(address => Report[]) private _reports;

    function anchorReport(address wallet, bytes32 summaryHash) external {
        _reports[wallet].push(Report(summaryHash, block.timestamp, msg.sender));
        emit ReportAnchored(wallet, summaryHash, block.timestamp, msg.sender);
    }

    function getReports(address wallet) external view returns (Report[] memory) {
        return _reports[wallet];
    }

    function reportCount(address wallet) external view returns (uint256) {
        return _reports[wallet].length;
    }

    // ------------------------------------------------------------------
    // Snapshot minting (soulbound NFT)
    // ------------------------------------------------------------------

    struct Snapshot {
        uint256 tokenId;
        address wallet;
        bytes32 summaryHash;
        uint256 timestamp;
        address investigator;
        string dataRef;
    }

    event SnapshotMinted(
        uint256 indexed tokenId,
        address indexed wallet,
        bytes32 indexed summaryHash,
        uint256 timestamp,
        address investigator
    );

    string public constant name = "BOT Investigation Snapshot";
    string public constant symbol = "BOTSNAP";

    uint256 private _nextTokenId = 1;
    mapping(uint256 => Snapshot) private _snapshots;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => uint256[]) private _walletTokens;

    /**
     * @notice Mint a snapshot NFT to the investigated wallet.
     * @param wallet The investigated wallet address (becomes the owner).
     * @param summaryHash keccak256 hash of the snapshot contents.
     * @param dataRef Optional reference to the full data (e.g. the report).
     * @return tokenId The minted token id.
     */
    function mintSnapshot(
        address wallet,
        bytes32 summaryHash,
        string calldata dataRef
    ) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _snapshots[tokenId] = Snapshot(tokenId, wallet, summaryHash, block.timestamp, msg.sender, dataRef);
        _owners[tokenId] = wallet;
        _balances[wallet]++;
        _walletTokens[wallet].push(tokenId);
        emit SnapshotMinted(tokenId, wallet, summaryHash, block.timestamp, msg.sender);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "not minted");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function snapshotOf(uint256 tokenId) external view returns (Snapshot memory) {
        require(_owners[tokenId] != address(0), "not minted");
        return _snapshots[tokenId];
    }

    function snapshotsOf(address wallet) external view returns (uint256[] memory) {
        return _walletTokens[wallet];
    }

    /**
     * @notice Find the snapshot with the largest timestamp at or before a
     * given timestamp ("what was known at time T").
     * @param timestamp Unix seconds.
     * @return best The matching snapshot (tokenId 0 when none found).
     * @return found True when a snapshot exists at or before the timestamp.
     */
    function getSnapshotAtOrBefore(uint256 timestamp)
        external
        view
        returns (Snapshot memory best, bool found)
    {
        uint256 bestDelta = type(uint256).max;
        for (uint256 i = 1; i < _nextTokenId; i++) {
            if (_owners[i] == address(0)) continue;
            uint256 ts = _snapshots[i].timestamp;
            if (ts <= timestamp) {
                uint256 delta = timestamp - ts;
                if (delta < bestDelta) {
                    bestDelta = delta;
                    best = _snapshots[i];
                    found = true;
                }
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd; // ERC165, ERC721
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "not minted");
        Snapshot memory s = _snapshots[tokenId];
        string memory json = string(
            abi.encodePacked(
                '{"name":"BOT Investigation Snapshot #', toString(tokenId), '",',
                '"description":"Timestamped snapshot of an investigated wallet on BOT Chain.",',
                '"attributes":[',
                '{"trait_type":"wallet","value":"', toHex(s.wallet), '"},',
                '{"trait_type":"timestamp","value":"', toString(s.timestamp), '"},',
                '{"trait_type":"summaryHash","value":"', toHex32(s.summaryHash), '"},',
                '{"trait_type":"investigator","value":"', toHex(s.investigator), '"}',
                "]}"
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", toBase64(bytes(json))));
    }

    // ------------------------------------------------------------------
    // Encoding helpers
    // ------------------------------------------------------------------

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function toHex(address a) internal pure returns (string memory) {
        bytes memory out = new bytes(42);
        bytes memory chars = "0123456789abcdef";
        out[0] = "0";
        out[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 c = uint8(uint160(a) >> (8 * (19 - i)));
            out[2 + i * 2] = chars[c >> 4];
            out[3 + i * 2] = chars[c & 0x0f];
        }
        return string(out);
    }

    function toHex32(bytes32 v) internal pure returns (string memory) {
        bytes memory out = new bytes(66);
        bytes memory chars = "0123456789abcdef";
        out[0] = "0";
        out[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 c = uint8(v[i]);
            out[2 + i * 2] = chars[c >> 4];
            out[3 + i * 2] = chars[c & 0x0f];
        }
        return string(out);
    }

    function toBase64(bytes memory data) internal pure returns (string memory) {
        bytes memory table = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory out = new bytes(encodedLen);
        uint256 i;
        uint256 j;
        while (j < encodedLen) {
            uint256 b0 = uint8(data[i]);
            uint256 b1 = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 b2 = i + 2 < len ? uint8(data[i + 2]) : 0;
            uint256 n = (b0 << 16) | (b1 << 8) | b2;
            out[j] = table[(n >> 18) & 0x3f];
            out[j + 1] = table[(n >> 12) & 0x3f];
            out[j + 2] = i + 1 < len ? table[(n >> 6) & 0x3f] : bytes1("=");
            out[j + 3] = i + 2 < len ? table[n & 0x3f] : bytes1("=");
            i += 3;
            j += 4;
        }
        return string(out);
    }
}