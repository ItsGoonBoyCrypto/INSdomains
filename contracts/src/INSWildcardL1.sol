// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title  INSWildcardL1
 * @notice CCIP-Read wildcard resolver, deployed on **Ethereum L1**, that
 *         bridges `*.igra.eth` queries from ENS-aware wallets to the Igra L2
 *         INS Registry via a signed off-chain gateway response.
 *
 * @dev    Lifecycle:
 *
 *           1. User types `alice.igra.eth` in MetaMask.
 *           2. Wallet calls ENS on Ethereum L1, resolver of `igra.eth`
 *              (this contract) → wallet calls `resolve(name, data)`.
 *           3. `resolve()` reverts with `OffchainLookup(...)` per EIP-3668,
 *              pointing the wallet at our HTTPS gateway.
 *           4. Wallet GETs the gateway URL with the dnsEncoded name + data
 *              in path params. Gateway reads `Registry.resolve(label)` on
 *              Igra L2, signs the response with `signer`, returns the
 *              `(result, expires, sig)` triple.
 *           5. Wallet calls `resolveCallback(response, extraData)` on this
 *              contract → we verify the signature came from an allowlisted
 *              signer, check `expires > block.timestamp`, and return the
 *              result bytes to the wallet.
 *
 *         Standards conformed to:
 *           - EIP-3668 (CCIP-Read)              — error revert + callback
 *           - ENSIP-10 (Wildcard Resolution)    — resolve(bytes, bytes)
 *           - EIP-191 personal_sign             — signature scheme used
 *
 *         Trust model:
 *           - The `signer` allowlist is the sole trust anchor — anyone holding
 *             a signer private key can spoof name resolutions. Keep it tight,
 *             rotate periodically.
 *           - `owner` (the Safe) can add / remove signers and update the
 *             gateway URL.
 *           - No funds ever flow through this contract.
 *
 * @custom:reference https://eips.ethereum.org/EIPS/eip-3668
 * @custom:reference https://docs.ens.domains/ensip/10
 */
contract INSWildcardL1 {
    /* ─────────────────────────── Errors ─────────────────────────── */

    /// @notice EIP-3668 standard error — clients catch + handle.
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error EmptyUrls();
    error SignerExpired();
    error SignerNotAllowed();
    error RequestMismatch();
    error InvalidSignatureLength();
    error InvalidSignature();

    /* ─────────────────────────── State ──────────────────────────── */

    /// @notice Multisig owner (Igra-side Treasury Safe in production).
    address public owner;
    address public pendingOwner;

    /// @notice CCIP-Read gateway URLs. Wallets try them in order. Each URL
    ///         must contain `{sender}` and `{data}` substitution tokens
    ///         per EIP-3668.
    string[] public urls;

    /// @notice Allowlist of off-chain signers whose EIP-191 signatures are
    ///         accepted in `resolveCallback`. address → bool.
    mapping(address => bool) public signers;

    /* ─────────────────────────── Events ─────────────────────────── */

    event OwnershipTransferStarted(address indexed previousOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event UrlsUpdated(string[] urls);

    /* ─────────────────────────── Modifiers ──────────────────────── */

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ─────────────────────────── Constructor ────────────────────── */

    constructor(address _owner, string[] memory _urls, address _initialSigner) {
        if (_owner == address(0) || _initialSigner == address(0)) revert ZeroAddress();
        if (_urls.length == 0) revert EmptyUrls();

        owner = _owner;
        urls = _urls;
        signers[_initialSigner] = true;

        emit OwnershipTransferred(address(0), _owner);
        emit SignerAdded(_initialSigner);
        emit UrlsUpdated(_urls);
    }

    /* ─────────────────────────── ENSIP-10: resolve ──────────────── */

    /**
     * @notice ENSIP-10 wildcard resolution entry point. Every call reverts
     *         with `OffchainLookup` so the wallet routes through the gateway.
     *
     * @param  name DNS-wire-encoded name (e.g. \x05alice\x04igra\x03eth\x00)
     * @param  data The inner resolver call — typically
     *              `abi.encodeCall(IResolver.addr, (node))` or
     *              `abi.encodeCall(IResolver.text, (node, "key"))`
     *
     * @dev    `view` keyword is required so `staticcall`-issuing clients
     *         (which is everyone — ENS PublicResolver calls via staticcall)
     *         get the revert and parse the OffchainLookup payload.
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        // Pack (name, data) into the gateway call payload. The gateway uses
        // this to (a) decode the name, (b) replay the call against Igra L2.
        bytes memory callData = abi.encode(name, data);

        // extraData lets the callback re-verify what the gateway was asked
        // for. We pass the same (name, data) pair so the callback can hash
        // it and bind the signature to this exact request.
        bytes memory extraData = abi.encode(name, data);

        revert OffchainLookup(
            address(this),
            urls,
            callData,
            this.resolveCallback.selector,
            extraData
        );
    }

    /* ─────────────────────────── CCIP-Read callback ─────────────── */

    /**
     * @notice Verifies the gateway's signed response and returns the inner
     *         resolver bytes to the wallet.
     *
     * @param  response abi.encoded `(bytes result, uint64 expires, bytes sig)`
     *                  where `sig` is an EIP-191 signature over
     *                  `keccak256(abi.encodePacked(0x1900, address(this),
     *                  expires, keccak256(extraData), keccak256(result)))`
     * @param  extraData The same (name, data) blob passed to OffchainLookup.
     *
     * @return result The decoded resolver result (an `address` or a `string`
     *                depending on the inner call in `extraData`).
     */
    function resolveCallback(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        (bytes memory result, uint64 expires, bytes memory sig) =
            abi.decode(response, (bytes, uint64, bytes));

        // 1. Freshness — gateway responses are short-lived (~5 min default).
        if (expires < block.timestamp) revert SignerExpired();

        // 2. Reconstruct the message hash the gateway signed. Binding both
        //    `extraData` (the request) and `result` (the answer) into the
        //    digest prevents replay across different name lookups and
        //    prevents result-swap attacks.
        bytes32 digest = keccak256(
            abi.encodePacked(
                hex"1900",
                address(this),
                expires,
                keccak256(extraData),
                keccak256(result)
            )
        );

        // 3. ECDSA recover + allowlist check.
        address recovered = _recover(digest, sig);
        if (!signers[recovered]) revert SignerNotAllowed();

        return result;
    }

    /* ─────────────────────────── Admin ──────────────────────────── */

    function addSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        signers[signer] = true;
        emit SignerAdded(signer);
    }

    function removeSigner(address signer) external onlyOwner {
        signers[signer] = false;
        emit SignerRemoved(signer);
    }

    function setUrls(string[] calldata _urls) external onlyOwner {
        if (_urls.length == 0) revert EmptyUrls();
        urls = _urls;
        emit UrlsUpdated(_urls);
    }

    /// @notice 2-step ownership handoff (same pattern as TreasurySplitter).
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address prev = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(prev, owner);
    }

    /* ─────────────────────────── Views ──────────────────────────── */

    function urlCount() external view returns (uint256) {
        return urls.length;
    }

    /// @notice Standards-compliant supportsInterface for ENS tooling.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x9061b923 || // ENSIP-10: IExtendedResolver.resolve(bytes,bytes)
            interfaceId == 0x01ffc9a7;   // ERC-165 itself
    }

    /* ─────────────────────────── Internal ─────────────────────────── */

    /// @dev Minimal ECDSA recover. Accepts both 64- and 65-byte sigs, but
    ///      requires the canonical low-s form for malleability resistance.
    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) revert InvalidSignatureLength();
        bytes32 r;
        bytes32 s;
        uint8 v;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        // EIP-2 low-s check (prevents signature malleability).
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignature();
        }
        if (v != 27 && v != 28) revert InvalidSignature();
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }
}
