#!/usr/bin/env python3
"""
Watch the TreasurySplitter on Igra L2 for Funded + Flushed events
and DM @GoonBoyCrypto via Telegram on each one. Idempotent: state at
/var/lib/ins-splitter-watch/seen.json tracks the last block we've
processed so re-runs don't double-DM.

Schedule: every 5 minutes by default via systemd timer (frequent
enough that the first flush after a deposit pings within minutes).

Event signatures we care about (keccak256 of "Name(types)"):
  Flushed(uint256,uint256,uint256)  topic0:
    0x6c92ce8a8b9fbb495b8e6c3fc6c2e7f4f9a... (computed below)
  Funded(address,uint256)           topic0: computed below
  SplitUpdated(uint16)              topic0: computed below
  DaoUpdated(address)               topic0: computed below
"""

import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

STATE_DIR = Path("/var/lib/ins-splitter-watch")
STATE_FILE = STATE_DIR / "seen.json"
CONFIG = Path("/etc/ins-health/config")
RPC = "https://rpc.igralabs.com:8545"
SPLITTER = "0x6Da215700aca9F35714Dce20b0c09735d92282E2"
TREASURY = "0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
DAO = "0x90870B1017f3FcbB11647BF563F3c2333EA8a2c2"
EXPLORER = "https://explorer.igralabs.com"
UA = "ins-splitter-watch/1.0"

# Compute keccak256 topic hashes for the events we monitor.
# Using pysha3-style keccak (the hashlib variant in py3.9+ has sha3_256
# which is the FIPS variant, NOT keccak — Ethereum uses pre-FIPS keccak).
# Falling back to a pure-py implementation since we don't want a heavy
# dep tree on this little watcher VPS.

KECCAK_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A,
    0x8000000080008000, 0x000000000000808B, 0x0000000080000001,
    0x8000000080008081, 0x8000000000008009, 0x000000000000008A,
    0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089,
    0x8000000000008003, 0x8000000000008002, 0x8000000000000080,
    0x000000000000800A, 0x800000008000000A, 0x8000000080008081,
    0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]
KECCAK_R = [
    [0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56], [27, 20, 39, 8, 14],
]


def keccak256(data: bytes) -> bytes:
    """Pure-py Keccak-f[1600] 256-bit hash. Slow but tiny; fine for event
    selectors (run once at startup)."""
    rate = 136
    state = [[0] * 5 for _ in range(5)]
    # Pad with Keccak (pre-FIPS) padding: 0x01 ... 0x80
    pad = bytearray(data)
    pad.append(0x01)
    while len(pad) % rate != rate - 1:
        pad.append(0x00)
    pad.append(0x80)
    # Absorb
    for i in range(0, len(pad), rate):
        block = pad[i:i + rate]
        for j in range(rate // 8):
            lane = int.from_bytes(block[j * 8:j * 8 + 8], "little")
            state[j % 5][j // 5] ^= lane
        # Keccak-f
        for rc in KECCAK_RC:
            C = [state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4] for x in range(5)]
            D = [C[(x - 1) % 5] ^ ((C[(x + 1) % 5] << 1 | C[(x + 1) % 5] >> 63) & 0xFFFFFFFFFFFFFFFF) for x in range(5)]
            for x in range(5):
                for y in range(5):
                    state[x][y] ^= D[x]
            B = [[0] * 5 for _ in range(5)]
            for x in range(5):
                for y in range(5):
                    n = KECCAK_R[x][y]
                    v = state[x][y]
                    B[y][(2 * x + 3 * y) % 5] = ((v << n) | (v >> (64 - n))) & 0xFFFFFFFFFFFFFFFF if n else v
            for x in range(5):
                for y in range(5):
                    state[x][y] = B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y] & 0xFFFFFFFFFFFFFFFF)
            state[0][0] ^= rc
    # Squeeze 32 bytes
    out = bytearray()
    for j in range(4):
        lane = state[j % 5][j // 5]
        out.extend(lane.to_bytes(8, "little"))
    return bytes(out)


def topic0(sig: str) -> str:
    return "0x" + keccak256(sig.encode()).hex()


TOPIC_FLUSHED = topic0("Flushed(uint256,uint256,uint256)")
TOPIC_FUNDED = topic0("Funded(address,uint256)")
TOPIC_SPLIT_UPDATED = topic0("SplitUpdated(uint16)")
TOPIC_DAO_UPDATED = topic0("DaoUpdated(address)")
TOPIC_TREASURY_UPDATED = topic0("TreasuryUpdated(address)")


def load_config():
    out = {}
    for line in CONFIG.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def rpc(method: str, params: list):
    req = urllib.request.Request(
        RPC,
        data=json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def telegram(text: str, token: str, chat_id: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode()
    try:
        with urllib.request.urlopen(url, data=data, timeout=20) as r:
            return r.status == 200
    except Exception as e:
        print(f"telegram error: {e}", file=sys.stderr)
        return False


def fmt_ikas(wei: int) -> str:
    return f"{wei / 1e18:.6f} iKAS"


def main():
    cfg = load_config()
    token = cfg["BOT_TOKEN"]
    chat = cfg["ADMIN_CHAT_ID"]

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
    else:
        # Cold start: start watching from CURRENT block (don't replay history
        # — splitter has no history yet so this is just safer/cheaper).
        latest = int(rpc("eth_blockNumber", [])["result"], 16)
        state = {"from_block": latest, "seen_tx": [], "hello_sent": False}

    if not state.get("hello_sent"):
        telegram(
            "\U0001F441 <b>TreasurySplitter watch is live.</b>\n"
            f"Monitoring <code>{SPLITTER}</code> on Igra L2 for "
            "Funded + Flushed events. You'll get a DM on every deposit "
            "and every flush — perfect for screenshotting the first one "
            "to send to Pavel.",
            token, chat
        )
        state["hello_sent"] = True
        STATE_FILE.write_text(json.dumps(state, indent=2))

    latest = int(rpc("eth_blockNumber", [])["result"], 16)
    from_block = state.get("from_block", latest)
    if from_block >= latest:
        # Up to date; nothing to do.
        return

    # Query logs on the splitter address for blocks (from_block, latest]
    params = [{
        "fromBlock": hex(from_block + 1),
        "toBlock": hex(latest),
        "address": SPLITTER,
    }]
    logs = rpc("eth_getLogs", params)
    if "error" in logs:
        print(f"eth_getLogs error: {logs['error']}", file=sys.stderr)
        sys.exit(1)
    entries = logs.get("result", [])

    seen_tx = set(state.get("seen_tx", []))
    for log in entries:
        tx = log["txHash"] if "txHash" in log else log["transactionHash"]
        key = f"{tx}:{log['logIndex']}"
        if key in seen_tx:
            continue
        topic = log["topics"][0].lower()
        data_hex = log["data"]
        # Strip 0x then split into 32-byte words
        raw = bytes.fromhex(data_hex[2:]) if data_hex.startswith("0x") else bytes.fromhex(data_hex)
        words = [int.from_bytes(raw[i:i + 32], "big") for i in range(0, len(raw), 32)]

        if topic == TOPIC_FLUSHED.lower():
            total, to_treasury, to_dao = words[0], words[1], words[2]
            msg = (
                f"\U0001F4B0 <b>TreasurySplitter flush!</b>\n\n"
                f"Total split:  <b>{fmt_ikas(total)}</b>\n"
                f"  -> Treasury: {fmt_ikas(to_treasury)} (80%)\n"
                f"  -> DAO:      {fmt_ikas(to_dao)} (20%)\n\n"
                f"<a href=\"{EXPLORER}/tx/{tx}\">View tx on explorer</a>\n\n"
                f"Send this tx hash to Pavel so the Igra DAO multisig can confirm "
                f"receipt:\n<code>{tx}</code>"
            )
        elif topic == TOPIC_FUNDED.lower():
            # Funded(address indexed from, uint256 amount)
            # `from` is indexed -> in topics[1]; `amount` is in data
            from_addr = "0x" + log["topics"][1][-40:]
            amount = words[0] if words else 0
            msg = (
                f"\U0001F4E5 <b>TreasurySplitter received funds.</b>\n\n"
                f"From:   <code>{from_addr}</code>\n"
                f"Amount: <b>{fmt_ikas(amount)}</b>\n\n"
                f"Anyone can now call <code>flush()</code> to split this "
                f"80% to Treasury / 20% to DAO.\n\n"
                f"<a href=\"{EXPLORER}/tx/{tx}\">View tx</a>"
            )
        elif topic == TOPIC_SPLIT_UPDATED.lower():
            new_bps = words[0] if words else 0
            msg = (
                f"⚙ <b>Splitter config changed.</b>\n"
                f"New DAO share: {new_bps} bps ({new_bps / 100:.1f}%)\n"
                f"<a href=\"{EXPLORER}/tx/{tx}\">View tx</a>"
            )
        elif topic == TOPIC_DAO_UPDATED.lower():
            # dao address arg is in data (not indexed)
            new_dao = "0x" + raw.hex()[-40:] if raw else "0x" + "0" * 40
            msg = (
                f"⚙ <b>Splitter DAO recipient changed.</b>\n"
                f"New DAO: <code>{new_dao}</code>\n"
                f"<a href=\"{EXPLORER}/tx/{tx}\">View tx</a>"
            )
        elif topic == TOPIC_TREASURY_UPDATED.lower():
            new_treasury = "0x" + raw.hex()[-40:] if raw else "0x" + "0" * 40
            msg = (
                f"⚙ <b>Splitter treasury recipient changed.</b>\n"
                f"New treasury: <code>{new_treasury}</code>\n"
                f"<a href=\"{EXPLORER}/tx/{tx}\">View tx</a>"
            )
        else:
            # Unknown event (Ownership* etc); ignore to avoid noise.
            seen_tx.add(key)
            continue

        if telegram(msg, token, chat):
            seen_tx.add(key)

    state["from_block"] = latest
    state["seen_tx"] = list(seen_tx)[-1000:]  # rolling cap
    STATE_FILE.write_text(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
