// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title INSRegistryIkas
 * @notice Permanent .ikas name registry for the Igra Network.
 *         Sister contract to INSRegistry (.ins) and INSRegistryIgra (.igra) —
 *         identical logic, only the TLD suffix rendered in tokenURI differs.
 *         Names are ERC-721 NFTs — pay once, own forever, no renewals.
 *         Payment is in native iKAS (msg.value).
 *
 * @dev Pricing tiers (set in constructor, admin-updatable):
 *      - 1-char  : reserved (cannot register; adminMint only)
 *      - 2-char  : 5,000 iKAS
 *      - 3-char  : 500 iKAS
 *      - 4-char  : 50 iKAS
 *      - 5-32    : 10 iKAS
 *      Plus per-name `premiumPrice[label]` override (admin-set).
 *
 *      Admin ("owner") can:
 *      - reserve names (blocks public registration)
 *      - adminMint any name (bypasses payment + reservation), e.g. to gift
 *        premium names to ecosystem users for distribution / growth
 *      - set length-tier prices and per-name premium prices
 */
contract INSRegistryIkas {
    /* ─────────────────────────── Errors ─────────────────────────── */
    error InvalidLabel();
    error AlreadyRegistered();
    error InsufficientPayment();
    error NotOwner();
    error ZeroAddress();
    error TransferToZero();
    error NotAuthorized();
    error NonexistentToken();
    error NameReserved();
    error TierReserved();

    /* ─────────────────────────── Events ─────────────────────────── */
    event Registered(string indexed label, address indexed owner, address target, uint256 paid);
    event AdminMinted(string indexed label, address indexed to, address mintedBy);
    event Reserved(string indexed label, bool isReserved);
    event TargetSet(uint256 indexed tokenId, address indexed target);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event LengthPriceUpdated(uint8 len, uint256 price);
    event PremiumPriceUpdated(string indexed label, uint256 price);
    event Withdraw(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ─────────────────────────── State ──────────────────────────── */
    string public constant name = "Igra Name Service (.ikas)";
    string public constant symbol = "INSK";

    /// @notice Sentinel meaning "this length tier is reserved (no public mint)."
    uint256 public constant TIER_RESERVED = type(uint256).max;

    address public owner;
    uint256 public totalSupply;

    /// @notice price for labels of length L; index 0 unused, index 32 for 5+.
    /// Lengths 1..4 are direct-indexed; 5..32 share index 5 by convention
    /// (see _lengthBucket). Admin can update each via setLengthPrice.
    mapping(uint8 => uint256) public lengthPrice;

    /// @notice per-name override. 0 means "use length tier".
    mapping(string => uint256) public premiumPrice;

    /// @notice reserved names cannot be publicly registered. Admin can
    ///         still mint them via adminMint (to gift to ecosystem users).
    mapping(string => bool) public reserved;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    mapping(string => uint256) public tokenIdOf;
    mapping(uint256 => string) public labelOf;
    mapping(uint256 => address) public targetOf;
    mapping(uint256 => uint256) public mintedAt;

    /* ─────────────────────────── Modifiers ──────────────────────── */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        // Default tier prices in wei (18 decimals on Igra).
        lengthPrice[1] = TIER_RESERVED;      // 1-char: ecosystem allocation only
        lengthPrice[2] = 5000 ether;         // 2-char: 5,000 iKAS
        lengthPrice[3] = 500 ether;          // 3-char: 500 iKAS
        lengthPrice[4] = 50 ether;           // 4-char: 50 iKAS
        lengthPrice[5] = 10 ether;           // 5-32 char: 10 iKAS
        emit LengthPriceUpdated(1, TIER_RESERVED);
        emit LengthPriceUpdated(2, 5000 ether);
        emit LengthPriceUpdated(3, 500 ether);
        emit LengthPriceUpdated(4, 50 ether);
        emit LengthPriceUpdated(5, 10 ether);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /* ─────────────────────────── View ───────────────────────────── */

    /// @notice Effective price for a label (premium > tier).
    ///         Returns `TIER_RESERVED` if the name cannot be publicly minted.
    function priceFor(string calldata label) external view returns (uint256) {
        if (!_isValidLabel(label)) return TIER_RESERVED;
        if (reserved[label]) return TIER_RESERVED;
        uint256 p = premiumPrice[label];
        if (p != 0) return p;
        return lengthPrice[_lengthBucket(bytes(label).length)];
    }

    /// @notice Whether a name is available for public registration.
    function available(string calldata label) external view returns (bool) {
        if (!_isValidLabel(label)) return false;
        if (tokenIdOf[label] != 0) return false;
        if (reserved[label]) return false;
        uint256 p = premiumPrice[label];
        uint256 effective = p != 0 ? p : lengthPrice[_lengthBucket(bytes(label).length)];
        return effective != TIER_RESERVED;
    }

    function ownerOfName(string calldata label) external view returns (address) {
        uint256 id = tokenIdOf[label];
        if (id == 0) return address(0);
        return _owners[id];
    }

    function resolve(string calldata label) external view returns (address) {
        uint256 id = tokenIdOf[label];
        if (id == 0) return address(0);
        return targetOf[id];
    }

    /* ─────────────────────────── Register ───────────────────────── */

    /// @notice Publicly register an available name. Pay in native iKAS.
    function register(string calldata label, address target)
        external
        payable
        returns (uint256 tokenId)
    {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (tokenIdOf[label] != 0) revert AlreadyRegistered();
        if (reserved[label]) revert NameReserved();

        uint256 price = premiumPrice[label];
        if (price == 0) price = lengthPrice[_lengthBucket(bytes(label).length)];
        if (price == TIER_RESERVED) revert TierReserved();
        if (msg.value < price) revert InsufficientPayment();

        if (target == address(0)) target = msg.sender;

        unchecked { tokenId = ++totalSupply; }
        tokenIdOf[label] = tokenId;
        labelOf[tokenId] = label;
        targetOf[tokenId] = target;
        mintedAt[tokenId] = block.timestamp;
        _mint(msg.sender, tokenId);

        // refund overpayment
        if (msg.value > price) {
            (bool ok, ) = msg.sender.call{value: msg.value - price}("");
            require(ok, "refund failed");
        }

        emit Registered(label, msg.sender, target, price);
        emit TargetSet(tokenId, target);
    }

    /// @notice Update the resolver target for a name you own.
    function setTarget(string calldata label, address target) external {
        uint256 id = tokenIdOf[label];
        if (id == 0) revert NonexistentToken();
        if (_owners[id] != msg.sender) revert NotOwner();
        if (target == address(0)) revert ZeroAddress();
        targetOf[id] = target;
        emit TargetSet(id, target);
    }

    /* ─────────────────────────── Admin ──────────────────────────── */

    /// @notice Mint any name directly to `to`, bypassing payment + reservation.
    ///         Used to gift premium names to ecosystem users for growth.
    function adminMint(string calldata label, address to)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (tokenIdOf[label] != 0) revert AlreadyRegistered();
        if (to == address(0)) revert ZeroAddress();

        unchecked { tokenId = ++totalSupply; }
        tokenIdOf[label] = tokenId;
        labelOf[tokenId] = label;
        targetOf[tokenId] = to;
        mintedAt[tokenId] = block.timestamp;
        _mint(to, tokenId);

        emit AdminMinted(label, to, msg.sender);
        emit TargetSet(tokenId, to);
    }

    /// @notice Reserve (or unreserve) a name. Reserved names cannot be
    ///         publicly registered but can still be adminMinted.
    function setReserved(string calldata label, bool isReserved) external onlyOwner {
        if (!_isValidLabel(label)) revert InvalidLabel();
        reserved[label] = isReserved;
        emit Reserved(label, isReserved);
    }

    /// @notice Batch reservation for seeding the initial premium list.
    function setReservedBatch(string[] calldata labels, bool isReserved) external onlyOwner {
        for (uint256 i; i < labels.length; ++i) {
            if (!_isValidLabel(labels[i])) revert InvalidLabel();
            reserved[labels[i]] = isReserved;
            emit Reserved(labels[i], isReserved);
        }
    }

    /// @notice Set the price for a length bucket. Use bucket 5 for labels of
    ///         length 5..32. Pass `TIER_RESERVED` to block that entire tier.
    function setLengthPrice(uint8 bucket, uint256 price) external onlyOwner {
        require(bucket >= 1 && bucket <= 5, "bucket out of range");
        lengthPrice[bucket] = price;
        emit LengthPriceUpdated(bucket, price);
    }

    /// @notice Override price for a specific name. Pass 0 to clear override.
    ///         Takes precedence over length tier.
    function setPremiumPrice(string calldata label, uint256 price) external onlyOwner {
        if (!_isValidLabel(label)) revert InvalidLabel();
        premiumPrice[label] = price;
        emit PremiumPriceUpdated(label, price);
    }

    function withdraw(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        require(ok, "withdraw failed");
        emit Withdraw(to, bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address prev = owner;
        owner = newOwner;
        emit OwnershipTransferred(prev, newOwner);
    }

    /* ─────────────────── ERC-721 minimal surface ────────────────── */

    function balanceOf(address who) external view returns (uint256) {
        if (who == address(0)) revert ZeroAddress();
        return _balances[who];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert NonexistentToken();
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address o = _owners[tokenId];
        if (o == address(0)) revert NonexistentToken();
        if (msg.sender != o && !_operatorApprovals[o][msg.sender]) revert NotAuthorized();
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address o, address op) external view returns (bool) {
        return _operatorApprovals[o][op];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert TransferToZero();
        address o = _owners[tokenId];
        if (o != from) revert NotOwner();
        if (
            msg.sender != o &&
            _tokenApprovals[tokenId] != msg.sender &&
            !_operatorApprovals[o][msg.sender]
        ) revert NotAuthorized();

        delete _tokenApprovals[tokenId];
        unchecked {
            _balances[from] -= 1;
            _balances[to] += 1;
        }
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function supportsInterface(bytes4 iid) external pure returns (bool) {
        return
            iid == 0x80ac58cd || // ERC-721
            iid == 0x5b5e139f || // ERC-721 Metadata
            iid == 0x01ffc9a7;   // ERC-165
    }

    /// @notice On-chain data URI with inline SVG artwork — cyan/plum gradient
    ///         card matching the dApp theme. All bytes returned; no IPFS.
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        string memory label = labelOf[tokenId];
        string memory svg = _renderSVG(label);
        string memory json = string(
            abi.encodePacked(
                '{"name":"', label, '.ikas",',
                '"description":"Permanent .ikas name on the Igra Name Service. One-time payment, no renewals.",',
                '"image":"data:image/svg+xml;base64,', Base64Ikas.encode(bytes(svg)), '",',
                '"attributes":[',
                    '{"trait_type":"Length","value":', _toString(bytes(label).length), '},',
                    '{"trait_type":"Tier","value":"', _tierName(bytes(label).length), '"}',
                ']}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64Ikas.encode(bytes(json))));
    }

    /* ─────────────────────── Internal ───────────────────────────── */

    function _mint(address to, uint256 tokenId) private {
        if (to == address(0)) revert ZeroAddress();
        unchecked { _balances[to] += 1; }
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _lengthBucket(uint256 len) private pure returns (uint8) {
        if (len == 1) return 1;
        if (len == 2) return 2;
        if (len == 3) return 3;
        if (len == 4) return 4;
        return 5; // 5..32
    }

    function _isValidLabel(string calldata label) private pure returns (bool) {
        bytes memory b = bytes(label);
        uint256 len = b.length;
        if (len < 1 || len > 32) return false; // allow 1-char for admin mint; public blocked by tier
        if (b[0] == "-" || b[len - 1] == "-") return false;
        for (uint256 i; i < len; ++i) {
            bytes1 c = b[i];
            bool isAZ = c >= 0x61 && c <= 0x7a;
            bool is09 = c >= 0x30 && c <= 0x39;
            bool isDash = c == 0x2d;
            if (!(isAZ || is09 || isDash)) return false;
        }
        return true;
    }

    function _tierName(uint256 len) private pure returns (string memory) {
        if (len == 1) return "Reserved";
        if (len == 2) return "Ultra-Rare";
        if (len == 3) return "Rare";
        if (len == 4) return "Uncommon";
        return "Standard";
    }

    function _tierColor(uint256 len) private pure returns (string memory) {
        if (len == 1) return "#f87171"; // red
        if (len == 2) return "#c084fc"; // plum
        if (len == 3) return "#fbbf24"; // amber
        if (len == 4) return "#22d3ee"; // cyan
        return "#34d399";               // emerald
    }

    /// @dev Renders a 500x500 SVG card with gradient, label, ".ikas" suffix,
    ///      tier badge, and a decorative monogram in the corner.
    function _renderSVG(string memory label) private pure returns (string memory) {
        bytes memory b = bytes(label);
        uint256 len = b.length;
        string memory tier = _tierName(len);
        string memory accent = _tierColor(len);
        // scale font to fit card (500px wide, 40px margin each side)
        uint256 fontSize;
        if (len <= 6)      fontSize = 80;
        else if (len <= 10) fontSize = 60;
        else if (len <= 16) fontSize = 40;
        else if (len <= 22) fontSize = 30;
        else                fontSize = 22;

        return string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
                '<defs>',
                    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
                        '<stop offset="0%" stop-color="#0a0a1a"/>',
                        '<stop offset="100%" stop-color="#1a0f2e"/>',
                    '</linearGradient>',
                    '<linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">',
                        '<stop offset="0%" stop-color="#22d3ee"/>',
                        '<stop offset="100%" stop-color="#c084fc"/>',
                    '</linearGradient>',
                '</defs>',
                '<rect width="500" height="500" rx="28" fill="url(#bg)"/>',
                '<rect x="8" y="8" width="484" height="484" rx="22" fill="none" stroke="url(#stroke)" stroke-width="2" opacity="0.6"/>',
                // tier chip
                '<rect x="32" y="32" width="120" height="28" rx="14" fill="', accent, '" opacity="0.16"/>',
                '<text x="92" y="51" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="600" fill="', accent, '" text-anchor="middle">', tier, '</text>',
                // brand mark top-right
                '<text x="468" y="51" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="700" fill="#e8e8f5" text-anchor="end" letter-spacing="2">INS-IKAS</text>',
                // label center
                '<text x="250" y="260" font-family="Inter,system-ui,sans-serif" font-size="', _toString(fontSize), '" font-weight="800" fill="#ffffff" text-anchor="middle">',
                    label,
                '</text>',
                // .ikas suffix directly below
                '<text x="250" y="310" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="600" fill="url(#stroke)" text-anchor="middle">.ikas</text>',
                // footer
                '<text x="32" y="468" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#9aa0b4">Igra Name Service</text>',
                '<text x="468" y="468" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#9aa0b4" text-anchor="end">permanent \xE2\x80\xA2 onchain</text>',
                '</svg>'
            )
        );
    }

    function _toString(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint256 temp = v;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (v != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(v % 10)));
            v /= 10;
        }
        return string(buffer);
    }
}

/// @title Base64Ikas
/// @notice Minimal Base64Ikas encoder — OpenZeppelin-style (memory-local table).
library Base64Ikas {
    string internal constant _TABLE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = _TABLE;
        // result length: 4 * ceil(len / 3)
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        assembly {
            let tablePtr := add(table, 1) // skip length prefix
            let resultPtr := add(result, 32)
            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {} {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
            mstore(result, encodedLen)
        }
        return result;
    }
}
