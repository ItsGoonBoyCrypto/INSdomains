# INS Deployments

Canonical registry of INS contract deployments per chain.

## Igra Mainnet (chain 38833)

| Contract           | Address                                      | Deployed   |
|--------------------|----------------------------------------------|------------|
| INSRegistry        | `0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46` | 2026-04-23 |
| INSResolver        | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` | 2026-04-23 |
| INSReverseResolver | `0x9afb263be198c35159FafDafa0729Fc8B13562DA` | 2026-04-23 |
| INSMarketplace     | *pending deploy*                             | —          |
| Registry owner     | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` | 2026-04-23 |
| Deployer           | `0x3352E8AF21a02A04Bfb9e4E941295B3f8Fa8D044` | —          |

**RPC:** `https://rpc.igralabs.com:8545`
**Explorer:** https://explorer.igralabs.com

Raw broadcast receipts:
- Registry + Resolver: [`igra-mainnet-38833.json`](./igra-mainnet-38833.json)
- ReverseResolver: [`../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json`](../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json)
- Marketplace: *will be added post-deploy*

## Reverse resolution

`INSReverseResolver` is a standalone sidecar contract. It has no owner,
no admin functions, and holds a single mapping: `address → primary tokenId`.
Users opt in by calling `setPrimary(tokenId)` on a name they own.
Reads (`primaryName(addr)`) return `""` when the caller no longer owns the
stored token, so explorers and dApps can render the result without extra
liveness checks.

## Marketplace (pending deploy)

`INSMarketplace.sol` is a zero-custody on-chain orderbook for `.ins` names.

- **Zero custody.** Sellers call `setApprovalForAll(marketplace, true)` on
  the Registry once. NFT never leaves the seller wallet until the moment
  of sale.
- **Fees:** 2% seller fee (200 bps, admin-tunable up to 500 bps),
  1% featured-listing upfront fee (100 bps, same cap). 0% buyer fee.
  All fees route to `treasury` (the Igra Safe on mainnet).
- **Safety:** CEI on `buyListing`, `nonReentrant` on mutating externals,
  pause kill-switch, and `cancelListing` intentionally remains open during
  pause so sellers are never trapped.
- **Coverage:** 42 Foundry tests (+ 2 fuzz × 256 runs) covering every
  external path including seller-revoke-approval, non-receiver buyer,
  reentry attempts, and revert-path refund.

Post-deploy:
1. Run `forge script script/DeployMarketplace.s.sol --rpc-url $IGRA_RPC --broadcast` with `INS_REGISTRY`, `INS_TREASURY`, and (recommended) `MARKET_NEW_OWNER=<Safe addr>` set so ownership atomically lands in the Safe.
2. Add `NEXT_PUBLIC_INS_MARKETPLACE=<addr>` to `/home/ins-dapp/.env.local`, rebuild and restart the Next.js service.
3. Update the table above with the deployed address + block.
