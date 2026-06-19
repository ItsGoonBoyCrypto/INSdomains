#!/usr/bin/env bash
# Polls INS V2 Registry for the first emoji mint (label starts with xn--).
# Writes to /tmp/.ins-emoji-mint-alerted once detected so we don't spam Liam.
#
# Baseline: V2 totalSupply = 277 at launch (block 9569348, 2026-06-19 evening).
# Any new token with label matching ^xn-- is an emoji mint.

set -euo pipefail

PATH="/c/Users/Liam/.foundry/bin:$PATH"
REGV2=0x7E7018959bf44045F01D176D8db1594894CBf4E9
RPC=https://rpc.igralabs.com:8545
BASELINE=277
MARKER=/tmp/.ins-emoji-mint-alerted

if [ -f "$MARKER" ]; then
  echo "STATUS: already_alerted"
  cat "$MARKER"
  exit 0
fi

CURRENT=$(cast call $REGV2 "totalSupply()(uint256)" --rpc-url $RPC 2>&1)
if ! [[ "$CURRENT" =~ ^[0-9]+$ ]]; then
  echo "STATUS: rpc_error"
  echo "raw: $CURRENT"
  exit 0
fi

if [ "$CURRENT" -le "$BASELINE" ]; then
  echo "STATUS: no_new_mints"
  echo "totalSupply: $CURRENT (baseline $BASELINE)"
  exit 0
fi

NEW=$((CURRENT - BASELINE))
FOUND=""
for i in $(seq $((BASELINE + 1)) "$CURRENT"); do
  LABEL=$(cast call $REGV2 "labelOf(uint256)(string)" "$i" --rpc-url $RPC 2>/dev/null || echo "")
  if [[ "$LABEL" == \"xn--* ]] || [[ "$LABEL" == xn--* ]]; then
    # Strip the cast quote wrapping if present
    CLEAN_LABEL="${LABEL#\"}"
    CLEAN_LABEL="${CLEAN_LABEL%\"}"
    OWNER=$(cast call $REGV2 "ownerOf(uint256)(address)" "$i" --rpc-url $RPC 2>/dev/null || echo "?")
    FOUND="${FOUND}token_id=${i} label=${CLEAN_LABEL} owner=${OWNER}
"
  fi
done

if [ -n "$FOUND" ]; then
  {
    echo "STATUS: emoji_mint_detected"
    echo "total_v2_supply: $CURRENT"
    echo "mints_since_launch: $NEW"
    echo "$FOUND"
  } | tee "$MARKER"
  exit 0
fi

echo "STATUS: new_mints_but_no_emoji"
echo "totalSupply: $CURRENT, new_since_launch: $NEW (all ASCII)"
