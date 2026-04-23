# INS Deployments

Canonical registry of INS contract deployments per chain.

## Igra Mainnet (chain 38833)

| Contract    | Address                                      |
|-------------|----------------------------------------------|
| INSRegistry | `0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46` |
| INSResolver | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| Owner       | `0xF9d065b70C9357098dc7854D7A28B1498f6d125c` |
| Deployer    | `0x3352E8AF21a02A04Bfb9e4E941295B3f8Fa8D044` |

**Deployed:** 2026-04-23
**RPC:** `https://rpc.igralabs.com:8545`
**Explorer:** https://explorer.igralabs.com

Raw broadcast receipt: [`igra-mainnet-38833.json`](./igra-mainnet-38833.json)

## Ownership handover plan

Ownership currently sits on the operator EOA `0xF9d065…d125c`. Planned
migration to an Igra Safe multisig via https://safe.igralabs.com/ —
the `transferOwnership(newOwner)` call can be made from the `/admin`
dashboard once the Safe address is known.
