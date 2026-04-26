// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title INSSubnameExtension
 * @notice Optional subname layer on top of an existing INSRegistry.
 *
 *         The owner of any top-level INS name (e.g. `alice.igra`) can mint
 *         free subnames underneath it (e.g. `pay.alice.igra`,
 *         `vault.alice.igra`). Subnames are independent ERC-721 NFTs in
 *         this contract — they can be transferred, given away, or held
 *         long-term separately from the parent. Each subname carries its
 *         own resolver target so it points wherever its current owner
 *         decides.
 *
 * @dev Architecture (the "Option C" approach):
 *      - This contract is SEPARATE from INSRegistry — no upgrade required
 *        to the existing immutable Registry.
 *      - Permission to mint a subname is derived from on-chain ownership
 *        of the parent: `IINSRegistry(parentRegistry).ownerOf(parentId)`
 *        must equal `msg.sender`.
 *      - Subname tokenIds start at SUBNAME_ID_OFFSET (1B) so they cannot
 *        collide with top-level Registry IDs at any sane supply.
 *      - The contract launches with `enabled = false`. Admin (Safe)
 *        flips it on later via `setEnabled(true)` once the v1 product
 *        has stabilised (~1 month post-mainnet, per launch plan).
 *      - Sub-of-sub is NOT supported in v1 — only top-level → subname.
 *        Adding it later is a small addition without breaking anything.
 *      - Subnames are NOT listable on INSMarketplace v1. They live in
 *        this contract; trading them is a future enhancement.
 *
 *      Pricing: free (gas only). Parent already paid for the namespace;
 *      sub-creation is a free "of course you can carve up your own name"
 *      privilege. Mirrors ENS norm + drives adoption.
 */

interface IINSRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function labelOf(uint256 tokenId) external view returns (string memory);
}

interface IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata)
        external returns (bytes4);
}

contract INSSubnameExtension {
    /* ─────────────────────────── Errors ─────────────────────────── */
    error NotOwner();
    error NotEnabled();
    error NotParentOwner();
    error ParentLocked();
    error SubnameExists();
    error InvalidLabel();
    error ZeroAddress();
    error NonexistentToken();
    error NotAuthorized();
    error TransferToZero();
    error TransferToNonReceiver();
    error NotTopLevelParent();

    /* ─────────────────────────── Events ─────────────────────────── */
    event SubnameMinted(uint256 indexed parentTokenId, string indexed subLabel,
                        uint256 indexed subTokenId, address to);
    event TargetSet(uint256 indexed subTokenId, address indexed target);
    event ParentLockSet(uint256 indexed parentTokenId, bool locked);
    event EnabledSet(bool enabled);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /* ─────────────────────────── Constants ──────────────────────── */
    string public constant name = "INS Subname (.igra)";
    string public constant symbol = "INSSUB";
    /// @notice Subname tokenIds start here so they never collide with the
    /// parent Registry's incrementing IDs (currently in the low 100s).
    uint256 public constant SUBNAME_ID_OFFSET = 1_000_000_000;

    /* ─────────────────────────── State ──────────────────────────── */
    IINSRegistry public immutable parentRegistry;
    address public owner;
    bool public enabled;

    /// @dev parentTokenId => sub-label => sub-tokenId (0 if not minted)
    mapping(uint256 => mapping(string => uint256)) public subnameOf;
    /// @dev subId => parentId (top-level Registry ID)
    mapping(uint256 => uint256) public parentOf;
    /// @dev subId => subname label (e.g. "pay")
    mapping(uint256 => string) public subLabelOf;
    /// @dev parentId => true if owner has paused subname creation under this parent
    mapping(uint256 => bool) public lockedParents;
    /// @dev subId => resolver target (defaults to subname owner at mint time)
    mapping(uint256 => address) public targetOf;

    /// @notice Next subname tokenId to assign (starts at SUBNAME_ID_OFFSET).
    uint256 public nextSubTokenId = SUBNAME_ID_OFFSET;
    /// @notice Total subnames currently minted.
    uint256 public totalSupply;

    // ERC-721 internals
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /* ─────────────────────────── Modifiers ──────────────────────── */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyEnabled() {
        if (!enabled) revert NotEnabled();
        _;
    }

    /* ─────────────────────────── Constructor ────────────────────── */
    /**
     * @param _parentRegistry the INSRegistry whose top-level names are eligible parents
     * @param _owner the admin (typically the Igra Safe) — can flip `enabled` and transfer
     */
    constructor(address _parentRegistry, address _owner) {
        if (_parentRegistry == address(0) || _owner == address(0)) revert ZeroAddress();
        parentRegistry = IINSRegistry(_parentRegistry);
        owner = _owner;
        // Launch off; admin flips on via setEnabled(true) later.
        enabled = false;
        emit OwnershipTransferred(address(0), _owner);
        emit EnabledSet(false);
    }

    /* ─────────────────────────── Admin ──────────────────────────── */
    function setEnabled(bool _enabled) external onlyOwner {
        enabled = _enabled;
        emit EnabledSet(_enabled);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /* ─────────────────────────── Mint subname ───────────────────── */
    /**
     * @notice Mint a subname under a top-level parent name.
     *         Caller MUST own the parent (verified via parentRegistry.ownerOf).
     *         The subname is created as a fresh ERC-721 in this contract,
     *         owned by `to`. Default resolver target is `to` itself.
     *
     * @param parentTokenId top-level Registry tokenId of the parent name
     * @param subLabel      sub-label (e.g. "pay" → "pay.alice.igra")
     * @param to            recipient of the new subname NFT
     * @return subTokenId   the newly minted subname tokenId
     */
    function mintSubname(uint256 parentTokenId, string calldata subLabel, address to)
        external
        onlyEnabled
        returns (uint256 subTokenId)
    {
        if (to == address(0)) revert ZeroAddress();
        // v1: only top-level parents (no sub-of-sub). Parent IDs from the
        // Registry start at 1 and increment; they never reach 1B in any
        // realistic supply, so anything >= SUBNAME_ID_OFFSET is one of OUR
        // subname IDs and ineligible to be a parent here.
        if (parentTokenId >= SUBNAME_ID_OFFSET) revert NotTopLevelParent();

        if (parentRegistry.ownerOf(parentTokenId) != msg.sender) revert NotParentOwner();
        if (lockedParents[parentTokenId]) revert ParentLocked();
        if (!_isValidLabel(subLabel)) revert InvalidLabel();
        if (subnameOf[parentTokenId][subLabel] != 0) revert SubnameExists();

        subTokenId = nextSubTokenId++;
        _safeMint(to, subTokenId);
        subnameOf[parentTokenId][subLabel] = subTokenId;
        parentOf[subTokenId] = parentTokenId;
        subLabelOf[subTokenId] = subLabel;
        targetOf[subTokenId] = to;

        emit SubnameMinted(parentTokenId, subLabel, subTokenId, to);
    }

    /* ─────────────────────────── Set target ─────────────────────── */
    /**
     * @notice Subname owner sets where the subname resolves to.
     *         Like Registry.setTarget but scoped to this contract's NFTs.
     */
    function setSubnameTarget(uint256 subTokenId, address newTarget) external {
        if (_owners[subTokenId] != msg.sender) revert NotAuthorized();
        targetOf[subTokenId] = newTarget;
        emit TargetSet(subTokenId, newTarget);
    }

    /* ─────────────────────────── Lock parent ────────────────────── */
    /**
     * @notice Parent owner can pause/unpause subname creation under their name.
     *         REVERSIBLE: pass `false` to unlock again later.
     *         For a permanent guarantee that no more subnames will be minted,
     *         transfer the parent's NFT to a burn address (e.g. 0x000...dEaD).
     */
    function lockParentSubnames(uint256 parentTokenId, bool locked) external {
        if (parentTokenId >= SUBNAME_ID_OFFSET) revert NotTopLevelParent();
        if (parentRegistry.ownerOf(parentTokenId) != msg.sender) revert NotParentOwner();
        lockedParents[parentTokenId] = locked;
        emit ParentLockSet(parentTokenId, locked);
    }

    /* ─────────────────────────── Read helpers ───────────────────── */
    /**
     * @notice Returns the full dotted name for a subname (e.g. "pay.alice.igra").
     *         For convenience — anyone can compute this off-chain too.
     *         Hard-coded ".igra" suffix since this contract is .igra-scoped.
     */
    function fullName(uint256 subTokenId) external view returns (string memory) {
        if (subTokenId < SUBNAME_ID_OFFSET) revert NonexistentToken();
        if (_owners[subTokenId] == address(0)) revert NonexistentToken();
        uint256 parentId = parentOf[subTokenId];
        return string(abi.encodePacked(
            subLabelOf[subTokenId], ".", parentRegistry.labelOf(parentId), ".igra"
        ));
    }

    /* ─────────────────────────── ERC-721 ────────────────────────── */
    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        if (o == address(0)) revert NonexistentToken();
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        if (msg.sender != o && !_operatorApprovals[o][msg.sender]) revert NotAuthorized();
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        _transfer(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        _transfer(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd  // ERC-721
            || interfaceId == 0x5b5e139f  // ERC-721 Metadata
            || interfaceId == 0x01ffc9a7; // ERC-165
    }

    /* ─────────────────────────── tokenURI ───────────────────────── */
    function tokenURI(uint256 subTokenId) external view returns (string memory) {
        if (_owners[subTokenId] == address(0)) revert NonexistentToken();
        // Minimal on-chain JSON pointing at the dApp's per-name route.
        // Full SVG generation could be added later; for v1 we keep tokenURI
        // small + let wallets fetch a lightweight metadata blob.
        uint256 parentId = parentOf[subTokenId];
        string memory full = string(abi.encodePacked(
            subLabelOf[subTokenId], ".", parentRegistry.labelOf(parentId), ".igra"
        ));
        return string(abi.encodePacked(
            'data:application/json;utf8,{"name":"', full,
            '","description":"INS subname under ',
            parentRegistry.labelOf(parentId), '.igra (Igra Name Service).",',
            '"external_url":"https://insdomains.org/n/', full, '"}'
        ));
    }

    /* ─────────────────────────── Internals ──────────────────────── */
    function _safeMint(address to, uint256 tokenId) internal {
        _mint(to, tokenId);
        _checkOnERC721Received(address(0), to, tokenId, "");
    }

    function _mint(address to, uint256 tokenId) internal {
        if (to == address(0)) revert TransferToZero();
        _owners[tokenId] = to;
        _balances[to] += 1;
        unchecked { totalSupply += 1; }
        emit Transfer(address(0), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        if (to == address(0)) revert TransferToZero();
        address o = ownerOf(tokenId);
        if (o != from) revert NotAuthorized();
        if (msg.sender != o &&
            _tokenApprovals[tokenId] != msg.sender &&
            !_operatorApprovals[o][msg.sender]) {
            revert NotAuthorized();
        }
        _tokenApprovals[tokenId] = address(0);
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
        // Note: we DO NOT touch targetOf on transfer — it persists.
        // New owner can call setSubnameTarget if they want to change it.
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) internal {
        if (to.code.length == 0) return;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            if (retval != IERC721Receiver.onERC721Received.selector) revert TransferToNonReceiver();
        } catch {
            revert TransferToNonReceiver();
        }
    }

    function _isValidLabel(string calldata label) internal pure returns (bool) {
        bytes memory b = bytes(label);
        uint256 len = b.length;
        if (len < 1 || len > 32) return false;
        if (b[0] == 0x2d || b[len - 1] == 0x2d) return false; // no leading/trailing hyphen
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = b[i];
            bool isLower = (c >= 0x61 && c <= 0x7a); // a-z
            bool isDigit = (c >= 0x30 && c <= 0x39); // 0-9
            bool isHyphen = c == 0x2d;
            if (!isLower && !isDigit && !isHyphen) return false;
        }
        return true;
    }
}
