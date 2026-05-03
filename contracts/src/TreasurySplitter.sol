// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title  TreasurySplitter
 * @notice Single-purpose payment splitter for INS Registry / Marketplace
 *         withdrawals. Receives iKAS from anywhere, holds it until anyone
 *         (operator, keeper, or even a random caller) invokes `flush()`,
 *         then atomically distributes the contract's balance between
 *         `treasury` and `dao` per a basis-points split that the Owner
 *         can tune.
 *
 *         Designed for the INS V2 deploy where the Treasury Safe wants to
 *         route a percentage of every Registry / Marketplace withdrawal to
 *         the Igra DAO multisig WITHOUT modifying either of those
 *         already-deployed (immutable-modulo-owner) contracts.
 *
 * Usage:
 *   1. Deploy with (treasury, dao, daoBps, owner). dao MAY be address(0)
 *      at deploy if the DAO multisig isn't known yet — flush() will revert
 *      until setDao() is called (or daoBps is left at 0).
 *   2. Operator calls Registry.withdraw(splitter) — Registry sends 100%
 *      to this contract.
 *   3. Operator (or anyone) calls splitter.flush() — contract sends
 *      treasuryBps to `treasury` and the remaining (BPS_MAX - treasuryBps)
 *      to `dao`. Idempotent at zero balance.
 *
 * Trust:
 *   - `flush()` is permissionless. There are no funds at rest in normal
 *     operation (operator drives a withdraw + flush in the same session)
 *     and the split logic is deterministic, so making it permissioned
 *     would only add a footgun (operator forgetting to flush) without
 *     reducing attack surface.
 *   - `daoBps` is capped at 10_000 (100%); cannot accidentally send 105%.
 *   - Owner is intended to be a Safe multisig — can rotate dao address,
 *     bps, treasury, or transfer ownership entirely.
 *   - Splits ROUND DOWN on the DAO side; the residual (1 wei in the
 *     worst case) accrues to `treasury`. Documented + tested.
 *
 * Reentrancy:
 *   - flush() reads balance once, computes the split, then makes two
 *     external calls. State is not mutated between the calls and the
 *     contract has no other state that an inbound reentrant call could
 *     drain. Re-entering flush() during a recipient callback would just
 *     find balance == 0 and emit a zero-amount Flushed event. Adding a
 *     mutex would only catch the case where one recipient is malicious
 *     AND reverts on receive — which we already revert SendFailed for.
 */
contract TreasurySplitter {
    /* ─────────────────────────── Constants ──────────────────────── */
    uint16 public constant BPS_MAX = 10_000;

    /* ─────────────────────────── State ──────────────────────────── */
    address public owner;
    address payable public treasury;
    address payable public dao;
    /// @notice basis points (out of 10_000) sent to `dao` on each flush.
    ///         The remainder (10_000 - daoBps) goes to `treasury`.
    uint16 public daoBps;

    /* ─────────────────────────── Events ─────────────────────────── */
    event Flushed(uint256 totalAmount, uint256 toTreasury, uint256 toDao);
    event SplitUpdated(uint16 daoBps);
    event DaoUpdated(address dao);
    event TreasuryUpdated(address treasury);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Funded(address indexed from, uint256 amount);

    /* ─────────────────────────── Errors ─────────────────────────── */
    error NotOwner();
    error ZeroAddress();
    error BpsTooHigh();
    error SendFailed();
    error DaoUnsetButShareNonZero();

    /* ─────────────────────────── Modifiers ──────────────────────── */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /* ─────────────────────────── Constructor ────────────────────── */
    constructor(
        address payable _treasury,
        address payable _dao,
        uint16 _daoBps,
        address _owner
    ) {
        if (_treasury == address(0) || _owner == address(0)) revert ZeroAddress();
        if (_daoBps > BPS_MAX) revert BpsTooHigh();
        // _dao MAY be address(0) at deploy. flush() will revert until
        // setDao() is called OR daoBps is set to 0 (full route to treasury).
        treasury = _treasury;
        dao = _dao;
        daoBps = _daoBps;
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    /* ─────────────────────────── Receive ────────────────────────── */
    receive() external payable {
        if (msg.value > 0) emit Funded(msg.sender, msg.value);
    }

    /* ─────────────────────────── Flush ──────────────────────────── */

    /// @notice Permissionless flush — splits this contract's full balance
    ///         between treasury + DAO per current `daoBps`. Idempotent at
    ///         zero balance. Reverts if dao is unset (zero address) and
    ///         daoBps > 0 — set DAO first (or set bps to 0).
    function flush() external {
        uint256 bal = address(this).balance;
        if (bal == 0) {
            emit Flushed(0, 0, 0);
            return;
        }

        uint256 toDao;
        if (daoBps > 0) {
            if (dao == address(0)) revert DaoUnsetButShareNonZero();
            toDao = (bal * daoBps) / BPS_MAX;
        }
        uint256 toTreasury = bal - toDao;

        if (toDao > 0) {
            (bool okDao, ) = dao.call{value: toDao}("");
            if (!okDao) revert SendFailed();
        }
        if (toTreasury > 0) {
            (bool okT, ) = treasury.call{value: toTreasury}("");
            if (!okT) revert SendFailed();
        }
        emit Flushed(bal, toTreasury, toDao);
    }

    /* ─────────────────────────── Admin ──────────────────────────── */

    function setSplit(uint16 _daoBps) external onlyOwner {
        if (_daoBps > BPS_MAX) revert BpsTooHigh();
        daoBps = _daoBps;
        emit SplitUpdated(_daoBps);
    }

    function setDao(address payable _dao) external onlyOwner {
        // _dao = address(0) is allowed — disables DAO routing. flush() will
        // then require daoBps == 0, otherwise it reverts.
        dao = _dao;
        emit DaoUpdated(_dao);
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address prev = owner;
        owner = newOwner;
        emit OwnershipTransferred(prev, newOwner);
    }

    /* ─────────────────────────── Views ──────────────────────────── */

    /// @notice Treasury's basis-points share. Helper so consumers don't have
    ///         to compute (BPS_MAX - daoBps) themselves.
    function treasuryBps() external view returns (uint16) {
        return BPS_MAX - daoBps;
    }

    /// @notice Preview the split for a given amount without sending.
    function previewSplit(uint256 amount) external view returns (uint256 toTreasury, uint256 toDao) {
        toDao = daoBps > 0 ? (amount * daoBps) / BPS_MAX : 0;
        toTreasury = amount - toDao;
    }
}
