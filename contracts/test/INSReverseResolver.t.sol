// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSRegistry} from "../src/INSRegistry.sol";
import {INSReverseResolver} from "../src/INSReverseResolver.sol";

contract INSReverseResolverTest is Test {
    INSRegistry reg;
    INSReverseResolver rev;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);
    address carol = address(0xCAF0);

    uint256 constant P5 = 10 ether;

    event PrimarySet(address indexed user, uint256 indexed tokenId, string label);
    event PrimaryCleared(address indexed user, uint256 indexed previousTokenId);

    function setUp() public {
        reg = new INSRegistry();
        rev = new INSReverseResolver(address(reg));
        vm.deal(alice, 10_000 ether);
        vm.deal(bob,   10_000 ether);
        vm.deal(carol, 10_000 ether);
    }

    /* ─────────────── helpers ─────────────── */

    function _mint(address who, string memory label) internal returns (uint256) {
        vm.prank(who);
        reg.register{value: P5}(label, who);
        return reg.tokenIdOf(label);
    }

    /* ─────────────── setPrimary ─────────────── */

    function testSetPrimary_Happy() public {
        uint256 id = _mint(alice, "alice");

        vm.expectEmit(true, true, false, true);
        emit PrimarySet(alice, id, "alice");

        vm.prank(alice);
        rev.setPrimary(id);

        assertEq(rev.primaryName(alice), "alice");
        assertEq(rev.primaryTokenId(alice), id);
        assertTrue(rev.hasPrimary(alice));
    }

    function testSetPrimary_RevertIfNotOwner() public {
        uint256 id = _mint(alice, "alice");
        vm.prank(bob);
        vm.expectRevert(INSReverseResolver.NotTokenOwner.selector);
        rev.setPrimary(id);
    }

    function testSetPrimary_RevertIfNonexistent() public {
        vm.prank(alice);
        vm.expectRevert(INSReverseResolver.NonexistentToken.selector);
        rev.setPrimary(999);
    }

    function testSetPrimary_Overwrite() public {
        uint256 id1 = _mint(alice, "alice");
        uint256 id2 = _mint(alice, "alice2");

        vm.prank(alice);
        rev.setPrimary(id1);
        assertEq(rev.primaryName(alice), "alice");

        vm.prank(alice);
        rev.setPrimary(id2);
        assertEq(rev.primaryName(alice), "alice2");
        assertEq(rev.primaryTokenId(alice), id2);
    }

    /* ─────────────── clearPrimary ─────────────── */

    function testClearPrimary() public {
        uint256 id = _mint(alice, "alice");

        vm.prank(alice);
        rev.setPrimary(id);

        vm.expectEmit(true, true, false, false);
        emit PrimaryCleared(alice, id);

        vm.prank(alice);
        rev.clearPrimary();

        assertEq(rev.primaryName(alice), "");
        assertEq(rev.primaryTokenId(alice), 0);
        assertFalse(rev.hasPrimary(alice));
    }

    function testClearPrimary_NoopIfUnset() public {
        // should NOT revert, should NOT emit
        vm.prank(alice);
        rev.clearPrimary();
        assertEq(rev.primaryTokenId(alice), 0);
    }

    /* ─────────────── transfer invalidates primary ─────────────── */

    function testTransferInvalidatesPrimary() public {
        uint256 id = _mint(alice, "alice");
        vm.prank(alice);
        rev.setPrimary(id);
        assertEq(rev.primaryName(alice), "alice");

        // alice sends NFT to bob
        vm.prank(alice);
        reg.transferFrom(alice, bob, id);

        // alice's primary is now stale — must return empty
        assertEq(rev.primaryName(alice), "");
        assertFalse(rev.hasPrimary(alice));
        // storage still holds the stale tokenId for debugging
        assertEq(rev.primaryTokenId(alice), id);

        // bob has NOT set a primary, so nothing for bob either
        assertEq(rev.primaryName(bob), "");
    }

    function testPrimaryFollowsBackOnReacquisition() public {
        uint256 id = _mint(alice, "alice");
        vm.prank(alice);
        rev.setPrimary(id);

        // alice → bob → back to alice
        vm.prank(alice);
        reg.transferFrom(alice, bob, id);
        assertEq(rev.primaryName(alice), "");

        vm.prank(bob);
        reg.transferFrom(bob, alice, id);
        // alice never cleared, so her primary "reactivates"
        assertEq(rev.primaryName(alice), "alice");
        assertTrue(rev.hasPrimary(alice));
    }

    /* ─────────────── independent users ─────────────── */

    function testIndependentUsers() public {
        uint256 a = _mint(alice, "alice");
        uint256 b = _mint(bob,   "bobby"); // 5+ chars, P5 tier

        vm.prank(alice);
        rev.setPrimary(a);
        vm.prank(bob);
        rev.setPrimary(b);

        assertEq(rev.primaryName(alice), "alice");
        assertEq(rev.primaryName(bob),   "bobby");
    }

    function testUnsetUserReturnsEmpty() public view {
        assertEq(rev.primaryName(carol), "");
        assertEq(rev.primaryTokenId(carol), 0);
        assertFalse(rev.hasPrimary(carol));
    }

    /* ─────────────── fuzz ─────────────── */

    function testFuzz_SetPrimaryOnlyOwner(address attacker) public {
        uint256 id = _mint(alice, "alice");
        vm.assume(attacker != alice);
        vm.assume(attacker != address(0));

        vm.prank(attacker);
        vm.expectRevert(INSReverseResolver.NotTokenOwner.selector);
        rev.setPrimary(id);
    }

    /* ─────────────── registry immutability ─────────────── */

    function testRegistryAddressImmutable() public view {
        assertEq(address(rev.registry()), address(reg));
    }
}
