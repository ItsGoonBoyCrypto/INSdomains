#!/usr/bin/env python3
"""
Watch the MetaMask snaps-registry for the INS Snap, with THREE
independent signals so a single missed alert never silences the
launch announcement:

  1. PR signal:       any PR mentioning `ins-snap-resolver` (open → merged → closed)
  2. Registry signal: snap_id appears in the merged main registry JSON
  3. Frontend signal: https://snaps.metamask.io/snap/npm:ins-snap-resolver/ returns 200

Each signal has its own state in seen.json and fires its own Telegram alert
on first detection. Re-runs are idempotent — state file prevents double-ping
on each signal.

Schedule: 4x/day via systemd timer (every 6h).
"""

import json
import sys
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

STATE_DIR = Path("/var/lib/ins-snap-registry-watch")
STATE_FILE = STATE_DIR / "seen.json"
CONFIG = Path("/etc/ins-health/config")
PACKAGE = "ins-snap-resolver"
SNAP_ID = "npm:ins-snap-resolver"
PR_LIST_URL = "https://api.github.com/repos/MetaMask/snaps-registry/pulls?state=all&per_page=50&sort=created&direction=desc"
REGISTRY_JSON_URL = "https://raw.githubusercontent.com/MetaMask/snaps-registry/main/src/registry.json"
FRONTEND_URL = "https://snaps.metamask.io/snap/npm:ins-snap-resolver/"
UA = "ins-snap-registry-watch/2.0 (github.com/ItsGoonBoyCrypto/INSdomains)"


def load_config():
    out = {}
    for line in CONFIG.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def http_get_json(url, accept="application/json"):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def http_head_status(url):
    """Returns the HTTP status code for a GET (some hosts reject HEAD)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


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


def check_pr_signal(state, token, chat):
    """Signal 1: detect PR mentioning ins-snap-resolver + state transitions."""
    try:
        prs = http_get_json(PR_LIST_URL, "application/vnd.github+json")
    except Exception as e:
        print(f"github fetch failed: {e}", file=sys.stderr)
        return

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
                f"\U0001F389\U0001F389 <b>INS SNAP REGISTRY PR MERGED!</b>\n\n"
                f"PR #{pr_num} merged into snaps-registry/main.\n"
                f"Registry JSON should now include the snap.\n\n"
                f"{url}"
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


def check_registry_signal(state, token, chat):
    """Signal 2: registry.json on main contains our snap entry."""
    try:
        reg = http_get_json(REGISTRY_JSON_URL)
    except Exception as e:
        print(f"registry json fetch failed: {e}", file=sys.stderr)
        return

    verified = reg.get("verifiedSnaps", reg.get("verified_snaps", {}))
    in_registry = SNAP_ID in verified

    prev = state.get("registry_present")
    if prev == in_registry:
        return

    if in_registry and not prev:
        entry = verified.get(SNAP_ID, {})
        md = entry.get("metadata", {})
        name = md.get("name", "?")
        summary = md.get("summary", "")[:200]
        msg = (
            f"\U0001F389 <b>INS Snap is IN the MetaMask registry JSON!</b>\n\n"
            f"Listed as: <b>{name}</b>\n"
            f"{summary}\n\n"
            f"Snap ID: <code>{SNAP_ID}</code>\n"
            f"Any wallet pulling the verified-snaps list now sees INS.\n\n"
            f"Frontend page may take longer to deploy."
        )
        if telegram(msg, token, chat):
            state["registry_present"] = True
    elif prev and not in_registry:
        msg = (
            f"⚠ <b>INS Snap REMOVED from registry JSON.</b>\n\n"
            f"<code>{SNAP_ID}</code> no longer in verifiedSnaps on main.\n"
            f"Investigate https://github.com/MetaMask/snaps-registry/commits/main"
        )
        if telegram(msg, token, chat):
            state["registry_present"] = False


def check_frontend_signal(state, token, chat):
    """Signal 3: snaps.metamask.io serves the snap page (200)."""
    status = http_head_status(FRONTEND_URL)
    is_live = status == 200

    prev = state.get("frontend_live")
    if prev == is_live:
        return

    if is_live and not prev:
        msg = (
            f"\U0001F680 <b>INS Snap PAGE IS LIVE on snaps.metamask.io!</b>\n\n"
            f"{FRONTEND_URL}\n\n"
            f"This is the public-facing install page. Users can now click "
            f"\"Install\" directly from the MetaMask Snap Directory.\n\n"
            f"<b>This is the moment to fire the launch tweet.</b>"
        )
        if telegram(msg, token, chat):
            state["frontend_live"] = True
    elif prev and not is_live:
        msg = (
            f"⚠ <b>INS Snap page returning HTTP {status} on snaps.metamask.io.</b>\n\n"
            f"Was previously live. Frontend may be redeploying or the snap was unlisted."
        )
        if telegram(msg, token, chat):
            state["frontend_live"] = False


def main():
    cfg = load_config()
    token = cfg["BOT_TOKEN"]
    chat = cfg["ADMIN_CHAT_ID"]

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
    else:
        state = {}

    # Migrate old state format
    state.setdefault("seen", {})
    state.setdefault("hello_sent", False)
    state.setdefault("registry_present", None)
    state.setdefault("frontend_live", None)

    if not state.get("hello_sent"):
        telegram(
            "\U0001F441 <b>INS Snap registry watch is live (v2).</b>\n"
            "Now polling 3 signals every 6h: PR state, registry JSON, "
            "frontend page. You'll get a DM at each milestone.",
            token, chat
        )
        state["hello_sent"] = True
        STATE_FILE.write_text(json.dumps(state, indent=2))

    check_pr_signal(state, token, chat)
    check_registry_signal(state, token, chat)
    check_frontend_signal(state, token, chat)

    STATE_FILE.write_text(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
