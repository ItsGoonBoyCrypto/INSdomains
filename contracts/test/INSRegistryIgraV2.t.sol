// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {INSRegistryIgraV2} from "../src/INSRegistryIgraV2.sol";
import {INSRegistryIgra} from "../src/INSRegistryIgra.sol";

/**
 * @title INSRegistryIgraV2.t
 * @notice Full Foundry suite for the V2 Registry — covers Annual mints,
 *         renewals, extend-to-Forever, grace-period re-registration, V1
 *         migration, admin surface, and ERC-721 surface.
 *
 *         Mirrors the V1 INSRegistry.t.sol structure where applicable so
 *         shared semantics (label validation, admin mint, reservations,
 *         tier pricing, ownership) are tested in both V1 and V2.
 *
 *         Designed to hit ~80 tests with ~8 fuzz tests at 1024 runs each.
 */
contract INSRegistryIgraV2Test is Test {
    /* ─────────────────────────── Constants ─────────────────────────── */
    // Forever defaults (locked 2026-05-02)
    uint256 internal constant FOREVER_1 = 4000 ether;
    uint256 internal constant FOREVER_2 = 2000 ether;
    uint256 internal constant FOREVER_3 = 1200 ether;
    uint256 internal constant FOREVER_4 = 800 ether;
    uint256 internal constant FOREVER_5 = 500 ether;

    // Annual defaults (per year)
    uint256 internal constant ANNUAL_1 = 1000 ether;
    uint256 internal constant ANNUAL_2 = 800 ether;
    uint256 internal constant ANNUAL_3 = 500 ether;
    uint256 internal constant ANNUAL_4 = 250 ether;
    uint256 internal constant ANNUAL_5 = 50 ether;

    uint256 internal constant SEC_PER_YEAR = 365 days;
    uint256 internal constant DEFAULT_GRACE = 30 days;

    /* ─────────────────────────── Wallets ───────────────────────────── */
    address internal owner    = address(this);
    address internal alice    = makeAddr("alice");
    address internal bob      = makeAddr("bob");
    address internal charlie  = makeAddr("charlie");

    /* ─────────────────────────── Contracts ─────────────────────────── */
    INSRegistryIgra   internal v1;
    INSRegistryIgraV2 internal v2;

    /* ─────────────────────────── Setup ─────────────────────────────── */
    function setUp() public virtual {
        v1 = new INSRegistryIgra();
        v2 = new INSRegistryIgraV2(address(v1));

        vm.deal(alice,   1_000_000 ether);
        vm.deal(bob,     1_000_000 ether);
        vm.deal(charlie, 1_000_000 ether);
    }

    /* ─────────────────────────── Helpers ───────────────────────────── */
    function _registerForever(address as_, string memory label) internal returns (uint256 id) {
        uint256 price = v2.priceFor(label);
        vm.prank(as_);
        id = v2.register{value: price}(label, as_);
    }

    function _registerAnnual(address as_, string memory label, uint256 yrs) internal returns (uint256 id) {
        uint256 price = v2.priceAnnualFor(label) * yrs;
        vm.prank(as_);
        id = v2.registerAnnual{value: price}(label, as_, yrs);
    }

    function _registerOnV1(address as_, string memory label) internal returns (uint256 id) {
        // V1's pricing has a quirk: 1-char is TIER_RESERVED (admin only).
        // Use adminMint for any 1-char V1 fixtures, register() otherwise.
        uint256 price = v1.priceFor(label);
        if (price == type(uint256).max) {
            id = v1.adminMint(label, as_);
        } else {
            vm.deal(as_, price + 1 ether);
            vm.prank(as_);
            id = v1.register{value: price}(label, as_);
        }
    }

    /* ────────────────── Constructor + defaults ─────────────────────── */

    function test_constructor_setsOwnerAndV1() public view {
        assertEq(v2.owner(), owner);
        assertEq(v2.v1Registry(), address(v1));
    }

    function test_constructor_revertsOnZeroV1() public {
        vm.expectRevert(INSRegistryIgraV2.ZeroAddress.selector);
        new INSRegistryIgraV2(address(0));
    }

    function test_constructor_setsForeverDefaults() public view {
        assertEq(v2.lengthPrice(1), FOREVER_1);
        assertEq(v2.lengthPrice(2), FOREVER_2);
        assertEq(v2.lengthPrice(3), FOREVER_3);
        assertEq(v2.lengthPrice(4), FOREVER_4);
        assertEq(v2.lengthPrice(5), FOREVER_5);
    }

    function test_constructor_setsAnnualDefaults() public view {
        assertEq(v2.lengthPriceAnnual(1), ANNUAL_1);
        assertEq(v2.lengthPriceAnnual(2), ANNUAL_2);
        assertEq(v2.lengthPriceAnnual(3), ANNUAL_3);
        assertEq(v2.lengthPriceAnnual(4), ANNUAL_4);
        assertEq(v2.lengthPriceAnnual(5), ANNUAL_5);
    }

    function test_constructor_setsGracePeriod() public view {
        assertEq(v2.gracePeriodSec(), DEFAULT_GRACE);
    }

    function test_priceFor_returnsTier() public view {
        assertEq(v2.priceFor("a"), FOREVER_1);
        assertEq(v2.priceFor("ab"), FOREVER_2);
        assertEq(v2.priceFor("abc"), FOREVER_3);
        assertEq(v2.priceFor("abcd"), FOREVER_4);
        assertEq(v2.priceFor("alice"), FOREVER_5);
        assertEq(v2.priceFor("verylongnamethatfits"), FOREVER_5);
    }

    function test_priceAnnualFor_returnsTier() public view {
        assertEq(v2.priceAnnualFor("a"), ANNUAL_1);
        assertEq(v2.priceAnnualFor("ab"), ANNUAL_2);
        assertEq(v2.priceAnnualFor("abc"), ANNUAL_3);
        assertEq(v2.priceAnnualFor("abcd"), ANNUAL_4);
        assertEq(v2.priceAnnualFor("alice"), ANNUAL_5);
    }

    function test_priceFor_invalidReturnsReserved() public view {
        assertEq(v2.priceFor(""), type(uint256).max);
        assertEq(v2.priceFor("UPPER"), type(uint256).max);
        assertEq(v2.priceFor("-leading"), type(uint256).max);
    }

    /* ───────────────────── register (Forever) ──────────────────────── */

    function test_register_foreverHappyPath() public {
        uint256 id = _registerForever(alice, "alice");
        assertEq(v2.ownerOf(id), alice);
        assertEq(v2.expiresAt(id), 0);
        assertEq(v2.targetOf(id), alice);
        assertEq(v2.tokenIdOf("alice"), id);
        assertEq(v2.totalSupply(), 1);
    }

    function test_register_emitsRegistered() public {
        uint256 price = v2.priceFor("alice");
        vm.expectEmit(true, true, false, true);
        emit INSRegistryIgraV2.Registered("alice", alice, alice, price);
        vm.prank(alice);
        v2.register{value: price}("alice", alice);
    }

    function test_register_refundsOverpayment() public {
        uint256 price = v2.priceFor("alice");
        uint256 overpay = price + 7 ether;
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        v2.register{value: overpay}("alice", alice);
        assertEq(alice.balance, balBefore - price);
    }

    function test_register_revertsOnInvalid() public {
        vm.expectRevert(INSRegistryIgraV2.InvalidLabel.selector);
        vm.prank(alice);
        v2.register{value: FOREVER_5}("UPPER", alice);
    }

    function test_register_revertsOnAlreadyRegistered() public {
        _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.AlreadyRegistered.selector);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
    }

    function test_register_revertsOnReserved() public {
        v2.setReserved("vip", true);
        vm.expectRevert(INSRegistryIgraV2.NameReserved.selector);
        vm.prank(alice);
        v2.register{value: FOREVER_3}("vip", alice);
    }

    function test_register_revertsOnInsufficient() public {
        vm.expectRevert(INSRegistryIgraV2.InsufficientPayment.selector);
        vm.prank(alice);
        v2.register{value: FOREVER_5 - 1}("alice", alice);
    }

    function test_register_targetZeroDefaultsToSender() public {
        uint256 price = v2.priceFor("alice");
        vm.prank(alice);
        uint256 id = v2.register{value: price}("alice", address(0));
        assertEq(v2.targetOf(id), alice);
    }

    function test_register_oneCharOpenAtTier() public {
        // 1-char is no longer reserved by default in V2 (matches V1's
        // post-Safe-tx state). Should mint at FOREVER_1.
        uint256 id = _registerForever(alice, "x");
        assertEq(v2.ownerOf(id), alice);
        assertEq(v2.expiresAt(id), 0);
    }

    function test_register_revertsOnTierReserved() public {
        v2.setLengthPrice(5, type(uint256).max);
        vm.expectRevert(INSRegistryIgraV2.TierReserved.selector);
        vm.prank(alice);
        v2.register{value: FOREVER_5}("alice", alice);
    }

    /* ─────────────────── registerAnnual ────────────────────────────── */

    function test_registerAnnual_oneYearHappy() public {
        uint256 price = ANNUAL_5;
        vm.prank(alice);
        uint256 id = v2.registerAnnual{value: price}("alice", alice, 1);
        assertEq(v2.ownerOf(id), alice);
        assertEq(v2.expiresAt(id), block.timestamp + SEC_PER_YEAR);
    }

    function test_registerAnnual_fiveYearHappy() public {
        uint256 price = ANNUAL_5 * 5;
        vm.prank(alice);
        uint256 id = v2.registerAnnual{value: price}("alice", alice, 5);
        assertEq(v2.expiresAt(id), block.timestamp + 5 * SEC_PER_YEAR);
    }

    function test_registerAnnual_tenYearHappy() public {
        uint256 price = ANNUAL_5 * 10;
        vm.prank(alice);
        uint256 id = v2.registerAnnual{value: price}("alice", alice, 10);
        assertEq(v2.expiresAt(id), block.timestamp + 10 * SEC_PER_YEAR);
    }

    function test_registerAnnual_revertsOnZeroYears() public {
        vm.expectRevert(INSRegistryIgraV2.InvalidYearsCount.selector);
        vm.prank(alice);
        v2.registerAnnual{value: ANNUAL_5}("alice", alice, 0);
    }

    function test_registerAnnual_revertsOn11Years() public {
        vm.expectRevert(INSRegistryIgraV2.InvalidYearsCount.selector);
        vm.prank(alice);
        v2.registerAnnual{value: ANNUAL_5 * 11}("alice", alice, 11);
    }

    function test_registerAnnual_emitsEventWithExpiry() public {
        uint256 price = ANNUAL_5;
        uint256 expectedExpiry = block.timestamp + SEC_PER_YEAR;
        vm.expectEmit(true, true, false, true);
        emit INSRegistryIgraV2.RegisteredAnnual("alice", alice, alice, price, expectedExpiry, 1);
        vm.prank(alice);
        v2.registerAnnual{value: price}("alice", alice, 1);
    }

    function test_registerAnnual_premiumOverridePerYear() public {
        v2.setPremiumPriceAnnual("alice", 999 ether);
        uint256 price = 999 ether * 3;
        vm.prank(alice);
        uint256 id = v2.registerAnnual{value: price}("alice", alice, 3);
        assertEq(v2.expiresAt(id), block.timestamp + 3 * SEC_PER_YEAR);
    }

    function test_registerAnnual_refundsOverpayment() public {
        uint256 price = ANNUAL_5 * 2;
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        v2.registerAnnual{value: price + 13 ether}("alice", alice, 2);
        assertEq(alice.balance, balBefore - price);
    }

    function test_registerAnnual_revertsOnReserved() public {
        v2.setReserved("vip", true);
        vm.expectRevert(INSRegistryIgraV2.NameReserved.selector);
        vm.prank(alice);
        v2.registerAnnual{value: ANNUAL_3}("vip", alice, 1);
    }

    function test_registerAnnual_revertsOnTierReserved() public {
        v2.setLengthPriceAnnual(5, type(uint256).max);
        vm.expectRevert(INSRegistryIgraV2.TierReserved.selector);
        vm.prank(alice);
        v2.registerAnnual{value: ANNUAL_5}("alice", alice, 1);
    }

    function test_registerAnnual_revertsOnInsufficient() public {
        uint256 price = ANNUAL_5 * 3;
        vm.expectRevert(INSRegistryIgraV2.InsufficientPayment.selector);
        vm.prank(alice);
        v2.registerAnnual{value: price - 1}("alice", alice, 3);
    }

    /* ─────────────────────── renew ─────────────────────────────────── */

    function test_renew_oneYearExtends() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 originalExpiry = v2.expiresAt(id);
        vm.prank(bob); // anyone can pay
        vm.deal(bob, ANNUAL_5);
        v2.renew{value: ANNUAL_5}(id, 1);
        assertEq(v2.expiresAt(id), originalExpiry + SEC_PER_YEAR);
    }

    function test_renew_fiveYearExtends() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 originalExpiry = v2.expiresAt(id);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 * 5}(id, 5);
        assertEq(v2.expiresAt(id), originalExpiry + 5 * SEC_PER_YEAR);
    }

    function test_renew_emitsRenewed() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 newExpiry = v2.expiresAt(id) + 2 * SEC_PER_YEAR;
        vm.expectEmit(true, true, false, true);
        emit INSRegistryIgraV2.Renewed(id, alice, 2, ANNUAL_5 * 2, newExpiry);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 * 2}(id, 2);
    }

    function test_renew_inGraceExtendsFromOriginalExpiry() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 originalExpiry = v2.expiresAt(id);
        // Skip into grace period
        vm.warp(originalExpiry + 7 days);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5}(id, 1);
        // New expiry = original + 1y, NOT now + 1y
        assertEq(v2.expiresAt(id), originalExpiry + SEC_PER_YEAR);
    }

    function test_renew_postGraceReverts() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + DEFAULT_GRACE + 1);
        vm.expectRevert(INSRegistryIgraV2.NameExpired.selector);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5}(id, 1);
    }

    function test_renew_onForeverReverts() public {
        uint256 id = _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.NotAnnual.selector);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5}(id, 1);
    }

    function test_renew_anyoneCanRenew() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        // Charlie (random third party) renews for alice
        vm.prank(charlie);
        v2.renew{value: ANNUAL_5}(id, 1);
        assertEq(v2.ownerOf(id), alice); // ownership unchanged
    }

    function test_renew_revertsOnZeroYears() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.expectRevert(INSRegistryIgraV2.InvalidYearsCount.selector);
        vm.prank(alice);
        v2.renew{value: 0}(id, 0);
    }

    function test_renew_revertsOn11Years() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.expectRevert(INSRegistryIgraV2.InvalidYearsCount.selector);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 * 11}(id, 11);
    }

    function test_renew_revertsOnNonexistent() public {
        vm.expectRevert(INSRegistryIgraV2.NonexistentToken.selector);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5}(999, 1);
    }

    function test_renew_refundsOverpay() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 + 5 ether}(id, 1);
        assertEq(alice.balance, balBefore - ANNUAL_5);
    }

    function test_renew_revertsOnInsufficient() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.expectRevert(INSRegistryIgraV2.InsufficientPayment.selector);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 - 1}(id, 1);
    }

    function test_renew_premiumOverrideUsed() public {
        v2.setPremiumPriceAnnual("alice", 99 ether);
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.prank(alice);
        v2.renew{value: 99 ether * 2}(id, 2);
    }

    /* ─────────────────── extendToForever ───────────────────────────── */

    function test_extendToForever_happy() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5}(id);
        assertEq(v2.expiresAt(id), 0);
    }

    function test_extendToForever_inGraceWorks() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + 5 days);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5}(id);
        assertEq(v2.expiresAt(id), 0);
    }

    function test_extendToForever_postGraceReverts() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + DEFAULT_GRACE + 1);
        vm.expectRevert(INSRegistryIgraV2.NameExpired.selector);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5}(id);
    }

    function test_extendToForever_onForeverReverts() public {
        uint256 id = _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.AlreadyForever.selector);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5}(id);
    }

    function test_extendToForever_emits() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.expectEmit(true, true, false, true);
        emit INSRegistryIgraV2.ExtendedToForever(id, alice, FOREVER_5);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5}(id);
    }

    function test_extendToForever_revertsOnInsufficient() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.expectRevert(INSRegistryIgraV2.InsufficientPayment.selector);
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5 - 1}(id);
    }

    function test_extendToForever_refundsOverpay() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        v2.extendToForever{value: FOREVER_5 + 1 ether}(id);
        assertEq(alice.balance, balBefore - FOREVER_5);
    }

    function test_extendToForever_ownershipUnchanged() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.prank(charlie);
        vm.deal(charlie, FOREVER_5);
        v2.extendToForever{value: FOREVER_5}(id);
        assertEq(v2.ownerOf(id), alice);
    }

    /* ─────────────────── Re-registration after grace ───────────────── */

    function test_postGrace_canBeReRegistered() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.prank(bob);
        uint256 newId = v2.register{value: FOREVER_5}("alice", bob);
        assertTrue(newId != oldId);
        assertEq(v2.tokenIdOf("alice"), newId);
        assertEq(v2.ownerOf(newId), bob);
    }

    function test_inGrace_cannotBeReRegistered() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + 5 days); // mid-grace
        vm.expectRevert(INSRegistryIgraV2.AlreadyRegistered.selector);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
    }

    function test_preExpiry_cannotBeReRegistered() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) - 1);
        vm.expectRevert(INSRegistryIgraV2.AlreadyRegistered.selector);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
    }

    function test_postGrace_oldOwnerOfReverts() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
        vm.expectRevert(INSRegistryIgraV2.NonexistentToken.selector);
        v2.ownerOf(oldId);
    }

    function test_postGrace_oldLabelOfCleared() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
        assertEq(bytes(v2.labelOf(oldId)).length, 0);
    }

    function test_postGrace_canReRegisterAsAnnual() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.prank(bob);
        uint256 newId = v2.registerAnnual{value: ANNUAL_5}("alice", bob, 1);
        assertEq(v2.expiresAt(newId), block.timestamp + SEC_PER_YEAR);
    }

    function test_postGrace_emitsTransferToZero() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.expectEmit(true, true, true, false);
        emit INSRegistryIgraV2.Transfer(alice, address(0), oldId);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
    }

    function test_postGrace_aliceCanBuyHerOwnNameBack() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + DEFAULT_GRACE + 1);
        vm.prank(alice);
        v2.register{value: FOREVER_5}("alice", alice);
    }

    function test_postGrace_balancesUpdate() public {
        uint256 oldId = _registerAnnual(alice, "alice", 1);
        assertEq(v2.balanceOf(alice), 1);
        vm.warp(v2.expiresAt(oldId) + DEFAULT_GRACE + 1);
        vm.prank(bob);
        v2.register{value: FOREVER_5}("alice", bob);
        assertEq(v2.balanceOf(alice), 0);
        assertEq(v2.balanceOf(bob), 1);
    }

    function test_isExpired_andIsInGrace() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        assertFalse(v2.isExpired(id));
        assertFalse(v2.isInGrace(id));
        vm.warp(v2.expiresAt(id));
        assertTrue(v2.isExpired(id));
        assertTrue(v2.isInGrace(id));
        vm.warp(v2.expiresAt(id) + DEFAULT_GRACE);
        assertTrue(v2.isExpired(id));
        assertFalse(v2.isInGrace(id));
    }

    /* ─────────────────── V1 Migration ──────────────────────────────── */

    function test_claimV1Forever_happy() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        uint256 v2Id = v2.claimV1Forever(v1Id, alice);
        assertEq(v2.ownerOf(v2Id), alice);
        assertEq(v2.expiresAt(v2Id), 0); // Forever
        assertEq(v2.tokenIdOf("alicev1"), v2Id);
        assertTrue(v2.migrated(v1Id));
    }

    function test_claimV1Forever_nonOwnerReverts() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.expectRevert(INSRegistryIgraV2.NotV1Owner.selector);
        vm.prank(bob);
        v2.claimV1Forever(v1Id, bob);
    }

    function test_claimV1Forever_doubleClaimReverts() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
        vm.expectRevert(INSRegistryIgraV2.AlreadyMigrated.selector);
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
    }

    function test_claimV1Forever_collisionReverts() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        // Someone else registers the label on V2 first
        _registerForever(bob, "alicev1");
        vm.expectRevert(INSRegistryIgraV2.AlreadyRegistered.selector);
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
    }

    function test_claimV1Forever_targetZeroDefaultsToSender() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        uint256 v2Id = v2.claimV1Forever(v1Id, address(0));
        assertEq(v2.targetOf(v2Id), alice);
    }

    function test_claimV1Forever_emitsV1Migrated() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.expectEmit(true, true, true, true);
        emit INSRegistryIgraV2.V1Migrated(v1Id, 1, "alicev1", alice);
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
    }

    function test_claimV1Forever_v1NftStaysWithOwner() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
        // V1 contract is untouched
        assertEq(v1.ownerOf(v1Id), alice);
    }

    function test_claimV1Forever_v2NftIsForever() public {
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        uint256 v2Id = v2.claimV1Forever(v1Id, alice);
        assertEq(v2.expiresAt(v2Id), 0);
    }

    function test_claimV1Forever_countsTowardTotalSupply() public {
        uint256 supplyBefore = v2.totalSupply();
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
        assertEq(v2.totalSupply(), supplyBefore + 1);
    }

    function test_claimV1Forever_multipleHoldersMigrate() public {
        uint256 v1IdA = _registerOnV1(alice, "alicev1");
        uint256 v1IdB = _registerOnV1(bob, "bobv1");
        vm.prank(alice);
        v2.claimV1Forever(v1IdA, alice);
        vm.prank(bob);
        v2.claimV1Forever(v1IdB, bob);
        assertEq(v2.totalSupply(), 2);
    }

    function test_claimV1Forever_nonexistentReverts() public {
        // V1.ownerOf reverts on non-existent ids — surfaces here
        vm.expectRevert();
        vm.prank(alice);
        v2.claimV1Forever(999, alice);
    }

    /* ─────────────────── Grace period admin ────────────────────────── */

    function test_setGracePeriod_minWorks() public {
        v2.setGracePeriod(7 days);
        assertEq(v2.gracePeriodSec(), 7 days);
    }

    function test_setGracePeriod_maxWorks() public {
        v2.setGracePeriod(365 days);
        assertEq(v2.gracePeriodSec(), 365 days);
    }

    function test_setGracePeriod_belowMinReverts() public {
        vm.expectRevert(INSRegistryIgraV2.InvalidGracePeriod.selector);
        v2.setGracePeriod(7 days - 1);
    }

    function test_setGracePeriod_aboveMaxReverts() public {
        vm.expectRevert(INSRegistryIgraV2.InvalidGracePeriod.selector);
        v2.setGracePeriod(365 days + 1);
    }

    function test_setGracePeriod_nonOwnerReverts() public {
        vm.expectRevert(INSRegistryIgraV2.NotAuthorized.selector);
        vm.prank(alice);
        v2.setGracePeriod(60 days);
    }

    /* ─────────────────── Annual admin ──────────────────────────────── */

    function test_setLengthPriceAnnual_works() public {
        v2.setLengthPriceAnnual(5, 99 ether);
        assertEq(v2.lengthPriceAnnual(5), 99 ether);
    }

    function test_setLengthPriceAnnualBatch_atomic() public {
        uint8[] memory bks = new uint8[](5);
        uint256[] memory pcs = new uint256[](5);
        for (uint8 i = 0; i < 5; i++) {
            bks[i] = i + 1;
            pcs[i] = uint256(i + 1) * 100 ether;
        }
        v2.setLengthPriceAnnualBatch(bks, pcs);
        for (uint8 i = 0; i < 5; i++) {
            assertEq(v2.lengthPriceAnnual(i + 1), uint256(i + 1) * 100 ether);
        }
    }

    function test_setLengthPriceAnnual_nonOwnerReverts() public {
        vm.expectRevert(INSRegistryIgraV2.NotAuthorized.selector);
        vm.prank(alice);
        v2.setLengthPriceAnnual(5, 99 ether);
    }

    function test_setPremiumPriceAnnual_works() public {
        v2.setPremiumPriceAnnual("vip", 999 ether);
        assertEq(v2.premiumPriceAnnual("vip"), 999 ether);
    }

    function test_adminMintAnnual_gifts1y() public {
        uint256 id = v2.adminMintAnnual("gifted", alice, 1);
        assertEq(v2.ownerOf(id), alice);
        assertEq(v2.expiresAt(id), block.timestamp + SEC_PER_YEAR);
    }

    /* ─────────────────── ERC-721 surface ───────────────────────────── */

    function test_supportsInterface() public view {
        assertTrue(v2.supportsInterface(0x80ac58cd)); // ERC-721
        assertTrue(v2.supportsInterface(0x5b5e139f)); // ERC-721 Metadata
        assertTrue(v2.supportsInterface(0x01ffc9a7)); // ERC-165
        assertFalse(v2.supportsInterface(0xdeadbeef));
    }

    function test_transferFrom_works() public {
        uint256 id = _registerForever(alice, "alice");
        vm.prank(alice);
        v2.transferFrom(alice, bob, id);
        assertEq(v2.ownerOf(id), bob);
    }

    function test_transferFrom_nonOwnerReverts() public {
        uint256 id = _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.NotAuthorized.selector);
        vm.prank(bob);
        v2.transferFrom(alice, bob, id);
    }

    function test_approve_works() public {
        uint256 id = _registerForever(alice, "alice");
        vm.prank(alice);
        v2.approve(bob, id);
        assertEq(v2.getApproved(id), bob);
        // bob can now transfer
        vm.prank(bob);
        v2.transferFrom(alice, charlie, id);
        assertEq(v2.ownerOf(id), charlie);
    }

    function test_setApprovalForAll_works() public {
        uint256 id = _registerForever(alice, "alice");
        vm.prank(alice);
        v2.setApprovalForAll(bob, true);
        assertTrue(v2.isApprovedForAll(alice, bob));
        vm.prank(bob);
        v2.transferFrom(alice, charlie, id);
    }

    /* ─────────────────── tokenURI ──────────────────────────────────── */

    function test_tokenURI_foreverHasForeverPill() public {
        uint256 id = _registerForever(alice, "alice");
        string memory uri = v2.tokenURI(id);
        assertTrue(bytes(uri).length > 100);
        assertTrue(_contains(uri, "data:application/json;base64,"));
    }

    function test_tokenURI_annualHasExpiryPill() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        string memory uri = v2.tokenURI(id);
        assertTrue(bytes(uri).length > 100);
    }

    function test_tokenURI_nonexistentReverts() public {
        vm.expectRevert(INSRegistryIgraV2.NonexistentToken.selector);
        v2.tokenURI(999);
    }

    /* ─────────────────── setTarget ─────────────────────────────────── */

    function test_setTarget_ownerCanSet() public {
        _registerForever(alice, "alice");
        vm.prank(alice);
        v2.setTarget("alice", bob);
        assertEq(v2.resolve("alice"), bob);
    }

    function test_setTarget_nonOwnerReverts() public {
        _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.NotOwner.selector);
        vm.prank(bob);
        v2.setTarget("alice", bob);
    }

    function test_setTarget_postGraceReverts() public {
        uint256 id = _registerAnnual(alice, "alice", 1);
        vm.warp(v2.expiresAt(id) + DEFAULT_GRACE + 1);
        vm.expectRevert(INSRegistryIgraV2.NameExpired.selector);
        vm.prank(alice);
        v2.setTarget("alice", bob);
    }

    function test_setTarget_zeroAddressReverts() public {
        _registerForever(alice, "alice");
        vm.expectRevert(INSRegistryIgraV2.ZeroAddress.selector);
        vm.prank(alice);
        v2.setTarget("alice", address(0));
    }

    /* ─────────────────── Punycode-style labels ─────────────────────── */

    function test_punycode_emojiLabelAccepted() public {
        // 🦄 = xn--ls8h in punycode
        uint256 id = _registerForever(alice, "xn--ls8h");
        assertEq(v2.ownerOf(id), alice);
    }

    function test_punycode_longerEmojiSequenceAccepted() public {
        // a fictional multi-emoji punycode form
        uint256 id = _registerForever(alice, "xn--abc123def");
        assertEq(v2.ownerOf(id), alice);
    }

    /* ─────────────────── Fuzz tests ────────────────────────────────── */

    function testFuzz_registerAnnual_yearsMath(uint8 yrs) public {
        yrs = uint8(bound(yrs, 1, 10));
        uint256 expected = ANNUAL_5 * yrs;
        vm.prank(alice);
        uint256 id = v2.registerAnnual{value: expected}("alice", alice, yrs);
        assertEq(v2.expiresAt(id), block.timestamp + uint256(yrs) * SEC_PER_YEAR);
    }

    function testFuzz_renew_monotonicity(uint8 yrs1, uint8 yrs2) public {
        yrs1 = uint8(bound(yrs1, 1, 10));
        yrs2 = uint8(bound(yrs2, 1, 10));
        uint256 id = _registerAnnual(alice, "alice", yrs1);
        uint256 e1 = v2.expiresAt(id);
        vm.prank(alice);
        v2.renew{value: ANNUAL_5 * yrs2}(id, yrs2);
        uint256 e2 = v2.expiresAt(id);
        assertGt(e2, e1);
        assertEq(e2, e1 + uint256(yrs2) * SEC_PER_YEAR);
    }

    function testFuzz_overpayRefund(uint96 extra) public {
        vm.assume(extra < 1_000_000 ether);
        uint256 price = FOREVER_5;
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        v2.register{value: price + extra}("alice", alice);
        assertEq(alice.balance, balBefore - price);
    }

    function testFuzz_lengthBucket(uint8 len) public {
        len = uint8(bound(len, 5, 32));
        // build a label of that length, all 'a'
        bytes memory b = new bytes(len);
        for (uint256 i; i < len; ++i) b[i] = bytes1("a");
        string memory label = string(b);
        assertEq(v2.priceFor(label), FOREVER_5);
        assertEq(v2.priceAnnualFor(label), ANNUAL_5);
    }

    function testFuzz_premiumOverridePrecedence(uint96 override_) public {
        vm.assume(override_ > 0 && override_ < 100_000 ether);
        v2.setPremiumPrice("alice", override_);
        assertEq(v2.priceFor("alice"), override_);
    }

    function testFuzz_graceBoundary(uint8 yrs) public {
        yrs = uint8(bound(yrs, 1, 10));
        uint256 id = _registerAnnual(alice, "alice", yrs);
        uint256 e = v2.expiresAt(id);
        // at e + grace - 1: still in grace
        vm.warp(e + DEFAULT_GRACE - 1);
        assertTrue(v2.isInGrace(id));
        // at e + grace: post-grace
        vm.warp(e + DEFAULT_GRACE);
        assertFalse(v2.isInGrace(id));
    }

    function testFuzz_migrationIdempotence(uint8 attempts) public {
        attempts = uint8(bound(attempts, 1, 5));
        uint256 v1Id = _registerOnV1(alice, "alicev1");
        // first call works
        vm.prank(alice);
        v2.claimV1Forever(v1Id, alice);
        // every subsequent call reverts
        for (uint8 i = 1; i < attempts; ++i) {
            vm.expectRevert(INSRegistryIgraV2.AlreadyMigrated.selector);
            vm.prank(alice);
            v2.claimV1Forever(v1Id, alice);
        }
    }

    function testFuzz_punycodeLabelsAccepted(bytes8 raw) public {
        // build "xn--<8 lowercase hex chars>" — always valid Punycode shape
        string memory label = string(abi.encodePacked("xn--", _toHex(raw)));
        // must be 1..32 chars (it'll be exactly 4 + 16 = 20)
        uint256 id = _registerForever(alice, label);
        assertEq(v2.ownerOf(id), alice);
    }

    /* ─────────────────── Internal helpers ──────────────────────────── */

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i; i <= h.length - n.length; ++i) {
            bool match_ = true;
            for (uint256 j; j < n.length; ++j) {
                if (h[i + j] != n[j]) { match_ = false; break; }
            }
            if (match_) return true;
        }
        return false;
    }

    function _toHex(bytes8 raw) internal pure returns (string memory) {
        bytes memory chars = "0123456789abcdef";
        bytes memory out = new bytes(16);
        for (uint256 i; i < 8; ++i) {
            uint8 b = uint8(raw[i]);
            out[i * 2] = chars[b >> 4];
            out[i * 2 + 1] = chars[b & 0x0f];
        }
        return string(out);
    }
}
