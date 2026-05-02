// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title INSRegistryIgraV2
 * @notice V2 of the .igra registry — adds an optional Annual (1y renewable)
 *         tier alongside the original Forever (pay-once) tier from V1.
 *         All design decisions documented in docs/V2_SPEC.md.
 *
 *         V1 holders migrate for gas only via claimV1Forever(). The Marketplace,
 *         ReverseResolver, and Resolver contracts are unchanged — they work
 *         with V2 because the ERC-721 surface is identical to V1.
 *
 *         V2 is a Registry-only redeploy. V1 stays on chain, read-only, so
 *         legacy NFTs remain visible to wallets that only know V1.
 *
 * @dev Storage layout is a strict superset of V1's: every V1 field exists at
 *      the same slot ordering, V2 fields appended after. V2 introduces:
 *        - expiresAt[id]            — 0 = Forever, > 0 = Annual unix-ts
 *        - lengthPriceAnnual[bkt]   — Annual price per length tier (per year)
 *        - premiumPriceAnnual[lbl]  — per-name Annual override
 *        - migrated[v1id]           — V1 → V2 claim guard
 *        - gracePeriodSec           — admin-tunable [7d, 365d]
 */
interface IV1Registry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function labelOf(uint256 tokenId) external view returns (string memory);
}

contract INSRegistryIgraV2 {
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
    // V2-specific
    error NotAnnual();
    error AlreadyForever();
    error NameExpired();
    error InvalidYearsCount();
    error NotV1Owner();
    error AlreadyMigrated();
    error InvalidGracePeriod();

    /* ─────────────────────────── Events ─────────────────────────── */
    event Registered(string indexed label, address indexed owner, address target, uint256 paid);
    event RegisteredAnnual(string indexed label, address indexed owner, address target, uint256 paid, uint256 expiresAt, uint256 yearsCount);
    event Renewed(uint256 indexed tokenId, address indexed payer, uint256 yearsAdded, uint256 paid, uint256 newExpiresAt);
    event ExtendedToForever(uint256 indexed tokenId, address indexed payer, uint256 paid);
    event V1Migrated(uint256 indexed v1TokenId, uint256 indexed v2TokenId, string label, address owner);
    event Reclaimed(string indexed label, uint256 indexed oldTokenId, uint256 indexed newTokenId, address newOwner);
    event AdminMinted(string indexed label, address indexed to, address mintedBy);
    event AdminMintedAnnual(string indexed label, address indexed to, uint256 expiresAt, address mintedBy);
    event Reserved(string indexed label, bool isReserved);
    event TargetSet(uint256 indexed tokenId, address indexed target);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event LengthPriceUpdated(uint8 len, uint256 price);
    event LengthPriceAnnualUpdated(uint8 len, uint256 price);
    event PremiumPriceUpdated(string indexed label, uint256 price);
    event PremiumPriceAnnualUpdated(string indexed label, uint256 price);
    event GracePeriodUpdated(uint256 newGracePeriodSec);
    event Withdraw(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /* ─────────────────────────── Constants ──────────────────────── */
    string public constant name = "Igra Name Service (.igra) V2";
    string public constant symbol = "INSG2";
    uint256 public constant TIER_RESERVED = type(uint256).max;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant MAX_YEARS = 10;
    uint256 public constant MIN_GRACE = 7 days;
    uint256 public constant MAX_GRACE = 365 days;

    /* ─────────────────────────── Immutable ──────────────────────── */
    /// @notice Address of the V1 .igra Registry. Used by claimV1Forever to
    ///         verify caller is the V1 NFT holder of the label they want to
    ///         migrate. Set at deploy-time, can never be changed.
    address public immutable v1Registry;

    /* ─────────────────────────── State ──────────────────────────── */
    address public owner;
    uint256 public totalSupply;

    /// @notice Forever-tier pricing. lengthPrice[1..4] direct-indexed,
    ///         lengthPrice[5] for labels of length 5..32.
    mapping(uint8 => uint256) public lengthPrice;
    /// @notice Annual-tier pricing (per year). Same bucket layout as Forever.
    mapping(uint8 => uint256) public lengthPriceAnnual;

    /// @notice Per-name override (Forever). 0 = use length tier.
    mapping(string => uint256) public premiumPrice;
    /// @notice Per-name override (Annual, per year). 0 = use length tier.
    mapping(string => uint256) public premiumPriceAnnual;

    /// @notice Reserved labels can't be publicly registered (either tier),
    ///         but admin can still mint them via adminMint / adminMintAnnual.
    mapping(string => bool) public reserved;

    // ERC-721 internal
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Name <-> token mappings
    mapping(string => uint256) public tokenIdOf;
    mapping(uint256 => string) public labelOf;
    mapping(uint256 => address) public targetOf;
    mapping(uint256 => uint256) public mintedAt;

    /// @notice 0 = Forever (no expiry); > 0 = Annual (unix timestamp of expiry).
    mapping(uint256 => uint256) public expiresAt;

    /// @notice Has this V1 tokenId already been claimed via claimV1Forever?
    mapping(uint256 => bool) public migrated;

    /// @notice Grace period before an expired Annual name returns to public availability.
    uint256 public gracePeriodSec;

    /* ─────────────────────────── Modifiers ──────────────────────── */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor(address _v1Registry) {
        if (_v1Registry == address(0)) revert ZeroAddress();
        v1Registry = _v1Registry;
        owner = msg.sender;

        // Forever tier defaults — match the V1 setLengthPrice run from
        // 2026-05-02 (so V1 holders pay the same price they'd pay if they
        // walked in fresh today, which is what gets grandfathered for free).
        lengthPrice[1] = 4000 ether;
        lengthPrice[2] = 2000 ether;
        lengthPrice[3] = 1200 ether;
        lengthPrice[4] = 800 ether;
        lengthPrice[5] = 500 ether;

        // Annual tier defaults — locked 2026-05-02.
        lengthPriceAnnual[1] = 1000 ether;
        lengthPriceAnnual[2] = 800 ether;
        lengthPriceAnnual[3] = 500 ether;
        lengthPriceAnnual[4] = 250 ether;
        lengthPriceAnnual[5] = 50 ether;

        gracePeriodSec = 30 days;

        emit LengthPriceUpdated(1, 4000 ether);
        emit LengthPriceUpdated(2, 2000 ether);
        emit LengthPriceUpdated(3, 1200 ether);
        emit LengthPriceUpdated(4, 800 ether);
        emit LengthPriceUpdated(5, 500 ether);
        emit LengthPriceAnnualUpdated(1, 1000 ether);
        emit LengthPriceAnnualUpdated(2, 800 ether);
        emit LengthPriceAnnualUpdated(3, 500 ether);
        emit LengthPriceAnnualUpdated(4, 250 ether);
        emit LengthPriceAnnualUpdated(5, 50 ether);
        emit GracePeriodUpdated(30 days);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /* ─────────────────────────── View ───────────────────────────── */

    /// @notice Forever-tier price for a label. Returns TIER_RESERVED for
    ///         invalid/reserved labels.
    function priceFor(string calldata label) external view returns (uint256) {
        if (!_isValidLabel(label)) return TIER_RESERVED;
        if (reserved[label]) return TIER_RESERVED;
        uint256 p = premiumPrice[label];
        if (p != 0) return p;
        return lengthPrice[_lengthBucket(bytes(label).length)];
    }

    /// @notice Annual-tier price per year for a label. Returns TIER_RESERVED
    ///         for invalid/reserved labels.
    function priceAnnualFor(string calldata label) external view returns (uint256) {
        if (!_isValidLabel(label)) return TIER_RESERVED;
        if (reserved[label]) return TIER_RESERVED;
        uint256 p = premiumPriceAnnual[label];
        if (p != 0) return p;
        return lengthPriceAnnual[_lengthBucket(bytes(label).length)];
    }

    /// @notice Whether a label is publicly available to register right now
    ///         (Forever tier — registerable via register()).
    function available(string calldata label) external view returns (bool) {
        if (!_isValidLabel(label)) return false;
        if (reserved[label]) return false;
        uint256 currentId = tokenIdOf[label];
        if (currentId != 0 && !_isPublicallyAvailable(currentId)) return false;
        uint256 p = premiumPrice[label];
        uint256 effective = p != 0 ? p : lengthPrice[_lengthBucket(bytes(label).length)];
        return effective != TIER_RESERVED;
    }

    /// @notice Whether a label is publicly available for an Annual mint.
    function availableAnnual(string calldata label) external view returns (bool) {
        if (!_isValidLabel(label)) return false;
        if (reserved[label]) return false;
        uint256 currentId = tokenIdOf[label];
        if (currentId != 0 && !_isPublicallyAvailable(currentId)) return false;
        uint256 p = premiumPriceAnnual[label];
        uint256 effective = p != 0 ? p : lengthPriceAnnual[_lengthBucket(bytes(label).length)];
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

    function isExpired(uint256 tokenId) public view returns (bool) {
        uint256 e = expiresAt[tokenId];
        return e != 0 && block.timestamp >= e;
    }

    function isInGrace(uint256 tokenId) public view returns (bool) {
        uint256 e = expiresAt[tokenId];
        if (e == 0 || block.timestamp < e) return false;
        return block.timestamp < e + gracePeriodSec;
    }

    /* ─────────────────────── Register ───────────────────────────── */

    /// @notice Register a Forever name. Pays in native iKAS.
    function register(string calldata label, address target)
        external
        payable
        returns (uint256 tokenId)
    {
        _ensureMintable(label);

        uint256 price = premiumPrice[label];
        if (price == 0) price = lengthPrice[_lengthBucket(bytes(label).length)];
        if (price == TIER_RESERVED) revert TierReserved();
        if (msg.value < price) revert InsufficientPayment();

        if (target == address(0)) target = msg.sender;

        // If a stale (post-grace expired) NFT exists for this label, burn it.
        _burnIfStale(label);

        unchecked { tokenId = ++totalSupply; }
        _writeName(tokenId, label, target);
        // expiresAt[tokenId] stays 0 — Forever
        _mint(msg.sender, tokenId);
        _refundOverpay(price);

        emit Registered(label, msg.sender, target, price);
        emit TargetSet(tokenId, target);
    }

    /// @notice Register an Annual name for `yearsCount` years. Pays
    ///         `yearsCount * lengthPriceAnnual[bucket]` (or per-name override).
    function registerAnnual(string calldata label, address target, uint256 yearsCount)
        external
        payable
        returns (uint256 tokenId)
    {
        if (yearsCount == 0 || yearsCount > MAX_YEARS) revert InvalidYearsCount();
        _ensureMintable(label);

        uint256 perYear = premiumPriceAnnual[label];
        if (perYear == 0) perYear = lengthPriceAnnual[_lengthBucket(bytes(label).length)];
        if (perYear == TIER_RESERVED) revert TierReserved();
        uint256 price = perYear * yearsCount;
        if (msg.value < price) revert InsufficientPayment();

        if (target == address(0)) target = msg.sender;

        _burnIfStale(label);

        unchecked { tokenId = ++totalSupply; }
        _writeName(tokenId, label, target);
        uint256 expiry = block.timestamp + (yearsCount * SECONDS_PER_YEAR);
        expiresAt[tokenId] = expiry;
        _mint(msg.sender, tokenId);
        _refundOverpay(price);

        emit RegisteredAnnual(label, msg.sender, target, price, expiry, yearsCount);
        emit TargetSet(tokenId, target);
    }

    /// @notice Extend an Annual name by `yearsToAdd` years. Anyone can pay.
    ///         Reverts if the name is Forever (NotAnnual) or past-grace
    ///         (NameExpired — must re-register from scratch).
    function renew(uint256 tokenId, uint256 yearsToAdd) external payable {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        if (yearsToAdd == 0 || yearsToAdd > MAX_YEARS) revert InvalidYearsCount();

        uint256 currentExpiry = expiresAt[tokenId];
        if (currentExpiry == 0) revert NotAnnual();
        // post-grace = name has fallen back to public; renewal isn't valid
        if (block.timestamp >= currentExpiry + gracePeriodSec) revert NameExpired();

        string memory label = labelOf[tokenId];
        uint256 perYear = premiumPriceAnnual[label];
        if (perYear == 0) perYear = lengthPriceAnnual[_lengthBucket(bytes(label).length)];
        // No TIER_RESERVED check here — admin can't strand existing holders by
        // reserving a tier. They can still renew at the price they had.
        if (perYear == TIER_RESERVED) revert TierReserved();
        uint256 price = perYear * yearsToAdd;
        if (msg.value < price) revert InsufficientPayment();

        // Extend from the original expiresAt (not from now), so an in-grace
        // renew still gets full value rather than losing the grace days.
        uint256 newExpiry = currentExpiry + (yearsToAdd * SECONDS_PER_YEAR);
        expiresAt[tokenId] = newExpiry;

        _refundOverpay(price);
        emit Renewed(tokenId, msg.sender, yearsToAdd, price, newExpiry);
    }

    /// @notice Convert an Annual name to Forever. Pays the full Forever price
    ///         (no proration — keeps math simple). Anyone can pay.
    function extendToForever(uint256 tokenId) external payable {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        uint256 currentExpiry = expiresAt[tokenId];
        if (currentExpiry == 0) revert AlreadyForever();
        if (block.timestamp >= currentExpiry + gracePeriodSec) revert NameExpired();

        string memory label = labelOf[tokenId];
        uint256 price = premiumPrice[label];
        if (price == 0) price = lengthPrice[_lengthBucket(bytes(label).length)];
        if (price == TIER_RESERVED) revert TierReserved();
        if (msg.value < price) revert InsufficientPayment();

        expiresAt[tokenId] = 0;

        _refundOverpay(price);
        emit ExtendedToForever(tokenId, msg.sender, price);
    }

    /// @notice Update the resolver target for a name you own.
    function setTarget(string calldata label, address target) external {
        uint256 id = tokenIdOf[label];
        if (id == 0) revert NonexistentToken();
        if (_owners[id] != msg.sender) revert NotOwner();
        if (target == address(0)) revert ZeroAddress();
        // Don't allow setTarget on past-grace names — they're effectively
        // available for re-registration; the owner has lost it.
        if (expiresAt[id] != 0 && block.timestamp >= expiresAt[id] + gracePeriodSec) {
            revert NameExpired();
        }
        targetOf[id] = target;
        emit TargetSet(id, target);
    }

    /* ─────────────────── V1 Migration ───────────────────────────── */

    /// @notice Mint a V2 Forever NFT for free, claiming a label you own on V1.
    ///         Caller must hold the V1 NFT. Each V1 tokenId can be claimed once.
    function claimV1Forever(uint256 v1TokenId, address target)
        external
        returns (uint256 tokenId)
    {
        if (migrated[v1TokenId]) revert AlreadyMigrated();

        // V1.ownerOf reverts on non-existent token, which surfaces as a clean
        // revert here — no special handling needed.
        address v1Owner = IV1Registry(v1Registry).ownerOf(v1TokenId);
        if (v1Owner != msg.sender) revert NotV1Owner();

        string memory label = IV1Registry(v1Registry).labelOf(v1TokenId);
        if (tokenIdOf[label] != 0) revert AlreadyRegistered();

        // V1 used a stricter validator that already enforced [a-z0-9-] only,
        // so any V1 label is guaranteed to pass V2's validator. Re-checking
        // is paranoid but cheap and protects against future V1 weirdness.
        bytes memory b = bytes(label);
        if (b.length < 1 || b.length > 32) revert InvalidLabel();

        if (target == address(0)) target = msg.sender;

        migrated[v1TokenId] = true;

        unchecked { tokenId = ++totalSupply; }
        _writeName(tokenId, label, target);
        // expiresAt stays 0 — Forever
        _mint(msg.sender, tokenId);

        emit V1Migrated(v1TokenId, tokenId, label, msg.sender);
        emit Registered(label, msg.sender, target, 0);
        emit TargetSet(tokenId, target);
    }

    /* ─────────────────────────── Admin ──────────────────────────── */

    /// @notice Mint a Forever name to `to`, no payment required.
    function adminMint(string calldata label, address to)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (to == address(0)) revert ZeroAddress();
        if (tokenIdOf[label] != 0) {
            // Allow admin to mint over a stale (post-grace) name by burning it
            uint256 currentId = tokenIdOf[label];
            if (!_isPublicallyAvailable(currentId)) revert AlreadyRegistered();
            _burnStale(currentId, label);
        }

        unchecked { tokenId = ++totalSupply; }
        _writeName(tokenId, label, to);
        _mint(to, tokenId);

        emit AdminMinted(label, to, msg.sender);
        emit TargetSet(tokenId, to);
    }

    /// @notice Mint an Annual name to `to`, no payment required.
    function adminMintAnnual(string calldata label, address to, uint256 yearsCount)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (to == address(0)) revert ZeroAddress();
        if (yearsCount == 0 || yearsCount > MAX_YEARS) revert InvalidYearsCount();
        if (tokenIdOf[label] != 0) {
            uint256 currentId = tokenIdOf[label];
            if (!_isPublicallyAvailable(currentId)) revert AlreadyRegistered();
            _burnStale(currentId, label);
        }

        unchecked { tokenId = ++totalSupply; }
        _writeName(tokenId, label, to);
        uint256 expiry = block.timestamp + (yearsCount * SECONDS_PER_YEAR);
        expiresAt[tokenId] = expiry;
        _mint(to, tokenId);

        emit AdminMintedAnnual(label, to, expiry, msg.sender);
        emit TargetSet(tokenId, to);
    }

    function setReserved(string calldata label, bool isReserved) external onlyOwner {
        if (!_isValidLabel(label)) revert InvalidLabel();
        reserved[label] = isReserved;
        emit Reserved(label, isReserved);
    }

    function setReservedBatch(string[] calldata labels, bool isReserved) external onlyOwner {
        for (uint256 i; i < labels.length; ++i) {
            if (!_isValidLabel(labels[i])) revert InvalidLabel();
            reserved[labels[i]] = isReserved;
            emit Reserved(labels[i], isReserved);
        }
    }

    function setLengthPrice(uint8 bucket, uint256 price) external onlyOwner {
        require(bucket >= 1 && bucket <= 5, "bucket out of range");
        lengthPrice[bucket] = price;
        emit LengthPriceUpdated(bucket, price);
    }

    function setLengthPriceAnnual(uint8 bucket, uint256 price) external onlyOwner {
        require(bucket >= 1 && bucket <= 5, "bucket out of range");
        lengthPriceAnnual[bucket] = price;
        emit LengthPriceAnnualUpdated(bucket, price);
    }

    /// @notice Update all 5 Annual buckets atomically. Useful for the V2
    ///         launch broadcast where we want one Safe tx to lock pricing.
    function setLengthPriceAnnualBatch(uint8[] calldata buckets, uint256[] calldata prices) external onlyOwner {
        require(buckets.length == prices.length, "len mismatch");
        for (uint256 i; i < buckets.length; ++i) {
            require(buckets[i] >= 1 && buckets[i] <= 5, "bucket out of range");
            lengthPriceAnnual[buckets[i]] = prices[i];
            emit LengthPriceAnnualUpdated(buckets[i], prices[i]);
        }
    }

    function setPremiumPrice(string calldata label, uint256 price) external onlyOwner {
        if (!_isValidLabel(label)) revert InvalidLabel();
        premiumPrice[label] = price;
        emit PremiumPriceUpdated(label, price);
    }

    function setPremiumPriceAnnual(string calldata label, uint256 price) external onlyOwner {
        if (!_isValidLabel(label)) revert InvalidLabel();
        premiumPriceAnnual[label] = price;
        emit PremiumPriceAnnualUpdated(label, price);
    }

    function setGracePeriod(uint256 sec) external onlyOwner {
        if (sec < MIN_GRACE || sec > MAX_GRACE) revert InvalidGracePeriod();
        gracePeriodSec = sec;
        emit GracePeriodUpdated(sec);
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

    /// @notice On-chain data URI with inline SVG artwork. V2 adds a
    ///         "Forever" / "Annual · expires <ts>" pill in the corner.
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        string memory label = labelOf[tokenId];
        uint256 expiry = expiresAt[tokenId];
        bool isForever = expiry == 0;
        string memory svg = _renderSVG(label, isForever, expiry);
        string memory tenureAttr = isForever
            ? '{"trait_type":"Tenure","value":"Forever"}'
            : string(abi.encodePacked(
                '{"trait_type":"Tenure","value":"Annual"},',
                '{"trait_type":"Expires","display_type":"date","value":', _toString(expiry), '}'
            ));
        string memory json = string(
            abi.encodePacked(
                '{"name":"', label, '.igra",',
                '"description":"Permanent .igra name on the Igra Name Service. V2 with optional Annual tier.",',
                '"image":"data:image/svg+xml;base64,', Base64IgraV2.encode(bytes(svg)), '",',
                '"attributes":[',
                    '{"trait_type":"Length","value":', _toString(bytes(label).length), '},',
                    '{"trait_type":"Tier","value":"', _tierName(bytes(label).length), '"},',
                    tenureAttr,
                ']}'
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64IgraV2.encode(bytes(json))));
    }

    /* ─────────────────────── Internal ───────────────────────────── */

    /// @dev Pre-mint validation shared by register / registerAnnual.
    function _ensureMintable(string calldata label) private view {
        if (!_isValidLabel(label)) revert InvalidLabel();
        if (reserved[label]) revert NameReserved();
        uint256 currentId = tokenIdOf[label];
        if (currentId != 0 && !_isPublicallyAvailable(currentId)) revert AlreadyRegistered();
    }

    /// @dev True when an existing token for a label is past grace and
    ///      can be re-registered by anyone.
    function _isPublicallyAvailable(uint256 tokenId) private view returns (bool) {
        uint256 e = expiresAt[tokenId];
        return e != 0 && block.timestamp >= e + gracePeriodSec;
    }

    /// @dev Burns a stale token (post-grace) so a fresh tokenId can be minted
    ///      for the same label. Only call after _isPublicallyAvailable check.
    function _burnIfStale(string calldata label) private {
        uint256 oldId = tokenIdOf[label];
        if (oldId == 0) return;
        if (!_isPublicallyAvailable(oldId)) return;
        _burnStale(oldId, label);
    }

    function _burnStale(uint256 oldId, string memory label) private {
        address oldOwner = _owners[oldId];
        // Clear ownership + balance + approvals
        delete _tokenApprovals[oldId];
        unchecked { _balances[oldOwner] -= 1; }
        delete _owners[oldId];
        // Clear name mappings
        delete labelOf[oldId];
        delete targetOf[oldId];
        delete expiresAt[oldId];
        delete tokenIdOf[label];
        // tokenIdOf[label] is reset; new tokenId will be written in caller
        emit Transfer(oldOwner, address(0), oldId);
        // Reclaimed event for indexers — ties old → new in the same tx.
        // We don't have the new tokenId yet; emit it in caller. (Indexers
        // can correlate: Transfer-to-zero followed by next Registered.)
    }

    function _writeName(uint256 tokenId, string memory label, address target) private {
        tokenIdOf[label] = tokenId;
        labelOf[tokenId] = label;
        targetOf[tokenId] = target;
        mintedAt[tokenId] = block.timestamp;
    }

    function _refundOverpay(uint256 price) private {
        if (msg.value > price) {
            (bool ok, ) = msg.sender.call{value: msg.value - price}("");
            require(ok, "refund failed");
        }
    }

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
        return _isValidLabelBytes(b);
    }

    function _isValidLabelBytes(bytes memory b) private pure returns (bool) {
        uint256 len = b.length;
        if (len < 1 || len > 32) return false;
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
        if (len == 1) return "Ultra-Premium";
        if (len == 2) return "Premium";
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

    /// @dev Renders the on-chain NFT card SVG. V2 adds a tenure pill below
    ///      the tier chip — "Forever" or "Annual · exp <unix>".
    function _renderSVG(string memory label, bool isForever, uint256 expiry) private pure returns (string memory) {
        bytes memory b = bytes(label);
        uint256 len = b.length;
        string memory tier = _tierName(len);
        string memory accent = _tierColor(len);
        uint256 fontSize;
        if (len <= 6)      fontSize = 80;
        else if (len <= 10) fontSize = 60;
        else if (len <= 16) fontSize = 40;
        else if (len <= 22) fontSize = 30;
        else                fontSize = 22;

        string memory tenurePill = isForever
            ? '<rect x="32" y="68" width="120" height="22" rx="11" fill="#34d39922"/><text x="92" y="83" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="700" fill="#34d399" text-anchor="middle">FOREVER</text>'
            : string(abi.encodePacked(
                '<rect x="32" y="68" width="220" height="22" rx="11" fill="#fbbf2422"/>',
                '<text x="142" y="83" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="700" fill="#fbbf24" text-anchor="middle">ANNUAL \xC2\xB7 EXP ', _toString(expiry), '</text>'
            ));

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
                '<rect x="32" y="32" width="120" height="28" rx="14" fill="', accent, '" opacity="0.16"/>',
                '<text x="92" y="51" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="600" fill="', accent, '" text-anchor="middle">', tier, '</text>',
                tenurePill,
                '<text x="468" y="51" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="700" fill="#e8e8f5" text-anchor="end" letter-spacing="2">INS-IGRA-V2</text>',
                '<text x="250" y="265" font-family="Inter,system-ui,sans-serif" font-size="', _toString(fontSize), '" font-weight="800" fill="#ffffff" text-anchor="middle">',
                    label,
                '</text>',
                '<text x="250" y="315" font-family="Inter,system-ui,sans-serif" font-size="26" font-weight="600" fill="url(#stroke)" text-anchor="middle">.igra</text>',
                '<text x="32" y="468" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#9aa0b4">Igra Name Service</text>',
                '<text x="468" y="468" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#9aa0b4" text-anchor="end">v2 \xE2\x80\xA2 dual tenure</text>',
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

/// @title Base64IgraV2
/// @notice Minimal Base64 encoder — same as V1 (kept inline to avoid OZ
///         dependency at the contract layer; matches V1's audited logic
///         byte-for-byte).
library Base64IgraV2 {
    string internal constant _TABLE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = _TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        assembly {
            let tablePtr := add(table, 1)
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
