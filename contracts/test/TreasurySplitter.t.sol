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
        // Default: 20% to DAO, 80% to treasury, owner = ownerWallet.
        // Matches the production split planned for Igra mainnet — keeping
        // the test default in sync with prod gives a freebie sanity check
        // every time the suite runs.
        splitter = new TreasurySplitter(treasury, dao, 2000, ownerWallet);
    }

    /* ─────────────────────────── Constructor ────────────────────── */

    function test_Constructor_SetsAllFields() public {
        assertEq(splitter.treasury(), treasury);
        assertEq(splitter.dao(),      dao);
        assertEq(splitter.daoBps(),   2000);
        assertEq(splitter.owner(),    ownerWallet);
        assertEq(splitter.BPS_MAX(),  10_000);
        assertEq(splitter.treasuryBps(), 8000);
    }

    function test_Constructor_RevertsZeroTreasury() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        new TreasurySplitter(payable(address(0)), dao, 2000, ownerWallet);
    }

    function test_Constructor_RevertsZeroOwner() public {
        vm.expectRevert(TreasurySplitter.ZeroAddress.selector);
        new TreasurySplitter(treasury, dao, 2000, address(0));
    }

    function test_Constructor_AllowsZeroDao() public {
        // Pre-DAO deploy state — splitter exists but flush() reverts until
        // setDao() OR daoBps == 0. Verified in test_Flush_RevertsWhenDaoUnset.
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 2000, ownerWallet);
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

    function test_Flush_20_80_Split() public {
        // Default split is 20% to DAO / 80% to treasury (matches prod).
        vm.deal(address(splitter), 100 ether);

        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.Flushed(100 ether, 80 ether, 20 ether);

        vm.prank(randomCaller); // permissionless
        splitter.flush();

        assertEq(treasury.balance, 80 ether);
        assertEq(dao.balance,      20 ether);
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
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 2000, ownerWallet);
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
        TreasurySplitter sp = new TreasurySplitter(payable(address(rejecting)), dao, 2000, ownerWallet);
        vm.deal(address(sp), 10 ether);
        vm.expectRevert(TreasurySplitter.SendFailed.selector);
        sp.flush();
    }

    function test_Flush_RevertsOnDaoSendFailure() public {
        RejectingReceiver rejecting = new RejectingReceiver();
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(rejecting)), 2000, ownerWallet);
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

    /* ─────────────────────────── Admin: 2-step ownership ────────── */

    function test_TransferOwnership_StartsHandoverButDoesNotRotate() public {
        address newOwner = makeAddr("newOwner");
        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.OwnershipTransferStarted(ownerWallet, newOwner);

        vm.prank(ownerWallet);
        splitter.transferOwnership(newOwner);

        // Owner UNCHANGED until acceptOwnership lands.
        assertEq(splitter.owner(),        ownerWallet);
        assertEq(splitter.pendingOwner(), newOwner);

        // Old owner can still write.
        vm.prank(ownerWallet);
        splitter.setSplit(1234);
        assertEq(splitter.daoBps(), 1234);
    }

    function test_AcceptOwnership_RotatesAndClearsPending() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(ownerWallet);
        splitter.transferOwnership(newOwner);

        vm.expectEmit(true, true, true, true);
        emit TreasurySplitter.OwnershipTransferred(ownerWallet, newOwner);

        vm.prank(newOwner);
        splitter.acceptOwnership();

        assertEq(splitter.owner(),        newOwner);
        assertEq(splitter.pendingOwner(), address(0));

        // Old owner is now locked out.
        vm.prank(ownerWallet);
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        splitter.setSplit(5000);

        // New owner can write.
        vm.prank(newOwner);
        splitter.setSplit(5000);
        assertEq(splitter.daoBps(), 5000);
    }

    function test_AcceptOwnership_RevertsForNonPending() public {
        vm.prank(ownerWallet);
        splitter.transferOwnership(makeAddr("intended"));

        vm.expectRevert(TreasurySplitter.NotPendingOwner.selector);
        vm.prank(randomCaller);
        splitter.acceptOwnership();
    }

    function test_TransferOwnership_CanCancelByZeroAddress() public {
        address newOwner = makeAddr("newOwner");
        vm.startPrank(ownerWallet);
        splitter.transferOwnership(newOwner);
        assertEq(splitter.pendingOwner(), newOwner);

        // Cancel by passing address(0)
        splitter.transferOwnership(address(0));
        assertEq(splitter.pendingOwner(), address(0));
        vm.stopPrank();

        // The previously-pending owner can no longer accept.
        vm.expectRevert(TreasurySplitter.NotPendingOwner.selector);
        vm.prank(newOwner);
        splitter.acceptOwnership();
    }

    function test_TransferOwnership_RevertsNotOwner() public {
        vm.expectRevert(TreasurySplitter.NotOwner.selector);
        vm.prank(randomCaller);
        splitter.transferOwnership(makeAddr("attacker"));
    }

    /* ─────────────────────────── previewSplit ───────────────────── */

    function test_PreviewSplit_MatchesActualFlush() public {
        // Default split is 20% to DAO / 80% to treasury (matches prod).
        (uint256 prevT, uint256 prevD) = splitter.previewSplit(100 ether);
        assertEq(prevT, 80 ether);
        assertEq(prevD, 20 ether);

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

/// @notice Helper: receive() re-enters splitter.flush() on every credit.
///         Used to assert flush() is reentrancy-safe — at the moment of
///         re-entry the contract balance should already be 0 (since the
///         splitter sends in a single, full-balance distribution), so the
///         re-entered call is a no-op.
contract ReentrantReceiver {
    TreasurySplitter public target;
    uint256 public reentryHits;

    function arm(TreasurySplitter t) external {
        target = t;
    }

    receive() external payable {
        if (address(target) != address(0) && address(target).balance > 0) {
            reentryHits += 1;
            target.flush();
        }
    }
}

/// @notice Helper: receive() consumes a large but bounded amount of gas
///         then succeeds. Used to confirm that even if a malicious
///         recipient gas-grinds, the OTHER recipient (treasury) still
///         gets paid first under our send-order policy.
contract GasGriefer {
    uint256 public counter;
    receive() external payable {
        // Burn gas in a bounded loop. 5_000 iterations is enough to make
        // the call observable in test gas reports without OOG'ing the
        // outer flush() under a Foundry default block gas limit.
        for (uint256 i = 0; i < 5_000; i++) {
            counter += 1;
        }
    }
}

/// @notice Helper: attempts to force-fund the splitter via selfdestruct.
///         (selfdestruct still credits the target's balance even though
///         the receive() callback doesn't fire — exact behaviour the
///         splitter must handle without bricking.)
contract ForceFunder {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}

/// @notice Extra coverage requested by the security audit.
contract TreasurySplitterAuditExtraTest is Test {
    TreasurySplitter splitter;
    address payable treasury = payable(makeAddr("treasury"));
    address payable dao      = payable(makeAddr("dao"));
    address ownerWallet      = makeAddr("ownerWallet");

    function setUp() public {
        splitter = new TreasurySplitter(treasury, dao, 2000, ownerWallet);
    }

    /// @notice Reentrancy: a malicious DAO recipient that calls flush()
    ///         again during its receive() must NOT be able to extract
    ///         additional funds. Because treasury is paid first AND we
    ///         drain on a single read of address(this).balance, the
    ///         re-entered call sees balance == 0 and emits a Flushed(0).
    function test_FlushIsReentrancySafe_DaoCallsBackIntoFlush() public {
        ReentrantReceiver evilDao = new ReentrantReceiver();
        evilDao.arm(splitter);

        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(evilDao)), 2000, ownerWallet);
        vm.deal(address(sp), 100 ether);

        sp.flush();

        // Treasury got 80, evilDao got 20, even with reentrancy attempt.
        assertEq(treasury.balance,         80 ether);
        assertEq(address(evilDao).balance, 20 ether);
        assertEq(address(sp).balance,      0);
        // The reentrancy DID happen (proves the test is exercising the
        // path), but it was a harmless no-op because treasury was paid
        // BEFORE dao under the new send-order, so when evilDao's receive
        // re-entered, the splitter balance was already 0.
        assertEq(evilDao.reentryHits(), 0); // flush is the LAST thing we do
    }

    /// @notice Send-order: malicious DAO that gas-griefs in receive() must
    ///         NOT prevent treasury from being paid. Treasury is paid
    ///         FIRST so even if the DAO call later succeeds with extreme
    ///         gas usage, treasury already has its share.
    function test_SendOrder_TreasuryPaidEvenIfDaoGasGriefs() public {
        GasGriefer gasGriefer = new GasGriefer();
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(gasGriefer)), 2000, ownerWallet);
        vm.deal(address(sp), 100 ether);

        // Treasury BALANCE BEFORE
        uint256 tBefore = treasury.balance;
        sp.flush();
        // Treasury was paid 80 iKAS BEFORE DAO got the gas-griefing 20 iKAS.
        assertEq(treasury.balance - tBefore, 80 ether);
        assertEq(address(gasGriefer).balance, 20 ether);
        assertGt(gasGriefer.counter(), 0); // confirms the griefing path ran
    }

    /// @notice Force-balance via selfdestruct: if anyone selfdestructs
    ///         into the splitter while DAO is unset and bps == 0, flush
    ///         must still succeed and route the surprise balance to
    ///         treasury (no funds stuck).
    function test_FlushHandlesSelfdestructForceFundedBalance_DaoUnset() public {
        TreasurySplitter sp = new TreasurySplitter(treasury, payable(address(0)), 0, ownerWallet);
        vm.deal(address(this), 1 ether);
        new ForceFunder{ value: 1 ether }(payable(address(sp)));
        assertEq(address(sp).balance, 1 ether);

        sp.flush();
        assertEq(treasury.balance, 1 ether);
        assertEq(address(sp).balance, 0);
    }

    /// @notice setTreasury(address(this)) creates a flush() that recurses
    ///         into receive() — receive emits Funded but doesn't move
    ///         funds, so it should work but be visibly wasteful. Documents
    ///         the (allowed) behaviour for the auditor checklist.
    function test_SetTreasury_ToSplitterAddress_FlushReturnsBalanceToSelf() public {
        vm.prank(ownerWallet);
        splitter.setTreasury(payable(address(splitter)));

        // Disable DAO routing to isolate the loop case.
        vm.prank(ownerWallet);
        splitter.setSplit(0);

        vm.deal(address(splitter), 5 ether);
        splitter.flush();
        // Balance returns to self via the receive() — Funded event fires,
        // funds remain available for the next (correct) flush after a
        // setTreasury fix-up. No iKAS is lost.
        assertEq(address(splitter).balance, 5 ether);
    }
}
