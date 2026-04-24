// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC721Min {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title INSMarketplace
 * @notice Zero-custody marketplace for .ins names.
 *
 * @dev Design notes:
 *   - The NFT never leaves the seller's wallet while listed. Sellers grant
 *     a one-time `setApprovalForAll(marketplace, true)` on the Registry;
 *     the marketplace pulls the NFT only at sale time via `safeTransferFrom`.
 *   - Listings are stored on-chain keyed by tokenId. Each token can have
 *     at most one active listing at a time.
 *   - A listing is considered "dead" (treat as unlisted on reads) if:
 *       • active == false, OR
 *       • block.timestamp > expiry, OR
 *       • the seller no longer owns the underlying token.
 *     `buyListing` enforces all three at fill time.
 *
 * @dev Fees (bps = basis points, 10000 = 100%):
 *   - Sale fee:      2% of price, withheld from seller proceeds at fill,
 *                    routed to `treasury`.
 *   - Feature fee:   1% of list price, paid upfront by the seller when
 *                    creating a promoted listing, routed to `treasury`.
 *                    Non-refundable (it's a promotion, not an escrow).
 *   - Buyer fee:     0%. Buyers pay exactly the listed price.
 *   - Listing fee:   0%. Creating a non-featured listing is gas-only.
 *   - Creator fee:   0%. No royalty on sales.
 *
 * @dev Admin-updatable (via `owner`): treasury address, sale fee bps,
 *      feature fee bps, and a kill-switch `paused` for emergencies.
 *      Both fee bps are hard-capped at 500 (5%) so a compromised owner
 *      can't extract more than that from existing listings.
 */
contract INSMarketplace {
    /* ─────────────────────────── Errors ─────────────────────────── */
    error NotOwner();
    error ZeroAddress();
    error Paused();
    error NotSeller();
    error ListingInactive();
    error ListingExpired();
    error SellerLostOwnership();
    error NotApproved();
    error InvalidPrice();
    error InvalidExpiry();
    error IncorrectPayment();
    error FeeCapExceeded();
    error PayoutFailed();
    error NotRegistryNft();
    error AlreadyListed();
    error Reentrancy();

    /* ─────────────────────────── Events ─────────────────────────── */
    event ListingCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint64 expiry,
        bool featured
    );
    event ListingUpdated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 newPrice,
        uint64 newExpiry
    );
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event ListingSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 fee
    );
    event ListingFeatured(uint256 indexed tokenId, address indexed seller, uint256 feePaid);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event SaleFeeUpdated(uint16 previousBps, uint16 newBps);
    event FeatureFeeUpdated(uint16 previousBps, uint16 newBps);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PausedSet(bool paused);

    /* ─────────────────────────── Types ───────────────────────────── */
    struct Listing {
        address seller;   // slot 1 — 20 bytes
        uint64 expiry;    // slot 1 — 8  bytes (unix seconds)
        bool featured;    // slot 1 — 1  byte
        bool active;      // slot 1 — 1  byte
        uint256 price;    // slot 2 — 32 bytes (wei)
    }

    /* ─────────────────────────── Config ──────────────────────────── */
    uint16 public constant FEE_CAP_BPS = 500;       // 5% hard ceiling
    uint16 public constant BPS_DENOM   = 10_000;

    IERC721Min public immutable registry;           // INSRegistry (set in ctor)
    address public owner;
    address public treasury;
    uint16  public saleFeeBps    = 200;             // 2%
    uint16  public featureFeeBps = 100;             // 1%
    bool    public paused;

    /// @dev Reentrancy guard. 1 = unlocked, 2 = locked. Starts unlocked.
    ///      Guards `createListing` and `buyListing` because both make external
    ///      calls (treasury payout, safeTransferFrom to buyer) and the
    ///      Registry could in future versions add an ERC721Receiver callback
    ///      on safeTransferFrom. This is defence-in-depth — current Registry
    ///      doesn't invoke hooks, but a future swap shouldn't silently widen
    ///      attack surface.
    uint256 private _reentrancyStatus = 1;

    /// @dev tokenId → current listing. Absence or active=false means unlisted.
    mapping(uint256 => Listing) public listings;

    /* ─────────────────────────── Modifiers ───────────────────────── */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == 2) revert Reentrancy();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    /* ─────────────────────────── Ctor ────────────────────────────── */
    constructor(address _registry, address _treasury) {
        if (_registry == address(0) || _treasury == address(0)) revert ZeroAddress();
        registry = IERC721Min(_registry);
        treasury = _treasury;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        emit TreasuryUpdated(address(0), _treasury);
    }

    /* ─────────────────────────── Seller actions ──────────────────── */

    /**
     * @notice List a name for sale. Caller must own the token and have
     *         granted approval to this contract (either token-level or
     *         operator-level). If `featured` is true, caller must send
     *         exactly `featureFeeBps * price / 10000` in iKAS as msg.value;
     *         otherwise msg.value must be 0.
     * @param tokenId   The INS tokenId being listed.
     * @param price     Sale price in wei. Must be > 0.
     * @param expiry    Unix timestamp after which the listing can no longer
     *                  be filled. Must be strictly greater than now.
     * @param featured  True to promote the listing (pays 1% upfront, non-refundable).
     */
    function createListing(
        uint256 tokenId,
        uint256 price,
        uint64 expiry,
        bool featured
    ) external payable whenNotPaused nonReentrant {
        if (price == 0) revert InvalidPrice();
        if (expiry <= block.timestamp) revert InvalidExpiry();
        if (registry.ownerOf(tokenId) != msg.sender) revert NotSeller();
        if (
            registry.getApproved(tokenId) != address(this) &&
            !registry.isApprovedForAll(msg.sender, address(this))
        ) revert NotApproved();

        Listing storage existing = listings[tokenId];
        if (existing.active) revert AlreadyListed();

        uint256 featureFee = 0;
        if (featured) {
            featureFee = (price * featureFeeBps) / BPS_DENOM;
            if (msg.value != featureFee) revert IncorrectPayment();
        } else {
            if (msg.value != 0) revert IncorrectPayment();
        }

        listings[tokenId] = Listing({
            seller: msg.sender,
            expiry: expiry,
            featured: featured,
            active: true,
            price: price
        });

        emit ListingCreated(tokenId, msg.sender, price, expiry, featured);

        if (featureFee > 0) {
            (bool ok, ) = payable(treasury).call{value: featureFee}("");
            if (!ok) revert PayoutFailed();
            emit ListingFeatured(tokenId, msg.sender, featureFee);
        }
    }

    /**
     * @notice Update price and/or expiry on an existing listing without
     *         cancelling it. Cannot change featured status (re-list to
     *         toggle). Owner-only.
     */
    function updateListing(
        uint256 tokenId,
        uint256 newPrice,
        uint64 newExpiry
    ) external whenNotPaused {
        Listing storage l = listings[tokenId];
        if (!l.active) revert ListingInactive();
        if (l.seller != msg.sender) revert NotSeller();
        if (newPrice == 0) revert InvalidPrice();
        if (newExpiry <= block.timestamp) revert InvalidExpiry();

        l.price = newPrice;
        l.expiry = newExpiry;

        emit ListingUpdated(tokenId, msg.sender, newPrice, newExpiry);
    }

    /**
     * @notice Cancel an active listing. Seller-only. Feature fee is NOT
     *         refunded — it was paid for promotion time, not as escrow.
     * @dev    Intentionally NOT gated by `whenNotPaused`: during an emergency
     *         pause, sellers must always retain the ability to exit positions
     *         (the only other escape would be the NFT moving out of the
     *         seller's wallet, which invalidates the listing via the
     *         `SellerLostOwnership` check on fill). updateListing IS
     *         paused-gated — a paused marketplace freezes price changes but
     *         never traps sellers.
     */
    function cancelListing(uint256 tokenId) external {
        Listing storage l = listings[tokenId];
        if (!l.active) revert ListingInactive();
        if (l.seller != msg.sender) revert NotSeller();

        delete listings[tokenId];
        emit ListingCancelled(tokenId, msg.sender);
    }

    /* ─────────────────────────── Buyer action ────────────────────── */

    /**
     * @notice Buy a listed name. Pays exactly `listing.price` in iKAS.
     *         2% goes to the treasury; the remaining 98% goes to the seller.
     *         NFT transfer happens in a single tx via `safeTransferFrom`.
     */
    function buyListing(uint256 tokenId) external payable whenNotPaused nonReentrant {
        Listing memory l = listings[tokenId];
        if (!l.active) revert ListingInactive();
        if (block.timestamp > l.expiry) revert ListingExpired();
        if (msg.value != l.price) revert IncorrectPayment();
        if (registry.ownerOf(tokenId) != l.seller) revert SellerLostOwnership();

        // Clear state BEFORE external calls (CEI).
        delete listings[tokenId];

        uint256 fee = (l.price * saleFeeBps) / BPS_DENOM;
        uint256 sellerAmount = l.price - fee;

        registry.safeTransferFrom(l.seller, msg.sender, tokenId);

        if (fee > 0) {
            (bool a, ) = payable(treasury).call{value: fee}("");
            if (!a) revert PayoutFailed();
        }
        (bool b, ) = payable(l.seller).call{value: sellerAmount}("");
        if (!b) revert PayoutFailed();

        emit ListingSold(tokenId, l.seller, msg.sender, l.price, fee);
    }

    /* ─────────────────────────── Reads ───────────────────────────── */

    /// @notice Returns the listing for a token, but zeroed out if it has
    ///         expired or the seller no longer owns the token. Frontends can
    ///         check `.active` as the single "is this buyable?" flag.
    function getActiveListing(uint256 tokenId) external view returns (Listing memory) {
        Listing memory l = listings[tokenId];
        if (!l.active) return _empty();
        if (block.timestamp > l.expiry) return _empty();
        // Seller must still own; if not, treat as dead.
        try registry.ownerOf(tokenId) returns (address o) {
            if (o != l.seller) return _empty();
        } catch {
            return _empty();
        }
        return l;
    }

    /// @notice Computed live sale fee on a given price.
    function saleFeeOn(uint256 price) external view returns (uint256) {
        return (price * saleFeeBps) / BPS_DENOM;
    }

    /// @notice Computed featured-listing upfront fee on a given price.
    function featureFeeOn(uint256 price) external view returns (uint256) {
        return (price * featureFeeBps) / BPS_DENOM;
    }

    /* ─────────────────────────── Admin ───────────────────────────── */

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function setSaleFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > FEE_CAP_BPS) revert FeeCapExceeded();
        emit SaleFeeUpdated(saleFeeBps, newBps);
        saleFeeBps = newBps;
    }

    function setFeatureFeeBps(uint16 newBps) external onlyOwner {
        if (newBps > FEE_CAP_BPS) revert FeeCapExceeded();
        emit FeatureFeeUpdated(featureFeeBps, newBps);
        featureFeeBps = newBps;
    }

    function setPaused(bool v) external onlyOwner {
        paused = v;
        emit PausedSet(v);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /* ─────────────────────────── Internal ────────────────────────── */

    function _empty() private pure returns (Listing memory) {
        return Listing({seller: address(0), expiry: 0, featured: false, active: false, price: 0});
    }
}
