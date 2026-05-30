#!/usr/bin/env python3
"""
Watch the MetaMask snaps-registry GitHub repo for any PR mentioning
`ins-snap-resolver`, and DM @GoonBoyCrypto via Telegram on first
sighting + every state change (open -> merged / open -> closed).

Idempotent: state lives at /var/lib/ins-snap-registry-watch/seen.json
so re-runs don't double-ping.

Schedule: 4x/day via systemd timer (every 6h).
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

STATE_DIR = Path("/var/lib/ins-snap-registry-watch")
STATE_FILE = STATE_DIR / "seen.json"
CONFIG = Path("/etc/ins-health/config")
PACKAGE = "ins-snap-resolver"
PR_LIST_URL = "https://api.github.com/repos/MetaMask/snaps-registry/pulls?state=all&per_page=50&sort=created&direction=desc"
UA = "ins-snap-registry-watch/1.0 (github.com/ItsGoonBoyCrypto/INSdomains)"


def load_config():
    out = {}
    for line in CONFIG.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def http_get_json(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def telegram(text, token, chat_id):
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


def main():
    cfg = load_config()
    token = cfg["BOT_TOKEN"]
    chat = cfg["ADMIN_CHAT_ID"]

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
    else:
        state = {"seen": {}, "hello_sent": False}

    if not state.get("hello_sent"):
        telegram(
            "\U0001F441 <b>INS Snap registry watch is live.</b>\n"
            "Polling MetaMask snaps-registry every 6h for any PR mentioning "
            "<code>ins-snap-resolver</code>. You'll get a DM the moment one "
            "appears -- typical timeline 5-14 days from submission.",
            token, chat
        )
        state["hello_sent"] = True
        STATE_FILE.write_text(json.dumps(state, indent=2))

    try:
        prs = http_get_json(PR_LIST_URL)
    except Exception as e:
        print(f"github fetch failed: {e}", file=sys.stderr)
        sys.exit(1)

    for pr in prs:
        blob = (pr.get("title", "") + " " + (pr.get("body") or "")).lower()
        if PACKAGE not in blob and "ins - igra name service" not in blob:
            continue

        pr_num = str(pr["number"])
        merged = pr.get("merged_at") is not None
        new_state = "merged" if merged else pr["state"]
        prev_state = state["seen"].get(pr_num)

        if prev_state == new_state:
            continue

        author = pr["user"]["login"]
        title = pr["title"]
        url = pr["html_url"]

        if prev_state is None and new_state == "open":
            msg = (
                f"\U0001F4E8 <b>New snap-registry PR detected!</b>\n"
                f"MetaMask reviewer is processing the INS Snap submission.\n\n"
                f"<b>#{pr_num}</b>: {title}\n"
                f"by @{author}\n\n"
                f"{url}"
            )
        elif new_state == "merged":
            msg = (
                f"\U0001F389\U0001F389 <b>INS SNAP APPROVED!</b>\n\n"
                f"PR #{pr_num} merged into snaps-registry.\n"
                f"INS Snap will be live in regular MetaMask within hours.\n\n"
                f"{url}\n\n"
                f"Next steps:\n"
                f"- Verify https://snaps.metamask.io/snap/npm/ins-snap-resolver\n"
                f"- Ship the launch tweet\n"
                f"- DM wallet partners (Kasware / Kastle / Kasperia)\n"
                f"- Flip the /snap page status pill from amber to green"
            )
        elif new_state == "closed":
            msg = (
                f"⚠ <b>snap-registry PR #{pr_num} CLOSED without merge.</b>\n"
                f"Check for reviewer feedback in the PR thread.\n\n"
                f"{url}"
            )
        else:
            msg = (
                f"snap-registry PR #{pr_num} state: {prev_state} -> {new_state}\n"
                f"{url}"
            )

        if telegram(msg, token, chat):
            state["seen"][pr_num] = new_state

    STATE_FILE.write_text(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
