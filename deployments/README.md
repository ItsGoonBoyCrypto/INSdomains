# INS Deployments

Canonical registry of INS contract deployments per chain.

## Igra Mainnet (chain 38833)

| Contract           | Address                                      | Deployed   |
|--------------------|----------------------------------------------|------------|
| INSRegistry        | `0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46` | 2026-04-23 |
| INSResolver        | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` | 2026-04-23 |
| INSReverseResolver | `0x9afb263be198c35159FafDafa0729Fc8B13562DA` | 2026-04-23 |
| INSMarketplace     | `0xf9e41e0a6fa04B641F6Cf8C92562C551034Af9F7` | 2026-04-24 |
| Registry owner     | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` | 2026-04-23 |
| Deployer           | `0x3352E8AF21a02A04Bfb9e4E941295B3f8Fa8D044` | —          |

**RPC:** `https://rpc.igralabs.com:8545`
**Explorer:** https://explorer.igralabs.com

Raw broadcast receipts:
- Registry + Resolver: [`igra-mainnet-38833.json`](./igra-mainnet-38833.json)
- ReverseResolver: [`../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json`](../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json)
- Marketplace: [`igra-mainnet-marketplace-38833.json`](./igra-mainnet-marketplace-38833.json) (deploy tx `0x2f74bb10888db7b3f31f7a171776eafb12d4f24e295e28e9d978997a90cb0e1a`, block 4801985, gas 1,246,840)

## Reverse resolution

`INSReverseResolver` is a standalone sidecar contract. It has no owner,
no admin functions, and holds a single mapping: `address → primary tokenId`.
Users opt in by calling `setPrimary(tokenId)` on a name they own.
Reads (`primaryName(addr)`) return `""` when the caller no longer owns the
stored token, so explorers and dApps can render the result without extra
liveness checks.

## Marketplace

`INSMarketplace.sol` is a zero-custody on-chain orderbook for `.ins` names.
Live on Igra mainnet 2026-04-24 at `0xf9e41e0a6fa04B641F6Cf8C92562C551034Af9F7`.
Owned and treasury-receiving via the Igra Safe — both on deploy (atomic handover
via `MARKET_NEW_OWNER`), so no single-key EOA has ever controlled it.

- **Zero custody.** Sellers call `setApprovalForAll(marketplace, true)` on
  the Registry once. NFT never leaves the seller wallet until the moment
  of sale.
- **Fees:** 2% seller fee (200 bps, admin-tunable up to 500 bps),
  1% featured-listing upfront fee (100 bps, same cap). 0% buyer fee.
  All fees route to `treasury` (the Igra Safe on mainnet).
- **Safety:** CEI on `buyListing`, `nonReentrant` on mutating externals,
  pause kill-switch, and `cancelListing` intentionally remains open during
  pause so sellers are never trapped.
- **Coverage:** 43 Foundry tests (+ 3 fuzz × 256 runs) covering every
  external path including seller-revoke-approval, non-receiver buyer,
  reentry attempts via malicious treasury callback, and revert-path refund.
