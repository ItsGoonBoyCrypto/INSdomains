#!/usr/bin/env bash
#
# deploy-wildcard-l1.sh — one-shot deploy of INSWildcardL1 + env activation.
#
# Pre-requisites (do BEFORE running):
#   1. ~/.foundry-keys/wildcard-l1-deployer.json exists with funded EOA
#      (≥ 0.025 ETH on Ethereum mainnet to cover deploy gas)
#   2. ~/.foundry-keys/ccip-signer.json exists (off-chain signer EOA)
#   3. You own the ENS name (e.g. insdomains.eth) and are ready to
#      set its resolver once this script prints the wildcard address
#   4. Your L1 wallet address (will become initial owner of the wildcard)
#
# Usage (run as root on the VPS):
#   ./deploy-wildcard-l1.sh 0xYOUR_L1_WALLET_ADDRESS
#
# What it does:
#   1. Loads deployer + signer keys
#   2. Pre-flight: checks balance, addresses, RPC reachability
#   3. Runs forge script against Ethereum mainnet (--broadcast)
#   4. Extracts the deployed contract address
#   5. Appends CCIP_GATEWAY_ENABLED / SIGNER_PRIVATE_KEY / WILDCARD_L1_ADDRESS
#      to /home/insdapp/ins-dapp/.env.local
#   6. Restarts the ins-dapp systemd service
#   7. Prints the next manual steps (set ENS resolver, smoke-test)

set -euo pipefail

INS_OWNER="${1:-}"
if [[ -z "$INS_OWNER" ]]; then
  echo "usage: $0 <INS_OWNER address — your L1 wallet, becomes initial contract owner>"
  exit 1
fi
if ! [[ "$INS_OWNER" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo "INS_OWNER must be a 0x-prefixed 40-hex address"
  exit 1
fi

# Resolve paths relative to insdapp's home, regardless of who's running.
INSDAPP_HOME="/home/insdapp"
KEYS_DIR="$INSDAPP_HOME/.foundry-keys"
DEPLOYER_KEY_FILE="$KEYS_DIR/wildcard-l1-deployer.json"
SIGNER_KEY_FILE="$KEYS_DIR/ccip-signer.json"
APP_DIR="$INSDAPP_HOME/ins-dapp"
ENV_FILE="$APP_DIR/.env.local"
RPC="${ETH_MAINNET_RPC:-https://ethereum-rpc.publicnode.com}"

# Pre-flight
[[ -f "$DEPLOYER_KEY_FILE" ]] || { echo "✗ missing deployer key at $DEPLOYER_KEY_FILE"; exit 1; }
[[ -f "$SIGNER_KEY_FILE"   ]] || { echo "✗ missing signer key at $SIGNER_KEY_FILE"; exit 1; }
[[ -f "$ENV_FILE"          ]] || { echo "✗ missing env file at $ENV_FILE"; exit 1; }

# Make sure forge is on PATH (foundry installs into ~insdapp/.foundry/bin).
export PATH="$INSDAPP_HOME/.foundry/bin:$PATH"
command -v forge >/dev/null || { echo "✗ forge not on PATH"; exit 1; }
command -v cast  >/dev/null || { echo "✗ cast not on PATH"; exit 1; }

# Extract addrs + keys
DEPLOYER_ADDR=$(grep -oE '0x[a-fA-F0-9]{40}' "$DEPLOYER_KEY_FILE" | head -1)
DEPLOYER_KEY=$(grep -oE '0x[a-fA-F0-9]{64}'  "$DEPLOYER_KEY_FILE" | head -1)
SIGNER_ADDR=$(grep -oE '0x[a-fA-F0-9]{40}'   "$SIGNER_KEY_FILE"   | head -1)
SIGNER_KEY=$(grep -oE '0x[a-fA-F0-9]{64}'    "$SIGNER_KEY_FILE"   | head -1)

# Balance check
BAL_WEI=$(cast balance "$DEPLOYER_ADDR" --rpc-url "$RPC")
BAL_ETH=$(awk -v b="$BAL_WEI" 'BEGIN{printf "%.5f", b/1e18}')
ENOUGH=$(awk -v b="$BAL_ETH" 'BEGIN{print (b>=0.025)?1:0}')

echo ""
echo "================ PRE-FLIGHT ================"
echo "  INS_OWNER:      $INS_OWNER"
echo "  Deployer:       $DEPLOYER_ADDR"
echo "  Deployer bal:   $BAL_ETH ETH on Ethereum L1"
echo "  Signer:         $SIGNER_ADDR"
echo "  RPC:            $RPC"
echo "============================================"
if [[ "$ENOUGH" -ne 1 ]]; then
  echo "✗ Deployer needs ≥ 0.025 ETH on Ethereum L1 (currently $BAL_ETH)"
  echo "  Send ETH to $DEPLOYER_ADDR then re-run."
  exit 1
fi

# Run forge deploy
echo ""
echo "================ DEPLOY ================"
cd "$APP_DIR/contracts"
export PRIVATE_KEY="$DEPLOYER_KEY"
export INS_OWNER
export CCIP_GATEWAY_URL='https://insdomains.org/api/ccip/{sender}/{data}.json'
export CCIP_SIGNER_ADDR="$SIGNER_ADDR"

# Run as insdapp (owns ~/.foundry + the contracts dir). Capture output.
DEPLOY_OUT=$(sudo -u insdapp -E bash -lc "forge script script/DeployWildcardL1.s.sol --rpc-url '$RPC' --broadcast --slow 2>&1" || true)

echo "$DEPLOY_OUT" | tail -25

# Extract deployed address
WILDCARD_ADDR=$(echo "$DEPLOY_OUT" | grep -oE 'INSWildcardL1 deployed: 0x[a-fA-F0-9]{40}' | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
if [[ -z "$WILDCARD_ADDR" ]]; then
  echo ""
  echo "✗ couldn't extract wildcard address from forge output."
  echo "  Inspect the output above; if deploy succeeded, find the address and"
  echo "  finish steps manually (env update + restart)."
  exit 1
fi

# Update env file (atomic-ish: write tmp, replace)
echo ""
echo "================ ENV UPDATE ================"
sed -i '/^CCIP_GATEWAY_ENABLED=/d'      "$ENV_FILE"
sed -i '/^CCIP_SIGNER_PRIVATE_KEY=/d'   "$ENV_FILE"
sed -i '/^CCIP_WILDCARD_L1_ADDRESS=/d'  "$ENV_FILE"
{
  echo "CCIP_GATEWAY_ENABLED=true"
  echo "CCIP_SIGNER_PRIVATE_KEY=$SIGNER_KEY"
  echo "CCIP_WILDCARD_L1_ADDRESS=$WILDCARD_ADDR"
} >> "$ENV_FILE"
chown insdapp:insdapp "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "✓ env appended (3 new vars)"

# Restart service
echo ""
echo "================ RESTART ================"
systemctl restart ins-dapp
sleep 3
echo "service: $(systemctl is-active ins-dapp)"

# Done
cat <<EOF

============================================================
  ✓ WILDCARD DEPLOYED + GATEWAY LIVE
============================================================
  Wildcard L1:  $WILDCARD_ADDR
  Owner:        $INS_OWNER
  Signer:       $SIGNER_ADDR
  Gateway URL:  https://insdomains.org/api/ccip/{sender}/{data}.json

NEXT STEPS (your turn, ~3 min on app.ens.domains):
  1. Visit https://app.ens.domains/insdomains.eth
  2. Records → Resolver → Set to:
       $WILDCARD_ADDR
  3. Sign the tx (~\$5 in ETH gas)
  4. Wait ~60 seconds for ENS propagation
  5. Test in MetaMask on Ethereum mainnet:
       Send 0-value tx to: igranetwork.insdomains.eth
       MetaMask should resolve it to the V2 owner's address.

If Pavel also greenlit igra.eth:
  Repeat step 2 from igra.eth's records page with the same address.
  Both alice.igra.eth AND alice.insdomains.eth will then resolve.

After smoke-test passes:
  - cast send  $DEPLOYER_ADDR --value <leftover ETH>  → drain deployer
  - rm /home/insdapp/.foundry-keys/wildcard-l1-deployer.json  → wipe key
============================================================
EOF
