// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IINSRegistry {
    function tokenIdOf(string calldata label) external view returns (uint256);
    function labelOf(uint256 tokenId) external view returns (string memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function targetOf(uint256 tokenId) external view returns (address);
}

/**
 * @title INSResolverV2
 * @notice Hardened ENS-compatible namehash resolver for `.igra` names.
 *
 * @dev Replaces the original INSResolver (0x451D84…5f2A). Same ENS surface
 *      (`addr(bytes32 node)` / `text(bytes32 node, string key)`) so existing
 *      ENS-style tooling drops in unchanged — but the node→label binding is
 *      now TRUSTLESS.
 *
 *      ## The bug this fixes
 *
 *      The original resolver let anyone call `cacheNode(label, node)` with an
 *      arbitrary `(label, node)` pair on a trust-on-first-write basis. An
 *      attacker could front-run `cacheNode("attacker", namehash("alice.igra"))`
 *      so that `addr(namehash("alice.igra"))` resolved to the attacker's
 *      target — a name-resolution poisoning attack.
 *
 *      ## The fix
 *
 *      `cacheNode(string label)` now takes ONLY the label and computes the
 *      namehash on-chain (`_node(label)`). The node is therefore always
 *      derived from — and consistent with — the label. There is no way to
 *      bind a node to a label that isn't its true preimage. Poisoning is
 *      impossible by construction, so `cacheNode` can stay permissionless
 *      (anyone can seed the correct mapping; nobody can seed a wrong one).
 *
 *      `addr(node)` additionally honours V2 Annual expiry: an expired name
 *      (past its grace window) resolves to address(0), matching the
 *      Registry's own `setTarget`/`resolve` guards.
 *
 *      Text records are owner-gated and keyed by the on-chain-derived node,
 *      so the same anti-poisoning property holds for `text`.
 *
 * @custom:reference ENSIP-1 (namehash), ENS PublicResolver addr/text surface
 */
contract INSResolverV2 {
    error NotOwner();
    error EmptyKey();
    error UnknownName();

    event NodeCached(bytes32 indexed node, string label);
    event TextSet(bytes32 indexed node, string key, string value);

    IINSRegistry public immutable registry;

    /// @notice namehash("igra") — the parent node. Precomputed:
    ///   keccak256( bytes32(0) ‖ keccak256("igra") )
    ///   = 0x845ae117fa3f88f78ba0d236aa4592959057d520889c7edd86b74d4123cc73e1
    bytes32 public constant PARENT_NODE =
        0x845ae117fa3f88f78ba0d236aa4592959057d520889c7edd86b74d4123cc73e1;

    /// @notice node → label. Only ever written via the on-chain namehash
    ///         derivation, so the mapping is always self-consistent.
    mapping(bytes32 => string) public labelOfNode;
    /// @notice node → key → value text records.
    mapping(bytes32 => mapping(string => string)) private _text;

    constructor(address _registry) {
        registry = IINSRegistry(_registry);
    }

    /* ───────────── Namehash (ENSIP-1, .igra subtree) ──────────── */

    /// @notice Compute the ENS namehash for `<label>.igra` on chain.
    /// @dev    namehash(label.igra) = keccak256( PARENT_NODE ‖ keccak256(label) )
    function nodeOf(string calldata label) external pure returns (bytes32) {
        return _node(label);
    }

    function _node(string calldata label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(PARENT_NODE, keccak256(bytes(label))));
    }

    /* ───────────── Trustless node→label registration ──────────── */

    /// @notice Seed the node→label mapping so `addr(node)` can resolve.
    ///         Permissionless and safe: the node is derived from the label
    ///         on-chain, so this can only ever create the CORRECT binding.
    ///         Idempotent. Reverts if the label was never registered on the
    ///         Registry (prevents seeding junk).
    function cacheNode(string calldata label) external {
        if (registry.tokenIdOf(label) == 0) revert UnknownName();
        bytes32 node = _node(label);
        labelOfNode[node] = label;
        emit NodeCached(node, label);
    }

    /* ───────────── ENS-compatible read surface ──────────────── */

    /// @notice Resolve a node (namehash) to the name's current target.
    ///         Returns address(0) for unknown nodes, unregistered names, or
    ///         expired V2 Annual names (past grace) — never a stale value.
    function addr(bytes32 node) external view returns (address) {
        string memory lbl = labelOfNode[node];
        if (bytes(lbl).length == 0) return address(0);
        uint256 id = registry.tokenIdOf(lbl);
        if (id == 0) return address(0);
        // Honour expiry if the Registry exposes it (V2). Static-call so this
        // stays compatible with V1 registries that lack `isExpired`.
        (bool ok, bytes memory ret) = address(registry).staticcall(
            abi.encodeWithSignature("isExpired(uint256)", id)
        );
        if (ok && ret.length == 32 && abi.decode(ret, (bool))) return address(0);
        return registry.targetOf(id);
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _text[node][key];
    }

    /* ───────────── Owner-gated text writes ──────────────────── */

    /// @notice Set a text record for `<label>.igra`. Caller must own the
    ///         name. Node is derived on-chain so the record can't be bound
    ///         to a node the caller doesn't control.
    function setText(string calldata label, string calldata key, string calldata value) external {
        if (bytes(key).length == 0) revert EmptyKey();
        uint256 id = registry.tokenIdOf(label);
        if (id == 0) revert UnknownName();
        if (registry.ownerOf(id) != msg.sender) revert NotOwner();
        bytes32 node = _node(label);
        // Keep the node→label cache fresh as a side effect of setText.
        labelOfNode[node] = label;
        _text[node][key] = value;
        emit TextSet(node, key, value);
    }
}
