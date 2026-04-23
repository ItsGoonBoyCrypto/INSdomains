// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IINSRegistry {
    function tokenIdOf(string calldata label) external view returns (uint256);
    function labelOf(uint256 tokenId) external view returns (string memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function targetOf(uint256 tokenId) external view returns (address);
}

/**
 * @title INSResolver
 * @notice Namehash-keyed resolver for .ins names. ENS-compatible surface
 *         for tooling that already speaks namehash(node) / addr(node).
 * @dev The canonical address record lives on the registry (targetOf). This
 *      contract wraps it with namehash lookup and adds text records
 *      (avatar, url, socials, email, description).
 */
contract INSResolver {
    error NotOwner();
    error EmptyKey();

    event TextSet(bytes32 indexed node, string key, string value);

    IINSRegistry public immutable registry;

    // node → key → value
    mapping(bytes32 => mapping(string => string)) private _text;
    // node → label (caches the last lookup so onchain callers can verify)
    mapping(bytes32 => string) public labelOfNode;

    constructor(address _registry) {
        registry = IINSRegistry(_registry);
    }

    /* ───────────── ENS-compatible resolver surface ────────────── */

    /// @notice Resolve a node (namehash) to its current target address.
    function addr(bytes32 node) external view returns (address) {
        string memory lbl = labelOfNode[node];
        if (bytes(lbl).length == 0) return address(0);
        uint256 id = registry.tokenIdOf(lbl);
        if (id == 0) return address(0);
        return registry.targetOf(id);
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _text[node][key];
    }

    /* ─────────────── Owner writes ──────────────────────────────── */

    /// @notice Bind a label to its node for future lookups. Anyone can call —
    ///         this is a pure cache seed; it doesn't change ownership.
    function cacheNode(string calldata label, bytes32 node) external {
        // trust-on-first-write: only set if empty
        if (bytes(labelOfNode[node]).length == 0) {
            labelOfNode[node] = label;
        }
    }

    function setText(string calldata label, bytes32 node, string calldata key, string calldata value) external {
        if (bytes(key).length == 0) revert EmptyKey();
        uint256 id = registry.tokenIdOf(label);
        if (id == 0 || registry.ownerOf(id) != msg.sender) revert NotOwner();
        if (bytes(labelOfNode[node]).length == 0) labelOfNode[node] = label;
        _text[node][key] = value;
        emit TextSet(node, key, value);
    }
}
