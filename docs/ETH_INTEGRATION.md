# `.eth` interop — INS via CCIP-Read

> **Status:** design + Phase-1 code complete (this file + L1 contract + gateway
> route, all deploy-deferred). **Not yet active on chain.**
>
> Activation cost: registering `igra.eth` on Ethereum L1 (~$5–100 in ETH gas
> depending on label length + year) + a one-time L1 deploy of the wildcard
> resolver (~$30–80 in ETH gas) + flipping `CCIP_GATEWAY_ENABLED=true` on the
> VPS. **No Igra L2 contract changes required.**

---

## What this gives users

After activation, **any ENS-aware wallet** (MetaMask, Rabby, Uniswap, etc.)
can resolve `alice.igra.eth` directly to the on-chain target address of
`alice.igra` on Igra L2 — no special integration, no extension, no manual
"add network" step.

```
User types "alice.igra.eth" in Uniswap →
  Uniswap calls ENS resolver on Ethereum L1 →
    Wildcard resolver reverts with OffchainLookup (EIP-3668) →
      Wallet calls our gateway: https://insdomains.org/api/ccip/... →
        Gateway reads Igra V2 Registry.resolve("alice") →
        Gateway signs response with EIP-191 →
      Wallet verifies signature against wildcard resolver's signer allowlist →
    Wallet displays: alice.igra.eth → 0xUser
```

Round-trip is one extra HTTPS request — ~50–200ms, transparent to the user.

---

## Standards we conform to

| Standard | What it does | Status |
|---|---|---|
| **[EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)** (CCIP-Read) | Off-chain data with on-chain verification via `OffchainLookup` revert | ✓ wildcard resolver implements |
| **[ENSIP-10](https://docs.ens.domains/ensip/10)** (Wildcard Resolution) | Subdomain queries route to a parent's resolver | ✓ wildcard resolver implements `resolve(bytes name, bytes data)` |
| **[ENSIP-1](https://docs.ens.domains/ensip/1)** (Namehash) | Recursive keccak of label hashes | Used in name encoding |
| **[EIP-191](https://eips.ethereum.org/EIPS/eip-191)** | Signed-message format | Gateway uses for response signing |
| **ENS public resolver `addr()`/`text()` selectors** | Standard record types | Gateway decodes + serves |

---

## Architecture

```
                    Ethereum L1                                 Igra L2
                  (chain 1, mainnet)                          (chain 38833)
       ┌──────────────────────────────────────┐    ┌──────────────────────┐
       │ ENS Registry (0x00000000000C2E…)     │    │ V2 INSRegistry       │
       │  resolver(namehash("igra.eth")) ─────┼─┐  │ 0x7E70189…f4E9       │
       │      → INSWildcardL1                 │ │  │  resolve(label)      │
       └──────────────────────────────────────┘ │  └──────────▲───────────┘
                                                │             │
       ┌──────────────────────────────────────┐ │             │
       │ INSWildcardL1 (NEW — this work)      │ │             │
       │  resolve(name, data)                 │◀┘             │ (reads via
       │   → reverts OffchainLookup           │               │  Igra RPC)
       │      sender = self                   │               │
       │      urls = [gateway URL]            │               │
       │      callbackFunction = resolveCB   │               │
       │  resolveCB(response, extraData)      │               │
       │   → verifies sig + returns bytes     │               │
       └──────────────────────────────────────┘               │
                          ▲                                    │
                          │ ENS-aware wallet                    │
                          │ (MetaMask, Rabby, …)                │
                          │                                    │
                          ▼                                    │
       ┌──────────────────────────────────────┐               │
       │ CCIP-Read Gateway (NEW — this work)  │               │
       │  insdomains.org/api/ccip/{sender}/   │               │
       │                       {data}.json    │───────────────┘
       │  - DNS-decodes name to label         │
       │  - Reads V2 Registry.resolve(label)  │
       │  - Signs response with EIP-191       │
       │  - Returns { data, expires, sig }    │
       └──────────────────────────────────────┘
                                                                            
```

---

## Design decisions

### D1: `igra.eth` subdomains (not `.igra` TLD recognition)

We register **`igra.eth`** on ENS L1 and let users resolve `alice.igra.eth`
(rather than coordinating with ENS Labs for first-class `.igra` recognition,
which is slow / unlikely).

**Cost:** ~$5–100 one-time depending on label length + years (3-char "igra"
is in the "rare" tier, ~$640/yr per ENS pricing — but we'd register for
multiple years upfront).

**Trade-off:** Users see `alice.igra.eth` in wallets, not `alice.igra`. The
`.eth` suffix is OK — it's how every CCIP-Read project does it
(`x.cb.id`, `*.argent.xyz` on ENS, etc.). The `.igra` substring still reads.

### D2: Gateway hosted as Next.js API route

`/api/ccip/[sender]/[data]/route.ts` lives on the existing `insdomains.org`
infra. **No new servers, no new domains, no new TLS certs.**

Caddy already TLS-terminates; the route is server-rendered Node.js (not
Edge — needs the EOA signing key in env). Edge-cached per-name for 60s.

### D3: Signing key is a fresh EOA

CCIP-Read signers are a closed allowlist on the wildcard resolver. Compromise
of the signer key = attacker can spoof name → address resolutions (high-
impact MEV / phishing).

Mitigation:
- **Dedicated EOA**, never reused for anything else
- Private key in `CCIP_SIGNER_PRIVATE_KEY` env (NOT `NEXT_PUBLIC_…`)
- File perms `chmod 600` on `/home/insdapp/ins-dapp/.env.local`
- Wildcard resolver allows the Safe to add/remove signers — instant rotation if compromise suspected
- Plan: rotate signer every 6 months as a hygiene practice

### D4: Linking direction

- **`alice.igra` → `alice.eth`**: store ENS profile URL or ETH address in
  Igra Resolver's `text(node, "eth.address")` or `text(node, "url")`
  records. Self-serve via the dApp.
- **`alice.eth` → `alice.igra`**: user sets a `text()` record on THEIR ENS
  resolver (e.g. `url = https://insdomains.org/alice.igra`). Out of our
  control; documented as a "how-to" page.

### D5: Phased rollout

| Phase | When | What |
|---|---|---|
| **0** — Foundation | Done pre-launch | `INSResolver` (Igra L2) is namehash-compatible. ABI surface matches ENS public resolver. |
| **1** — Code (this work) | **Today** | Wildcard resolver Solidity + Foundry tests + Next.js gateway route + encoding lib. All deploy-deferred. |
| **2** — Sepolia smoke test | Post-launch + DAO finalised | Deploy wildcard resolver to Sepolia. Register `igra-test.eth`. Smoke-test resolution from a Sepolia wallet. |
| **3** — Mainnet activation | When (1) Sepolia clean (2) Igra DAO has had a chance to weigh in on `.eth` strategy | Buy `igra.eth` on Ethereum mainnet. Deploy wildcard resolver to mainnet. Point `igra.eth`'s resolver at the wildcard contract. Flip `CCIP_GATEWAY_ENABLED=true`. Smoke-test from MetaMask. |
| **4** — Profile-linking UX | v1.1 (with subnames) | `/app` panel: "Link your .eth profile" — set `text(node, "eth.address")` from the dApp UI. |
| **5** — Reverse `.eth → .igra` | v1.2 | Document how holders set their ENS reverse record to point at insdomains.org/<label>.igra |

---

## Files in this work

| File | What | Status |
|---|---|---|
| `docs/ETH_INTEGRATION.md` | This doc | ✓ written |
| `contracts/src/INSWildcardL1.sol` | L1 wildcard resolver — CCIP-Read trigger + verifier | ✓ written |
| `contracts/test/INSWildcardL1.t.sol` | Forge tests (OffchainLookup revert shape, signer allowlist, callback verification, admin paths) | ✓ written |
| `contracts/script/DeployWildcardL1.s.sol` | Deploy script for Sepolia / mainnet | ✓ written |
| `lib/ccip.ts` | Shared helpers: DNS-encoding, namehash, EIP-191 signing | ✓ written |
| `app/api/ccip/[sender]/[data]/route.ts` | The gateway endpoint | ✓ written |
| `docs/ETH_INTEGRATION.md` (this section) | Activation runbook | below ↓ |

Everything is **deploy-deferred**:
- L1 contract: written, tested, but not deployed
- Gateway route: written, server-rendered, but returns a 503 unless `CCIP_GATEWAY_ENABLED=true` and `CCIP_SIGNER_PRIVATE_KEY` are set
- ENS L1 registration: not done

So this code can ship to production with zero impact on the .igra launch.

---

## Activation runbook (Phase 3, post-launch)

### Step 1 — Generate signer EOA

```bash
# Generate fresh wallet for CCIP signing (never reuse this key for anything else)
cast wallet new
# → Address: 0x…<SIGNER>
# → Private key: 0x…<SIGNER_PK>
# Store both. The address goes on chain (signer allowlist); the PK goes
# in VPS .env.local under CCIP_SIGNER_PRIVATE_KEY.
```

### Step 2 — Register `igra.eth` on Ethereum mainnet

```text
1. Visit https://app.ens.domains
2. Search "igra.eth"
3. Register for 5+ years upfront (pre-pay so we're not on the renewal
   treadmill while iterating)
4. The Safe (or a hot wallet) becomes the controller — once stable,
   transfer ownership to the Igra Safe via ENS UI
```

Cost: ~$640/year × 5 years for a 4-char label, plus L1 gas. Pay in ETH.

### Step 3 — Deploy `INSWildcardL1` to Ethereum mainnet

```bash
cd contracts

# Fund deployer (Ethereum mainnet, not Igra L2!)
export PRIVATE_KEY=0x<deployer key, fresh EOA>
export INS_TREASURY=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1  # Safe
export CCIP_GATEWAY_URL="https://insdomains.org/api/ccip/{sender}/{data}.json"
export CCIP_SIGNER_ADDR=0x<SIGNER from step 1>

forge script script/DeployWildcardL1.s.sol \
  --rpc-url $ETH_MAINNET_RPC \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

# Note the deployed address — call it 0x<WILDCARD_L1>
```

### Step 4 — Point `igra.eth` at the wildcard resolver

In the ENS UI:
1. Open `igra.eth` records page
2. Set "Resolver" to `0x<WILDCARD_L1>`
3. Sign the tx (~$5 in gas)

### Step 5 — Activate the gateway on VPS

```bash
ssh root@91.99.27.76

# /home/insdapp/ins-dapp/.env.local
cat >> /home/insdapp/ins-dapp/.env.local <<EOF
CCIP_GATEWAY_ENABLED=true
CCIP_SIGNER_PRIVATE_KEY=0x<SIGNER_PK from step 1>
CCIP_WILDCARD_L1_ADDRESS=0x<WILDCARD_L1 from step 3>
EOF

chmod 600 /home/insdapp/ins-dapp/.env.local

systemctl restart ins-dapp
```

### Step 6 — Smoke test from a real .eth-aware wallet

```text
1. Open MetaMask, switch to Ethereum mainnet
2. Send a 0-value tx to "alice.igra.eth" (or any minted .igra name)
3. MetaMask should resolve → show the V2 owner's address
```

### Step 7 — Announce

Post on @IgraNameService X:
```text
🟣 Your .igra name now resolves from any .eth-aware wallet.
Type alice.igra.eth in MetaMask / Rabby / Uniswap — it works.

CCIP-Read powered, no extension needed.
insdomains.org
```

---

## Cost summary

| Item | Cost (est.) | One-time / recurring |
|---|---|---|
| `igra.eth` ENS registration (5 years, 4-char) | ~$3,200 | recurring (every 5y) |
| L1 wildcard resolver deploy | ~$30–80 | one-time |
| Pointing `igra.eth` resolver at wildcard | ~$5 | one-time |
| Gateway hosting | $0 | (existing VPS) |
| **Total launch cost** | **~$3,250** | |

---

## What WON'T work after activation (intentionally)

- **`alice.igra`** in MetaMask alone (without `.eth` suffix) — MetaMask only
  knows `.eth` namespace by default. The `.eth` suffix is mandatory for the
  ENS path. (Wallets that natively read Igra L2 can resolve plain `alice.igra`
  via the existing INSResolver.)
- **Subnames** — initial gateway only handles top-level names. Subname
  resolution (e.g. `pay.alice.igra.eth`) added when SubnameExtension is
  activated in v1.1.
- **Annual names that have expired** — gateway returns address(0) if the
  V2 Registry reports the name has expired AND grace period ended. This is
  correct ENS behavior (an expired name resolves to zero).

---

## Security model

- **Signer compromise:** spoofed resolutions until Safe rotates signers via
  `setSigners()` on `INSWildcardL1`. Worst case: 1 admin tx to recover.
- **Gateway compromise (VPS):** same as signer compromise — attacker gets
  the signing key. Mitigation: dedicated EOA, never used for anything else.
- **`igra.eth` ENS controller theft:** worst case — attacker can change
  the resolver to point elsewhere. Mitigation: transfer ENS controller to
  the Safe once configuration is stable. Safe-only changes from then on.
- **L1 contract bug:** the wildcard resolver is tiny (~200 lines, no value
  flows, no upgradability). Foundry tests cover every external path.

---

## Why we're not using ENS Labs' Durin / EVMGateway

[Durin](https://durin.dev) and [EVMGateway](https://github.com/ensdomains/evmgateway)
are ENS Labs' generic CCIP-Read frameworks. They're great but heavier than
what we need:
- They assume a sibling EVM L2 with broad state-proof support
- They require Merkle proofs of state from the source chain
- They depend on an additional indexer service

We can avoid all of that because:
- Our gateway just reads `Registry.resolve(label)` via Igra RPC and signs
- Signature-based verification is simpler than state proofs
- One fewer moving part = one fewer thing that can break

The trade-off: signed gateway responses require trusting the gateway's
signing key (vs. state proofs which are trustless). For our launch volume
this is the right call. We can migrate to Durin/EVMGateway later if/when
the use case demands it.

---

## References

- [EIP-3668: CCIP-Read](https://eips.ethereum.org/EIPS/eip-3668)
- [ENSIP-10: Wildcard Resolution](https://docs.ens.domains/ensip/10)
- [ENS App](https://app.ens.domains)
- [Optimism Off-Chain Resolver](https://github.com/ensdomains/op-resolver) (reference implementation pattern)
- INS existing Resolver: `contracts/src/INSResolver.sol` (Igra L2, namehash-keyed)
- INS V2 Registry: `contracts/src/INSRegistryIgraV2.sol`
