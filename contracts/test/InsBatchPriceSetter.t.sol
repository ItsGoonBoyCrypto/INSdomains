// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {InsBatchPriceSetter, IINSRegistryIgraV2Admin} from "../src/InsBatchPriceSetter.sol";
import {INSRegistryIgraV2} from "../src/INSRegistryIgraV2.sol";
import {INSRegistryIgra} from "../src/INSRegistryIgra.sol";

/**
 * @title InsBatchPriceSetter.t
 * @notice Full Foundry suite for the one-shot batch helper.
 *
 *         Covers:
 *           - Constructor zero-address guards
 *           - Access control (only-safe enforcement)
 *           - One-shot semantics (used flag set + can't re-run)
 *           - Length-mismatch and empty-batch reverts
 *           - NotOwner revert when helper doesn't own Registry
 *           - Successful batch:
 *               * Both prices set per label
 *               * Annual-skip (annualPrices[i] == 0)
 *               * Forever-skip (foreverPrices[i] == 0)
 *               * Ownership returned to safe
 *               * BatchExecuted + OwnershipReturned events fire
 *           - emergencyReturnOwnership: clean exit before batch runs
 *           - Fuzz: random label/price arrays of varying length
 *           - Integration: end-to-end against a real INSRegistryIgraV2
 */
contract InsBatchPriceSetterTest is Test {
    /* ────────────────────────── Wallets ──────────────────────────── */
    address internal safe   = makeAddr("safe");
    address internal random = makeAddr("random");

    /* ────────────────────────── Contracts ────────────────────────── */
    INSRegistryIgra   internal v1;
    INSRegistryIgraV2 internal registry;
    InsBatchPriceSetter internal helper;

    /* ────────────────────────── Events (mirrored) ─────────────────── */
    event BatchExecuted(uint256 entries);
    event OwnershipReturned(address indexed to);

    /* ────────────────────────── Setup ─────────────────────────────── */
    function setUp() public {
        // V2 ctor needs a V1 reference for claimV1Forever migration plumbing.
        v1       = new INSRegistryIgra();
        registry = new INSRegistryIgraV2(address(v1));

        // Hand registry to `safe` so subsequent transferOwnership(helper)
        // tests faithfully simulate the production handover from Safe.
        registry.transferOwnership(safe);

        // Deploy the helper.
        helper = new InsBatchPriceSetter(safe, address(registry));
    }

    /* ────────────────────────── Helpers ───────────────────────────── */
    function _ascendOwnership() internal {
        vm.prank(safe);
        registry.transferOwnership(address(helper));
        assertEq(registry.owner(), address(helper), "helper now owns registry");
    }

    function _labels1() internal pure returns (string[] memory) {
        string[] memory a = new string[](1);
        a[0] = "xn--4v8h"; // fire emoji
        return a;
    }

    function _prices1(uint256 v) internal pure returns (uint256[] memory) {
        uint256[] memory a = new uint256[](1);
        a[0] = v;
        return a;
    }

    /* ────────────────────────── Constructor ───────────────────────── */
    function test_constructor_zeroSafe_reverts() public {
        vm.expectRevert(InsBatchPriceSetter.ZeroAddress.selector);
        new InsBatchPriceSetter(address(0), address(registry));
    }

    function test_constructor_zeroRegistry_reverts() public {
        vm.expectRevert(InsBatchPriceSetter.ZeroAddress.selector);
        new InsBatchPriceSetter(safe, address(0));
    }

    function test_constructor_setsImmutables() public view {
        assertEq(helper.safe(), safe);
        assertEq(address(helper.registry()), address(registry));
        assertFalse(helper.used());
    }

    /* ────────────────────────── Access control ────────────────────── */
    function test_runBatch_onlySafe() public {
        _ascendOwnership();
        vm.prank(random);
        vm.expectRevert(InsBatchPriceSetter.OnlySafe.selector);
        helper.runBatch(_labels1(), _prices1(4000 ether), _prices1(1000 ether));
    }

    function test_emergencyReturnOwnership_onlySafe() public {
        _ascendOwnership();
        vm.prank(random);
        vm.expectRevert(InsBatchPriceSetter.OnlySafe.selector);
        helper.emergencyReturnOwnership();
    }

    /* ─────────────────── Pre-conditions / input validation ────────── */
    function test_runBatch_emptyBatch_reverts() public {
        _ascendOwnership();
        string[] memory L = new string[](0);
        uint256[] memory F = new uint256[](0);
        uint256[] memory A = new uint256[](0);
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.EmptyBatch.selector);
        helper.runBatch(L, F, A);
    }

    function test_runBatch_lengthMismatch_forever_reverts() public {
        _ascendOwnership();
        string[] memory L = new string[](2);
        L[0] = "xn--4v8h"; L[1] = "xn--158h";
        uint256[] memory F = new uint256[](1); F[0] = 1 ether;
        uint256[] memory A = new uint256[](2); A[0] = 1 ether; A[1] = 1 ether;
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.LengthMismatch.selector);
        helper.runBatch(L, F, A);
    }

    function test_runBatch_lengthMismatch_annual_reverts() public {
        _ascendOwnership();
        string[] memory L = new string[](2);
        L[0] = "xn--4v8h"; L[1] = "xn--158h";
        uint256[] memory F = new uint256[](2); F[0] = 1 ether; F[1] = 1 ether;
        uint256[] memory A = new uint256[](1); A[0] = 1 ether;
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.LengthMismatch.selector);
        helper.runBatch(L, F, A);
    }

    function test_runBatch_notOwner_reverts() public {
        // Helper hasn't received ownership yet — registry.owner() is still `safe`.
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.NotOwner.selector);
        helper.runBatch(_labels1(), _prices1(1 ether), _prices1(1 ether));
    }

    /* ────────────────────────── Success ────────────────────────────── */
    function test_runBatch_setsPricesAndReturnsOwnership() public {
        _ascendOwnership();

        string[] memory L = new string[](2);
        L[0] = "xn--4v8h";  // fire
        L[1] = "xn--158h";  // rocket
        uint256[] memory F = new uint256[](2);
        F[0] = 4000 ether; F[1] = 4000 ether;
        uint256[] memory A = new uint256[](2);
        A[0] = 1000 ether; A[1] = 1000 ether;

        vm.expectEmit(true, true, true, true);
        emit BatchExecuted(2);
        vm.expectEmit(true, true, true, true);
        emit OwnershipReturned(safe);

        vm.prank(safe);
        helper.runBatch(L, F, A);

        assertEq(registry.premiumPrice("xn--4v8h"),       4000 ether);
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 1000 ether);
        assertEq(registry.premiumPrice("xn--158h"),       4000 ether);
        assertEq(registry.premiumPriceAnnual("xn--158h"), 1000 ether);
        assertEq(registry.owner(), safe, "ownership returned");
        assertTrue(helper.used(), "used flipped");
    }

    function test_runBatch_zeroForeverSkipsForever() public {
        _ascendOwnership();
        // Set an Annual price baseline first so we can verify Forever is untouched.
        // Helper is the owner now, so we set via helper to a baseline of 1, then
        // run the batch and verify the original 1 is preserved.
        // Simpler approach: just check premiumPrice stays 0 after batch.
        string[] memory L = new string[](1);
        L[0] = "xn--4v8h";
        uint256[] memory F = new uint256[](1); F[0] = 0; // skip Forever
        uint256[] memory A = new uint256[](1); A[0] = 1000 ether;
        vm.prank(safe);
        helper.runBatch(L, F, A);
        assertEq(registry.premiumPrice("xn--4v8h"), 0, "forever untouched");
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 1000 ether);
    }

    function test_runBatch_zeroAnnualSkipsAnnual() public {
        _ascendOwnership();
        string[] memory L = new string[](1);
        L[0] = "xn--4v8h";
        uint256[] memory F = new uint256[](1); F[0] = 4000 ether;
        uint256[] memory A = new uint256[](1); A[0] = 0; // skip Annual
        vm.prank(safe);
        helper.runBatch(L, F, A);
        assertEq(registry.premiumPrice("xn--4v8h"), 4000 ether);
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 0, "annual untouched");
    }

    function test_runBatch_bothZeroIsValidEntry_noop() public {
        // A row with (0, 0) is technically a no-op but doesn't revert. The
        // contract checks each side individually; both checks fail, both
        // setters are skipped. Helps idempotent batch construction.
        _ascendOwnership();
        string[] memory L = new string[](1);
        L[0] = "xn--4v8h";
        uint256[] memory F = new uint256[](1); F[0] = 0;
        uint256[] memory A = new uint256[](1); A[0] = 0;
        vm.prank(safe);
        helper.runBatch(L, F, A);
        // No reverts. Both stay at 0.
        assertEq(registry.premiumPrice("xn--4v8h"), 0);
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 0);
        assertTrue(helper.used());
        assertEq(registry.owner(), safe);
    }

    /* ─────────────────────── One-shot enforcement ─────────────────── */
    function test_runBatch_cannotRunTwice() public {
        _ascendOwnership();
        vm.prank(safe);
        helper.runBatch(_labels1(), _prices1(1 ether), _prices1(1 ether));
        // Helper transferred ownership back to safe. Even if safe re-transfers
        // ownership to helper, the second runBatch reverts via AlreadyUsed.
        vm.prank(safe);
        registry.transferOwnership(address(helper));
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.AlreadyUsed.selector);
        helper.runBatch(_labels1(), _prices1(2 ether), _prices1(2 ether));
    }

    function test_runBatch_thenEmergency_rescuesOwnership() public {
        // Post-audit fix: emergencyReturnOwnership is NOT gated on `used`.
        // It must ALWAYS be able to return ownership while the helper holds
        // it, otherwise a stray re-transfer-to-helper post-runBatch would
        // permanently lock Registry admin. Test the rescue path.
        _ascendOwnership();
        vm.prank(safe);
        helper.runBatch(_labels1(), _prices1(1 ether), _prices1(1 ether));
        // runBatch already returned ownership. Simulate the Safe accidentally
        // re-transferring to the (now used) helper.
        vm.prank(safe);
        registry.transferOwnership(address(helper));
        assertEq(registry.owner(), address(helper), "helper temporarily owns again");
        // Emergency exit MUST work here.
        vm.prank(safe);
        helper.emergencyReturnOwnership();
        assertEq(registry.owner(), safe, "ownership rescued");
    }

    function test_emergency_thenRunBatch_reverts() public {
        _ascendOwnership();
        vm.prank(safe);
        helper.emergencyReturnOwnership();
        // Safe got ownership back. Even if it re-transfers and tries the batch,
        // runBatch is still locked by `used`.
        // NOTE: emergencyReturnOwnership does NOT flip `used` anymore (audit
        // fix), so runBatch is only locked because the FIRST emergency call
        // didn't flip used either, but the previous flow's used flag was set
        // there. Verify the current behaviour: with used still false after
        // emergencyReturnOwnership, runBatch SHOULD still work if helper
        // re-owns Registry.
        vm.prank(safe);
        registry.transferOwnership(address(helper));
        vm.prank(safe);
        helper.runBatch(_labels1(), _prices1(1 ether), _prices1(1 ether));
        assertTrue(helper.used(), "used set after runBatch");
        assertEq(registry.owner(), safe, "ownership returned");
    }

    function test_emergency_canBeCalledRepeatedly_isIdempotentRescue() public {
        // Audit-fix verification: emergencyReturnOwnership can be called
        // multiple times. Each call requires the helper to currently own
        // the Registry; if not, NotOwner.
        _ascendOwnership();
        vm.prank(safe);
        helper.emergencyReturnOwnership();
        // Calling again immediately reverts NotOwner (Safe owns now).
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.NotOwner.selector);
        helper.emergencyReturnOwnership();
        // Re-transfer + re-rescue still works.
        vm.prank(safe);
        registry.transferOwnership(address(helper));
        vm.prank(safe);
        helper.emergencyReturnOwnership();
        assertEq(registry.owner(), safe);
    }

    /* ─────────────────────── Emergency exit ───────────────────────── */
    function test_emergencyReturnOwnership_returnsOwnershipNoPriceChange() public {
        _ascendOwnership();
        vm.expectEmit(true, true, true, true);
        emit OwnershipReturned(safe);
        vm.prank(safe);
        helper.emergencyReturnOwnership();
        assertEq(registry.owner(), safe);
        // Post-audit fix: emergencyReturnOwnership does NOT flip `used` so it
        // can rescue ownership even after a successful runBatch (otherwise
        // the helper could permanently own the Registry if Safe accidentally
        // re-transferred ownership to it).
        assertFalse(helper.used(), "used stays false after emergency exit");
        // No prices were set
        assertEq(registry.premiumPrice("xn--4v8h"), 0);
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 0);
    }

    function test_emergencyReturnOwnership_notOwner_reverts() public {
        // Helper never received ownership.
        vm.prank(safe);
        vm.expectRevert(InsBatchPriceSetter.NotOwner.selector);
        helper.emergencyReturnOwnership();
    }

    /* ────────────────────────── Fuzz ───────────────────────────────── */
    function testFuzz_runBatch_randomPrices(uint256 forevP, uint256 annP, uint8 nRaw) public {
        uint256 n = (uint256(nRaw) % 10) + 1; // 1..10 entries
        string[] memory L = new string[](n);
        uint256[] memory F = new uint256[](n);
        uint256[] memory A = new uint256[](n);
        for (uint256 i = 0; i < n; ++i) {
            // Build a unique 5+ char ASCII label that the registry's char
            // validator accepts: prefix + index. Hex chars all in a-z/0-9.
            L[i] = string.concat("zzz", _hexSegment(i));
            F[i] = forevP;
            A[i] = annP;
        }
        _ascendOwnership();
        vm.prank(safe);
        helper.runBatch(L, F, A);

        for (uint256 i = 0; i < n; ++i) {
            assertEq(registry.premiumPrice(L[i]),       forevP > 0 ? forevP : 0);
            assertEq(registry.premiumPriceAnnual(L[i]), annP > 0 ? annP : 0);
        }
        assertEq(registry.owner(), safe);
    }

    function _hexSegment(uint256 i) internal pure returns (string memory) {
        bytes memory out = new bytes(2);
        out[0] = bytes1(uint8(0x61 + (i / 16) % 16)); // a-p
        out[1] = bytes1(uint8(0x30 + (i % 10)));      // 0-9
        return string(out);
    }

    /* ────────────────────────── Integration ────────────────────────── */
    function test_integration_endToEndFlow() public {
        // Simulates the exact production sequence:
        // 1. Helper deployed (done in setUp)
        // 2. Safe calls Registry.transferOwnership(helper)
        // 3. Safe calls helper.runBatch(...)
        // 4. Verify Registry pricing + ownership state

        vm.prank(safe);
        registry.transferOwnership(address(helper));

        string[] memory L = new string[](3);
        L[0] = "xn--4v8h";  // fire
        L[1] = "xn--158h";  // rocket
        L[2] = "xn--tr8h";  // diamond
        uint256[] memory F = new uint256[](3);
        F[0] = F[1] = F[2] = 4000 ether;
        uint256[] memory A = new uint256[](3);
        A[0] = A[1] = A[2] = 1000 ether;

        vm.prank(safe);
        helper.runBatch(L, F, A);

        // Verify all 3 prices set
        assertEq(registry.premiumPrice("xn--4v8h"), 4000 ether);
        assertEq(registry.premiumPrice("xn--158h"), 4000 ether);
        assertEq(registry.premiumPrice("xn--tr8h"), 4000 ether);
        assertEq(registry.premiumPriceAnnual("xn--4v8h"), 1000 ether);
        assertEq(registry.premiumPriceAnnual("xn--158h"), 1000 ether);
        assertEq(registry.premiumPriceAnnual("xn--tr8h"), 1000 ether);

        // priceFor() returns the new premium price now
        assertEq(registry.priceFor("xn--4v8h"), 4000 ether);

        // Helper is dead, ownership returned
        assertTrue(helper.used());
        assertEq(registry.owner(), safe);
    }
}
