// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import {INSRegistryIgra} from "../src/INSRegistryIgra.sol";
import {INSRegistryIkas} from "../src/INSRegistryIkas.sol";

/**
 * @notice INSRegistryIgra and INSRegistryIkas are line-identical clones of
 *         INSRegistry except for 6 TLD-specific strings (title, symbol,
 *         tokenURI JSON x2, SVG suffix, SVG brand mark). The full 55-test
 *         Registry suite applies unchanged to their shared logic; this
 *         file just locks in the TLD differentiation itself — ensuring the
 *         tokenURI actually renders `.igra` / `.ikas` (not `.ins`) and that
 *         the ERC-721 symbol distinguishes each collection in wallets.
 */
contract INSRegistryTldVariantsTest is Test {
    INSRegistryIgra igra;
    INSRegistryIkas ikas;

    address alice = address(0xA11CE);

    function setUp() public {
        igra = new INSRegistryIgra();
        ikas = new INSRegistryIkas();
        vm.deal(alice, 1_000 ether);
    }

    /* ──────────────── symbol + name differentiation ──────────────── */

    function test_Igra_SymbolAndNameAreDistinct() public view {
        assertEq(igra.symbol(), "INSG");
        assertEq(igra.name(), "Igra Name Service (.igra)");
    }

    function test_Ikas_SymbolAndNameAreDistinct() public view {
        assertEq(ikas.symbol(), "INSK");
        assertEq(ikas.name(), "Igra Name Service (.ikas)");
    }

    /* ──────────────── tokenURI suffix differentiation ────────────── */

    function test_Igra_TokenUriContainsIgraSuffix() public {
        vm.prank(alice);
        igra.register{value: 10 ether}("alice", alice);
        uint256 tokenId = igra.tokenIdOf("alice");
        string memory uri = igra.tokenURI(tokenId);

        // tokenURI returns base64-encoded JSON — we don't need to decode it
        // since the "alice.igra" string only ends up in here if the suffix
        // replacement worked. Easier: decode and string-search.
        string memory decoded = _decodeDataUriJson(uri);
        assertTrue(_contains(decoded, "alice.igra"), "JSON should mention alice.igra");
        assertFalse(_contains(decoded, "alice.ins"),  "JSON must not mention .ins");
    }

    function test_Ikas_TokenUriContainsIkasSuffix() public {
        vm.prank(alice);
        ikas.register{value: 10 ether}("alice", alice);
        uint256 tokenId = ikas.tokenIdOf("alice");
        string memory uri = ikas.tokenURI(tokenId);
        string memory decoded = _decodeDataUriJson(uri);
        assertTrue(_contains(decoded, "alice.ikas"), "JSON should mention alice.ikas");
        assertFalse(_contains(decoded, "alice.ins"),  "JSON must not mention .ins");
    }

    /* ──────────────── independence of mints across TLDs ──────────── */

    function test_SameLabelCanExistOnMultipleTlds() public {
        vm.prank(alice);
        igra.register{value: 10 ether}("alice", alice);
        vm.prank(alice);
        ikas.register{value: 10 ether}("alice", alice);

        // Both mints succeed — namespaces are independent.
        assertEq(igra.ownerOfName("alice"), alice);
        assertEq(ikas.ownerOfName("alice"), alice);
        assertGt(igra.tokenIdOf("alice"), 0);
        assertGt(ikas.tokenIdOf("alice"), 0);
    }

    function test_PricingIsIdentical() public view {
        // Tier prices baked in ctor — all 3 TLDs launch with the same
        // defaults (admin may tune per-TLD later).
        assertEq(igra.lengthPrice(2), 5000 ether);
        assertEq(igra.lengthPrice(3), 500 ether);
        assertEq(igra.lengthPrice(4), 50 ether);
        assertEq(igra.lengthPrice(5), 10 ether);

        assertEq(ikas.lengthPrice(2), 5000 ether);
        assertEq(ikas.lengthPrice(3), 500 ether);
        assertEq(ikas.lengthPrice(4), 50 ether);
        assertEq(ikas.lengthPrice(5), 10 ether);
    }

    /* ─────────────────── helpers ─────────────────── */

    /// @dev Decodes "data:application/json;base64,..." → decoded JSON text.
    ///      Crude hand-rolled decoder — good enough for test assertions.
    function _decodeDataUriJson(string memory uri) internal pure returns (string memory) {
        bytes memory b = bytes(uri);
        uint256 commaIdx;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == 0x2c) { commaIdx = i; break; }
        }
        // Payload starts after the comma
        uint256 n = b.length - commaIdx - 1;
        bytes memory enc = new bytes(n);
        for (uint256 i; i < n; ++i) enc[i] = b[commaIdx + 1 + i];
        return string(_base64Decode(enc));
    }

    function _base64Decode(bytes memory data) internal pure returns (bytes memory) {
        bytes memory alphabet = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
        // Build reverse-lookup table
        bytes memory rev = new bytes(256);
        for (uint256 i; i < alphabet.length; ++i) {
            rev[uint8(alphabet[i])] = bytes1(uint8(i));
        }
        // Strip padding
        uint256 padLen = 0;
        if (data.length >= 2 && data[data.length - 1] == 0x3d) padLen = 1;
        if (data.length >= 2 && data[data.length - 2] == 0x3d) padLen = 2;
        uint256 outLen = (data.length / 4) * 3 - padLen;
        bytes memory out = new bytes(outLen);
        uint256 oi;
        for (uint256 i; i < data.length; i += 4) {
            uint256 a = uint8(rev[uint8(data[i])]);
            uint256 b2 = uint8(rev[uint8(data[i + 1])]);
            uint256 c = data[i + 2] == 0x3d ? 0 : uint8(rev[uint8(data[i + 2])]);
            uint256 d = data[i + 3] == 0x3d ? 0 : uint8(rev[uint8(data[i + 3])]);
            uint256 trip = (a << 18) | (b2 << 12) | (c << 6) | d;
            if (oi < outLen) { out[oi++] = bytes1(uint8(trip >> 16)); }
            if (oi < outLen) { out[oi++] = bytes1(uint8(trip >>  8)); }
            if (oi < outLen) { out[oi++] = bytes1(uint8(trip)); }
        }
        return out;
    }

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0) return true;
        if (n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; ++i) {
            bool ok = true;
            for (uint256 j; j < n.length; ++j) {
                if (h[i + j] != n[j]) { ok = false; break; }
            }
            if (ok) return true;
        }
        return false;
    }
}
