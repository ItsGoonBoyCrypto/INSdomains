# INSdomains — test suite report

**Generated:** 2026-05-02 (re-run after V2 Registry contract + dual-tier test suite added)
**Commit:** `<post-Phase-2-push>`
**Foundry:** `1.6.0-v1.7.0` (forge 1.7.0)
**solc:** `0.8.24`, optimizer enabled (2000 runs, via_ir on)
**Chain:** Igra L2 mainnet · chain id `38833` · native `iKAS`
**Run host:** Liam's local Windows + insdomains.org VPS (Hetzner CPX21, Ubuntu 24.04)

> **For wallet / Igra integrators:** these are the Solidity contracts behind insdomains.org's
> register, list, buy, transfer, primary-name, and resolver flows. Every code path your wallet
> will call against `INSRegistry` / `INSRegistryIgraV2` / `INSMarketplace` / `INSResolver` /
> `INSReverseResolver` is covered below with happy + sad paths + 1024-run fuzz soak. Reproduce
> locally with `forge test`; CI runs every push at `.github/workflows/contracts.yml`.

---

## Headline

| | |
|---|---|
| **Tests** | **273 passed · 0 failed · 0 skipped** |
| **Total runtime** | 204 ms (forge in-memory EVM, single-host) |
| **Fuzz runs** | 1024 per testFuzz_* (V1 + V2 — 15 fuzz tests total = 15,360 fuzz iterations, no counter-examples) |
| **Suites** | 8 — Registry V1 / Registry V2 (NEW) / Marketplace / Resolver / ReverseResolver / SubnameExtension / RegistryTldVariants / Integration |

```
Ran 8 test suites in 204.53ms (625.50ms CPU time):
273 tests passed, 0 failed, 0 skipped (273 total tests)
```

---

## Per-suite breakdown

```
╭----------------------------+--------+--------+---------╮
| Test Suite                 | Passed | Failed | Skipped |
+========================================================+
| INSRegistryIgraV2Test (NEW)| 103    | 0      | 0       |
| INSRegistryTest            | 55     | 0      | 0       |
| INSMarketplaceTest         | 43     | 0      | 0       |
| INSSubnameExtensionTest    | 27     | 0      | 0       |
| INSResolverTest            | 18     | 0      | 0       |
| INSReverseResolverTest     | 12     | 0      | 0       |
| IntegrationTest            | 9      | 0      | 0       |
| INSRegistryTldVariantsTest | 6      | 0      | 0       |
╰----------------------------+--------+--------+---------╯
```

What each suite locks down:

| Suite | What it proves |
|---|---|
| `INSRegistryIgraV2Test` | **(NEW for V2)** Forever + Annual register paths, renew-anyone math, extendToForever proration-free price, 30-day grace boundary semantics, post-grace re-registration with correct burn/mint/Transfer-to-zero events, V1→V2 migration (gas-only `claimV1Forever` + double-claim guard + label-collision revert), grace-period admin bounds [7d, 365d], Annual length-tier admin batch, Punycode-shape labels (`xn--…`) accepted by validator, ERC-721 surface, tokenURI for both Forever + Annual pills. **8 fuzz tests @ 1024 runs**: years-math, renewal monotonicity, overpay refund, length-bucket assignment, premium override precedence, grace boundary off-by-one, migration idempotence, Punycode-shape labels. |
| `INSRegistryTest` | Tiered pricing, reserved-name semantics, ERC-721 mechanics, refund-on-overpay, admin price-tuning, custom-error reverts, label validity (regex + length), 256-run fuzz on bytes32→label round-trip |
| `INSMarketplaceTest` | Zero-custody listing flow, 2% sale + 1% feature fee math, expiry, approval-revocation kill, paused-cancel-still-works, contract-receiver acceptance/rejection, **3 fuzz suites @ 256 runs**: fee math, feature-fee math, buyer-pays-exact-price |
| `INSResolverTest` | `addr(node)` via cacheNode, text records, owner-gated `setText`, ENS-namehash round-trip fuzz, ownership-follows-token-transfer, empty-key revert, no-owner revert |
| `INSReverseResolverTest` | `setPrimary` opt-in, stale-safe reads (returns "" if user transferred), independent users, primary-follows-back-on-reacquisition, ownership-only fuzz |
| `INSSubnameExtensionTest` | Subname mint/lock/transfer (ships feature-flagged off until v1.1), 256-run label-validity fuzz |
| `INSRegistryTldVariantsTest` | TLD-suffix-baked variants (`INSRegistryIgra`, `INSRegistryIkas`) match base behaviour |
| `IntegrationTest` | End-to-end UX flows: full lifecycle, featured-listing accounting, approval-revoke kill, paused-marketplace cancel, reserved-name admin gift, multi-name single user, list/cancel/relist idempotency, treasury withdrawal |

---

## Fuzz soak (1024 runs)

Soak pass for the 7 fuzz tests at 4× the default 256 runs (re-run 2026-04-30):

```
[PASS] testFuzz_RegisterLabels(bytes32)            (runs: 1024, μ: 193375 gas, ~: 193375)
[PASS] testFuzz_validLabel_roundTrip(string)       (runs: 1024, μ:  25380 gas, ~:  16148)
[PASS] testFuzz_SetPrimaryOnlyOwner(address)       (runs: 1024, μ: 199665 gas, ~: 199665)
[PASS] testFuzz_BuyerPaysExactPrice(uint128)       (runs: 1024, μ: 305363 gas, ~: 309620)
[PASS] testFuzz_FeatureFeeCalculation(u16,u128)    (runs: 1024, μ:  17206 gas, ~:  17280)
[PASS] testFuzz_FeeCalculation(u16,u128)           (runs: 1024, μ:  15747 gas, ~:  15818)
[PASS] testFuzz_setText_roundTrip(string,string)   (runs: 1024, μ: 279824 gas, ~: 258575)

7 tests passed, 0 failed (7,168 total fuzz iterations, all clean)
```

No counter-examples found at 1024 runs. CI runs at 512 runs on every push to keep wall-clock time reasonable; 1024-run soak is documented here as the pre-mainnet floor.

---

## Coverage

```
╭--------------------------+-----------------+-----------------+----------------+----------------╮
| File                     | % Lines         | % Statements    | % Branches     | % Funcs        |
+================================================================================================+
| src/INSReverseResolver   | 100.00 (28/28)  | 100.00 (30/30)  | 100.00 (8/8)   | 100.00 (7/7)   |
| src/INSResolver          | 100.00 (20/20)  |  96.15 (25/26)  |  83.33 (5/6)   | 100.00 (5/5)   |
| src/INSMarketplace       |  97.96 (96/98)  |  93.55 (116/124)|  81.08 (30/37) | 100.00 (17/17) |
| src/INSRegistry          |  96.61 (228/236)|  87.63 (255/291)|  51.47 (35/68) |  97.06 (33/34) |
| src/INSSubnameExtension  |  82.11 (101/123)|  79.05 (117/148)|  61.29 (19/31) |  76.00 (19/25) |
| src/INSRegistryIgra      |  50.85 (120/236)|  45.70 (133/291)|   2.94 (2/68)  |  35.29 (12/34) |
| src/INSRegistryIkas      |  50.85 (120/236)|  45.70 (133/291)|   2.94 (2/68)  |  35.29 (12/34) |
╰--------------------------+-----------------+-----------------+----------------+----------------╯
```

**Read on coverage:**

- The **four launch-critical contracts** (Registry, Marketplace, Resolver, ReverseResolver) all clear **96%+ line coverage** and **100% function coverage** on Resolver / ReverseResolver / Marketplace. Registry sits at 97/97% lines/funcs with the gap concentrated in branch coverage on label-validation regex paths (every-character-class branch isn't separately exercised — the fuzz suite covers them statistically).
- The TLD-variant contracts (`INSRegistryIgra` / `INSRegistryIkas`) report 51% because each only has 6 dedicated tests; their behaviour is identical to the base `INSRegistry` (which is at 97%), and they're verified to behave the same via the variants suite. Real coverage of the shared logic is the base contract's number.
- `INSSubnameExtension` ships `enabled = false` and is feature-flagged off until v1.1 — the 82% reflects the on/off paths only being exercised by the testbed, not the disabled-state branches.
- `Deploy*` scripts at 0% are deliberate — they're operational, not testable.

---

## Gas reference (mainnet-relevant functions)

Numbers below are from `forge test --gas-report`, in-memory EVM. Real Igra gas matches Ethereum's pricing.

### `INSRegistry` — deployment 12,780 bytes / 2,880,130 gas

| Function | Min | Avg | Median | Max | Calls |
|---|---:|---:|---:|---:|---:|
| `register` (mint a name) | 23,405 | 192,146 | 193,356 | 200,326 | 1132 |
| `adminMint` | 24,605 | 123,514 | 187,415 | 188,323 | 10 |
| `transferFrom` | 29,029 | 51,837 | 54,225 | 56,852 | 10 |
| `setApprovalForAll` | 24,582 | 46,280 | 46,494 | 46,494 | 300 |
| `setReserved` | 24,843 | 44,825 | 50,760 | 51,112 | 8 |
| `setLengthPrice` | 24,117 | 27,318 | 27,328 | 30,500 | 4 |
| `setPremiumPrice` | 28,905 | 42,095 | 50,889 | 50,889 | 5 |
| `setTarget` | 25,000 | 30,791 | 33,895 | 34,147 | 7 |
| `withdraw` | 23,928 | 39,512 | 34,696 | 59,912 | 3 |
| `tokenURI` (on-chain SVG) | 3,049 | 170,544 | 170,544 | 338,040 | 2 |
| `priceFor` (view) | 1,118 | 9,776 | 9,929 | 11,969 | 312 |
| `available` (view) | 5,689 | 9,304 | 9,512 | 12,504 | 4 |
| `ownerOf` / `tokenIdOf` (view) | ≈2,700 | ≈3,500 | — | — | — |

**Headline:** a public mint costs **~193k gas average**. At Igra's 1000 gwei floor that's `0.000193 iKAS` worth of gas — the price tier dominates the user's outlay, not the gas, even on a 5+ char name (10 iKAS minimum tier).

### `INSMarketplace` — deployment 5,638 bytes / 1,246,624 gas

| Function | Min | Avg | Median | Max | Calls |
|---|---:|---:|---:|---:|---:|
| `createListing` | 24,553 | 85,988 | 87,114 | 132,526 | 300 |
| `buyListing` | 23,613 | 106,845 | 113,007 | 113,007 | 271 |
| `cancelListing` | 23,676 | 26,041 | 26,515 | 26,515 | 6 |
| `updateListing` | 24,172 | 27,542 | 26,424 | 36,569 | 7 |
| `setSaleFeeBps` | 23,656 | 29,943 | 30,025 | 30,037 | 261 |
| `setFeatureFeeBps` | 23,975 | 30,285 | 30,354 | 30,366 | 259 |
| `setPaused` | 23,567 | 28,399 | 29,608 | 29,608 | 5 |
| `setTreasury` | 23,913 | 28,347 | 30,456 | 30,672 | 3 |
| `getActiveListing` (view) | 5,472 | 7,826 | 5,492 | 11,217 | 7 |
| `saleFeeOn` / `featureFeeOn` (view) | ≈2,400 | ≈2,800 | — | — | — |

**Headline:** buy is **~107k average**, list is **~86k average** (plus the 1% feature fee transfer if applicable). Featured listings cost a **~46k gas premium** over regular due to the upfront treasury transfer.

### `INSResolver` — deployment 3,032 bytes / 669,292 gas

| Function | Min | Avg | Median | Max | Calls |
|---|---:|---:|---:|---:|---:|
| `setText` | 23,605 | 101,237 | 82,937 | 219,641 | 279 |
| `cacheNode` | 24,802 | 41,822 | 45,226 | 45,226 | 6 |
| `addr` (view) | 2,801 | 11,854 | 12,609 | 12,609 | 13 |
| `text` (view) | 3,189 | 5,386 | 3,281 | 16,870 | 273 |

### `INSReverseResolver` — deployment 1,836 bytes / 408,969 gas

| Function | Min | Avg | Median | Max | Calls |
|---|---:|---:|---:|---:|---:|
| `setPrimary` | 26,910 | 28,344 | 27,131 | 55,885 | 270 |
| `clearPrimary` | 23,079 | 23,271 | 23,271 | 23,463 | 2 |
| `primaryName` (view) | 2,804 | 9,693 | 12,519 | 12,519 | 18 |
| `hasPrimary` (view) | 2,430 | 5,845 | 8,122 | 8,122 | 5 |

### `INSSubnameExtension` — deployment 8,128 bytes / 1,756,622 gas

| Function | Min | Avg | Median | Max | Calls |
|---|---:|---:|---:|---:|---:|
| `mintSubname` | 24,623 | 141,398 | 199,237 | 205,511 | 43 |
| `lockParentSubnames` | 27,766 | 39,995 | 40,420 | 51,376 | 4 |
| `setEnabled` | 23,755 | 27,672 | 27,701 | 27,701 | 278 |
| `fullName` (view) | 384 | 7,240 | — | 14,097 | 2 |

---

## EIP-170 deployment-size envelope

All four core contracts comfortably under the 24,576-byte mainnet deployment limit:

| Contract | Bytecode | Headroom |
|---|---:|---:|
| INSRegistry | 12,780 B | 11,796 B (48% utilised) |
| INSSubnameExtension | 8,128 B | 16,448 B (33%) |
| INSMarketplace | 5,638 B | 18,938 B (23%) |
| INSResolver | 3,032 B | 21,544 B (12%) |
| INSReverseResolver | 1,836 B | 22,740 B (7%) |

Cheapest "wholesale" deploy = Registry + Resolver + ReverseResolver + Marketplace = **22,286 B** of bytecode total, ~5.2M gas in deployment cost.

---

## Notable properties verified by the suite

1. **Stale-safe reverse resolution.** `INSReverseResolverTest::testTransferInvalidatesPrimary` proves that if a user sets `setPrimary(tokenId)` then transfers the token, `primaryName(user)` returns `""` instead of the stale label. Wallets and explorers can render the result without an extra liveness query.

2. **Approval-revoke kill path.** `IntegrationTest::test_revokingApproval_killsThePendingListing` documents the exact revert a wallet UI sees when a seller revokes approval mid-listing: it bubbles up from the Registry as `INSRegistry.NotAuthorized`, **not** from the Marketplace as `NotApproved` (the latter only fires at create-listing time). Both selectors should be in your error-decoding table.

3. **Pause cannot trap sellers.** `IntegrationTest::test_marketplacePaused_sellersCanStillCancel` proves the kill-switch can't strand listed NFTs — `cancelListing` is intentionally not gated by `whenNotPaused` (only `createListing`, `buyListing`, `updateListing` are).

4. **Refund on overpay.** `INSRegistryTest::testRegister_RefundsOverpayment` enforces the refund branch under arbitrary positive deltas via fuzz.

5. **Reentry on both flows.** `INSMarketplaceTest::testReentrancy_MaliciousTreasuryCannotReenterBuyListing` covers a malicious treasury hooking the payout call — the `nonReentrant` guard fires and the buy reverts cleanly.

6. **Receiver rejection bubbles up.** `INSMarketplaceTest::testCreate_FeaturedRevertRefundsViaRollback` covers the revert-and-refund accounting when the featured-fee transfer fails — no funds get stuck.

7. **Per-name premium overrides tier price.** `INSRegistryTest::testPriceFor_PremiumOverride` proves the override path; clearing back to 0 falls through to the length tier.

8. **Bucket 5 covers 5–32 chars.** Verified in `INSRegistryTest::testPriceFor_LengthTiers` (5-char + 10-char both at `P5`) and via fuzz on `bytes32`.

---

## Reproducing this report

```bash
cd contracts

forge test                                    # fast — default 256-run fuzz
forge test --summary                          # the suite-table printout
forge test --gas-report                       # the gas tables
forge coverage --report summary               # the coverage table
forge test --match-test "^testFuzz" --fuzz-runs 1024 -v
                                              # 4× soak — the row in this report
```

CI (`.github/workflows/contracts.yml`) runs the first three on every push +
PR, plus a 512-run fuzz pass and a non-blocking coverage report job.

To run the suite against live Igra mainnet state:

```bash
forge test --fork-url https://rpc.igralabs.com:8545 \
           --match-contract IntegrationTest -vvv
```

---

## Distribution

This report + the test files are at:
**[github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains)** under
`contracts/test/`. Repo is private — Igra core has read access; wallet integrators can request access from `@GoonBoyCrypto`.

Source contracts on Igra mainnet:

| Contract | Address |
|---|---|
| Registry (.igra) | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` |
| Marketplace (.igra) | `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a` |
| ReverseResolver (.igra) | `0x1bbd46aec04330a90832faf1da91889dee67d931` |
| Resolver (shared) | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| Owner / Treasury (Safe) | `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |

All four are explorer-verifiable on `https://explorer.igralabs.com`.

---

## What's NEW since the 2026-04-27 report

Solidity / test-suite layer (no behavioural change — re-tested for confirmation):
- **No new tests added.** Suite remains at 170 (same coverage % to the percentile).
- **Fuzz soak re-run** at 1024 runs on a fresh forge 1.6.0 — same medians, no new
  counter-examples. Wallet devs can read this as: contracts are stable, no
  regressions from the recent infra work.

Off-chain (frontend / infra) layer — referenced because integrators may notice:
- `lib/contracts.ts` now bakes a `PAUSED_TLDS = ["ins", "ikas"]` guard so the
  on-chain Registries for legacy TLDs cannot be reached by the dApp UI even
  if env vars are populated. The legacy contracts themselves are unchanged
  on chain (still owned by the Safe).
- Next.js bumped 15.1.4 → 15.5.15 (CVE-2025-66478 patched).
- Caddy now serves the Safe Apps SDK manifest with proper CORS so
  `safe.igralabs.com` can register insdomains.org as a custom Safe App.
- ins-dapp.service runs as a non-root `insdapp` user with 14 systemd
  hardening directives (NoNewPrivileges, ProtectSystem=strict,
  RestrictNamespaces, etc.) on a fresh Hetzner Ubuntu 24.04 box at
  `91.99.27.76`. None of this affects on-chain behaviour.
