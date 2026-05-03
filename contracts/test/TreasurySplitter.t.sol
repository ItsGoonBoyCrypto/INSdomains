// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {TreasurySplitter} from "../src/TreasurySplitter.sol";

/**
 * @title  TreasurySplitterTest
 * @notice Coverage for the dual-recipient payment splitter that routes a
 *         configurable percentage of every Registry / Marketplace
 *         withdrawal between the Treasury Safe and the Igra DAO.
 *
 *         Tests cover:
 *         - constructor input validation
 *         - happy-path flush at 30/70, 0/100, 100/0 splits
 *         - rounding (DAO rounds DOWN, treasury keeps the residual)
 *         - permissionless flush
 *         - admin (setSplit, setDao, setTreasury, transferOwnership)
 *         - revert paths (DaoUnsetButShareNonZero, SendFailed, BpsTooHigh,
 *           ZeroAddress, NotOwner)
 *         - receive() Funded event
 *         - 4 fuzz suites (split correctness, full-route fallback,
 *           rounding bound, owner-only writes) at 256 runs each
 */
contract TreasurySplitterTest is Test {
    TreasurySplitter splitter;

    address payable treasury = payable(makeAddr("treasury"));
    address payable dao      = payable(makeAddr("dao"));
    address ownerWallet      = makeAddr("ownerWallet");
    address randomCaller     = makeAddr("randomCaller");

    /* ─────────────────────────── Setup ──────────────────────────── */

    function setUp() public {
        // Default: 30% to DAO, 70% to treasury, owner = ownerWallet
        splitter = new TreasurySplitter(treasury, dao, 3000, ownerWallet);
    }

    /* ─────────────────────────── Constructor ────────────────────── */

    function test_Constructor_SetsAllFields() public {
        assertEq(splitter.treasury(), treasury);
        assertEq(splitter.dao(),      dao);
        assertEq(splitter.daoBps(),   3000);
        assertEq(splitter.owner(),    ownerWallet);
        assertEq(splitter.BPS_MAX(),  10_000);
        assertEq(splitter.treasuryBps(), 7000);
    }

    function test_Constructor_RevertsZeroTreasury() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        new TreasurySplitter(payable(address(0)), dao, 3000, ownerWallet);
    }

    function test_Constructor_RevertsZeroOwner() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        new TreasurySplitter(treasury, dao, 3000, address(0));
    }

    function test_Constructor_AllowsZeroDao() public {
        // Pre-DAO deploy state — splitter exists but flush() reverts until
        // setDao() OR daoBps == 0. Verified in test_Flush_RevertsWhenDaoUnset.
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 3000, ownerWallet);
        assertEq(sp.dao(), address(0));
    }

    function test_Constructor_RevertsBpsTooHigh() public {
        vm.expectRevert(TreasurySplitter.BpsTooHigh.selector);
        new TreasurySplitter(treasury, dao, 10_001, ownerWallet);
    }

    function test_Constructor_AllowsBpsAtMax() public {
        TreasurySplitter sp = new TreasurySplitter(treasury, dao, 10_000, ownerWallet);
        assertEq(sp.daoBps(), 10_000);
        assertEq(sp.treasuryBps(), 0);
    }

    /* ─────────────────────────── Flush — happy paths ────────────── */

    function test_Flush_30_70_Split() public {
        vm.deal(address(splitter), 100 ether);

        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.Flushed(100 ether, 70 ether, 30 ether);

        vm.prank(randomCaller); // permissionless
        splitter.flush();

        assertEq(treasury.balance, 70 ether);
        assertEq(dao.balance,      30 ether);
        assertEq(address(splitter).balance, 0);
    }

    function test_Flush_AllToTreasury_When_DaoBpsZero() public {
        vm.prank(ownerWallet);
        splitter.setSplit(0);

        vm.deal(address(splitter), 50 ether);
        splitter.flush();

        assertEq(treasury.balance, 50 ether);
        assertEq(dao.balance,      0);
    }

    function test_Flush_AllToDao_When_DaoBpsMax() public {
        vm.prank(ownerWallet);
        splitter.setSplit(10_000);

        vm.deal(address(splitter), 50 ether);
        splitter.flush();

        assertEq(treasury.balance, 0);
        assertEq(dao.balance,      50 ether);
    }

    function test_Flush_ZeroBalance_Idempotent() public {
        // Should not revert, just emit a (0,0,0) Flushed and return
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.Flushed(0, 0, 0);
        splitter.flush();
        assertEq(treasury.balance, 0);
        assertEq(dao.balance,      0);
    }

    function test_Flush_PermissionlessCaller() public {
        vm.deal(address(splitter), 10 ether);
        vm.prank(randomCaller); // anyone can call
        splitter.flush();
        assertEq(treasury.balance + dao.balance, 10 ether);
    }

    /* ─────────────────────────── Flush — rounding ───────────────── */

    function test_Flush_RoundingResidualGoesToTreasury() public {
        // 1 wei at 30% DAO would compute toDao = 0 (integer div), so
        // treasury gets the entire 1 wei. Rounding direction MUST favour
        // treasury (the deployer) so the contract never overpays DAO.
        vm.deal(address(splitter), 1);
        splitter.flush();
        assertEq(treasury.balance, 1);
        assertEq(dao.balance,      0);
    }

    function test_Flush_RoundingExample_OddAmount() public {
        // 100 wei at 33% DAO: toDao = 100*3300/10000 = 33 (round down)
        // toTreasury = 100 - 33 = 67. Verifies the residual stays with treasury.
        vm.prank(ownerWallet);
        splitter.setSplit(3300);

        vm.deal(address(splitter), 100);
        splitter.flush();
        assertEq(treasury.balance, 67);
        assertEq(dao.balance,      33);
    }

    /* ─────────────────────────── Flush — revert paths ───────────── */

    function test_Flush_RevertsWhenDaoUnsetAndBpsNonZero() public {
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 3000, ownerWallet);
        vm.deal(address(sp), 10 ether);
        vm.expectRevert(TreasurySplitter.DaoUnsetButShareNonZero.selector);
        sp.flush();
    }

    function test_Flush_OkWhenDaoUnsetAndBpsZero() public {
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 0, ownerWallet);
        vm.deal(address(sp), 10 ether);
        sp.flush();
        assertEq(treasury.balance, 10 ether);
    }

    function test_Flush_RevertsOnTreasurySendFailure() public {
        // Replace `treasury` with a contract that rejects ETH on receive
        RejectingReceiver rejecting = new RejectingReceiver();
        TreasurySplitter sp = new TreasurySplitter(payable(address(rejecting)), dao, 3000, ownerWallet);
        vm.deal(address(sp), 10 ether);
        vm.expectRevert(TreasurySplitter.SendFailed.selector);
        sp.flush();
    }

    function test_Flush_RevertsOnDaoSendFailure() public {
        RejectingReceiver rejecting = new RejectingReceiver();
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(rejecting)), 3000, ownerWallet);
        vm.deal(address(sp), 10 ether);
        vm.expectRevert(TreasurySplitter.SendFailed.selector);
        sp.flush();
    }

    /* ─────────────────────────── Receive ────────────────────────── */

    function test_Receive_EmitsFunded() public {
        vm.deal(randomCaller, 1 ether);
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.Funded(randomCaller, 1 ether);
        vm.prank(randomCaller);
        (bool ok, ) = address(splitter).call{value: 1 ether}("");
        require(ok, "send failed");
        assertEq(address(splitter).balance, 1 ether);
    }

    /* ─────────────────────────── Admin: setSplit ────────────────── */

    function test_SetSplit_UpdatesField() public {
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.SplitUpdated(5000);
        vm.prank(ownerWallet);
        splitter.setSplit(5000);
        assertEq(splitter.daoBps(), 5000);
        assertEq(splitter.treasuryBps(), 5000);
    }

    function test_SetSplit_RevertsBpsTooHigh() public {
        vm.expectRevert(TreasurySplitter.BpsTooHigh.selector);
        vm.prank(ownerWallet);
        splitter.setSplit(10_001);
    }

    function test_SetSplit_RevertsNotOwner() public {
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        vm.prank(randomCaller);
        splitter.setSplit(5000);
    }

    /* ─────────────────────────── Admin: setDao ──────────────────── */

    function test_SetDao_UpdatesField() public {
        address payable newDao = payable(makeAddr("newDao"));
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.DaoUpdated(newDao);
        vm.prank(ownerWallet);
        splitter.setDao(newDao);
        assertEq(splitter.dao(), newDao);
    }

    function test_SetDao_AllowsZeroAddress() public {
        // Disabling DAO routing — flush() then requires daoBps == 0
        vm.startPrank(ownerWallet);
        splitter.setDao(payable(address(0)));
        splitter.setSplit(0);
        vm.stopPrank();

        vm.deal(address(splitter), 5 ether);
        splitter.flush();
        assertEq(treasury.balance, 5 ether);
    }

    function test_SetDao_RevertsNotOwner() public {
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        vm.prank(randomCaller);
        splitter.setDao(payable(makeAddr("attackerDao")));
    }

    /* ─────────────────────────── Admin: setTreasury ─────────────── */

    function test_SetTreasury_UpdatesField() public {
        address payable newT = payable(makeAddr("newT"));
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.TreasuryUpdated(newT);
        vm.prank(ownerWallet);
        splitter.setTreasury(newT);
        assertEq(splitter.treasury(), newT);
    }

    function test_SetTreasury_RevertsZeroAddress() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        vm.prank(ownerWallet);
        splitter.setTreasury(payable(address(0)));
    }

    function test_SetTreasury_RevertsNotOwner() public {
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        vm.prank(randomCaller);
        splitter.setTreasury(payable(makeAddr("attacker")));
    }

    /* ─────────────────────────── Admin: transferOwnership ───────── */

    function test_TransferOwnership_UpdatesOwner() public {
        address newOwner = makeAddr("newOwner");
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.OwnershipTransferred(ownerWallet, newOwner);
        vm.prank(ownerWallet);
        splitter.transferOwnership(newOwner);
        assertEq(splitter.owner(), newOwner);
    }

    function test_TransferOwnership_RevertsZeroAddress() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        vm.prank(ownerWallet);
        splitter.transferOwnership(address(0));
    }

    function test_TransferOwnership_RevertsNotOwner() public {
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        vm.prank(randomCaller);
        splitter.transferOwnership(makeAddr("attacker"));
    }

    /* ─────────────────────────── previewSplit ───────────────────── */

    function test_PreviewSplit_MatchesActualFlush() public {
        (uint256 prevT, uint256 prevD) = splitter.previewSplit(100 ether);
        assertEq(prevT, 70 ether);
        assertEq(prevD, 30 ether);

        vm.deal(address(splitter), 100 ether);
        splitter.flush();
        assertEq(treasury.balance, prevT);
        assertEq(dao.balance,      prevD);
    }

    /* ─────────────────────────── Fuzz ───────────────────────────── */

    /// @notice Property: for any (amount, bps), toTreasury + toDao == amount,
    ///         and toDao <= amount * bps / BPS_MAX (round-down).
    function testFuzz_FlushSplitsCorrectly(uint128 amount, uint16 bps) public {
        bps = uint16(bound(uint256(bps), 0, 10_000));
        // Avoid empty tests
        amount = uint128(bound(uint256(amount), 1, 1_000_000 ether));

        vm.prank(ownerWallet);
        splitter.setSplit(bps);

        vm.deal(address(splitter), amount);
        splitter.flush();

        uint256 expectedDao = (uint256(amount) * bps) / 10_000;
        assertEq(dao.balance,      expectedDao,            "dao mismatch");
        assertEq(treasury.balance, uint256(amount) - expectedDao, "treasury mismatch");
        assertEq(address(splitter).balance, 0,             "residual at splitter");
    }

    /// @notice Property: when daoBps == 0, treasury receives everything
    ///         (regardless of dao address).
    function testFuzz_FlushAllToTreasuryWhenBpsZero(uint128 amount) public {
        amount = uint128(bound(uint256(amount), 1, 1_000_000 ether));
        vm.prank(ownerWallet);
        splitter.setSplit(0);

        vm.deal(address(splitter), amount);
        splitter.flush();
        assertEq(treasury.balance, amount);
        assertEq(dao.balance,      0);
    }

    /// @notice Property: rounding never overpays DAO. toDao must always
    ///         be <= floor(amount * bps / BPS_MAX). Treasury keeps any
    ///         residual.
    function testFuzz_RoundingNeverOverpaysDao(uint128 amount, uint16 bps) public {
        bps = uint16(bound(uint256(bps), 1, 10_000));
        amount = uint128(bound(uint256(amount), 1, 1_000_000 ether));

        vm.prank(ownerWallet);
        splitter.setSplit(bps);

        vm.deal(address(splitter), amount);
        splitter.flush();

        uint256 maxDao = (uint256(amount) * bps) / 10_000;
        assertLe(dao.balance, maxDao, "dao overpaid");
    }

    /// @notice Property: any non-owner write reverts.
    function testFuzz_NonOwnerWritesRevert(address caller) public {
        vm.assume(caller != ownerWallet);

        vm.prank(caller);
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        splitter.setSplit(1234);

        vm.prank(caller);
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        splitter.setDao(payable(makeAddr("x")));

        vm.prank(caller);
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        splitter.setTreasury(payable(makeAddr("y")));

        vm.prank(caller);
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        splitter.transferOwnership(makeAddr("z"));
    }
}

/// @notice Helper: a contract whose receive() always reverts. Used to test
///         the SendFailed revert paths in flush().
contract RejectingReceiver {
    receive() external payable {
        revert("nope");
    }
}
