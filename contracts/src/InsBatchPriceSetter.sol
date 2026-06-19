// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @notice Minimal interface for the V2 Registry surface this helper needs.
 *         Kept narrow on purpose — fewer call paths to audit + smaller
 *         attack surface if the helper is ever upgraded.
 */
interface IINSRegistryIgraV2Admin {
    function setPremiumPrice(string calldata label, uint256 price) external;
    function setPremiumPriceAnnual(string calldata label, uint256 price) external;
    function transferOwnership(address newOwner) external;
    function owner() external view returns (address);
}

/**
 * @title  InsBatchPriceSetter
 * @notice One-shot helper that bulk-sets `setPremiumPrice` and
 *         `setPremiumPriceAnnual` on the INS V2 Registry in a single tx,
 *         then atomically hands ownership back to the caller (the
 *         Treasury Safe).
 *
 * @dev Why this exists: Igra L2's Safe deployment blocks delegatecall, so
 *      Safe's built-in Transaction Builder (MultiSend → delegatecall) can't
 *      batch the 50+ `setPremiumPrice` calls needed to launch emoji premium
 *      pricing. This helper takes Registry ownership briefly, runs the
 *      batch via regular CALL throughout, and returns ownership in the
 *      same transaction.
 *
 * Flow (5 steps, single Safe-side workflow):
 *   1. Deploy this contract: `forge create InsBatchPriceSetter(safe, registry)`
 *   2. Safe tx → Registry.transferOwnership(InsBatchPriceSetter)
 *      ↓ Registry's ownership now belongs to this contract
 *   3. Safe tx → InsBatchPriceSetter.runBatch(labels, forever[], annual[])
 *      ↓ Helper loops setPremiumPrice + setPremiumPriceAnnual for each label
 *      ↓ Helper calls Registry.transferOwnership(safe) — ownership back to Safe
 *      ↓ `used` flag set → contract is one-shot, can never run again
 *   4. Done. Helper contract has no further capability over Registry.
 *
 * Safety:
 *   - `runBatch` and `emergencyReturnOwnership` are msg.sender == safe gated
 *   - One-shot via `used` boolean — second call reverts even if Safe wants it
 *   - Holds ownership for exactly one transaction — never longer
 *   - No state that can be mutated after `used = true`
 *   - emergencyReturnOwnership lets Safe back out cleanly if it transferred
 *     ownership but decided not to run the batch
 *   - No payable functions, no withdraw, no upgrade, no token allowance —
 *     this contract holds no funds and grants no other capabilities
 *
 * Trust assumptions:
 *   - The Safe address passed at construction is the trusted batch executor
 *   - The Registry contract honors `transferOwnership` semantics correctly
 *     (verified: INSRegistryIgraV2.sol uses simple single-step transfer)
 */
contract InsBatchPriceSetter {
    /* ─────────────────────────── Storage ───────────────────────────── */

    /// @notice The Safe authorized to run the batch + receive returned ownership
    address public immutable safe;
    /// @notice The INS V2 Registry this helper bulk-prices
    IINSRegistryIgraV2Admin public immutable registry;
    /// @notice One-shot flag — set true on runBatch or emergencyReturnOwnership
    bool public used;

    /* ─────────────────────────── Events ────────────────────────────── */

    event BatchExecuted(uint256 entries);
    event OwnershipReturned(address indexed to);

    /* ─────────────────────────── Errors ────────────────────────────── */

    error OnlySafe();
    error AlreadyUsed();
    error EmptyBatch();
    error LengthMismatch();
    error NotOwner();
    error ZeroAddress();

    constructor(address _safe, address _registry) {
        if (_safe == address(0) || _registry == address(0)) revert ZeroAddress();
        safe = _safe;
        registry = IINSRegistryIgraV2Admin(_registry);
    }

    /* ───────────────────────── Main path ────────────────────────────── */

    /**
     * @notice Bulk-set premium overrides for `labels[i]` to (forever[i], annual[i]).
     *         A zero entry in either array skips that side of the override for
     *         that label, so callers can do Forever-only batches if they want
     *         to leave Annual at the contract default.
     *
     * @dev Requires this contract to own the Registry. If the Safe transferred
     *      ownership somewhere else after deploy, this reverts via NotOwner.
     *      One-shot: after one successful call, `used` is true and the contract
     *      is dead — gives launch teams a clean audit trail with no lingering
     *      capability.
     *
     * @param labels         Punycode-encoded (or plain ASCII) contract labels
     * @param foreverPrices  Forever-tier price in wei per label; 0 = skip
     * @param annualPrices   Annual-tier price (per year) in wei per label; 0 = skip
     */
    function runBatch(
        string[] calldata labels,
        uint256[] calldata foreverPrices,
        uint256[] calldata annualPrices
    ) external {
        if (msg.sender != safe) revert OnlySafe();
        if (used) revert AlreadyUsed();
        uint256 n = labels.length;
        if (n == 0) revert EmptyBatch();
        if (foreverPrices.length != n || annualPrices.length != n) revert LengthMismatch();
        if (registry.owner() != address(this)) revert NotOwner();

        // Flip BEFORE external calls — reentrancy hardening even though the
        // Registry surface we use can't reenter us in any meaningful way.
        used = true;

        unchecked {
            for (uint256 i = 0; i < n; ++i) {
                uint256 forev = foreverPrices[i];
                uint256 ann   = annualPrices[i];
                if (forev > 0) registry.setPremiumPrice(labels[i], forev);
                if (ann > 0)   registry.setPremiumPriceAnnual(labels[i], ann);
            }
        }
        emit BatchExecuted(n);

        registry.transferOwnership(safe);
        emit OwnershipReturned(safe);
    }

    /* ─────────────────────── Emergency exit ─────────────────────────── */

    /**
     * @notice Return Registry ownership to the Safe without running the batch.
     *         Use if the Safe transferred ownership but decided NOT to execute
     *         the batch (e.g. reviewed the labels and found a mistake).
     *
     * @dev Requires this contract to be the current Registry owner.
     */
    function emergencyReturnOwnership() external {
        if (msg.sender != safe) revert OnlySafe();
        if (used) revert AlreadyUsed();
        if (registry.owner() != address(this)) revert NotOwner();

        used = true;
        registry.transferOwnership(safe);
        emit OwnershipReturned(safe);
    }
}
