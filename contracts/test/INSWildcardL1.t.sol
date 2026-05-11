// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSWildcardL1} from "../src/INSWildcardL1.sol";

/**
 * @title  INSWildcardL1Test
 * @notice Coverage for the L1 CCIP-Read wildcard resolver.
 *
 *         Test groups:
 *         - constructor input validation
 *         - resolve() reverts with the correct OffchainLookup payload
 *         - resolveCallback signature verification (happy + tamper paths)
 *         - signer allowlist management (add/remove)
 *         - URLs management
 *         - 2-step ownership
 *         - supportsInterface
 *         - signature malleability rejection (low-s rule)
 *         - fuzz: any (name, data) pair produces a parseable revert
 *         - fuzz: non-signer ECDSA recoveries are always rejected
 */
contract INSWildcardL1Test is Test {
    INSWildcardL1 wc;

    // Use a known private key so we can sign + verify in tests.
    uint256 internal constant SIGNER_PK = 0xA11CE;
    address internal signer;
    address internal owner = makeAddr("owner");
    address internal randomCaller = makeAddr("randomCaller");

    string[] internal urls;

    function setUp() public {
        signer = vm.addr(SIGNER_PK);
        urls = new string[](1);
        urls[0] = "https://insdomains.org/api/ccip/{sender}/{data}.json";
        wc = new INSWildcardL1(owner, urls, signer);
    }

    /* ─────────────────────────── Constructor ────────────────────── */

    function test_Constructor_SetsAllFields() public {
        assertEq(wc.owner(), owner);
        assertTrue(wc.signers(signer));
        assertEq(wc.urlCount(), 1);
        assertEq(wc.urls(0), urls[0]);
    }

    function test_Constructor_RevertsZeroOwner() public {
        vm.expectRevert(INSWildcardL1.ZeroAddress.selector);
        new INSWildcardL1(address(0), urls, signer);
    }

    function test_Constructor_RevertsZeroSigner() public {
        vm.expectRevert(INSWildcardL1.ZeroAddress.selector);
        new INSWildcardL1(owner, urls, address(0));
    }

    function test_Constructor_RevertsEmptyUrls() public {
        string[] memory empty = new string[](0);
        vm.expectRevert(INSWildcardL1.EmptyUrls.selector);
        new INSWildcardL1(owner, empty, signer);
    }

    /* ─────────────────────────── resolve() ──────────────────────── */

    function test_Resolve_RevertsWithOffchainLookup() public {
        // DNS-encoded "alice.igra.eth"
        bytes memory name = hex"05616c69636504696772610365746800";
        // abi.encodeCall(IResolver.addr, (namehash)) — placeholder bytes
        bytes memory data = hex"3b3b57de0000000000000000000000000000000000000000000000000000000000000001";

        // Expect the exact OffchainLookup payload.
        // We can't directly use vm.expectRevert with named-error decoding for
        // dynamic arrays, so we capture the revert data and assert on it.
        (bool ok, bytes memory ret) = address(wc).staticcall(
            abi.encodeWithSelector(wc.resolve.selector, name, data)
        );
        assertFalse(ok, "resolve() should always revert");

        // First 4 bytes = error selector; rest = abi-encoded payload.
        bytes4 selector;
        assembly {
            selector := mload(add(ret, 32))
        }
        assertEq(selector, INSWildcardL1.OffchainLookup.selector);

        // Decode payload and check fields.
        bytes memory payload = new bytes(ret.length - 4);
        for (uint256 i = 0; i < payload.length; i++) {
            payload[i] = ret[i + 4];
        }
        (
            address sender,
            string[] memory retUrls,
            bytes memory callData,
            bytes4 cbSelector,
            bytes memory extraData
        ) = abi.decode(payload, (address, string[], bytes, bytes4, bytes));

        assertEq(sender, address(wc), "sender must be self");
        assertEq(retUrls.length, 1);
        assertEq(retUrls[0], urls[0]);
        assertEq(cbSelector, wc.resolveCallback.selector);
        // callData + extraData both encode (name, data)
        (bytes memory cdName, bytes memory cdData) = abi.decode(callData, (bytes, bytes));
        assertEq(cdName, name);
        assertEq(cdData, data);
        (bytes memory exName, bytes memory exData) = abi.decode(extraData, (bytes, bytes));
        assertEq(exName, name);
        assertEq(exData, data);
    }

    /* ─────────────────────────── resolveCallback() ──────────────── */

    function test_ResolveCallback_HappyPath_AcceptsValidSig() public {
        bytes memory name = hex"05616c69636504696772610365746800";
        bytes memory data = hex"3b3b57de00000000000000000000000000000000000000000000000000000000000000aa";
        bytes memory extraData = abi.encode(name, data);

        // Mock the inner resolver result — an `address` ABI-encoded.
        bytes memory result = abi.encode(address(0xcAfebAbeDeAdbEeFcAFebAbeDEaDbeefCAfEbABe));
        uint64 expires = uint64(block.timestamp + 300);

        bytes memory sig = _sign(SIGNER_PK, address(wc), expires, extraData, result);
        bytes memory response = abi.encode(result, expires, sig);

        bytes memory got = wc.resolveCallback(response, extraData);
        assertEq(got, result);
    }

    function test_ResolveCallback_RevertsOnExpired() public {
        bytes memory extraData = abi.encode(bytes("any"), bytes("any"));
        bytes memory result = abi.encode(address(0x1));
        uint64 expires = uint64(block.timestamp - 1); // already expired

        bytes memory sig = _sign(SIGNER_PK, address(wc), expires, extraData, result);
        bytes memory response = abi.encode(result, expires, sig);

        vm.expectRevert(INSWildcardL1.SignerExpired.selector);
        wc.resolveCallback(response, extraData);
    }

    function test_ResolveCallback_RevertsOnNonAllowlistedSigner() public {
        bytes memory extraData = abi.encode(bytes("any"), bytes("any"));
        bytes memory result = abi.encode(address(0x1));
        uint64 expires = uint64(block.timestamp + 300);

        // Sign with a different key.
        uint256 rogue = 0xBADC0DE;
        bytes memory sig = _sign(rogue, address(wc), expires, extraData, result);
        bytes memory response = abi.encode(result, expires, sig);

        vm.expectRevert(INSWildcardL1.SignerNotAllowed.selector);
        wc.resolveCallback(response, extraData);
    }

    function test_ResolveCallback_RevertsOnResultTamper() public {
        bytes memory extraData = abi.encode(bytes("any"), bytes("any"));
        bytes memory result = abi.encode(address(0xCAFEBABE));
        uint64 expires = uint64(block.timestamp + 300);

        // Sign for `result`, then tamper before submitting.
        bytes memory sig = _sign(SIGNER_PK, address(wc), expires, extraData, result);
        bytes memory tampered = abi.encode(address(0xBADC0DE));
        bytes memory response = abi.encode(tampered, expires, sig);

        vm.expectRevert(INSWildcardL1.SignerNotAllowed.selector);
        wc.resolveCallback(response, extraData);
    }

    function test_ResolveCallback_RevertsOnExtraDataTamper() public {
        bytes memory extraData = abi.encode(bytes("requested"), bytes("requested"));
        bytes memory result = abi.encode(address(0xCAFEBABE));
        uint64 expires = uint64(block.timestamp + 300);

        bytes memory sig = _sign(SIGNER_PK, address(wc), expires, extraData, result);
        bytes memory response = abi.encode(result, expires, sig);

        // Submit with different extraData — the request/response binding breaks.
        bytes memory bogus = abi.encode(bytes("different"), bytes("different"));
        vm.expectRevert(INSWildcardL1.SignerNotAllowed.selector);
        wc.resolveCallback(response, bogus);
    }

    function test_ResolveCallback_RevertsOnExpiryTamper() public {
        bytes memory extraData = abi.encode(bytes("x"), bytes("x"));
        bytes memory result = abi.encode(address(0xC0FFEE));
        uint64 expiresSigned = uint64(block.timestamp + 300);

        // Sign for one expiry, submit with a different one.
        bytes memory sig = _sign(SIGNER_PK, address(wc), expiresSigned, extraData, result);
        uint64 bogusExpires = uint64(block.timestamp + 7 days);
        bytes memory response = abi.encode(result, bogusExpires, sig);

        vm.expectRevert(INSWildcardL1.SignerNotAllowed.selector);
        wc.resolveCallback(response, extraData);
    }

    function test_ResolveCallback_RevertsOnInvalidSigLength() public {
        bytes memory extraData = abi.encode(bytes("x"), bytes("x"));
        bytes memory result = abi.encode(address(0x1));
        uint64 expires = uint64(block.timestamp + 300);
        bytes memory shortSig = hex"deadbeef";
        bytes memory response = abi.encode(result, expires, shortSig);

        vm.expectRevert(INSWildcardL1.InvalidSignatureLength.selector);
        wc.resolveCallback(response, extraData);
    }

    /* ─────────────────────────── Signature malleability ─────────── */

    function test_ResolveCallback_RejectsHighSSignature() public {
        bytes memory extraData = abi.encode(bytes("x"), bytes("x"));
        bytes memory result = abi.encode(address(0x1));
        uint64 expires = uint64(block.timestamp + 300);

        // Build a canonical low-s sig, then flip s → N-s to produce the
        // malleable counterpart. EIP-2 forbids accepting the flipped form.
        bytes32 digest = keccak256(
            abi.encodePacked(hex"1900", address(wc), expires, keccak256(extraData), keccak256(result))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        bytes32 flippedS = bytes32(
            uint256(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBAAEDCE6AF48A03BBFD25E8CD0364141) - uint256(s)
        );
        uint8 flippedV = v == 27 ? 28 : 27;
        bytes memory malleable = abi.encodePacked(r, flippedS, flippedV);
        bytes memory response = abi.encode(result, expires, malleable);

        vm.expectRevert(INSWildcardL1.InvalidSignature.selector);
        wc.resolveCallback(response, extraData);
    }

    /* ─────────────────────────── Signer admin ───────────────────── */

    function test_AddSigner_OnlyOwner() public {
        address newSigner = makeAddr("newSigner");

        vm.expectEmit(true, true, true, true);
        emit INSWildcardL1.SignerAdded(newSigner);
        vm.prank(owner);
        wc.addSigner(newSigner);
        assertTrue(wc.signers(newSigner));
    }

    function test_AddSigner_RevertsNotOwner() public {
        vm.expectRevert(INSWildcardL1.NotOwner.selector);
        vm.prank(randomCaller);
        wc.addSigner(makeAddr("x"));
    }

    function test_AddSigner_RevertsZeroAddress() public {
        vm.expectRevert(INSWildcardL1.ZeroAddress.selector);
        vm.prank(owner);
        wc.addSigner(address(0));
    }

    function test_RemoveSigner_RevokesAuthority() public {
        // Add then remove — afterwards the signature is no longer accepted.
        address rogue = vm.addr(0xDEAD);
        vm.startPrank(owner);
        wc.addSigner(rogue);
        wc.removeSigner(rogue);
        vm.stopPrank();
        assertFalse(wc.signers(rogue));
    }

    function test_RemoveSigner_RevertsNotOwner() public {
        vm.expectRevert(INSWildcardL1.NotOwner.selector);
        vm.prank(randomCaller);
        wc.removeSigner(signer);
    }

    /* ─────────────────────────── URL admin ──────────────────────── */

    function test_SetUrls_UpdatesAndEmits() public {
        string[] memory newUrls = new string[](2);
        newUrls[0] = "https://primary.gateway/{sender}/{data}.json";
        newUrls[1] = "https://backup.gateway/{sender}/{data}.json";

        vm.expectEmit(true, true, true, true);
        emit INSWildcardL1.UrlsUpdated(newUrls);
        vm.prank(owner);
        wc.setUrls(newUrls);

        assertEq(wc.urlCount(), 2);
        assertEq(wc.urls(0), newUrls[0]);
        assertEq(wc.urls(1), newUrls[1]);
    }

    function test_SetUrls_RevertsEmpty() public {
        string[] memory empty = new string[](0);
        vm.expectRevert(INSWildcardL1.EmptyUrls.selector);
        vm.prank(owner);
        wc.setUrls(empty);
    }

    function test_SetUrls_RevertsNotOwner() public {
        string[] memory newUrls = new string[](1);
        newUrls[0] = "https://attacker/{sender}/{data}.json";
        vm.expectRevert(INSWildcardL1.NotOwner.selector);
        vm.prank(randomCaller);
        wc.setUrls(newUrls);
    }

    /* ─────────────────────────── 2-step ownership ───────────────── */

    function test_TransferOwnership_DoesNotRotateUntilAccept() public {
        address newOwner = makeAddr("newOwner");
        vm.expectEmit(true, true, true, true);
        emit INSWildcardL1.OwnershipTransferStarted(owner, newOwner);
        vm.prank(owner);
        wc.transferOwnership(newOwner);
        assertEq(wc.owner(), owner);
        assertEq(wc.pendingOwner(), newOwner);
    }

    function test_AcceptOwnership_RotatesAndClearsPending() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        wc.transferOwnership(newOwner);

        vm.expectEmit(true, true, true, true);
        emit INSWildcardL1.OwnershipTransferred(owner, newOwner);
        vm.prank(newOwner);
        wc.acceptOwnership();

        assertEq(wc.owner(), newOwner);
        assertEq(wc.pendingOwner(), address(0));
    }

    function test_AcceptOwnership_RevertsForNonPending() public {
        vm.prank(owner);
        wc.transferOwnership(makeAddr("intended"));

        vm.expectRevert(INSWildcardL1.NotPendingOwner.selector);
        vm.prank(randomCaller);
        wc.acceptOwnership();
    }

    /* ─────────────────────────── supportsInterface ──────────────── */

    function test_SupportsInterface() public view {
        // ENSIP-10 IExtendedResolver
        assertTrue(wc.supportsInterface(0x9061b923));
        // ERC-165 self
        assertTrue(wc.supportsInterface(0x01ffc9a7));
        // Random should be false
        assertFalse(wc.supportsInterface(0xdeadbeef));
    }

    /* ─────────────────────────── Fuzz ───────────────────────────── */

    function testFuzz_Resolve_AlwaysRevertsWithParseablePayload(bytes calldata name, bytes calldata data) public {
        (bool ok, bytes memory ret) = address(wc).staticcall(
            abi.encodeWithSelector(wc.resolve.selector, name, data)
        );
        assertFalse(ok, "resolve always reverts");
        // 4-byte selector + payload
        assertGt(ret.length, 4, "must have payload");
        bytes4 selector;
        assembly {
            selector := mload(add(ret, 32))
        }
        assertEq(selector, INSWildcardL1.OffchainLookup.selector);
    }

    function testFuzz_ResolveCallback_RejectsRandomSigners(uint128 pk) public {
        uint256 randomPk = uint256(pk) | 1; // avoid 0
        vm.assume(randomPk < type(uint128).max);
        address randomAddr = vm.addr(randomPk);
        vm.assume(randomAddr != signer);

        bytes memory extraData = abi.encode(bytes("x"), bytes("x"));
        bytes memory result = abi.encode(address(0xC0FFEE));
        uint64 expires = uint64(block.timestamp + 300);
        bytes memory sig = _sign(randomPk, address(wc), expires, extraData, result);
        bytes memory response = abi.encode(result, expires, sig);

        vm.expectRevert(INSWildcardL1.SignerNotAllowed.selector);
        wc.resolveCallback(response, extraData);
    }

    /* ─────────────────────────── Helpers ────────────────────────── */

    /// @notice Mirror the digest construction in the contract; sign with EIP-191.
    function _sign(
        uint256 pk,
        address verifier,
        uint64 expires,
        bytes memory extraData,
        bytes memory result
    ) internal pure returns (bytes memory) {
        bytes32 digest = keccak256(
            abi.encodePacked(hex"1900", verifier, expires, keccak256(extraData), keccak256(result))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }
}
