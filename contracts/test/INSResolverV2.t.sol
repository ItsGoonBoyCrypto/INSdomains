// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSResolverV2} from "../src/INSResolverV2.sol";

/**
 * @title INSResolverV2Test
 * @notice Coverage for the hardened ENS-compatible resolver, with explicit
 *         regression tests for the namehash-poisoning attack that affected
 *         the original INSResolver.
 */

/// @notice Minimal mock registry implementing the IINSRegistry surface +
///         a settable isExpired so we can exercise the expiry guard.
contract MockRegistry {
    mapping(string => uint256) public ids;          // label -> tokenId
    mapping(uint256 => address) public owners;       // tokenId -> owner
    mapping(uint256 => address) public targets;      // tokenId -> target
    mapping(uint256 => bool) public expired;         // tokenId -> isExpired

    function setName(string calldata label, uint256 id, address owner_, address target_) external {
        ids[label] = id;
        owners[id] = owner_;
        targets[id] = target_;
    }
    function setExpired(uint256 id, bool v) external { expired[id] = v; }

    function tokenIdOf(string calldata label) external view returns (uint256) { return ids[label]; }
    function ownerOf(uint256 tokenId) external view returns (address) { return owners[tokenId]; }
    function targetOf(uint256 tokenId) external view returns (address) { return targets[tokenId]; }
    function isExpired(uint256 tokenId) external view returns (bool) { return expired[tokenId]; }
    function labelOf(uint256) external pure returns (string memory) { return ""; }
}

contract INSResolverV2Test is Test {
    INSResolverV2 resolver;
    MockRegistry reg;

    address alice = makeAddr("alice");
    address attacker = makeAddr("attacker");
    address aliceTarget = makeAddr("aliceTarget");
    address attackerTarget = makeAddr("attackerTarget");

    function setUp() public {
        reg = new MockRegistry();
        resolver = new INSResolverV2(address(reg));
        // alice owns "alice" (#1 → aliceTarget); attacker owns "attacker" (#2)
        reg.setName("alice", 1, alice, aliceTarget);
        reg.setName("attacker", 2, attacker, attackerTarget);
    }

    /* ───────────── namehash correctness ───────────── */

    function test_PARENT_NODE_matches_offchain() public view {
        // namehash("igra") computed off-chain in the deploy session.
        assertEq(
            resolver.PARENT_NODE(),
            0x845ae117fa3f88f78ba0d236aa4592959057d520889c7edd86b74d4123cc73e1
        );
    }

    function test_nodeOf_matches_ens_namehash() public view {
        // namehash("alice.igra") = keccak256(PARENT_NODE ‖ keccak256("alice"))
        bytes32 expected = keccak256(
            abi.encodePacked(resolver.PARENT_NODE(), keccak256(bytes("alice")))
        );
        assertEq(resolver.nodeOf("alice"), expected);
    }

    /* ───────────── happy-path resolution ───────────── */

    function test_cacheNode_then_addr_resolves() public {
        resolver.cacheNode("alice");
        bytes32 node = resolver.nodeOf("alice");
        assertEq(resolver.addr(node), aliceTarget);
    }

    function test_cacheNode_isPermissionless_but_correct() public {
        // Anyone can seed the mapping — but only ever to the TRUE label.
        vm.prank(attacker);
        resolver.cacheNode("alice");
        assertEq(resolver.labelOfNode(resolver.nodeOf("alice")), "alice");
        assertEq(resolver.addr(resolver.nodeOf("alice")), aliceTarget);
    }

    function test_cacheNode_revertsUnknownName() public {
        vm.expectRevert(INSResolverV2.UnknownName.selector);
        resolver.cacheNode("doesnotexist");
    }

    function test_addr_unknownNode_returnsZero() public view {
        assertEq(resolver.addr(bytes32(uint256(0xdead))), address(0));
    }

    /* ───────────── THE POISONING REGRESSION TEST ───────────── */

    /// @notice The original bug: attacker binds namehash("alice.igra") to
    ///         label "attacker" so addr() returns the attacker's target.
    ///         In the hardened resolver this is IMPOSSIBLE — cacheNode only
    ///         takes a label and derives the node, so the attacker can never
    ///         choose the node independently of the label.
    function test_poisoning_isImpossible() public {
        bytes32 aliceNode = resolver.nodeOf("alice");

        // Attacker seeds their own name — only affects attacker's node.
        vm.prank(attacker);
        resolver.cacheNode("attacker");

        // Attacker's node maps to attacker; alice's node is untouched.
        assertEq(resolver.addr(resolver.nodeOf("attacker")), attackerTarget);
        // alice's node still resolves to nothing until correctly cached...
        assertEq(resolver.addr(aliceNode), address(0));

        // ...and once cached (by anyone), it resolves to ALICE, never attacker.
        resolver.cacheNode("alice");
        assertEq(resolver.addr(aliceNode), aliceTarget);
        assertTrue(resolver.addr(aliceNode) != attackerTarget);
    }

    /// @notice Even if the attacker tries to overwrite an existing correct
    ///         binding, they can only re-write it to the same correct label.
    function test_cacheNode_cannotOverwriteToWrongLabel() public {
        resolver.cacheNode("alice");
        bytes32 aliceNode = resolver.nodeOf("alice");
        assertEq(resolver.addr(aliceNode), aliceTarget);

        // Attacker calls cacheNode("attacker") — different node, no effect on alice.
        vm.prank(attacker);
        resolver.cacheNode("attacker");
        assertEq(resolver.addr(aliceNode), aliceTarget); // unchanged
    }

    /* ───────────── expiry guard ───────────── */

    function test_addr_expiredName_returnsZero() public {
        resolver.cacheNode("alice");
        bytes32 node = resolver.nodeOf("alice");
        assertEq(resolver.addr(node), aliceTarget);

        reg.setExpired(1, true);
        assertEq(resolver.addr(node), address(0)); // expired → zero
    }

    /* ───────────── text records ───────────── */

    function test_setText_ownerOnly() public {
        vm.prank(alice);
        resolver.setText("alice", "url", "https://alice.example");
        assertEq(resolver.text(resolver.nodeOf("alice"), "url"), "https://alice.example");
    }

    function test_setText_revertsNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(INSResolverV2.NotOwner.selector);
        resolver.setText("alice", "url", "https://evil.example");
    }

    function test_setText_revertsEmptyKey() public {
        vm.prank(alice);
        vm.expectRevert(INSResolverV2.EmptyKey.selector);
        resolver.setText("alice", "", "x");
    }

    function test_setText_revertsUnknownName() public {
        vm.prank(alice);
        vm.expectRevert(INSResolverV2.UnknownName.selector);
        resolver.setText("ghost", "url", "x");
    }

    function test_setText_seedsNodeCache() public {
        // setText should also populate labelOfNode so addr() works after.
        vm.prank(alice);
        resolver.setText("alice", "avatar", "ipfs://x");
        assertEq(resolver.addr(resolver.nodeOf("alice")), aliceTarget);
    }

    /* ───────────── fuzz ───────────── */

    /// @notice For ANY label string, cacheNode binds the derived node to
    ///         exactly that label — never a different one. The core
    ///         anti-poisoning invariant.
    function testFuzz_cacheNodeAlwaysBindsTrueLabel(string calldata label) public {
        vm.assume(bytes(label).length > 0 && bytes(label).length <= 64);
        // Register the label so cacheNode doesn't revert.
        reg.setName(label, 999, alice, aliceTarget);
        resolver.cacheNode(label);
        // The node derived from `label` maps back to `label`, exactly.
        assertEq(resolver.labelOfNode(resolver.nodeOf(label)), label);
    }
}
