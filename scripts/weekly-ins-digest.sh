#!/usr/bin/env bash
# Weekly INS activity digest — mints, sales, listings, holders, treasury.
#
# Outputs a clean markdown-ready report that's screenshot-friendly + paste-able
# into a tweet/TG post when the week was a good one.
#
# Scans the last 7 days of blocks on Igra L2. State-free: each run is
# self-contained (window = now - 7 days → now).

set -uo pipefail

PATH="/c/Users/Liam/.foundry/bin:$PATH"
RPC=https://rpc.igralabs.com:8545
REGV2=0x7E7018959bf44045F01D176D8db1594894CBf4E9
MKT_V2=0xd641dadd503d8beba2395cd72367cf4edaf4674f
MKT_V1=0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a
SPLITTER=0x6Da215700aca9F35714Dce20b0c09735d92282E2
TREASURY=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1

# Igra L2 ~6.5s/block → ~13,300 blocks/hour → ~319k blocks/day. 7 days ≈ 2.23M.
BLOCKS_PER_WEEK=2230000

LATEST=$(cast block-number --rpc-url $RPC 2>/dev/null)
if ! [[ "$LATEST" =~ ^[0-9]+$ ]]; then
  echo "RPC error: couldn't fetch block number"; exit 1
fi
SINCE_BLOCK=$((LATEST - BLOCKS_PER_WEEK))
[ $SINCE_BLOCK -lt 0 ] && SINCE_BLOCK=0

# Topic hashes
TRANSFER_TOPIC=$(cast keccak "Transfer(address,address,uint256)")
SALE_TOPIC=$(cast keccak "ListingSold(uint256,address,address,uint256,uint256)")
LISTED_TOPIC=$(cast keccak "ListingCreated(uint256,address,uint256,uint256,bool)")
CANCEL_TOPIC=$(cast keccak "ListingCancelled(uint256,address)")
FLUSHED_TOPIC=$(cast keccak "Flushed(uint256,uint256)")

# Helper — count events on an address in the window, chunked at 100k blocks
count_events() {
  local addr=$1
  local topic=$2
  local from=$SINCE_BLOCK
  local total=0
  while [ $from -lt $LATEST ]; do
    local to=$((from + 99999))
    [ $to -gt $LATEST ] && to=$LATEST
    local c=$(cast logs --from-block $from --to-block $to --address "$addr" "$topic" --rpc-url $RPC 2>/dev/null | grep -c "^- address")
    total=$((total + c))
    from=$((to + 1))
  done
  echo $total
}

# Helper — collect raw log JSON for an address+topic in the window
get_logs_json() {
  local addr=$1
  local topic=$2
  local from=$SINCE_BLOCK
  while [ $from -lt $LATEST ]; do
    local to=$((from + 99999))
    [ $to -gt $LATEST ] && to=$LATEST
    cast logs --from-block $from --to-block $to --address "$addr" "$topic" --rpc-url $RPC --json 2>/dev/null || true
    from=$((to + 1))
  done
}

SUPPLY_V2_NOW=$(cast call $REGV2 "totalSupply()(uint256)" --rpc-url $RPC 2>/dev/null || echo 0)
TREASURY_BAL=$(cast balance $TREASURY --rpc-url $RPC --ether 2>/dev/null || echo 0)
SPLITTER_BAL=$(cast balance $SPLITTER --rpc-url $RPC --ether 2>/dev/null || echo 0)
REG_BAL=$(cast balance $REGV2 --rpc-url $RPC --ether 2>/dev/null || echo 0)

# Mints — V2 Transfer with from = 0x0
MINT_DATA=$(get_logs_json $REGV2 "$TRANSFER_TOPIC" | python -c "
import sys, json
mints = []
for line in sys.stdin:
    line = line.strip()
    if not line.startswith('['): continue
    try:
        arr = json.loads(line)
        for L in arr:
            topics = L.get('topics', [])
            if len(topics) >= 4 and topics[1] == '0x0000000000000000000000000000000000000000000000000000000000000000':
                token_id = int(topics[3], 16)
                to_addr = '0x' + topics[2][-40:]
                mints.append((token_id, to_addr))
    except: pass
print(f'{len(mints)}|' + ','.join([f'{t}:{a}' for t,a in mints[:200]]))
")
MINT_COUNT=$(echo "$MINT_DATA" | cut -d'|' -f1)
MINT_SAMPLE=$(echo "$MINT_DATA" | cut -d'|' -f2)

# For each mint, classify emoji vs ASCII
EMOJI_COUNT=0
ASCII_COUNT=0
UNIQUE_BUYERS=""
if [ -n "$MINT_SAMPLE" ]; then
  IFS=',' read -ra TOKENS <<< "$MINT_SAMPLE"
  for entry in "${TOKENS[@]}"; do
    tid="${entry%%:*}"
    addr="${entry##*:}"
    [ -z "$tid" ] && continue
    label=$(cast call $REGV2 "labelOf(uint256)(string)" $tid --rpc-url $RPC 2>/dev/null || echo "")
    label=$(echo "$label" | tr -d '"')
    if [[ "$label" == xn--* ]]; then
      EMOJI_COUNT=$((EMOJI_COUNT + 1))
    else
      ASCII_COUNT=$((ASCII_COUNT + 1))
    fi
    UNIQUE_BUYERS="$UNIQUE_BUYERS $addr"
  done
fi
UNIQUE_BUYER_COUNT=$(echo $UNIQUE_BUYERS | tr ' ' '\n' | sort -u | grep -c "^0x" 2>/dev/null || echo 0)

# Sales — ListingSold on V1 + V2
SALE_STATS=$({ get_logs_json $MKT_V2 "$SALE_TOPIC"; get_logs_json $MKT_V1 "$SALE_TOPIC"; } | python -c "
import sys, json
total_count, total_volume, top_price, top_id = 0, 0, 0, None
for line in sys.stdin:
    line = line.strip()
    if not line.startswith('['): continue
    try:
        arr = json.loads(line)
        for L in arr:
            topics = L.get('topics', [])
            data = L.get('data', '')
            if len(topics) >= 4 and len(data) >= 130:
                token_id = int(topics[1], 16)
                price = int(data[2:66], 16)
                total_count += 1
                total_volume += price
                if price > top_price:
                    top_price = price; top_id = token_id
    except: pass
print(f'{total_count}|{total_volume}|{top_price}|{top_id or 0}')
")
SALE_COUNT=$(echo "$SALE_STATS" | cut -d'|' -f1)
SALE_VOLUME_WEI=$(echo "$SALE_STATS" | cut -d'|' -f2)
TOP_SALE_WEI=$(echo "$SALE_STATS" | cut -d'|' -f3)
TOP_SALE_TOKEN=$(echo "$SALE_STATS" | cut -d'|' -f4)
SALE_VOLUME_IKAS=$(python -c "print(round(${SALE_VOLUME_WEI:-0} / 10**18, 2))" 2>/dev/null || echo 0)
TOP_SALE_IKAS=$(python -c "print(round(${TOP_SALE_WEI:-0} / 10**18, 2))" 2>/dev/null || echo 0)

# Listings + cancels
LISTED_V2=$(count_events $MKT_V2 "$LISTED_TOPIC")
LISTED_V1=$(count_events $MKT_V1 "$LISTED_TOPIC")
LISTED_TOTAL=$((LISTED_V2 + LISTED_V1))
CANCEL_COUNT=$(count_events $MKT_V2 "$CANCEL_TOPIC")

# Active listings via API
ACTIVE_LISTINGS=$(curl -sS "https://insdomains.org/api/marketplace/listings?tld=igra" --max-time 15 2>/dev/null | python -c "
import json, sys
try:
    d = json.load(sys.stdin)
    ll = d.get('listings', d.get('listing', []))
    print(len(ll))
except:
    print(0)
" 2>/dev/null || echo 0)

# Flushes from splitter
FLUSH_COUNT=$(count_events $SPLITTER "$FLUSHED_TOPIC")

# Output
echo "═══════════════════════════════════════════════"
echo "  INS WEEKLY DIGEST"
echo "  $(date '+%Y-%m-%d %H:%M %Z') — Igra L2 mainnet"
echo "  Window: blocks $SINCE_BLOCK → $LATEST (~7 days)"
echo "═══════════════════════════════════════════════"
echo ""
echo "📊 MINTS"
echo "   V2 totalSupply now:   $SUPPLY_V2_NOW"
echo "   New mints this week:  $MINT_COUNT"
echo "     ├─ Emoji mints:     $EMOJI_COUNT"
echo "     └─ ASCII mints:     $ASCII_COUNT"
echo "   Unique buyers:        $UNIQUE_BUYER_COUNT"
echo ""
echo "💰 SALES"
echo "   Sold this week:       $SALE_COUNT"
echo "   Volume:               $SALE_VOLUME_IKAS iKAS"
if [ "${TOP_SALE_TOKEN:-0}" != "0" ]; then
  TOP_LABEL=$(cast call $REGV2 "labelOf(uint256)(string)" $TOP_SALE_TOKEN --rpc-url $RPC 2>/dev/null | tr -d '"' || echo "?")
  echo "   Top sale:             $TOP_SALE_IKAS iKAS — #$TOP_SALE_TOKEN ($TOP_LABEL)"
fi
echo ""
echo "📋 LISTINGS"
echo "   New listings:         $LISTED_TOTAL"
echo "   Cancellations:        $CANCEL_COUNT"
echo "   Active right now:     $ACTIVE_LISTINGS"
echo ""
echo "🏛 TREASURY"
echo "   Treasury Safe:        $TREASURY_BAL iKAS"
echo "   Registry V2 pending:  $REG_BAL iKAS  (awaiting withdraw)"
echo "   Splitter held:        $SPLITTER_BAL iKAS"
echo "   DAO flushes this wk:  $FLUSH_COUNT"
echo ""
echo "═══════════════════════════════════════════════"
