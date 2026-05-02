# Safe transaction — Reserved names sweep (V1 + V2)

> **Run before flipping `INS_V2_ENABLED=true` on the VPS.**
> Reserves the names that legitimate brand / project / exchange owners will
> later want to claim free, plus a quality-control set (slurs, generic infra
> labels). Stops day-1 sniping the moment the public V2 register flow
> opens.

Each batch reserves ~50 labels. **Send each batch on BOTH V1 and V2** so a
sniper can't side-step through V1 (which still accepts new mints from
anyone — V1's `register()` was never disabled at the contract layer; the
dApp just stopped routing to it).

- **V1 Registry:** `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c`
- **V2 Registry:** `0x7E7018959bf44045F01D176D8db1594894CBf4E9`
- **Function:** `setReservedBatch(string[] labels, bool isReserved)`
- **Selector:** `0x0a3b0a4f`
- **Caller:** Treasury Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`

## Total reservation count

**~280 labels** across 6 categories — see "How to execute" at the bottom for the click-by-click runbook.

---

## Category 1 — Kaspa + Igra ecosystem (MUST RESERVE — 60 labels)

The names of every project, wallet, dex, explorer, bot, and core dev in
the Kaspa + Igra ecosystem. These are the most valuable to protect because
the legitimate owners are people we already know and want as users.

```
kaspa
kasper
kaspy
kasdog
kango
nacho
bowzer
bubble
gibles
kbots
kasmas
koin
meow
ghostdag
dagger
kspr
kasware
kastle
kasvault
kaspium
tangem
katscan
kasplex
chainge
katbridge
zealous
zeal
kcom
moonbound
kasfun
kasinvest
klaudeonkas
klaude
klaudeskills
xpolish
aiswamz
veriai
ziggy
igralock
ilock
iforge
igraforge
alphaprism
goonboy
goonboybot
prowler
profitprowler
emdin
igra
igralabs
igranetwork
igrabot
igratoken
igraprotocol
igrachain
igral2
ikas
kaspad
kaspaprotocol
krc20
krctwenty
```

---

## Category 2 — Top exchanges (MUST RESERVE — 40 labels)

Every exchange that might list KAS / IGRA / a future INS token. Their
legal teams will demand these the moment INS gets traction.

```
binance
coinbase
kraken
okx
bybit
kucoin
mexc
gate
gateio
bitget
htx
huobi
bitfinex
gemini
bitstamp
cryptocom
bingx
lbank
bitmart
bittrex
poloniex
phemex
whitebit
cex
weex
xt
digifinex
ascendex
probit
paribu
kanga
bitkub
wazirx
coindcx
tokocrypto
upbit
bithumb
korbit
gopax
indodax
```

---

## Category 3 — Top L1 / L2 chains + native tokens (50 labels)

Tickers + names of the top 50 chains by activity. Reserving prevents
brand-confusion squats (e.g. someone minting `bitcoin.igra` to dox or
phish).

```
bitcoin
btc
ethereum
eth
solana
sol
cardano
ada
xrp
ripple
bnb
avalanche
avax
polkadot
dot
cosmos
atom
polygon
matic
arbitrum
arb
optimism
base
near
tron
trx
litecoin
ltc
monero
xmr
dogecoin
doge
aptos
apt
sui
sei
injective
inj
celestia
tia
mantle
mnt
linea
scroll
blast
zksync
zk
starknet
strk
hyperliquid
```

---

## Category 4 — Top stablecoins + DeFi protocols (50 labels)

```
usdt
tether
usdc
circle
dai
makerdao
maker
mkr
frax
lusd
gusd
pyusd
paypal
pax
tusd
usde
eurc
eurt
mim
uniswap
uni
aave
compound
curve
crv
synthetix
snx
yearn
yfi
oneinch
lido
ldo
convex
cvx
gmx
dydx
sushi
sushiswap
pancakeswap
pancake
balancer
bal
velodrome
aerodrome
pendle
morpho
eigen
eigenlayer
ethena
ena
```

---

## Category 5 — Memes + NFT brands + AI / tech (50 labels)

Top memes (current cycle), top NFT/PFP collections, top AI/tech brands.

```
pepe
shib
shiba
floki
bonk
wif
dogwifhat
popcat
mog
brett
landwolf
andy
turbo
neiro
fartcoin
goat
opensea
blur
magiceden
tensor
bayc
bored
boredape
mayc
azuki
pudgy
pudgypenguins
punks
cryptopunks
moonbirds
doodles
coolcats
openai
anthropic
claude
gpt
chatgpt
xai
grok
gemini
perplexity
huggingface
mistral
cohere
nvidia
tesla
apple
microsoft
google
meta
```

---

## Category 6 — Generic infra + Web3 essentials + slurs (30+ labels)

Generic admin/system labels that get squatted on every name service
(`admin.eth`, `root.eth`, `support.eth` were all snipped in the first 24h
on ENS). Plus the standard Web3 vocabulary (`dao`, `defi`, `wagmi`, etc.).

**Slur list deliberately omitted from this doc** — see the project-private
`docs/RESERVED_SLURS_PRIVATE.md` (not in the public repo) for the
quality-control set. The Safe call payload includes them; the doc doesn't.
You'll see them in the Transaction Builder simulation before signing.

```
admin
root
support
help
team
staff
system
api
app
web
site
home
mail
email
null
void
test
demo
dev
prod
staging
dao
defi
nft
web3
dapp
metaverse
gm
gn
wagmi
lfg
hodl
moon
degen
alpha
chad
```

---

## How to execute (Safe Web app)

> ⚠️ **Same delegatecall-guard caveat as the V1 price update tx** — the
> Safe rejects Transaction Builder batches with "delegate call is
> disabled". Use the per-batch Contract Interaction path:

1. Open <https://app.safe.global> connected to chain 38833
2. **New transaction → Contract interaction**
3. Address: `0x7E7018959bf44045F01D176D8db1594894CBf4E9` (V2)
4. Paste the ABI snippet below
5. Function: `setReservedBatch`
6. `labels (string[])` — paste **one category's array** as JSON, e.g.
   `["kaspa","kasper","kaspy",...]`. The Safe UI accepts JSON arrays
   directly in the multi-line input.
7. `isReserved (bool)` — `true`
8. Create transaction → sign → co-signers approve → Execute

Then **repeat steps 2–8 with the V1 Registry address**
`0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` for the same labels.

So **6 categories × 2 registries = 12 Safe txs total**. About 30 min of
clicking, half of which is co-signer approval time.

ABI snippet:

```json
[
  {
    "type": "function",
    "name": "setReservedBatch",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "labels", "type": "string[]" },
      { "name": "isReserved", "type": "bool" }
    ],
    "outputs": []
  }
]
```

## Cast-calldata (one-shot per category)

If you'd rather pre-compute calldata locally and paste raw hex:

```bash
# Replace the "[...]" with each category array
cast calldata 'setReservedBatch(string[],bool)' '["kaspa","kasper",...]' true
```

Output is the calldata blob you paste into the Safe Transaction Builder's
**raw data** field (skip the function picker entirely).

## Verify after execution

```bash
# Should return true for any label that was in your batch
cast call 0x7E7018959bf44045F01D176D8db1594894CBf4E9 \
  'reserved(string)(bool)' 'kaspa' \
  --rpc-url https://rpc.igralabs.com:8545

# Same on V1
cast call 0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c \
  'reserved(string)(bool)' 'kaspa' \
  --rpc-url https://rpc.igralabs.com:8545
```

Or hit the public REST API:

```bash
curl https://insdomains.org/api/reserved-labels | jq '.labels[]' | grep -i kaspa
```

## Adding a name later

If a new project, exchange, or brand emerges that should be reserved,
just send a new `setReservedBatch(["newname"], true)` for both registries.
No need to re-run the full sweep.

## Removing a reservation (free a name back to the public pool)

Same call, with `isReserved=false`. E.g. when a brand owner has claimed
their name via DM, you can either keep the reservation (it doesn't matter
— their NFT is theirs) or release any unused reserved labels.

```bash
cast calldata 'setReservedBatch(string[],bool)' '["someoldname"]' false
```

---

## Notes on the curation process

The list above is intentionally **conservative for new picks** and
**aggressive for known brands**. Heuristic used:

- **Tier 1 (always reserve)** — Kaspa/Igra ecosystem projects + people.
  These are users we actively want; protecting their names protects the
  community.
- **Tier 2 (always reserve)** — Top 40 exchanges. Their legal/comms
  teams will reach out. We want them to come to us, not find their name
  squatted.
- **Tier 3 (strongly reserve)** — Top 50 chains + 50 DeFi protocols + 50
  memes/NFTs/AI. Lower priority than 1 + 2 but still high-value.
- **Tier 4 (curated)** — Web3 vocabulary + admin/infra. The "low hanging
  fruit" squatters always grab.
- **Tier 5 (private list)** — Slurs, harmful labels. Quality control.

**Names NOT reserved:** common first names (`alice`, `bob`, etc. — too
generic to claim ownership), country names (would need every country),
city names, generic English words. These are intentionally left to the
market — they're not "claims" anyone can make a brand argument over.

**1-char + 2-char tier:** these are admin-mint-aware-only via tier price
caps if you choose. The user explicitly opted to keep 1-char publicly
mintable at 4,000 iKAS (per call 2026-05-02), so single-char Kaspa or
Igra ticker squatting is gated by price, not reservation. If you want to
also reserve specific 1-chars, add them to a category above.

---

## When this list goes stale

Refresh annually or when:
- A new top-10 chain launches
- An exchange we didn't know about lists IGRA
- A new Kaspa/Igra ecosystem project ships
- A meme cycle pumps new top-15 tokens

The team can also accept rolling reservation requests via DM — the
"Claim it free" flow already covers brand owners who find their name
squatted.
