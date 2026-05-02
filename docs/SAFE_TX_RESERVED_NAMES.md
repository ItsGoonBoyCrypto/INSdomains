# Safe transaction — Reserved names sweep (V1 + V2)

> **List confirmed 2026-05-02 by Liam.** ~107 labels across 3 batches.
> Run before flipping `INS_V2_ENABLED=true` on the VPS so legitimate
> brand / project / exchange owners can later DM-claim their names free
> via the `ClaimReservedModal` flow on `/app`.

Send each batch on **BOTH V1 + V2** so a sniper can't side-step through V1
(which still accepts new mints from anyone — V1's `register()` was never
disabled at the contract layer; the dApp just stopped routing to it).

- **V1 Registry:** `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c`
- **V2 Registry:** `0x7E7018959bf44045F01D176D8db1594894CBf4E9`
- **Function:** `setReservedBatch(string[] labels, bool isReserved)`
- **Caller:** Treasury Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`

**3 batches × 2 registries = 6 Safe txs total.** ~10 minutes of clicking.

---

## Batch 1 — Kaspa + Igra ecosystem (62 labels)

```json
["kaspa","kasper","kaspy","kango","nacho","kspr","kasware","kastle","kasperia","kasanova","metamask","rabby","kasvault","kaspium","tangem","katscan","katbridge","krex","bite","zealous","zealousswap","zeal","kcom","moonbound","kasinvest","klaudeonkas","klaude","klaudeskills","xpolish","aiswamz","ziggy","igralock","ilock","iforge","igraforge","alphaprism","goonboy","goonboybot","profitprowler","emdin","igra","igralabs","igranetwork","igrabot","igratoken","igraprotocol","igrachain","igral2","ikas","kaskad","stonks","stonksonkas","thekaspaexperience","wolfy","wolfie","kaspakii","hyperliquid","xxim","proof","blockchainbanter","kaslens","hyperlane"]
```

## Batch 2 — Web3 + generic infra (27 labels)

```json
["usdt","tether","usdc","circle","dai","makerdao","uniswap","openai","anthropic","claude","chatgpt","grok","support","help","team","staff","system","api","app","web","site","home","mail","email","dev","dao","igradao"]
```

## Batch 3 — People + brands (18 labels)

```json
["ashton","fullface","chriscrypto","louis","ramy","coinco","skyegreen","cautiousdegen","leo","pavel","dennis","zenith","cryptoog","kaspafinance","crumpetmedia","levendi","chrishutch","tomhutch"]
```

---

## How to execute

> ⚠️ The Igra Safe rejects Transaction Builder batches with "delegate
> call is disabled". Use **Contract Interaction** (one tx per batch)
> — same workaround as the V1 price update tx.

For each batch above × each Registry (V1 then V2):

1. <https://app.safe.global> → connect to chain 38833
2. **New transaction → Contract interaction**
3. Address: `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` (V1) or `0x7E7018959bf44045F01D176D8db1594894CBf4E9` (V2)
4. Paste this minimal ABI:
   ```json
   [{"type":"function","name":"setReservedBatch","stateMutability":"nonpayable","inputs":[{"name":"labels","type":"string[]"},{"name":"isReserved","type":"bool"}],"outputs":[]}]
   ```
5. Function: `setReservedBatch`
6. `labels (string[])` — paste the JSON array from the batch above (Safe accepts JSON arrays directly)
7. `isReserved (bool)` — `true`
8. Create transaction → sign → co-signers approve → Execute
9. Repeat for the other registry

## Cast-calldata one-shot (alternative)

If you'd rather pre-compute calldata locally and paste raw hex into Safe's "Custom data" field:

```bash
# Batch 1 — Kaspa/Igra ecosystem
cast calldata 'setReservedBatch(string[],bool)' \
  '["kaspa","kasper","kaspy","kango","nacho","kspr","kasware","kastle","kasperia","kasanova","metamask","rabby","kasvault","kaspium","tangem","katscan","katbridge","krex","bite","zealous","zealousswap","zeal","kcom","moonbound","kasinvest","klaudeonkas","klaude","klaudeskills","xpolish","aiswamz","ziggy","igralock","ilock","iforge","igraforge","alphaprism","goonboy","goonboybot","profitprowler","emdin","igra","igralabs","igranetwork","igrabot","igratoken","igraprotocol","igrachain","igral2","ikas","kaskad","stonks","stonksonkas","thekaspaexperience","wolfy","wolfie","kaspakii","hyperliquid","xxim","proof","blockchainbanter","kaslens","hyperlane"]' \
  true

# Batch 2 — Web3 + generic
cast calldata 'setReservedBatch(string[],bool)' \
  '["usdt","tether","usdc","circle","dai","makerdao","uniswap","openai","anthropic","claude","chatgpt","grok","support","help","team","staff","system","api","app","web","site","home","mail","email","dev","dao","igradao"]' \
  true

# Batch 3 — People + brands
cast calldata 'setReservedBatch(string[],bool)' \
  '["ashton","fullface","chriscrypto","louis","ramy","coinco","skyegreen","cautiousdegen","leo","pavel","dennis","zenith","cryptoog","kaspafinance","crumpetmedia","levendi","chrishutch","tomhutch"]' \
  true
```

Each output blob is the calldata you paste into Safe's "Custom data" field (skip the function picker entirely). Same hex works for both V1 and V2 — only the `to` address differs.

---

## Verify after execution

```bash
# Spot-check one label per batch on each registry
for REG in 0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c 0x7E7018959bf44045F01D176D8db1594894CBf4E9; do
  for L in kaspa makerdao chriscrypto blockchainbanter; do
    echo -n "  $REG  '$L': "
    cast call $REG 'reserved(string)(bool)' "$L" \
      --rpc-url https://rpc.igralabs.com:8545
  done
done

# Or via REST API (V1 + V2 unioned automatically)
curl -s https://insdomains.org/api/reserved-labels | jq '.labels | length'
```

---

## Adding a name later

If a new project, exchange, or brand emerges that should be reserved,
just send a new `setReservedBatch(["newname"], true)` for both registries.
No need to re-run the full sweep.

## Removing a reservation

Same call, with `isReserved=false`. E.g. when a brand owner has claimed
their name via DM, you can keep the reservation (their NFT is theirs
either way) or release the unused reservations.

```bash
cast calldata 'setReservedBatch(string[],bool)' '["someoldname"]' false
```

---

## Curation notes

The list was hand-picked by Liam from a broader proposal — favours
**known Kaspa/Igra ecosystem names + people** over generic crypto brands
(no exchanges or chain tickers; those are left to the market for now).
Specifically:

- **Wallets:** kasware, kastle, kasperia, kasanova, metamask, rabby, kasvault, kaspium, tangem
- **Tools/explorers:** katscan, katbridge, krex, bite, kaslens
- **DEXes/dApps:** zealous, zealousswap, zeal, kcom, moonbound, kasinvest, kasfinance variants
- **Project family (yours):** klaudeonkas, klaude, klaudeskills, xpolish, aiswamz, ziggy, igralock, ilock, iforge, igraforge, alphaprism, goonboy, goonboybot, profitprowler
- **Igra meta:** igra, igralabs, igranetwork, igrabot, igratoken, igraprotocol, igrachain, igral2, igradao, ikas, emdin
- **KRC-20 / community:** kaspa, kasper, kaspy, kango, nacho, kspr, kaskad, stonks, stonksonkas, kaspakii, kaslens, kaspafinance
- **Cross-chain:** hyperliquid, hyperlane (you may want to add `wormhole`, `axelar`, `layerzero` later)
- **Influencers / community figures:** ashton, fullface, chriscrypto, louis, ramy, coinco, skyegreen, cautiousdegen, leo, pavel, dennis, zenith, cryptoog, crumpetmedia, levendi, chrishutch, tomhutch, wolfy, wolfie
- **Web3 essentials:** dao, web3-style brands as protective reserves
- **Top stablecoins + Anthropic/OpenAI/Uniswap/etc.:** small protective set, in case someone tries to phish

**Names NOT reserved (intentionally market-driven):** common first names
(`alice`, `bob`), exchanges, country/city names, generic English words.
