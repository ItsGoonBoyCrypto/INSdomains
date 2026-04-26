# INS Subnames — concept, contract, integration

Subnames are a **post-launch feature** that lets the owner of any top-level
`.igra` name mint free child names underneath it. Code is shipped + tested in
the repo today; the contract launches with `enabled = false` and is intended
to be activated **~1 month after mainnet** once the v1 product has stabilised
with zero-issue baseline.

## What

`alice.igra` owner can mint:
- `pay.alice.igra` → hot wallet
- `vault.alice.igra` → cold storage
- `eth.alice.igra` → cross-chain ETH address

Each subname is its **own ERC-721 NFT** in the `INSSubnameExtension` contract.
Once minted, it lives independently — transferable, with its own resolver
target — so even if the parent is sold, existing subnames stay with their
current owners.

## Why

- **Org/DAO use** — `kasplex.igra` mints `treasury.kasplex.igra`, `governance.kasplex.igra`, etc.
- **Hot/cold separation** — `pay.alice.igra` for tips, `vault.alice.igra` for big transfers
- **White-label** — `nftmkt.igra` can give every user a free `username.nftmkt.igra`
- **Verifiable association** — only parent owner can create children, so `support.igralabs.igra` is provably authorised by `igralabs.igra`'s owner

## Architecture (Option C — separate extension contract)

The existing `INSRegistry` is **not modified** — its on-chain code is immutable
and the subname feature is implemented in a separate `INSSubnameExtension`
contract. The extension reads parent ownership from the Registry but stores
subname state in its own mappings + mints subname NFTs as its own ERC-721
collection (with token IDs starting at 1,000,000,000 to avoid collision with
top-level Registry IDs).

```
INSRegistry (.igra)              INSSubnameExtension (.igra)
─────────────────                ───────────────────────────
ownerOf(parentTokenId)  ◀────  parentRegistry.ownerOf(parentTokenId)
                                  ↑
                                  │ verifies caller before minting
                                  │
                                mintSubname(parentId, label, to)
                                  ├ subnameOf[parentId][label] = subId
                                  ├ parentOf[subId] = parentId
                                  ├ subLabelOf[subId] = label
                                  ├ targetOf[subId] = to
                                  └ _safeMint(to, subId)
```

## Contract surface

### Reads (public)
- `enabled() → bool` — global on/off
- `parentRegistry() → address`
- `subnameOf(parentTokenId, label) → subTokenId` (0 if not minted)
- `parentOf(subTokenId) → parentTokenId`
- `subLabelOf(subTokenId) → string`
- `lockedParents(parentTokenId) → bool`
- `targetOf(subTokenId) → address`
- `fullName(subTokenId) → string` (e.g. `"pay.alice.igra"`)
- standard ERC-721: `ownerOf`, `balanceOf`, `getApproved`, `isApprovedForAll`, `tokenURI`, `supportsInterface`

### Writes (parent owner)
- `mintSubname(parentTokenId, subLabel, to) → subTokenId`
- `lockParentSubnames(parentTokenId, locked)` — pause/unpause subname creation under this parent (reversible)

### Writes (subname owner)
- `setSubnameTarget(subTokenId, newTarget)` — change resolver target
- standard ERC-721 transfers

### Admin (Safe only)
- `setEnabled(bool)` — global feature toggle
- `transferOwnership(newOwner)`

## Constraints (v1)

- **Top-level parents only** — no sub-of-sub. `pay.alice.igra` cannot itself have children.
  Adding sub-of-sub later is non-breaking (just enable a check that's currently a revert).
- **Pricing: free** — gas only. Mirrors ENS norm + drives adoption.
- **Not listable on INSMarketplace v1** — subnames are NFTs but the Marketplace
  whitelist is keyed to the top-level Registries. Adding subname trading requires
  a separate listing contract or Marketplace upgrade.
- **`.igra` only** — `.ins` and `.ikas` are paused legacy as of 2026-04-26 pivot,
  no subname extension deployed for them.

## Integration

### `/api/resolve`
Auto-handles 3-segment names like `pay.alice.igra`:
- Parses subLabel + parent label + tld
- If `SUBNAME_EXTENSION_ADDRESS` is set AND contract reports `enabled = true`,
  walks the hierarchy: `tokenIdOf("alice")` → `subnameOf(parentId, "pay")` → `targetOf(subId)`
- Returns standard envelope with extra fields:
  ```json
  {
    "name": "pay.alice.igra",
    "subLabel": "pay",
    "label": "alice",
    "tld": "igra",
    "tokenId": "1000000000",
    "parentTokenId": "5",
    "isSubname": true,
    "address": "0x...",
    "owner": "0x...",
    "exists": true
  }
  ```

### `/domains` UI
Each top-level name card has an expandable **"Subnames"** section that:
- Renders **nothing** when `SUBNAME_EXTENSION_ADDRESS = 0x000…0` (env not set)
- Renders **nothing** when `enabled() = false`
- Otherwise: lists existing subnames, lets parent owner mint new ones,
  lets subname owner edit their target, lets parent owner lock/unlock subname creation

### `/admin` UI
A **Subname Extension** card on the admin dashboard:
- Shows current enabled/disabled state + on/off toggle (Safe tx)
- Shows total subnames minted
- Links to contract on explorer

### Activity bot
When `SUBNAME_EXTENSION_IGRA` env var is set, the bot adds a `subname_igra`
event stream watching `SubnameMinted` events and posts:
```
🟣 🌳 New subname pay.alice.igra
minted under alice.igra
→ 0x… · tx
```

## Deployment plan (when activating)

1. **Deploy contract** via `forge script script/DeploySubnameExtension.s.sol`
   passing `parentRegistry = .igra Registry` and `_owner = Safe`.
   Use `--legacy --slow --with-gas-price 1100000000000` per Igra deploy gotcha.
2. **Verify** on Blockscout via `forge verify-contract`.
3. **Update `deployments/README.md`** with the address.
4. **Add env var** `NEXT_PUBLIC_INS_SUBNAME_EXTENSION_IGRA=<address>` to
   `/home/ins-dapp/.env.local` on VPS.
5. **Add bot env var** `SUBNAME_EXTENSION_IGRA=<address>` to
   `/home/ins-activity-bot/.env`.
6. **Rebuild + restart**: `cd /home/ins-dapp && npm run build && systemctl restart ins-dapp`
   and `systemctl restart ins-activity-bot`.
7. **Flip on via Safe**: `setEnabled(true)` on the contract via Safe UI.
8. **Announce** in TG + on a homepage banner / about-page roadmap update.

After step 7, the SubnamesPanel becomes visible on `/domains` cards and the API
starts answering 3-segment queries.

## Tests

`contracts/test/INSSubnameExtension.t.sol` — 27 tests passing including a
256-run fuzz round on label validation:

- Initial state (off, owner = deployer arg)
- Admin: setEnabled / transferOwnership only by owner
- Mint: happy path, recipient-can-be-anyone, not-parent-owner reverts,
  duplicate label reverts, invalid label reverts, zero recipient reverts,
  sub-as-parent reverts, safeMint receiver hook, non-receiver contract reverts
- Lock: blocks further mints, reversible, only parent owner
- Target: only subname owner, persists across transfer
- Transfer independence: subname transfers freely, parent transfer doesn't
  affect existing subname
- ERC-721 surface: balanceOf, ownerOf, supportsInterface (165/721/Metadata)
- Read helpers: fullName, tokenURI contains full name
- Fuzz: mint with random valid labels round-trips through mappings

Run via `cd contracts && forge test --match-contract INSSubnameExtensionTest -vv`.

## Why the "off by default" approach

- Lets us ship fully-tested code now that Igra reviewers can audit
- Avoids any chance of subnames going live before the team is ready
- Two layers of off (env var + on-chain enabled flag) — even if env var
  accidentally gets set in dev, contract.enabled() = false hides everything
- Activation is a single Safe tx + env var change — no code redeploy
- Reversible if ever needed (admin can flip enabled off again)

## Status

- [x] Contract code + 27 Foundry tests (commit `198e084`)
- [x] Frontend SubnamesPanel + admin toggle card
- [x] API hierarchy walker
- [x] Activity bot subname event handler
- [x] Documentation (this file)
- [ ] On-chain deployment — **deferred to ~1 month post-mainnet**
- [ ] Activation via Safe `setEnabled(true)` — after deployment
