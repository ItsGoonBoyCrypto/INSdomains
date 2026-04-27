// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "./BaseTest.sol";
import {INSResolver} from "../src/INSResolver.sol";

/**
 * @title INSResolverTest
 * @notice Test surface for INSResolver — the namehash-keyed forward
 *         resolver that wraps INSRegistry's address record and adds
 *         text records (avatar / url / twitter / email / etc).
 *
 * @dev    Coverage:
 *          - addr(node)         — forward lookup via labelOfNode cache
 *          - text(node, key)    — read text records
 *          - cacheNode          — trust-on-first-write label binding
 *          - setText            — owner-gated, double-purposes as a writeable
 *                                 cache seed
 *          - sad paths: empty key, unauthorized writer, unbound node,
 *                       transferred token revoking write authority
 *          - integration: target updates on Registry propagate to addr()
 */
contract INSResolverTest is BaseTest {
    /* ─────────────────────────── addr(node) ────────────────────────── */

    function test_addr_unboundNodeReturnsZero() public {
        // No name registered; namehash never bound to any label.
        bytes32 node = namehashIgra("nobody");
        assertEq(resolver.addr(node), address(0), "expected zero for unbound node");
    }

    function test_addr_returnsRegistryTargetAfterCache() public {
        // Alice registers "alice" → target alice.
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // Anyone (here: bob) can seed the namehash cache with the label.
        // It's pure metadata — does not change ownership.
        vm.prank(bob);
        resolver.cacheNode("alice", node);

        assertEq(resolver.addr(node), alice, "addr() should track Registry target");
    }

    function test_addr_followsRegistryTargetUpdates() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");
        resolver.cacheNode("alice", node);

        // Initial target was alice.
        assertEq(resolver.addr(node), alice);

        // Alice updates the target on the Registry to point at bob.
        vm.prank(alice);
        registry.setTarget("alice", bob);

        // Resolver now reflects the new target without re-caching.
        assertEq(resolver.addr(node), bob, "addr() should track live Registry state");
    }

    function test_addr_returnsZeroAfterTokenBurned_NotApplicable() public {
        // Sanity: burns aren't supported in INSRegistry today (no burn fn).
        // Test exists to explicitly document the assumption — if a burn path
        // is ever added, `addr()` should fall back to address(0). Right now
        // that branch is unreachable by design.
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");
        resolver.cacheNode("alice", node);
        assertEq(resolver.addr(node), alice);
    }

    /* ─────────────────────────── cacheNode ─────────────────────────── */

    function test_cacheNode_anyoneCanSeedFirstWrite() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // Charlie (random third party) seeds the cache.
        vm.prank(charlie);
        resolver.cacheNode("alice", node);

        assertEq(resolver.labelOfNode(node), "alice");
    }

    function test_cacheNode_secondWriteIsNoop() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // First write wins.
        resolver.cacheNode("alice", node);

        // Trying to overwrite to a different label silently no-ops.
        // (This is the trust-on-first-write guarantee — no race possible.)
        resolver.cacheNode("attacker", node);

        assertEq(resolver.labelOfNode(node), "alice", "cache must be append-only");
    }

    /* ─────────────────────────── setText ───────────────────────────── */

    function test_setText_ownerCanWriteRecords() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.startPrank(alice);
        resolver.setText("alice", node, "url",     "https://alice.example");
        resolver.setText("alice", node, "twitter", "@alice");
        resolver.setText("alice", node, "email",   "alice@example.com");
        vm.stopPrank();

        assertEq(resolver.text(node, "url"),     "https://alice.example");
        assertEq(resolver.text(node, "twitter"), "@alice");
        assertEq(resolver.text(node, "email"),   "alice@example.com");
    }

    function test_setText_doublesAsCacheSeed() public {
        // setText also seeds the labelOfNode cache, so a single call is enough
        // to make the name resolvable + populated with metadata.
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.prank(alice);
        resolver.setText("alice", node, "url", "https://alice.example");

        assertEq(resolver.labelOfNode(node), "alice", "setText should seed cache");
        assertEq(resolver.addr(node),        alice,   "addr() should resolve");
    }

    function test_setText_overwritesExistingValue() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.startPrank(alice);
        resolver.setText("alice", node, "status", "online");
        assertEq(resolver.text(node, "status"), "online");

        resolver.setText("alice", node, "status", "afk");
        vm.stopPrank();
        assertEq(resolver.text(node, "status"), "afk", "value should overwrite cleanly");
    }

    function test_setText_clearViaEmptyValue() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.startPrank(alice);
        resolver.setText("alice", node, "note", "important");
        assertEq(resolver.text(node, "note"), "important");

        // Setting empty string is the canonical "clear this record" convention.
        resolver.setText("alice", node, "note", "");
        vm.stopPrank();
        assertEq(resolver.text(node, "note"), "");
    }

    function test_setText_revertsWhenKeyIsEmpty() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.prank(alice);
        vm.expectRevert(INSResolver.EmptyKey.selector);
        resolver.setText("alice", node, "", "anything");
    }

    function test_setText_revertsForNonOwner() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // Bob doesn't own "alice" → resolver rejects.
        vm.prank(bob);
        vm.expectRevert(INSResolver.NotOwner.selector);
        resolver.setText("alice", node, "url", "https://bob-attack.example");
    }

    function test_setText_revertsForUnregisteredLabel() public {
        bytes32 node = namehashIgra("ghost");

        // Even the deployer can't write text for a name that has never been
        // minted — no token, no owner.
        vm.expectRevert(INSResolver.NotOwner.selector);
        resolver.setText("ghost", node, "url", "https://ghost.example");
    }

    function test_setText_authorityFollowsTokenTransfer() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // Alice writes the initial record.
        vm.prank(alice);
        resolver.setText("alice", node, "url", "https://alice.example");

        // Alice transfers the NFT to bob.
        uint256 tokenId = registry.tokenIdOf("alice");
        vm.prank(alice);
        registry.transferFrom(alice, bob, tokenId);

        // Alice can no longer write.
        vm.prank(alice);
        vm.expectRevert(INSResolver.NotOwner.selector);
        resolver.setText("alice", node, "url", "https://alice-not-anymore.example");

        // Bob (the new owner) can now write.
        vm.prank(bob);
        resolver.setText("alice", node, "url", "https://bob-now-owns.example");

        assertEq(resolver.text(node, "url"), "https://bob-now-owns.example");
    }

    /* ─────────────────────────── Integration with reverse ──────────── */

    function test_forwardAndReverse_workTogether() public {
        // Register, set text records, set primary — verify full bi-directional
        // resolution. This is the canonical "wallet UX" path.
        uint256 tokenId = registerName(alice, "alice");
        bytes32 node    = namehashIgra("alice");

        vm.startPrank(alice);
        resolver.setText("alice", node, "url",     "https://alice.example");
        resolver.setText("alice", node, "twitter", "@alice");
        reverseResolver.setPrimary(tokenId);
        vm.stopPrank();

        // Forward: namehash → address
        assertEq(resolver.addr(node), alice);
        // Forward (text records): namehash → string
        assertEq(resolver.text(node, "twitter"), "@alice");
        // Reverse: address → label
        assertEq(reverseResolver.primaryName(alice), "alice");
    }

    /* ─────────────────────────── Independence ──────────────────────── */

    function test_textRecordsAreIndependentAcrossNodes() public {
        registerName(alice, "alice");
        registerName(bob,   "bobby");

        bytes32 nodeA = namehashIgra("alice");
        bytes32 nodeB = namehashIgra("bobby");

        vm.prank(alice);
        resolver.setText("alice", nodeA, "url", "https://alice.example");

        vm.prank(bob);
        resolver.setText("bobby", nodeB, "url", "https://bob.example");

        assertEq(resolver.text(nodeA, "url"), "https://alice.example");
        assertEq(resolver.text(nodeB, "url"), "https://bob.example");
    }

    function test_unsetTextRecordReturnsEmpty() public {
        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        // Reading an unset key on a real node returns "" (no revert).
        assertEq(resolver.text(node, "neverWrittenKey"), "");
    }

    /* ─────────────────────────── Fuzz ──────────────────────────────── */

    /// @notice Setting + reading any (key,value) combination must round-trip
    ///         identically. Covers UTF-8, special chars, long values.
    function testFuzz_setText_roundTrip(string calldata key, string calldata value) public {
        // Skip empty key — that's its own revert path covered above.
        vm.assume(bytes(key).length > 0);
        // Cap length to keep the fuzzer focused; resolver itself has no limit.
        vm.assume(bytes(key).length   <= 64);
        vm.assume(bytes(value).length <= 256);

        registerName(alice, "alice");
        bytes32 node = namehashIgra("alice");

        vm.prank(alice);
        resolver.setText("alice", node, key, value);

        assertEq(resolver.text(node, key), value, "round-trip mismatch");
    }
}
