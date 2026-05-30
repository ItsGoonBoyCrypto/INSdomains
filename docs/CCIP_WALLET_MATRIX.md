# Wallet CCIP-Read Compatibility Matrix for `*.insdomains.eth`

**Setup verified 2026-05-30.** ENS resolver `0x20e628321f3569874AdAf5DE0dd58A1f2275d115` set on `insdomains.eth`. CCIP gateway at `insdomains.org/api/ccip` with `CCIP_PARENT_NAME=insdomains.eth`. Resolution test: `igranetwork.insdomains.eth → 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` via viem `ccipRead:true` ✓.

## Compatibility status

| Wallet | Stack | CCIP-Read | Status | Why |
|---|---|---|---|---|
| **MetaMask (regular)** | ethers + viem (modern) | ✅ Built-in | ✅ **VERIFIED WORKING** | Liam tested today. MetaMask added CCIP-Read in early 2022 (EIP-3668 native) |
| **Coinbase Wallet** | Custom resolver + ENS Universal Resolver | ✅ Documented | 🟢 **LIKELY WORKS** | Their `getProvider().resolveName()` uses CB's own CCIP-aware infra |
| **Frame Wallet** | ethers v5 default provider | ✅ Native | 🟢 **LIKELY WORKS** | Default ethers v5 provider has CCIP-Read enabled since v5.6.4 (2022) |
| **Rainbow Wallet** | ethers v5 + custom RPC | 🟡 Probably | 🟡 **LIKELY WORKS** | Uses ethers default provider for ENS, should follow OffchainLookup |
| **Brave Wallet** | Custom Rust resolver | 🟡 Unknown | 🟡 **NEEDS TEST** | Their resolver handles ENS/SNS/Unstoppable; CCIP support undocumented |
| **Trust Wallet** | Closed source | 🟡 Unknown | 🟡 **NEEDS TEST** | ENS supported but CCIP-Read support undocumented |
| **Uniswap Interface** | wagmi (viem) | ⚠️ Opt-in needed | 🟡 **NEEDS TEST** | viem requires `ccipRead:true`. Recent wagmi/Uniswap configs likely enable it |
| **Rabby Wallet** | ethers 5.8.0 + viem 2.47.6 | ❌ NOT enabled | ❌ **CONFIRMED BROKEN** | Searched repo: zero `ccipRead` / `OffchainLookup` references. Liam tested → falls through to whitelist prompt |
| **Phantom (EVM)** | Closed source | 🟡 Unknown | 🟡 **NEEDS TEST** | New EVM support; ENS resolution path unclear |
| **OKX Wallet** | Closed source | 🟡 Unknown | 🟡 **NEEDS TEST** | Limited ENS docs available |
| **MetaMask Flask + INS Snap** | Our snap | N/A (direct `.igra`) | ✅ **VERIFIED WORKING** | Native `.igra` resolution, no CCIP needed |

## How to test in any wallet (~10 sec each)

1. Open the wallet
2. Switch to Ethereum Mainnet
3. Hit Send / Transfer
4. Paste `igranetwork.insdomains.eth` in the recipient field
5. **PASS:** Address `0x7447F0e5...07aA1` appears below
6. **FAIL:** Field shows error / asks to whitelist / says "invalid address"

## Why some wallets fail

CCIP-Read (EIP-3668) lets resolvers return `OffchainLookup(...)` reverts that tell the wallet to GET a signed response from an HTTPS gateway. Wallets that don't implement EIP-3668 ignore the revert → get null → user sees no resolution.

Two implementation flavors:

- **ethers v5.6.4+** has CCIP-Read **enabled by default** in `provider.resolveName()`. Just upgrade ethers to fix.
- **viem** has CCIP-Read **disabled by default** — must pass `ccipRead: true` to `createPublicClient`. One-line fix.

## Action items per wallet

| Wallet | Action |
|---|---|
| **Rabby** | PR or DM to enable `ccipRead: true` on their viem client. See `docs/rabby-pr/`. |
| **Uniswap** | If broken, file issue at github.com/Uniswap/interface — likely 1-line fix in their wagmi config |
| **Brave / Trust / Phantom / OKX** | Manual test required. If broken, open GitHub issue / DM team |
| **Coinbase Wallet** | Manual test required — if works, document it as preferred path |

---

**Bottom line:** MetaMask works today. Adding **Rabby + ~5 other wallets** is achievable via 1-line PRs to enable a CCIP-Read flag that all of them already have in their stack. **None of them need to know about INS specifically** — fixing CCIP-Read fixes the entire ENS L2 ecosystem (NameStone, NameSpace, ours, etc).
