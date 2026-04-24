// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSRegistry} from "../src/INSRegistry.sol";
import {INSMarketplace} from "../src/INSMarketplace.sol";

contract INSMarketplaceTest is Test {
    INSRegistry reg;
    INSMarketplace mkt;

    address alice    = address(0xA11CE);
    address bob      = address(0xB0B);
    address carol    = address(0xCAF0);
    address treasury = address(0x7EA);

    // P5 tier cost for 5+ char names (10 iKAS)
    uint256 constant P5 = 10 ether;

    uint256 constant LIST_PRICE = 50 ether;
    uint64  constant WEEK_SECS  = 7 days;

    event ListingCreated(uint256 indexed tokenId, address indexed seller, uint256 price, uint64 expiry, bool featured);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event ListingSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event ListingFeatured(uint256 indexed tokenId, address indexed seller, uint256 feePaid);
    event ListingUpdated(uint256 indexed tokenId, address indexed seller, uint256 newPrice, uint64 newExpiry);

    function setUp() public {
        reg = new INSRegistry();
        mkt = new INSMarketplace(address(reg), treasury);

        vm.deal(alice,    10_000 ether);
        vm.deal(bob,      10_000 ether);
        vm.deal(carol,    10_000 ether);
        vm.deal(treasury, 0);
    }

    /* ─────────────── helpers ─────────────── */

    function _mintAndApprove(address who, string memory label) internal returns (uint256 tokenId) {
        vm.prank(who);
        reg.register{value: P5}(label, who);
        tokenId = reg.tokenIdOf(label);

        vm.prank(who);
        reg.setApprovalForAll(address(mkt), true);
    }

    function _list(address who, uint256 tokenId, uint256 price, bool featured) internal returns (uint64 expiry) {
        expiry = uint64(block.timestamp + WEEK_SECS);
        uint256 feeFee = featured ? (price * mkt.featureFeeBps()) / 10_000 : 0;
        vm.prank(who);
        mkt.createListing{value: feeFee}(tokenId, price, expiry, featured);
    }

    /* ─────────────── constructor ─────────────── */

    function testCtor_StoresRegistryAndTreasury() public view {
        assertEq(address(mkt.registry()), address(reg));
        assertEq(mkt.treasury(), treasury);
        assertEq(mkt.owner(), address(this));
        assertEq(mkt.saleFeeBps(), 200);
        assertEq(mkt.featureFeeBps(), 100);
    }

    function testCtor_RevertsOnZeroAddress() public {
        vm.expectRevert(INSMarketplace.ZeroAddress.selector);
        new INSMarketplace(address(0), treasury);
        vm.expectRevert(INSMarketplace.ZeroAddress.selector);
        new INSMarketplace(address(reg), address(0));
    }

    /* ─────────────── createListing ─────────────── */

    function testCreateListing_Basic() public {
        uint256 id = _mintAndApprove(alice, "alice");

        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        vm.expectEmit(true, true, false, true);
        emit ListingCreated(id, alice, LIST_PRICE, expiry, false);

        vm.prank(alice);
        mkt.createListing(id, LIST_PRICE, expiry, false);

        (address seller, uint64 exp, bool featured, bool active, uint256 price) = mkt.listings(id);
        assertEq(seller, alice);
        assertEq(exp, expiry);
        assertFalse(featured);
        assertTrue(active);
        assertEq(price, LIST_PRICE);
    }

    function testCreateListing_FeaturedPaysUpfrontFee() public {
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        uint256 expectedFee = (LIST_PRICE * 100) / 10_000; // 1%
        uint256 treasuryBefore = treasury.balance;

        vm.expectEmit(true, true, false, true);
        emit ListingFeatured(id, alice, expectedFee);

        vm.prank(alice);
        mkt.createListing{value: expectedFee}(id, LIST_PRICE, expiry, true);

        assertEq(treasury.balance, treasuryBefore + expectedFee);
        (, , bool featured, bool active, ) = mkt.listings(id);
        assertTrue(featured);
        assertTrue(active);
    }

    function testCreateListing_RevertsIfFeaturedFeeWrong() public {
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        uint256 correct = (LIST_PRICE * 100) / 10_000;

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.IncorrectPayment.selector);
        mkt.createListing{value: correct - 1}(id, LIST_PRICE, expiry, true);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.IncorrectPayment.selector);
        mkt.createListing{value: correct + 1}(id, LIST_PRICE, expiry, true);
    }

    function testCreateListing_RevertsIfNonFeaturedSendsValue() public {
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.IncorrectPayment.selector);
        mkt.createListing{value: 1}(id, LIST_PRICE, expiry, false);
    }

    function testCreateListing_RevertsIfNotOwner() public {
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.NotSeller.selector);
        mkt.createListing(id, LIST_PRICE, expiry, false);
    }

    function testCreateListing_RevertsIfNoApproval() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        uint256 id = reg.tokenIdOf("alice");
        // deliberately did NOT setApprovalForAll
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotApproved.selector);
        mkt.createListing(id, LIST_PRICE, expiry, false);
    }

    function testCreateListing_AcceptsTokenLevelApproval() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        uint256 id = reg.tokenIdOf("alice");
        vm.prank(alice);
        reg.approve(address(mkt), id);

        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        vm.prank(alice);
        mkt.createListing(id, LIST_PRICE, expiry, false);

        (address seller, , , bool active, ) = mkt.listings(id);
        assertEq(seller, alice);
        assertTrue(active);
    }

    function testCreateListing_RevertsOnZeroPrice() public {
        uint256 id = _mintAndApprove(alice, "alice");
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.InvalidPrice.selector);
        mkt.createListing(id, 0, uint64(block.timestamp + 1), false);
    }

    function testCreateListing_RevertsIfExpiryInPast() public {
        uint256 id = _mintAndApprove(alice, "alice");
        vm.warp(1000);
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.InvalidExpiry.selector);
        mkt.createListing(id, LIST_PRICE, uint64(block.timestamp), false);
    }

    function testCreateListing_RevertsIfAlreadyListed() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.AlreadyListed.selector);
        mkt.createListing(id, LIST_PRICE, uint64(block.timestamp + WEEK_SECS), false);
    }

    function testCreateListing_RevertsWhenPaused() public {
        uint256 id = _mintAndApprove(alice, "alice");
        mkt.setPaused(true);
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.Paused.selector);
        mkt.createListing(id, LIST_PRICE, uint64(block.timestamp + WEEK_SECS), false);
    }

    /* ─────────────── updateListing ─────────────── */

    function testUpdateListing_OK() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        uint64 newExpiry = uint64(block.timestamp + 2 * WEEK_SECS);

        vm.expectEmit(true, true, false, true);
        emit ListingUpdated(id, alice, LIST_PRICE * 2, newExpiry);

        vm.prank(alice);
        mkt.updateListing(id, LIST_PRICE * 2, newExpiry);

        (, uint64 exp, , , uint256 price) = mkt.listings(id);
        assertEq(exp, newExpiry);
        assertEq(price, LIST_PRICE * 2);
    }

    function testUpdateListing_RevertsIfNotSeller() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.NotSeller.selector);
        mkt.updateListing(id, LIST_PRICE + 1, uint64(block.timestamp + WEEK_SECS));
    }

    function testUpdateListing_RevertsIfInactive() public {
        uint256 id = _mintAndApprove(alice, "alice");
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.ListingInactive.selector);
        mkt.updateListing(id, LIST_PRICE, uint64(block.timestamp + WEEK_SECS));
    }

    /* ─────────────── cancelListing ─────────────── */

    function testCancelListing_OK() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.expectEmit(true, true, false, false);
        emit ListingCancelled(id, alice);

        vm.prank(alice);
        mkt.cancelListing(id);

        (, , , bool active, ) = mkt.listings(id);
        assertFalse(active);
    }

    function testCancelListing_RevertsIfNotSeller() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.NotSeller.selector);
        mkt.cancelListing(id);
    }

    function testCancelListing_FeatureFeeNotRefunded() public {
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        uint256 featureFee = (LIST_PRICE * 100) / 10_000;
        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        mkt.createListing{value: featureFee}(id, LIST_PRICE, expiry, true);

        vm.prank(alice);
        mkt.cancelListing(id);

        // Feature fee stays in treasury; alice is out featureFee.
        assertEq(alice.balance, aliceBefore - featureFee);
        assertEq(treasury.balance, featureFee);
    }

    /* ─────────────── buyListing ─────────────── */

    function testBuyListing_HappyPath_FeeFlow() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        uint256 aliceBefore    = alice.balance;
        uint256 bobBefore      = bob.balance;
        uint256 treasuryBefore = treasury.balance;

        uint256 expectedFee    = (LIST_PRICE * 200) / 10_000; // 2%
        uint256 expectedToSeller = LIST_PRICE - expectedFee;

        vm.expectEmit(true, true, true, true);
        emit ListingSold(id, alice, bob, LIST_PRICE, expectedFee);

        vm.prank(bob);
        mkt.buyListing{value: LIST_PRICE}(id);

        // NFT moved
        assertEq(reg.ownerOf(id), bob);
        // alice got 98%
        assertEq(alice.balance, aliceBefore + expectedToSeller);
        // treasury got 2%
        assertEq(treasury.balance, treasuryBefore + expectedFee);
        // bob paid exactly LIST_PRICE
        assertEq(bob.balance, bobBefore - LIST_PRICE);
        // listing cleared
        (, , , bool active, ) = mkt.listings(id);
        assertFalse(active);
    }

    function testBuyListing_RevertIfInactive() public {
        uint256 id = _mintAndApprove(alice, "alice");
        vm.prank(bob);
        vm.expectRevert(INSMarketplace.ListingInactive.selector);
        mkt.buyListing{value: LIST_PRICE}(id);
    }

    function testBuyListing_RevertIfExpired() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);
        vm.warp(block.timestamp + WEEK_SECS + 1);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.ListingExpired.selector);
        mkt.buyListing{value: LIST_PRICE}(id);
    }

    function testBuyListing_RevertIfWrongPayment() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.IncorrectPayment.selector);
        mkt.buyListing{value: LIST_PRICE - 1}(id);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.IncorrectPayment.selector);
        mkt.buyListing{value: LIST_PRICE + 1}(id);
    }

    function testBuyListing_RevertIfSellerTransferredToken() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        // alice moves the NFT out — stale listing
        vm.prank(alice);
        reg.transferFrom(alice, carol, id);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.SellerLostOwnership.selector);
        mkt.buyListing{value: LIST_PRICE}(id);
    }

    function testBuyListing_RevertWhenPaused() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);
        mkt.setPaused(true);

        vm.prank(bob);
        vm.expectRevert(INSMarketplace.Paused.selector);
        mkt.buyListing{value: LIST_PRICE}(id);
    }

    function testBuyListing_ZeroFeeStillPays() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);
        mkt.setSaleFeeBps(0);

        uint256 aliceBefore = alice.balance;
        vm.prank(bob);
        mkt.buyListing{value: LIST_PRICE}(id);

        assertEq(alice.balance, aliceBefore + LIST_PRICE);
        assertEq(reg.ownerOf(id), bob);
    }

    /* ─────────────── getActiveListing (read) ─────────────── */

    function testGetActiveListing_ReturnsEmptyWhenExpired() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);
        vm.warp(block.timestamp + WEEK_SECS + 1);

        INSMarketplace.Listing memory l = mkt.getActiveListing(id);
        assertFalse(l.active);
        assertEq(l.seller, address(0));
    }

    function testGetActiveListing_ReturnsEmptyWhenSellerMoved() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);
        vm.prank(alice);
        reg.transferFrom(alice, carol, id);

        INSMarketplace.Listing memory l = mkt.getActiveListing(id);
        assertFalse(l.active);
    }

    function testGetActiveListing_ReturnsLiveWhenGood() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        INSMarketplace.Listing memory l = mkt.getActiveListing(id);
        assertTrue(l.active);
        assertEq(l.seller, alice);
        assertEq(l.price, LIST_PRICE);
    }

    /* ─────────────── admin ─────────────── */

    function testAdmin_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.setTreasury(bob);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.setSaleFeeBps(300);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.setFeatureFeeBps(150);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.transferOwnership(bob);
    }

    function testAdmin_FeeCapEnforced() public {
        vm.expectRevert(INSMarketplace.FeeCapExceeded.selector);
        mkt.setSaleFeeBps(501);
        vm.expectRevert(INSMarketplace.FeeCapExceeded.selector);
        mkt.setFeatureFeeBps(501);

        // 500 (5%) should be allowed
        mkt.setSaleFeeBps(500);
        mkt.setFeatureFeeBps(500);
        assertEq(mkt.saleFeeBps(), 500);
        assertEq(mkt.featureFeeBps(), 500);
    }

    function testAdmin_UpdateTreasuryAffectsFutureSales() public {
        address newT = address(0xD00D);
        mkt.setTreasury(newT);
        assertEq(mkt.treasury(), newT);

        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(bob);
        mkt.buyListing{value: LIST_PRICE}(id);

        uint256 expectedFee = (LIST_PRICE * 200) / 10_000;
        assertEq(newT.balance, expectedFee);
        assertEq(treasury.balance, 0); // old treasury unchanged
    }

    function testAdmin_TransferOwnership() public {
        mkt.transferOwnership(bob);
        assertEq(mkt.owner(), bob);

        // old owner can no longer call admin
        vm.expectRevert(INSMarketplace.NotOwner.selector);
        mkt.setSaleFeeBps(300);
    }

    /* ─────────────── fuzz ─────────────── */

    function testFuzz_BuyerPaysExactPrice(uint128 priceFz) public {
        priceFz = uint128(bound(uint256(priceFz), 1, 1_000_000 ether));
        uint256 id = _mintAndApprove(alice, "alice");

        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        vm.prank(alice);
        mkt.createListing(id, priceFz, expiry, false);

        vm.deal(bob, uint256(priceFz) + 1 ether);

        uint256 expectedFee = (uint256(priceFz) * 200) / 10_000;
        uint256 sellerBefore = alice.balance;

        vm.prank(bob);
        mkt.buyListing{value: priceFz}(id);

        assertEq(reg.ownerOf(id), bob);
        assertEq(alice.balance - sellerBefore, uint256(priceFz) - expectedFee);
    }

    function testFuzz_FeeCalculation(uint16 bps, uint128 price) public {
        bps = uint16(bound(uint256(bps), 0, 500));
        price = uint128(bound(uint256(price), 1, 1_000_000 ether));

        mkt.setSaleFeeBps(bps);
        uint256 expected = (uint256(price) * bps) / 10_000;
        assertEq(mkt.saleFeeOn(price), expected);
    }

    function testFuzz_FeatureFeeCalculation(uint16 bps, uint128 price) public {
        bps = uint16(bound(uint256(bps), 0, 500));
        price = uint128(bound(uint256(price), 1, 1_000_000 ether));

        mkt.setFeatureFeeBps(bps);
        uint256 expected = (uint256(price) * bps) / 10_000;
        assertEq(mkt.featureFeeOn(price), expected);
    }

    /* ─────────────── post-audit additions (coverage gaps) ─────────────── */

    /// @notice A malicious seller who revokes approval after listing:
    ///         buyListing must revert on the underlying transferFrom.
    function testBuy_RevertsWhenSellerRevokedApproval() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        // Alice revokes approval after listing
        vm.prank(alice);
        reg.setApprovalForAll(address(mkt), false);

        // Bob attempts to buy — must revert (Registry's transferFrom guards)
        vm.prank(bob);
        vm.expectRevert();
        mkt.buyListing{value: LIST_PRICE}(id);

        // Listing storage remains — seller or admin must cancel it. This is
        // cosmetic, not exploitable; `getActiveListing` still returns the
        // listing because the seller still owns the NFT. Frontends should
        // treat "approval revoked" as a latent failure — verified via buy.
        (address seller, , , bool active, ) = mkt.listings(id);
        assertEq(seller, alice);
        assertTrue(active);
    }

    /// @notice Contract buyer — locks in current Registry behaviour.
    /// @dev    INSRegistry's `safeTransferFrom` is implemented as a plain
    ///         `transferFrom` with no `onERC721Received` hook invocation.
    ///         This means contract buyers WITHOUT the hook can still receive
    ///         NFTs (unlike standard OpenZeppelin ERC721 where the hook is
    ///         required). This test documents that fact so any future Registry
    ///         swap that adds a real hook immediately breaks this test and
    ///         forces a review of the marketplace's buyer UX.
    function testBuy_SucceedsEvenWhenBuyerIsNonReceiverContract() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        NonReceiver bad = new NonReceiver();
        vm.deal(address(bad), LIST_PRICE);

        bad.tryBuy{value: LIST_PRICE}(mkt, id);

        // Currently succeeds because Registry hook-less
        assertEq(reg.ownerOf(id), address(bad));
        assertFalse(mkt.getActiveListing(id).active);
    }

    /// @notice Buyer is a contract that DOES implement onERC721Received.
    ///         Happy path — buy succeeds (same outcome as NonReceiver above
    ///         for this Registry, but locked in separately so a hook-enabled
    ///         future Registry continues to work for the well-formed receiver.)
    function testBuy_SucceedsWhenBuyerIsGoodReceiverContract() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        GoodReceiver good = new GoodReceiver();
        vm.deal(address(good), LIST_PRICE);

        good.tryBuy{value: LIST_PRICE}(mkt, id);

        assertEq(reg.ownerOf(id), address(good));
        assertFalse(mkt.getActiveListing(id).active);
    }

    /// @notice Emergency pause must not trap sellers: cancelListing works
    ///         while paused. updateListing does NOT — that's intentional.
    function testCancelWhilePaused_Succeeds_ButUpdateReverts() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        mkt.setPaused(true);

        // updateListing is paused-gated — reverts
        vm.prank(alice);
        vm.expectRevert(INSMarketplace.Paused.selector);
        mkt.updateListing(id, LIST_PRICE * 2, uint64(block.timestamp + WEEK_SECS));

        // cancelListing is NOT paused-gated — succeeds
        vm.prank(alice);
        mkt.cancelListing(id);

        assertFalse(mkt.getActiveListing(id).active);
    }

    /// @notice updateListing rejects zero price and past expiry.
    function testUpdateListing_RevertsOnZeroPriceOrPastExpiry() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.InvalidPrice.selector);
        mkt.updateListing(id, 0, uint64(block.timestamp + WEEK_SECS));

        // warp forward so block.timestamp is far from 0
        vm.warp(block.timestamp + 1 days);

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.InvalidExpiry.selector);
        mkt.updateListing(id, LIST_PRICE, uint64(block.timestamp));

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.InvalidExpiry.selector);
        mkt.updateListing(id, LIST_PRICE, uint64(block.timestamp - 1));
    }

    /// @notice Feature-fee refund path: creating a featured listing on a
    ///         tokenId that already has an active listing reverts on
    ///         AlreadyListed AFTER msg.value has arrived. Solidity's revert
    ///         rolls back state, so the caller's balance is unchanged —
    ///         this test locks that behaviour in.
    function testCreate_FeaturedRevertRefundsViaRollback() public {
        uint256 id = _mintAndApprove(alice, "alice");
        _list(alice, id, LIST_PRICE, false);

        uint256 featureFee = (LIST_PRICE * mkt.featureFeeBps()) / 10_000;
        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        vm.expectRevert(INSMarketplace.AlreadyListed.selector);
        mkt.createListing{value: featureFee}(
            id,
            LIST_PRICE,
            uint64(block.timestamp + WEEK_SECS),
            true
        );

        // Revert rolled back msg.value — Alice's balance unchanged.
        assertEq(alice.balance, aliceBefore);
        // Treasury received nothing.
        assertEq(treasury.balance, 0);
    }

    /// @notice Reentrancy guard — a malicious treasury tries to reenter
    ///         `buyListing` when it receives the featured-listing fee.
    ///
    ///         Current INSRegistry's safeTransferFrom doesn't invoke a
    ///         receiver hook, so the usual ERC721-receiver reentry path is
    ///         closed. BUT the marketplace makes external `.call()` to
    ///         `treasury` (on featured-listing creation AND on every buy),
    ///         and an attacker who controls treasury — either via compromised
    ///         admin or during a treasury migration — can try to reenter
    ///         from their `receive()` fallback. The `nonReentrant` guard
    ///         must block this.
    function testReentrancy_MaliciousTreasuryCannotReenterBuyListing() public {
        // Carol lists a token — that's the reentrant target.
        uint256 targetId = _mintAndApprove(carol, "bobby");
        _list(carol, targetId, LIST_PRICE, false);

        // Admin swaps treasury to a malicious contract.
        TreasuryReenterer evil = new TreasuryReenterer();
        evil.setTarget(mkt, targetId);
        mkt.setTreasury(address(evil));
        vm.deal(address(evil), LIST_PRICE * 2); // fund reentry attempt

        // Alice creates a featured listing — featureFee is paid to evil via
        // `treasury.call()`. Evil's receive() attempts to buy carol's listing
        // mid-flight. nonReentrant must block the nested call.
        uint256 id = _mintAndApprove(alice, "alice");
        uint64 expiry = uint64(block.timestamp + WEEK_SECS);
        uint256 feeFee = (LIST_PRICE * mkt.featureFeeBps()) / 10_000;
        vm.prank(alice);
        mkt.createListing{value: feeFee}(id, LIST_PRICE, expiry, true);

        // Reentry attempt happened…
        assertTrue(evil.wasTriggered(), "reenter callback should have fired");
        // …and was blocked by the guard — carol's listing is untouched.
        assertTrue(mkt.getActiveListing(targetId).active, "target must still be active");
        assertEq(reg.ownerOf(targetId), carol, "target NFT must still be carol's");
    }
}

/* ─────────────── helper contracts for post-audit tests ─────────────── */

/// @dev A contract with no onERC721Received — safeTransferFrom must revert.
contract NonReceiver {
    function tryBuy(INSMarketplace mkt, uint256 tokenId) external payable {
        mkt.buyListing{value: msg.value}(tokenId);
    }

    // Accept iKAS so vm.deal works and refunds are allowed
    receive() external payable {}
}

/// @dev A contract that correctly implements onERC721Received.
contract GoodReceiver {
    function tryBuy(INSMarketplace mkt, uint256 tokenId) external payable {
        mkt.buyListing{value: msg.value}(tokenId);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}

/// @dev Malicious treasury: on receiving any payment it tries to reenter
///      the marketplace's `buyListing`. If the `nonReentrant` guard is in
///      place the nested call reverts, the catch block swallows it, and
///      the outer flow continues — leaving the target listing untouched.
contract TreasuryReenterer {
    INSMarketplace public mkt;
    uint256 public targetTokenId;
    bool public wasTriggered;

    function setTarget(INSMarketplace _mkt, uint256 _tokenId) external {
        mkt = _mkt;
        targetTokenId = _tokenId;
    }

    receive() external payable {
        if (address(mkt) == address(0)) return;
        wasTriggered = true;
        // Use try/catch so the nested revert doesn't propagate — we want to
        // verify the guard BLOCKED the reentry without killing the outer tx.
        // The guard raises `Reentrancy` (plus any other check), caught here.
        try mkt.buyListing{value: 50 ether}(targetTokenId) {
            // If this branch is reached, the guard failed.
            revert("guard did not fire");
        } catch {
            // Expected: guard reverted the nested call.
        }
    }
}
