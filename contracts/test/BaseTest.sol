// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSRegistry} from "../src/INSRegistry.sol";
import {INSResolver} from "../src/INSResolver.sol";
import {INSReverseResolver} from "../src/INSReverseResolver.sol";
import {INSMarketplace} from "../src/INSMarketplace.sol";

/**
 * @title BaseTest
 * @notice Shared fixtures + helpers for the INSdomains test suite.
 *
 * @dev Inspired by an upstream scaffold contributed by an external dev,
 *      rewritten here to match the real on-chain interfaces of our
 *      contracts (custom errors, no-arg Registry ctor, 4-arg createListing,
 *      ENS-style namehash, etc.).
 *
 *      Every test file in this suite inherits from this contract:
 *      - All four contracts are deployed under one `owner` (the admin role)
 *      - Three test wallets (alice, bob, charlie) are funded with 100k iKAS
 *      - Tier prices are left at the contract defaults so a stock deployment
 *        from `INSRegistry.sol` can be exercised end-to-end without per-test
 *        setLengthPrice plumbing
 *
 *      Reusable helpers are provided for the patterns that appear in every
 *      test file: registering a name, listing on the marketplace, computing
 *      ENS-spec namehashes, and asserting custom-error reverts.
 *
 *      For wallet / Igra developers integrating against an INS deployment,
 *      this file doubles as a reference: the helpers show the exact call
 *      shapes you need on each contract.
 */
contract BaseTest is Test {
    /* ─────────────────────────── Pricing tiers ──────────────────────
     * These match the contract DEFAULTS in INSRegistry.sol's constructor.
     * If you re-tune via `setLengthPrice` in your own setUp, override these
     * constants in the inheriting test class.
     */
    uint256 internal constant PRICE_2_CHAR = 5000 ether;   // 5,000 iKAS
    uint256 internal constant PRICE_3_CHAR = 500 ether;    // 500 iKAS
    uint256 internal constant PRICE_4_CHAR = 50 ether;     // 50 iKAS
    uint256 internal constant PRICE_5_PLUS = 10 ether;     // 10 iKAS (5..32 chars)
    // 1-char is `TIER_RESERVED` — readable via `registry.TIER_RESERVED()`.
    // Public registration of 1-char names always reverts; only `adminMint`
    // can mint them.

    /* ─────────────────────────── Marketplace ───────────────────────── */
    uint16 internal constant SALE_FEE_BPS = 200;           // 2% (default)
    uint16 internal constant FEATURE_FEE_BPS = 100;        // 1% (default)
    uint16 internal constant FEE_CAP_BPS = 500;            // hard cap
    uint16 internal constant BPS_DENOM = 10_000;
    uint64 internal constant DEFAULT_LISTING_DURATION = 365 days;

    /* ─────────────────────────── Test wallets ──────────────────────── */
    address internal owner    = address(this);   // deployer + admin
    address internal alice    = makeAddr("alice");
    address internal bob      = makeAddr("bob");
    address internal charlie  = makeAddr("charlie");
    address internal treasury = makeAddr("treasury");

    /* ─────────────────────────── Contracts ─────────────────────────── */
    INSRegistry         internal registry;
    INSResolver         internal resolver;
    INSReverseResolver  internal reverseResolver;
    INSMarketplace      internal marketplace;

    /* ─────────────────────────── Setup ─────────────────────────────── */
    function setUp() public virtual {
        // Deploy the canonical stack as `owner`.
        registry         = new INSRegistry();
        resolver         = new INSResolver(address(registry));
        reverseResolver  = new INSReverseResolver(address(registry));
        marketplace      = new INSMarketplace(address(registry), treasury);

        // Fund the test wallets generously — 100k iKAS clears even a
        // 2-char-tier mint plus headroom for marketplace tests at 1k iKAS prices.
        vm.deal(alice,   100_000 ether);
        vm.deal(bob,     100_000 ether);
        vm.deal(charlie, 100_000 ether);
    }

    /* ─────────────────────────── Helpers: Registry ─────────────────── */

    /// @notice Compute the on-chain price the Registry would charge for `label`.
    function priceOf(string memory label) internal view returns (uint256) {
        return registry.priceFor(label);
    }

    /**
     * @notice Register `label` to `as_` with target=as_, paying the on-chain
     *         tier price exactly. Returns the tokenId.
     *         Reverts cleanly if the tier is reserved (1-char) or the label
     *         is invalid — caller's expectRevert applies normally.
     */
    function registerName(address as_, string memory label)
        internal
        returns (uint256 tokenId)
    {
        uint256 price = registry.priceFor(label);
        vm.prank(as_);
        tokenId = registry.register{value: price}(label, as_);
    }

    /// @notice As above, but resolves to `target` instead of `as_`.
    function registerNameWithTarget(
        address as_,
        string memory label,
        address target
    ) internal returns (uint256 tokenId) {
        uint256 price = registry.priceFor(label);
        vm.prank(as_);
        tokenId = registry.register{value: price}(label, target);
    }

    /* ─────────────────────────── Helpers: Marketplace ──────────────── */

    /**
     * @notice Approve marketplace + create a non-featured listing in one
     *         shot. Returns the tokenId being listed (callers usually
     *         already have it but this keeps test code symmetric with
     *         registerName).
     */
    function listForSale(
        address seller,
        uint256 tokenId,
        uint256 price
    ) internal returns (uint256) {
        vm.startPrank(seller);
        registry.setApprovalForAll(address(marketplace), true);
        marketplace.createListing(
            tokenId,
            price,
            uint64(block.timestamp + DEFAULT_LISTING_DURATION),
            false
        );
        vm.stopPrank();
        return tokenId;
    }

    /**
     * @notice Featured-listing variant. Caller must already hold the upfront
     *         feature fee; the helper reads `featureFeeBps` off the contract
     *         so it works even if you've tuned the bps in the test.
     */
    function listFeatured(
        address seller,
        uint256 tokenId,
        uint256 price
    ) internal returns (uint256 feePaid) {
        feePaid = (price * marketplace.featureFeeBps()) / BPS_DENOM;
        vm.startPrank(seller);
        registry.setApprovalForAll(address(marketplace), true);
        marketplace.createListing{value: feePaid}(
            tokenId,
            price,
            uint64(block.timestamp + DEFAULT_LISTING_DURATION),
            true
        );
        vm.stopPrank();
    }

    /// @notice Fee the Registry currently charges sellers, in wei, for `price`.
    function saleFeeOn(uint256 price) internal view returns (uint256) {
        return (price * marketplace.saleFeeBps()) / BPS_DENOM;
    }

    /* ─────────────────────────── Helpers: Resolver ─────────────────── */

    /**
     * @notice Compute an ENS-spec namehash for `<label>.igra`.
     *
     * @dev    Two-step recursion:
     *           node = keccak(0x00…00 ‖ keccak("igra"))
     *           node = keccak(node    ‖ keccak(label))
     *         Pure (no chain reads) — useful for pre-computing keys before
     *         calling resolver.cacheNode / setText.
     */
    function namehashIgra(string memory label) internal pure returns (bytes32 node) {
        node = keccak256(abi.encodePacked(bytes32(0), keccak256("igra")));
        node = keccak256(abi.encodePacked(node, keccak256(bytes(label))));
    }

    /* ─────────────────────────── Helpers: assertions ───────────────── */

    /// @notice Assert the address that owns `tokenId` on the Registry.
    function assertOwnerIs(address expected, uint256 tokenId) internal {
        assertEq(registry.ownerOf(tokenId), expected, "wrong NFT owner");
    }

    /// @notice Assert a name is currently reserved (admin-flagged).
    function assertReservedTrue(string memory label) internal view {
        assertTrue(registry.reserved(label), "expected reserved=true");
    }

    /// @notice Assert a name is currently NOT reserved.
    function assertReservedFalse(string memory label) internal view {
        assertFalse(registry.reserved(label), "expected reserved=false");
    }
}

/* ─────────────────────────── Auxiliary mocks ─────────────────────────
 *
 * Kept in this file (not separate) so any test that needs a contract
 * receiver can `import "./BaseTest.sol"` and instantiate without further
 * setup. The two flavours cover the happy + sad paths Marketplace cares
 * about: returning the magic value vs. reverting.
 */

/// @notice ERC-721 receiver that always returns the magic value.
contract MockGoodReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

/// @notice ERC-721 receiver that rejects every transfer.
contract MockBadReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        revert("MockBadReceiver: refused");
    }
}
