// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {INSSubnameExtension} from "../src/INSSubnameExtension.sol";

/// @dev Minimal mock of INSRegistry — only the two methods INSSubnameExtension needs.
contract MockRegistry {
    mapping(uint256 => address) public _owners;
    mapping(uint256 => string)  public _labels;
    function setOwner(uint256 tokenId, address o) external { _owners[tokenId] = o; }
    function setLabel(uint256 tokenId, string calldata l) external { _labels[tokenId] = l; }
    function ownerOf(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "no owner");
        return _owners[tokenId];
    }
    function labelOf(uint256 tokenId) external view returns (string memory) {
        return _labels[tokenId];
    }
}

contract NonReceiver {}

contract Receiver {
    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}

contract INSSubnameExtensionTest is Test {
    INSSubnameExtension ext;
    MockRegistry reg;
    address constant ADMIN = address(0xA1);
    address constant ALICE = address(0xA2);  // owns alice.igra (tokenId 1)
    address constant BOB   = address(0xA3);
    address constant CAROL = address(0xA4);

    uint256 constant ALICE_PARENT = 1;
    uint256 constant BOB_PARENT   = 2;

    function setUp() public {
        reg = new MockRegistry();
        reg.setOwner(ALICE_PARENT, ALICE);
        reg.setLabel(ALICE_PARENT, "alice");
        reg.setOwner(BOB_PARENT, BOB);
        reg.setLabel(BOB_PARENT, "bob");

        ext = new INSSubnameExtension(address(reg), ADMIN);
        // launches with enabled = false by design
    }

    /* ─────────────────────────── Admin / enable ──────────────── */
    function test_initialState() public view {
        assertEq(ext.owner(), ADMIN);
        assertFalse(ext.enabled());
        assertEq(address(ext.parentRegistry()), address(reg));
        assertEq(ext.SUBNAME_ID_OFFSET(), 1_000_000_000);
        assertEq(ext.nextSubTokenId(), 1_000_000_000);
        assertEq(ext.totalSupply(), 0);
    }

    function test_setEnabled_onlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotOwner.selector);
        ext.setEnabled(true);

        vm.prank(ADMIN);
        ext.setEnabled(true);
        assertTrue(ext.enabled());

        vm.prank(ADMIN);
        ext.setEnabled(false);
        assertFalse(ext.enabled());
    }

    function test_transferOwnership_onlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotOwner.selector);
        ext.transferOwnership(BOB);

        vm.prank(ADMIN);
        ext.transferOwnership(BOB);
        assertEq(ext.owner(), BOB);

        // Old admin can't act now
        vm.prank(ADMIN);
        vm.expectRevert(INSSubnameExtension.NotOwner.selector);
        ext.setEnabled(true);
    }

    function test_transferOwnership_zeroAddressReverts() public {
        vm.prank(ADMIN);
        vm.expectRevert(INSSubnameExtension.ZeroAddress.selector);
        ext.transferOwnership(address(0));
    }

    /* ─────────────────────────── Mint subname ────────────────── */
    function test_mintSubname_revertsWhenDisabled() public {
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotEnabled.selector);
        ext.mintSubname(ALICE_PARENT, "pay", ALICE);
    }

    function _enable() internal {
        vm.prank(ADMIN);
        ext.setEnabled(true);
    }

    function test_mintSubname_happyPath() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "pay", ALICE);

        assertEq(subId, 1_000_000_000);
        assertEq(ext.ownerOf(subId), ALICE);
        assertEq(ext.subnameOf(ALICE_PARENT, "pay"), subId);
        assertEq(ext.parentOf(subId), ALICE_PARENT);
        assertEq(ext.subLabelOf(subId), "pay");
        assertEq(ext.targetOf(subId), ALICE); // default target = recipient
        assertEq(ext.totalSupply(), 1);
        assertEq(ext.nextSubTokenId(), 1_000_000_001);
    }

    function test_mintSubname_recipientCanBeAnyone() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "gift", BOB);

        assertEq(ext.ownerOf(subId), BOB);
        assertEq(ext.targetOf(subId), BOB);
    }

    function test_mintSubname_revertsIfNotParentOwner() public {
        _enable();
        vm.prank(BOB); // bob doesn't own alice.igra
        vm.expectRevert(INSSubnameExtension.NotParentOwner.selector);
        ext.mintSubname(ALICE_PARENT, "pay", BOB);
    }

    function test_mintSubname_revertsIfDuplicateLabel() public {
        _enable();
        vm.startPrank(ALICE);
        ext.mintSubname(ALICE_PARENT, "pay", ALICE);
        vm.expectRevert(INSSubnameExtension.SubnameExists.selector);
        ext.mintSubname(ALICE_PARENT, "pay", BOB);
        vm.stopPrank();
    }

    function test_mintSubname_revertsOnInvalidLabel() public {
        _enable();
        vm.startPrank(ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "", ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "-pay", ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "pay-", ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "PAY", ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "pay.dao", ALICE);

        vm.expectRevert(INSSubnameExtension.InvalidLabel.selector);
        ext.mintSubname(ALICE_PARENT, "thirty-three-chars-label-too-long-x", ALICE); // 34 chars

        vm.stopPrank();
    }

    function test_mintSubname_revertsOnZeroRecipient() public {
        _enable();
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.ZeroAddress.selector);
        ext.mintSubname(ALICE_PARENT, "pay", address(0));
    }

    function test_mintSubname_revertsOnSubAsParent() public {
        _enable();
        vm.prank(ALICE);
        ext.mintSubname(ALICE_PARENT, "pay", ALICE);

        // Try to mint sub-of-sub (should revert — v1 only supports top-level parents)
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotTopLevelParent.selector);
        ext.mintSubname(1_000_000_000, "deep", ALICE);
    }

    function test_mintSubname_safeMint_callsReceiver() public {
        _enable();
        Receiver r = new Receiver();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "to-contract", address(r));
        assertEq(ext.ownerOf(subId), address(r));
    }

    function test_mintSubname_revertsOnNonReceiverContract() public {
        _enable();
        NonReceiver nr = new NonReceiver();
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.TransferToNonReceiver.selector);
        ext.mintSubname(ALICE_PARENT, "to-contract", address(nr));
    }

    /* ─────────────────────────── Lock / unlock parent ────────── */
    function test_lockParentSubnames_blocksFurtherMints() public {
        _enable();
        vm.startPrank(ALICE);
        ext.mintSubname(ALICE_PARENT, "first", ALICE);
        ext.lockParentSubnames(ALICE_PARENT, true);
        vm.expectRevert(INSSubnameExtension.ParentLocked.selector);
        ext.mintSubname(ALICE_PARENT, "second", ALICE);
        vm.stopPrank();
    }

    function test_lockParentSubnames_reversible() public {
        _enable();
        vm.startPrank(ALICE);
        ext.lockParentSubnames(ALICE_PARENT, true);
        vm.expectRevert(INSSubnameExtension.ParentLocked.selector);
        ext.mintSubname(ALICE_PARENT, "x", ALICE);
        // Unlock
        ext.lockParentSubnames(ALICE_PARENT, false);
        ext.mintSubname(ALICE_PARENT, "x", ALICE); // should succeed now
        vm.stopPrank();
    }

    function test_lockParentSubnames_onlyParentOwner() public {
        _enable();
        vm.prank(BOB); // not alice's owner
        vm.expectRevert(INSSubnameExtension.NotParentOwner.selector);
        ext.lockParentSubnames(ALICE_PARENT, true);
    }

    /* ─────────────────────────── Set target ──────────────────── */
    function test_setSubnameTarget_onlySubnameOwner() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "pay", ALICE);

        // Alice can set target
        vm.prank(ALICE);
        ext.setSubnameTarget(subId, BOB);
        assertEq(ext.targetOf(subId), BOB);

        // Bob (parent owner of bob.igra, but NOT subname owner) cannot
        vm.prank(BOB);
        vm.expectRevert(INSSubnameExtension.NotAuthorized.selector);
        ext.setSubnameTarget(subId, CAROL);

        // Even Alice's parent ownership doesn't give carol-the-subname-owner privilege
        vm.prank(ALICE); // alice transfers subname to carol
        ext.transferFrom(ALICE, CAROL, subId);

        // Now alice can no longer set target
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotAuthorized.selector);
        ext.setSubnameTarget(subId, ALICE);

        // Carol can
        vm.prank(CAROL);
        ext.setSubnameTarget(subId, ALICE);
        assertEq(ext.targetOf(subId), ALICE);
    }

    /* ─────────────────────────── Transfer independence ───────── */
    function test_subnameTransfersFreely() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "pay", ALICE);

        vm.prank(ALICE);
        ext.transferFrom(ALICE, BOB, subId);
        assertEq(ext.ownerOf(subId), BOB);

        // targetOf is preserved across transfer
        assertEq(ext.targetOf(subId), ALICE); // was alice (the original recipient)
    }

    function test_parentTransferDoesNotAffectSubname() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "pay", ALICE);

        // Simulate alice selling alice.igra to carol
        reg.setOwner(ALICE_PARENT, CAROL);

        // Subname is unaffected — still owned by alice
        assertEq(ext.ownerOf(subId), ALICE);
        assertEq(ext.targetOf(subId), ALICE);

        // Carol, the new parent owner, cannot setTarget on the subname
        vm.prank(CAROL);
        vm.expectRevert(INSSubnameExtension.NotAuthorized.selector);
        ext.setSubnameTarget(subId, CAROL);

        // But carol CAN mint NEW subnames under alice.igra (since she now owns parent)
        vm.prank(CAROL);
        ext.mintSubname(ALICE_PARENT, "carol-sub", CAROL);

        // Alice (no longer parent owner) cannot mint more under alice.igra
        vm.prank(ALICE);
        vm.expectRevert(INSSubnameExtension.NotParentOwner.selector);
        ext.mintSubname(ALICE_PARENT, "alice-sub", ALICE);
    }

    /* ─────────────────────────── ERC-721 standard ────────────── */
    function test_balanceOf() public {
        _enable();
        vm.startPrank(ALICE);
        ext.mintSubname(ALICE_PARENT, "a", ALICE);
        ext.mintSubname(ALICE_PARENT, "b", ALICE);
        ext.mintSubname(ALICE_PARENT, "c", BOB);
        vm.stopPrank();

        assertEq(ext.balanceOf(ALICE), 2);
        assertEq(ext.balanceOf(BOB), 1);
    }

    function test_ownerOf_revertsForUnminted() public {
        vm.expectRevert(INSSubnameExtension.NonexistentToken.selector);
        ext.ownerOf(999_999_999);
    }

    function test_supportsInterface() public view {
        assertTrue(ext.supportsInterface(0x80ac58cd)); // ERC-721
        assertTrue(ext.supportsInterface(0x5b5e139f)); // ERC-721 Metadata
        assertTrue(ext.supportsInterface(0x01ffc9a7)); // ERC-165
        assertFalse(ext.supportsInterface(0xdeadbeef));
    }

    /* ─────────────────────────── Read helpers ────────────────── */
    function test_fullName() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "pay", ALICE);
        assertEq(ext.fullName(subId), "pay.alice.igra");
    }

    function test_fullName_revertsForNonsubname() public {
        vm.expectRevert(INSSubnameExtension.NonexistentToken.selector);
        ext.fullName(1); // top-level ID, not a subname
    }

    function test_tokenURI_containsFullName() public {
        _enable();
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, "vault", ALICE);
        string memory uri = ext.tokenURI(subId);
        // Just sanity-check it contains the full name
        bytes memory uriBytes = bytes(uri);
        bool found = false;
        bytes memory needle = bytes("vault.alice.igra");
        for (uint256 i = 0; i + needle.length <= uriBytes.length; i++) {
            bool match_ = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (uriBytes[i + j] != needle[j]) { match_ = false; break; }
            }
            if (match_) { found = true; break; }
        }
        assertTrue(found, "tokenURI should contain full name");
    }

    /* ─────────────────────────── Fuzz ────────────────────────── */
    function testFuzz_validLabel_roundTrip(string calldata label) public {
        _enable();
        bytes memory b = bytes(label);
        // Filter to ensure valid label
        if (b.length < 1 || b.length > 32) return;
        if (b[0] == 0x2d || b[b.length - 1] == 0x2d) return;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c == 0x2d;
            if (!ok) return;
        }
        vm.prank(ALICE);
        uint256 subId = ext.mintSubname(ALICE_PARENT, label, ALICE);
        assertEq(ext.subnameOf(ALICE_PARENT, label), subId);
        assertEq(ext.ownerOf(subId), ALICE);
    }
}
