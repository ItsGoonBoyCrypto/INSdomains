# INS Deployments

Canonical registry of INS contract deployments per chain.

## Igra Mainnet (chain 38833)

| Contract           | Address                                      |
|--------------------|----------------------------------------------|
| INSRegistry        | `0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46` |
| INSResolver        | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| INSReverseResolver | `0x9afb263be198c35159FafDafa0729Fc8B13562DA` |
| Registry owner     | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |
| Deployer           | `0x3352E8AF21a02A04Bfb9e4E941295B3f8Fa8D044` |

**Registry / Resolver deployed:** 2026-04-23
**ReverseResolver deployed:** 2026-04-23
**RPC:** `https://rpc.igralabs.com:8545`
**Explorer:** https://explorer.igralabs.com

Raw broadcast receipts:
- Registry + Resolver: [`igra-mainnet-38833.json`](./igra-mainnet-38833.json)
- ReverseResolver: [`../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json`](../contracts/broadcast/DeployReverseResolver.s.sol/38833/run-latest.json)

## Reverse resolution

`INSReverseResolver` is a standalone sidecar contract. It has no owner,
no admin functions, and holds a single mapping: `address → primary tokenId`.
Users opt in by calling `setPrimary(tokenId)` on a name they own.
Reads (`primaryName(addr)`) return `""` when the caller no longer owns the
stored token, so explorers and dApps can render the result without extra
liveness checks.
