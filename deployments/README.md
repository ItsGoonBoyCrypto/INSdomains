# INS Deployments

Canonical registry of INS contract deployments per chain.

## Igra Mainnet (chain 38833)

### .igra TLD V2 (current — since 2026-05-02)
| Contract             | Address                                      | Deployed   | Notes |
|----------------------|----------------------------------------------|------------|-------|
| **INSRegistryIgraV2** | `0x7E7018959bf44045F01D176D8db1594894CBf4E9` | 2026-05-02 | Dual Forever / Annual tenure, V1 migration via `claimV1Forever`, 30-day grace. **Current canonical Registry**. Spec: `docs/V2_SPEC.md`, deploy artifact: `igra-mainnet-registry-igra-v2-38833.json` |
| **INSMarketplace V2** | `0xd641dadd503d8beba2395cd72367cf4edaf4674f` | 2026-05-02 | V2-bound Marketplace. Same `INSMarketplace.sol` source as V1 — the contract's `registry` is `IERC721Min immutable`, so V2 needed a fresh deploy. Same fee schedule (2% sale, 1% featured, 5% cap). Owner = Treasury Safe. Artifact: `igra-mainnet-marketplace-igra-v2-38833.json` |
| **INSReverseResolver V2** | `0xef449f577255ee1d6df37d982da086a7e22a6853` | 2026-05-02 | V2-bound Reverse Resolver. No owner / no admin functions — pure user-controlled primary-name mapping. Artifact: `igra-mainnet-reverse-resolver-igra-v2-38833.json` |
| **INSSubnameExtension V2** | `0x7E103668E40aeA3d3698f8D72cD6A8847FcCf280` | 2026-05-02 | V2-targeted subname extension. enabled=false on chain — flips on for v1.1 activation (~3-4 weeks post-launch). Artifact: `igra-mainnet-subname-extension-v2-38833.json` |
| Resolver (shared, ENS-compatible) | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` | 2026-04-23 | Unchanged — namehash-keyed, works across V1 + V2 |

### .igra TLD V1 (legacy — read-only since 2026-05-02)
| Contract            | Address                                      | Deployed   |
|---------------------|----------------------------------------------|------------|
| INSRegistryIgra     | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` | 2026-04-24 |
| INSReverseResolver  | `0x1bbd46aec04330a90832faf1da91889dee67d931` | 2026-04-24 |
| INSMarketplace      | `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a` | 2026-04-24 |

V1 NFTs remain in their holders' wallets indefinitely. Holders can migrate to V2 Forever for **gas only** via `INSRegistryIgraV2.claimV1Forever(v1TokenId, target)`.

### .ins TLD (legacy — paused 2026-04-26)
| Contract           | Address                                      | Deployed   |
|--------------------|----------------------------------------------|------------|
| INSRegistry        | `0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46` | 2026-04-23 |
| INSResolver (shared with V2 .igra) | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` | 2026-04-23 |
| INSReverseResolver | `0x9afb263be198c35159FafDafa0729Fc8B13562DA` | 2026-04-23 |
| INSMarketplace     | `0xf9e41e0a6fa04B641F6Cf8C92562C551034Af9F7` | 2026-04-24 |

### .ikas TLD (legacy — paused 2026-04-26)
| Contract            | Address                                      |
|---------------------|----------------------------------------------|
| INSRegistryIkas     | `0xe705e38DeF4970e23617d30D9774062FEeEBA610` |
| INSReverseResolver  | `0x9963aa24327f513b4cd5ce8118027a1da2fe76b5` |
| INSMarketplace      | `0x7ec22c238e7392adcc367f332f301629e9f4ec33` |

### Shared
| Role                       | Address                                          |
|----------------------------|--------------------------------------------------|
| Owner (every contract)     | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |
| Treasury (every contract)  | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |
| V1 Deployer (DRAINED — incident 2026-04-25, never reuse) | `0x3352E8AF21a02A04Bfb9e4E941295B3f8Fa8D044` |
| V2 Deployer (drained + quarantined 2026-05-02) | `0x198e1517858c9C5551b8de348d112931D2651df6` |

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
