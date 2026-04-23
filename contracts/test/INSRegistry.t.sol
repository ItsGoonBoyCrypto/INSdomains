// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSRegistry} from "../src/INSRegistry.sol";

contract INSRegistryTest is Test {
    INSRegistry reg;
    address admin = address(this);
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);
    address carol = address(0xCAF0);

    uint256 constant P2 = 5000 ether;
    uint256 constant P3 = 500 ether;
    uint256 constant P4 = 50 ether;
    uint256 constant P5 = 10 ether;

    event Registered(string indexed label, address indexed owner, address target, uint256 paid);
    event AdminMinted(string indexed label, address indexed to, address mintedBy);
    event Reserved(string indexed label, bool isReserved);
    event LengthPriceUpdated(uint8 len, uint256 price);
    event PremiumPriceUpdated(string indexed label, uint256 price);

    function setUp() public {
        reg = new INSRegistry();
        vm.deal(alice, 10000 ether);
        vm.deal(bob,   10000 ether);
        vm.deal(carol, 10000 ether);
    }

    /* ─────────────── priceFor / availability ─────────────── */

    function testPriceFor_LengthTiers() public view {
        assertEq(reg.priceFor("hi"),       P2, "2-char");
        assertEq(reg.priceFor("abc"),      P3, "3-char");
        assertEq(reg.priceFor("abcd"),     P4, "4-char");
        assertEq(reg.priceFor("abcde"),    P5, "5-char");
        assertEq(reg.priceFor("abcdefghij"), P5, "10-char");
    }

    function testPriceFor_OneCharIsReserved() public view {
        assertEq(reg.priceFor("a"), reg.TIER_RESERVED(), "1-char reserved");
    }

    function testPriceFor_InvalidLabelIsReserved() public view {
        assertEq(reg.priceFor("Bad"),       reg.TIER_RESERVED(), "uppercase");
        assertEq(reg.priceFor("-lead"),     reg.TIER_RESERVED(), "leading dash");
        assertEq(reg.priceFor("trail-"),    reg.TIER_RESERVED(), "trailing dash");
        assertEq(reg.priceFor("bad_under"), reg.TIER_RESERVED(), "underscore");
        assertEq(reg.priceFor(""),          reg.TIER_RESERVED(), "empty");
    }

    function testPriceFor_Length33IsReserved() public view {
        // 33 chars -> invalid
        string memory s = "abcdefghijklmnopqrstuvwxyzabcdefg";
        assertEq(bytes(s).length, 33);
        assertEq(reg.priceFor(s), reg.TIER_RESERVED(), "too long");
    }

    function testPriceFor_PremiumOverride() public {
        reg.setPremiumPrice("custom", 123 ether);
        assertEq(reg.priceFor("custom"), 123 ether, "premium overrides tier");
        reg.setPremiumPrice("custom", 0);
        assertEq(reg.priceFor("custom"), P5, "cleared override falls back");
    }

    function testPriceFor_ReservedBlocks() public {
        reg.setReserved("kcom", true);
        assertEq(reg.priceFor("kcom"), reg.TIER_RESERVED(), "reserved");
    }

    function testAvailable_OpenWhenValid() public view {
        assertTrue(reg.available("alice"));
    }

    function testAvailable_FalseWhenReserved() public {
        reg.setReserved("alice", true);
        assertFalse(reg.available("alice"));
    }

    function testAvailable_FalseWhenMinted() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        assertFalse(reg.available("alice"));
    }

    function testAvailable_FalseFor1Char() public view {
        assertFalse(reg.available("z"));
    }

    /* ─────────────── register ─────────────── */

    function testRegister_SetsOwnerAndTarget() public {
        vm.prank(alice);
        uint256 tokenId = reg.register{value: P5}("alice", bob);
        assertEq(tokenId, 1);
        assertEq(reg.ownerOfName("alice"), alice, "name owner");
        assertEq(reg.resolve("alice"), bob, "target");
        assertEq(reg.balanceOf(alice), 1);
        assertEq(reg.totalSupply(), 1);
    }

    function testRegister_DefaultsTargetToSender() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", address(0));
        assertEq(reg.resolve("alice"), alice);
    }

    function testRegister_RefundsOverpayment() public {
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        reg.register{value: P5 + 1 ether}("alice", alice);
        assertEq(alice.balance, balBefore - P5, "refund overage");
        assertEq(address(reg).balance, P5, "registry keeps exact price");
    }

    function testRegister_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit Registered("alice", alice, alice, P5);
        reg.register{value: P5}("alice", alice);
    }

    function testRegister_RevertOnInsufficient() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.InsufficientPayment.selector);
        reg.register{value: P5 - 1}("alice", alice);
    }

    function testRegister_RevertOnAlreadyRegistered() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        vm.prank(bob);
        vm.expectRevert(INSRegistry.AlreadyRegistered.selector);
        reg.register{value: P5}("alice", bob);
    }

    function testRegister_RevertOnReserved() public {
        reg.setReserved("alice", true);
        vm.prank(alice);
        vm.expectRevert(INSRegistry.NameReserved.selector);
        reg.register{value: P5}("alice", alice);
    }

    function testRegister_RevertOnTierReserved1Char() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.TierReserved.selector);
        reg.register{value: 100 ether}("a", alice);
    }

    function testRegister_RevertOnInvalidLabel() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.InvalidLabel.selector);
        reg.register{value: P5}("Bad", alice);
    }

    function testRegister_2CharRequires5000() public {
        vm.prank(alice);
        reg.register{value: P2}("ab", alice);
        assertEq(reg.ownerOfName("ab"), alice);
    }

    function testRegister_HyphenInMiddleOK() public {
        vm.prank(alice);
        reg.register{value: P5}("foo-bar", alice);
        assertEq(reg.ownerOfName("foo-bar"), alice);
    }

    /* ─────────────── adminMint ─────────────── */

    function testAdminMint_BypassesPayment() public {
        reg.adminMint("kcom", alice);  // reserved name, no payment
        assertEq(reg.ownerOfName("kcom"), alice);
        assertEq(reg.resolve("kcom"), alice, "target = recipient by default");
    }

    function testAdminMint_BypassesReservation() public {
        reg.setReserved("vip", true);
        reg.adminMint("vip", alice);
        assertEq(reg.ownerOfName("vip"), alice);
    }

    function testAdminMint_CanMint1Char() public {
        reg.adminMint("a", alice);
        assertEq(reg.ownerOfName("a"), alice);
    }

    function testAdminMint_RevertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        reg.adminMint("alice", alice);
    }

    function testAdminMint_RevertToZero() public {
        vm.expectRevert(INSRegistry.ZeroAddress.selector);
        reg.adminMint("gift", address(0));
    }

    function testAdminMint_RevertIfAlreadyRegistered() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        vm.expectRevert(INSRegistry.AlreadyRegistered.selector);
        reg.adminMint("alice", bob);
    }

    function testAdminMint_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit AdminMinted("gift", alice, address(this));
        reg.adminMint("gift", alice);
    }

    /* ─────────────── setReserved ─────────────── */

    function testSetReserved_FlipAndBack() public {
        reg.setReserved("goon", true);
        assertTrue(reg.reserved("goon"));
        reg.setReserved("goon", false);
        assertFalse(reg.reserved("goon"));
    }

    function testSetReservedBatch_SeedsList() public {
        string[] memory labels = new string[](3);
        labels[0] = "kcom";
        labels[1] = "zeal";
        labels[2] = "dao";
        reg.setReservedBatch(labels, true);
        assertTrue(reg.reserved("kcom"));
        assertTrue(reg.reserved("zeal"));
        assertTrue(reg.reserved("dao"));
    }

    function testSetReservedBatch_Unreserve() public {
        string[] memory labels = new string[](2);
        labels[0] = "a"; labels[1] = "b";
        reg.setReservedBatch(labels, true);
        reg.setReservedBatch(labels, false);
        assertFalse(reg.reserved("a"));
    }

    function testSetReserved_RevertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        reg.setReserved("kcom", true);
    }

    /* ─────────────── setLengthPrice / setPremiumPrice ─────────────── */

    function testSetLengthPrice_Update() public {
        reg.setLengthPrice(5, 20 ether);
        assertEq(reg.priceFor("alice"), 20 ether);
    }

    function testSetLengthPrice_UnlockOneChar() public {
        reg.setLengthPrice(1, 1000 ether);
        assertEq(reg.priceFor("a"), 1000 ether);
        vm.prank(alice);
        reg.register{value: 1000 ether}("a", alice);
        assertEq(reg.ownerOfName("a"), alice);
    }

    function testSetLengthPrice_RevertOutOfRange() public {
        vm.expectRevert(bytes("bucket out of range"));
        reg.setLengthPrice(0, 1 ether);
        vm.expectRevert(bytes("bucket out of range"));
        reg.setLengthPrice(6, 1 ether);
    }

    function testSetPremiumPrice_Overrides() public {
        reg.setPremiumPrice("vanity", 1000 ether);
        assertEq(reg.priceFor("vanity"), 1000 ether);
        vm.prank(alice);
        reg.register{value: 1000 ether}("vanity", alice);
        assertEq(reg.ownerOfName("vanity"), alice);
    }

    function testSetPremiumPrice_ClearWithZero() public {
        reg.setPremiumPrice("vanity", 1000 ether);
        reg.setPremiumPrice("vanity", 0);
        assertEq(reg.priceFor("vanity"), P5);
    }

    /* ─────────────── setTarget ─────────────── */

    function testSetTarget_OwnerCanUpdate() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        vm.prank(alice);
        reg.setTarget("alice", bob);
        assertEq(reg.resolve("alice"), bob);
    }

    function testSetTarget_RevertNotOwner() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        vm.prank(bob);
        vm.expectRevert(INSRegistry.NotOwner.selector);
        reg.setTarget("alice", bob);
    }

    function testSetTarget_RevertZeroAddress() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        vm.prank(alice);
        vm.expectRevert(INSRegistry.ZeroAddress.selector);
        reg.setTarget("alice", address(0));
    }

    function testSetTarget_RevertNonexistent() public {
        vm.expectRevert(INSRegistry.NonexistentToken.selector);
        reg.setTarget("nobody", bob);
    }

    /* ─────────────── transfer: target stays stale ─────────────── */

    function testTransferFrom_MovesNFTButTargetStays() public {
        vm.prank(alice);
        uint256 id = reg.register{value: P5}("alice", alice);
        vm.prank(alice);
        reg.transferFrom(alice, bob, id);
        assertEq(reg.ownerOf(id), bob);
        assertEq(reg.resolve("alice"), alice, "target is sticky until new owner calls setTarget");
        // bob can now update
        vm.prank(bob);
        reg.setTarget("alice", bob);
        assertEq(reg.resolve("alice"), bob);
    }

    function testTransferFrom_RevertIfNotAuthorized() public {
        vm.prank(alice);
        uint256 id = reg.register{value: P5}("alice", alice);
        vm.prank(carol);
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        reg.transferFrom(alice, bob, id);
    }

    function testApprove_AllowsTransfer() public {
        vm.prank(alice);
        uint256 id = reg.register{value: P5}("alice", alice);
        vm.prank(alice);
        reg.approve(carol, id);
        vm.prank(carol);
        reg.transferFrom(alice, bob, id);
        assertEq(reg.ownerOf(id), bob);
    }

    function testSetApprovalForAll_AllowsTransfer() public {
        vm.prank(alice);
        uint256 id = reg.register{value: P5}("alice", alice);
        vm.prank(alice);
        reg.setApprovalForAll(carol, true);
        vm.prank(carol);
        reg.transferFrom(alice, bob, id);
        assertEq(reg.ownerOf(id), bob);
    }

    /* ─────────────── withdraw ─────────────── */

    function testWithdraw_DrainsToAddress() public {
        vm.prank(alice);
        reg.register{value: P5}("alice", alice);
        uint256 balBefore = carol.balance;
        reg.withdraw(payable(carol));
        assertEq(address(reg).balance, 0);
        assertEq(carol.balance, balBefore + P5);
    }

    function testWithdraw_RevertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        reg.withdraw(payable(alice));
    }

    /* ─────────────── transferOwnership ─────────────── */

    function testTransferOwnership_Works() public {
        reg.transferOwnership(alice);
        assertEq(reg.owner(), alice);
        // old admin can't mint anymore
        vm.expectRevert(INSRegistry.NotAuthorized.selector);
        reg.adminMint("gift", bob);
        // new admin can
        vm.prank(alice);
        reg.adminMint("gift", bob);
        assertEq(reg.ownerOfName("gift"), bob);
    }

    function testTransferOwnership_RevertZero() public {
        vm.expectRevert(INSRegistry.ZeroAddress.selector);
        reg.transferOwnership(address(0));
    }

    /* ─────────────── ERC-721 surface ─────────────── */

    function testSupportsInterface() public view {
        assertTrue(reg.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(reg.supportsInterface(0x5b5e139f)); // metadata
        assertTrue(reg.supportsInterface(0x01ffc9a7)); // ERC165
        assertFalse(reg.supportsInterface(0xdeadbeef));
    }

    function testBalanceOf_RevertZero() public {
        vm.expectRevert(INSRegistry.ZeroAddress.selector);
        reg.balanceOf(address(0));
    }

    function testOwnerOf_RevertNonexistent() public {
        vm.expectRevert(INSRegistry.NonexistentToken.selector);
        reg.ownerOf(999);
    }

    /* ─────────────── tokenURI ─────────────── */

    function testTokenURI_RevertNonexistent() public {
        vm.expectRevert(INSRegistry.NonexistentToken.selector);
        reg.tokenURI(1);
    }

    function testTokenURI_ReturnsDataURI() public {
        vm.prank(alice);
        uint256 id = reg.register{value: P5}("alice", alice);
        string memory uri = reg.tokenURI(id);
        // should begin with "data:application/json;base64,"
        bytes memory b = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        assertGe(b.length, prefix.length + 50, "encoded JSON present");
        for (uint256 i; i < prefix.length; ++i) {
            assertEq(b[i], prefix[i], "prefix mismatch");
        }
    }

    /* ─────────────── fuzz ─────────────── */

    function testFuzz_RegisterLabels(bytes32 seed) public {
        // derive a 5-char lowercase label from seed
        bytes memory label = new bytes(5);
        for (uint256 i; i < 5; ++i) {
            label[i] = bytes1(uint8(97 + (uint8(seed[i]) % 26)));
        }
        vm.deal(alice, 100 ether);
        vm.prank(alice);
        reg.register{value: P5}(string(label), alice);
        assertEq(reg.ownerOfName(string(label)), alice);
    }

    /* ─────────────── receive ─────────────── */

    // Needed because refund uses call; this contract is a deployer acting as owner.
    receive() external payable {}
}
