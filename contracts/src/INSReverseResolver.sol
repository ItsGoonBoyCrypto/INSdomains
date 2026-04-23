// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IINSRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function labelOf(uint256 tokenId) external view returns (string memory);
}

/**
 * @title INSReverseResolver
 * @notice Address → primary .ins name lookup. Opt-in.
 *
 * @dev A user calls `setPrimary(tokenId)` on a name they own; future
 *      reverse lookups for that wallet return the name's label.
 *
 *      All reads are defensive: if the user has transferred the token
 *      since setting their primary, `primaryName(addr)` returns ""
 *      instead of a stale label. This means explorers and dApps can
 *      safely render the result without extra liveness checks.
 *
 *      This contract stores no privileged state and has no owner; it is
 *      a pure sidecar to the existing Registry.
 */
contract INSReverseResolver {
    error NotTokenOwner();
    error NonexistentToken();

    event PrimarySet(address indexed user, uint256 indexed tokenId, string label);
    event PrimaryCleared(address indexed user, uint256 indexed previousTokenId);

    IINSRegistry public immutable registry;

    /// @dev user → tokenId they picked as primary. 0 = unset.
    mapping(address => uint256) private _primary;

    constructor(address _registry) {
        registry = IINSRegistry(_registry);
    }

    /* ─────────────────────── Writes ─────────────────────── */

    /// @notice Pick a name you own as your primary reverse-resolution name.
    function setPrimary(uint256 tokenId) external {
        address tokenOwner = _ownerOrZero(tokenId);
        if (tokenOwner == address(0)) revert NonexistentToken();
        if (tokenOwner != msg.sender) revert NotTokenOwner();

        _primary[msg.sender] = tokenId;
        emit PrimarySet(msg.sender, tokenId, registry.labelOf(tokenId));
    }

    /// @notice Clear your primary — reverse lookups will return "" afterwards.
    function clearPrimary() external {
        uint256 prev = _primary[msg.sender];
        if (prev != 0) {
            delete _primary[msg.sender];
            emit PrimaryCleared(msg.sender, prev);
        }
    }

    /* ─────────────────────── Reads ──────────────────────── */

    /// @notice Resolve a wallet to its primary `.ins` label (no suffix).
    ///         Returns "" if the user never set a primary, cleared it,
    ///         or no longer owns the underlying token.
    function primaryName(address user) external view returns (string memory) {
        uint256 tokenId = _primary[user];
        if (tokenId == 0) return "";
        if (_ownerOrZero(tokenId) != user) return "";
        return registry.labelOf(tokenId);
    }

    /// @notice Raw primary tokenId. Does NOT validate current ownership —
    ///         callers that care should compare against registry.ownerOf().
    ///         Useful for indexers that want the stored value.
    function primaryTokenId(address user) external view returns (uint256) {
        return _primary[user];
    }

    /// @notice True iff the user currently has a live primary
    ///         (set AND still owns the token).
    function hasPrimary(address user) external view returns (bool) {
        uint256 tokenId = _primary[user];
        if (tokenId == 0) return false;
        return _ownerOrZero(tokenId) == user;
    }

    /* ─────────────────────── Internal ───────────────────── */

    /// @dev Try-catch wrapper: returns address(0) if ownerOf reverts
    ///      (e.g. token burned or never minted).
    function _ownerOrZero(uint256 tokenId) internal view returns (address) {
        try registry.ownerOf(tokenId) returns (address o) {
            return o;
        } catch {
            return address(0);
        }
    }
}
