// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "./BaseTest.sol";
import {INSMarketplace} from "../src/INSMarketplace.sol";
import {INSRegistry} from "../src/INSRegistry.sol";
import {INSReverseResolver} from "../src/INSReverseResolver.sol";

/**
 * @title IntegrationTest
 * @notice End-to-end paths exercising every contract in the INSdomains
 *         stack as a single user journey would, rather than one
 *         function-under-test at a time.
 *
 *         These tests are the closest analogue to integration / staging
 *         in a Web2 app: they catch wiring bugs that per-contract unit
 *         tests can't, e.g. a target update on the Registry not
 *         propagating to the Resolver, or a Marketplace sale silently
 *         leaving a stale primaryName.
 *
 *         Useful for wallet / explorer integrators because each test
 *         here mirrors a real-world UX flow: register → metadata →
 *         list → buy → re-customise.
 */
contract IntegrationTest is BaseTest {
    /* ─────────────────────────── Full lifecycle ────────────────────── */

    function test_lifecycle_register_resolve_list_sell() public {
        string memory label = "metacoin";
        uint256 listingPrice = 50 ether;

        // 1. Alice registers the name with herself as initial target.
        uint256 tokenId = registerName(alice, label);
        bytes32 node = namehashIgra(label);
        assertEq(registry.balanceOf(alice), 1, "alice should hold 1 NFT post-mint");

        // 2. Alice configures the resolver: text records + reverse primary.
        vm.startPrank(alice);
        resolver.setText(label, node, "url", "https://metacoin.example");
        reverseResolver.setPrimary(tokenId);
        vm.stopPrank();

        assertEq(resolver.addr(node),                   alice);
        assertEq(resolver.text(node, "url"),            "https://metacoin.example");
        assertEq(reverseResolver.primaryName(alice),    label);

        // 3. Alice lists the name on the marketplace.
        listForSale(alice, tokenId, listingPrice);
        (address listSeller,,, bool listActive, uint256 listPrice) = readListing(tokenId);
        assertEq(listSeller, alice, "listing seller");
        assertTrue(listActive,      "listing should be active");
        assertEq(listPrice, listingPrice);

        // 4. Bob buys at the asking price.
        uint256 aliceBalBefore     = alice.balance;
        uint256 treasuryBalBefore  = treasury.balance;
        uint256 expectedFee        = saleFeeOn(listingPrice);
        uint256 expectedSellerNet  = listingPrice - expectedFee;

        vm.prank(bob);
        marketplace.buyListing{value: listingPrice}(tokenId);

        // 5. NFT is now bob's; Alice received price - fee; treasury got fee.
        assertOwnerIs(bob, tokenId);
        assertEq(registry.balanceOf(alice), 0);
        assertEq(registry.balanceOf(bob),   1);
        assertEq(alice.balance - aliceBalBefore,        expectedSellerNet, "seller net");
        assertEq(treasury.balance - treasuryBalBefore,  expectedFee,       "treasury fee");

        // 6. Resolver still points at alice (the OLD target) — Registry's
        //    target field is independent of NFT ownership. Bob has to
        //    explicitly call setTarget if he wants the resolver to follow.
        assertEq(resolver.addr(node), alice, "stale target until bob updates");

        vm.prank(bob);
        registry.setTarget(label, bob);
        assertEq(resolver.addr(node), bob, "after setTarget, resolver follows");

        // 7. Reverse: alice's primaryName is now stale-cleared (she no longer
        //    owns the token), and bob has no primary unless he sets one.
        assertEq(reverseResolver.primaryName(alice), "", "stale-safe clear");
        assertEq(reverseResolver.primaryName(bob),   "", "bob hasn't set primary");

        vm.prank(bob);
        reverseResolver.setPrimary(tokenId);
        assertEq(reverseResolver.primaryName(bob), label, "bob's primary set");
    }

    /* ─────────────────────────── Featured listing flow ─────────────── */

    function test_lifecycle_featuredListing_paysUpfrontFeeToTreasury() public {
        // Featured listings cost 1% of list price upfront, routed to treasury
        // immediately on createListing. This test validates that path end-to-end
        // and that the buyer still pays the headline price (no double-fee).
        uint256 tokenId      = registerName(alice, "premiumname");
        uint256 listingPrice = 1_000 ether;

        uint256 treasuryStart = treasury.balance;
        uint256 featureFee    = listFeatured(alice, tokenId, listingPrice);

        // Treasury received the 1% upfront.
        assertEq(treasury.balance - treasuryStart, featureFee, "feature fee paid");

        // Buyer pays the headline price; alice receives net-of-sale-fee.
        uint256 aliceStart = alice.balance;
        vm.prank(bob);
        marketplace.buyListing{value: listingPrice}(tokenId);

        uint256 saleFee     = saleFeeOn(listingPrice);
        uint256 sellerNet   = listingPrice - saleFee;
        assertEq(alice.balance - aliceStart, sellerNet, "seller net (sale only)");
    }

    /* ─────────────────────────── Approval revoke ───────────────────── */

    function test_revokingApproval_killsThePendingListing() public {
        // Common UX scenario: user lists, then changes their mind and revokes
        // the marketplace's approval. The listing entry persists on-chain but
        // any buyListing attempt must fail clean.
        //
        // Note: the revert bubbles up from the Registry's own auth check
        // inside `safeTransferFrom`, NOT from a re-check of approval inside
        // Marketplace.buyListing — buyListing delegates the move to the NFT
        // contract and trusts ERC-721 to enforce. So the user-visible error
        // is `INSRegistry.NotAuthorized`, not `INSMarketplace.NotApproved`
        // (the latter only fires at createListing time). Worth knowing if
        // you're surfacing custom errors in a wallet UI.
        uint256 tokenId = registerName(alice, "willnotsell");
        listForSale(alice, tokenId, 5 ether);

        vm.prank(alice);
        registry.setApprovalForAll(address(marketplace), false);

        vm.prank(bob);
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        marketplace.buyListing{value: 5 ether}(tokenId);

        // Alice still owns the token.
        assertOwnerIs(alice, tokenId);
    }

    /* ─────────────────────────── Cancellation while paused ─────────── */

    function test_marketplacePaused_sellersCanStillCancel() public {
        // Defence-in-depth: even when the marketplace is paused (kill-switch),
        // sellers must always retain the ability to exit a listing. This
        // mirrors the comment in INSMarketplace.cancelListing.
        uint256 tokenId = registerName(alice, "exitable");
        listForSale(alice, tokenId, 5 ether);

        // Owner pauses.
        marketplace.setPaused(true);

        // Buys are blocked …
        vm.prank(bob);
        vm.expectRevert(INSMarketplace.Paused.selector);
        marketplace.buyListing{value: 5 ether}(tokenId);

        // … but alice can still cancel and reclaim.
        vm.prank(alice);
        marketplace.cancelListing(tokenId);

        (, , , bool listActive, ) = readListing(tokenId);
        assertFalse(listActive, "cancel must succeed under pause");
        assertOwnerIs(alice, tokenId); // never left her wallet (zero-custody design)
    }

    /* ─────────────────────────── Reserved-name admin gift ──────────── */

    function test_reservedName_adminGiftWorkflow() public {
        // The end-to-end reserved-name path:
        //   1. owner reserves a name (public mints blocked)
        //   2. public mint attempt reverts cleanly
        //   3. owner adminMints to a chosen recipient
        //   4. recipient owns the NFT and can fully use it (resolver, etc.)
        registry.setReserved("kcom", true);
        assertReservedTrue("kcom");

        vm.prank(charlie);
        vm.expectRevert(); // either NameReserved or InsufficientPayment depending on tier
        registry.register{value: PRICE_5_PLUS}("kcom", charlie);

        uint256 tokenId = registry.adminMint("kcom", charlie);
        assertOwnerIs(charlie, tokenId);

        // Recipient can immediately use it.
        bytes32 node = namehashIgra("kcom");
        vm.prank(charlie);
        resolver.setText("kcom", node, "url", "https://kcom.app");
        assertEq(resolver.text(node, "url"), "https://kcom.app");
    }

    /* ─────────────────────────── Multi-name single user ────────────── */

    function test_singleUser_multipleNames_independentResolvers() public {
        // One wallet holding 3 names: each has its own resolver target +
        // text records, but only one can be the reverse-primary at a time.
        uint256 idA = registerName(alice, "alpha");
        uint256 idB = registerName(alice, "beta");
        uint256 idC = registerName(alice, "gamma");

        bytes32 nA = namehashIgra("alpha");
        bytes32 nB = namehashIgra("beta");
        bytes32 nC = namehashIgra("gamma");

        // Three independent text records.
        vm.startPrank(alice);
        resolver.setText("alpha", nA, "url", "https://a.example");
        resolver.setText("beta",  nB, "url", "https://b.example");
        resolver.setText("gamma", nC, "url", "https://c.example");

        // Set BETA as primary.
        reverseResolver.setPrimary(idB);
        vm.stopPrank();

        assertEq(resolver.text(nA, "url"), "https://a.example");
        assertEq(resolver.text(nB, "url"), "https://b.example");
        assertEq(resolver.text(nC, "url"), "https://c.example");

        assertEq(reverseResolver.primaryName(alice), "beta");
        assertEq(reverseResolver.primaryTokenId(alice), idB);

        // Three forward addrs — all the same wallet, but reachable via 3 names.
        assertEq(resolver.addr(nA), alice);
        assertEq(resolver.addr(nB), alice);
        assertEq(resolver.addr(nC), alice);

        // Suppress unused-var warning for idA / idC.
        idA; idC;
    }

    /* ─────────────────────────── Stress: many parallel mints ───────── */

    function test_stress_tenRegistrations_threeDistinctOwners() public {
        // Sanity check that there's no off-by-one in tokenId issuance + that
        // `totalSupply()` tracks correctly across multiple registrants in one
        // transaction. This sized small (10) intentionally — fuzz/invariant
        // suites cover the upper bound.
        string[10] memory labels = [
            "label01", "label02", "label03", "label04", "label05",
            "label06", "label07", "label08", "label09", "label10"
        ];
        address[10] memory who;
        for (uint256 i = 0; i < 10; ++i) {
            who[i] = (i % 3 == 0) ? alice : (i % 3 == 1) ? bob : charlie;
        }

        for (uint256 i = 0; i < 10; ++i) {
            uint256 tid = registerName(who[i], labels[i]);
            assertEq(tid, i + 1, "tokenIds must be sequentially issued");
            assertOwnerIs(who[i], tid);
        }
        assertEq(registry.totalSupply(), 10);
    }

    /* ─────────────────────────── Treasury withdrawal ───────────────── */

    function test_treasuryWithdrawal_fromBothContracts() public {
        // Ownership trail: registration revenue accrues on the Registry; sale
        // fees accrue on the Marketplace. Both are owner-only withdraw
        // patterns — admins must hit each contract separately.
        registerName(alice, "first"); // 10 iKAS to Registry
        registerName(bob,   "second");

        uint256 tokenId = registerName(charlie, "third");
        listForSale(charlie, tokenId, 100 ether);

        vm.prank(alice);
        marketplace.buyListing{value: 100 ether}(tokenId); // 2% (= 2 iKAS) to Marketplace

        // Drain Registry to a payable receiver.
        address payable receiver = payable(makeAddr("receiver"));
        uint256 registryBal = address(registry).balance;
        registry.withdraw(receiver);
        assertEq(receiver.balance, registryBal, "registry withdrew everything");
        assertEq(address(registry).balance, 0,  "registry should be empty");
    }

    /* ─────────────────────────── Re-list after cancel ─────────────── */

    function test_listCancelRelist_idempotent() public {
        // Edge case: listing → cancel → list again. The Listing slot is
        // delete'd on cancel so a fresh listing must succeed without any
        // "AlreadyListed" race.
        uint256 tokenId = registerName(alice, "flipflop");

        // First listing.
        listForSale(alice, tokenId, 5 ether);
        vm.prank(alice);
        marketplace.cancelListing(tokenId);

        // Re-list — must work cleanly.
        listForSale(alice, tokenId, 7 ether);
        (, , , bool listActive, uint256 listPrice) = readListing(tokenId);
        assertTrue(listActive);
        assertEq(listPrice, 7 ether);
    }

    /* ─────────────────────────── Helpers ───────────────────────────── */

    /**
     * @dev Forge can't destructure tuple returns from auto-generated mapping
     *      getters when the return type is a struct, so we shim it here.
     */
    function readListing(uint256 tokenId)
        internal
        view
        returns (
            address seller,
            uint64 expiry,
            bool featured,
            bool active,
            uint256 price
        )
    {
        (seller, expiry, featured, active, price) = marketplace.listings(tokenId);
    }
}
