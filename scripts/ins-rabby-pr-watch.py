#!/usr/bin/env python3
"""
Watch RabbyHub/Rabby PR #3826 (INS .igra integration) for ANY change,
DM Liam via Telegram on each transition. Same skeleton as
/usr/local/bin/ins-snap-registry-watch.py — separate state file so
the two watchers don't collide.

Signals tracked:

  1. PR state       — open / merged / closed
  2. Head commit    — new commits pushed to the PR branch
  3. Issue comments — top-level thread comments (reviews reply, etc.)
  4. Review comments — inline code-review comments
  5. Requested reviewers — someone gets tagged for review
  6. Labels — new label added or removed (queue movement signal)

Each of these has its own state field in seen.json; a change fires
one Telegram message and updates state. Idempotent — re-runs never
double-ping.

Schedule: every 30 min via systemd timer. GitHub public rate limit
is 60 req/hour unauth; this hits ~5 endpoints per run → 10/hour, way
under the ceiling.
"""

import json
import sys
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

STATE_DIR = Path("/var/lib/ins-rabby-pr-watch")
STATE_FILE = STATE_DIR / "seen.json"
CONFIG = Path("/etc/ins-health/config")

PR_NUM = 3826
REPO = "RabbyHub/Rabby"
PR_URL           = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUM}"
ISSUE_COMMENTS_URL = f"https://api.github.com/repos/{REPO}/issues/{PR_NUM}/comments?per_page=100"
REVIEW_COMMENTS_URL = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUM}/comments?per_page=100"
PR_HTML_URL = f"https://github.com/{REPO}/pull/{PR_NUM}"

UA = "ins-rabby-pr-watch/1.0 (github.com/ItsGoonBoyCrypto/INSdomains)"


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


def check_pr_state(state, token, chat):
    """PR state + head commit + requested reviewers + labels."""
    try:
        pr = http_get_json(PR_URL)
    except Exception as e:
        print(f"pr fetch failed: {e}", file=sys.stderr)
        return

    # State transitions
    merged = pr.get("merged_at") is not None
    new_state = "merged" if merged else pr["state"]
    prev_state = state.get("pr_state")
    if prev_state != new_state:
        if prev_state is None:
            # First run — just record, don't ping (hello covers it).
            state["pr_state"] = new_state
        else:
            if new_state == "merged":
                msg = (
                    f"\U0001F389\U0001F389 <b>RABBY PR #{PR_NUM} MERGED!</b>\n\n"
                    f".igra resolution now native in Rabby.\n\n"
                    f"{PR_HTML_URL}\n\n"
                    f"Next: ship the launch tweet + DM Kastle/Kasware for their pipelines."
                )
            elif new_state == "closed":
                msg = (
                    f"⚠ <b>RABBY PR #{PR_NUM} CLOSED without merge.</b>\n\n"
                    f"Check reviewer feedback:\n{PR_HTML_URL}"
                )
            else:
                msg = f"Rabby PR #{PR_NUM} state: {prev_state} → {new_state}\n{PR_HTML_URL}"
            if telegram(msg, token, chat):
                state["pr_state"] = new_state

    # Head commit — someone pushed
    head_sha = pr["head"]["sha"]
    prev_sha = state.get("head_sha")
    if prev_sha and prev_sha != head_sha:
        msg = (
            f"\U0001F4E4 <b>Rabby PR #{PR_NUM}: new commits pushed</b>\n\n"
            f"<code>{prev_sha[:7]}</code> → <code>{head_sha[:7]}</code>\n\n"
            f"Someone (maintainer? maybe rebasing us?) pushed to the branch.\n"
            f"{PR_HTML_URL}/files"
        )
        if telegram(msg, token, chat):
            state["head_sha"] = head_sha
    elif not prev_sha:
        state["head_sha"] = head_sha  # record silently

    # Requested reviewers — assignment signal
    reviewers = sorted([r["login"] for r in pr.get("requested_reviewers", [])])
    prev_reviewers = state.get("requested_reviewers", [])
    if reviewers != prev_reviewers and reviewers:
        newly = [r for r in reviewers if r not in prev_reviewers]
        if newly:
            msg = (
                f"\U0001F449 <b>Rabby PR #{PR_NUM}: reviewer(s) assigned</b>\n\n"
                f"Now requesting: {', '.join('@'+r for r in newly)}\n\n"
                f"This is the movement signal — someone at Rabby is picking it up.\n"
                f"{PR_HTML_URL}"
            )
            if telegram(msg, token, chat):
                state["requested_reviewers"] = reviewers

    # Labels — queue movement signal
    labels = sorted([l["name"] for l in pr.get("labels", [])])
    prev_labels = state.get("labels", [])
    if labels != prev_labels:
        added = [l for l in labels if l not in prev_labels]
        removed = [l for l in prev_labels if l not in labels]
        parts = []
        if added:   parts.append("+ " + ", ".join(added))
        if removed: parts.append("− " + ", ".join(removed))
        if parts:
            msg = (
                f"\U0001F3F7 <b>Rabby PR #{PR_NUM}: labels changed</b>\n\n"
                f"{' · '.join(parts)}\n\n"
                f"{PR_HTML_URL}"
            )
            if telegram(msg, token, chat):
                state["labels"] = labels


def check_new_comments(state, token, chat):
    """New top-level issue comments (the review-reply thread)."""
    try:
        comments = http_get_json(ISSUE_COMMENTS_URL)
    except Exception as e:
        print(f"issue comments fetch failed: {e}", file=sys.stderr)
        return

    seen_ids = set(state.get("seen_issue_comment_ids", []))
    new = [c for c in comments if c["id"] not in seen_ids]
    if not new:
        return

    # First run — record all, don't ping (hello covers it)
    if not seen_ids:
        state["seen_issue_comment_ids"] = [c["id"] for c in comments]
        return

    for c in new:
        author = c["user"]["login"]
        # Skip our own comments — no need to ping ourselves
        if author.lower() == "itsgoonboycrypto":
            seen_ids.add(c["id"])
            continue

        body = c["body"]
        preview = body[:400] + ("…" if len(body) > 400 else "")
        # HTML-escape for Telegram HTML mode
        preview = preview.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        msg = (
            f"\U0001F4AC <b>Rabby PR #{PR_NUM}: new comment from @{author}</b>\n\n"
            f"{preview}\n\n"
            f"{c['html_url']}"
        )
        if telegram(msg, token, chat):
            seen_ids.add(c["id"])

    state["seen_issue_comment_ids"] = sorted(seen_ids)


def check_new_review_comments(state, token, chat):
    """New inline review comments (code-level feedback)."""
    try:
        comments = http_get_json(REVIEW_COMMENTS_URL)
    except Exception as e:
        print(f"review comments fetch failed: {e}", file=sys.stderr)
        return

    seen_ids = set(state.get("seen_review_comment_ids", []))
    new = [c for c in comments if c["id"] not in seen_ids]
    if not new:
        return

    if not seen_ids:
        state["seen_review_comment_ids"] = [c["id"] for c in comments]
        return

    for c in new:
        author = c["user"]["login"]
        if author.lower() == "itsgoonboycrypto":
            seen_ids.add(c["id"])
            continue

        body = c["body"]
        preview = body[:300] + ("…" if len(body) > 300 else "")
        preview = preview.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        path = c.get("path", "?")
        msg = (
            f"\U0001F50D <b>Rabby PR #{PR_NUM}: inline review from @{author}</b>\n\n"
            f"<code>{path}</code>\n\n"
            f"{preview}\n\n"
            f"{c['html_url']}"
        )
        if telegram(msg, token, chat):
            seen_ids.add(c["id"])

    state["seen_review_comment_ids"] = sorted(seen_ids)


def main():
    cfg = load_config()
    token = cfg["BOT_TOKEN"]
    chat = cfg["ADMIN_CHAT_ID"]

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    state.setdefault("hello_sent", False)

    if not state["hello_sent"]:
        telegram(
            "\U0001F441 <b>Rabby PR #3826 watcher is live.</b>\n\n"
            "Polling every 30 min for any change: new comments, "
            "review activity, reviewer assignment, merge/close, "
            "label movement. First ping fires the moment ANY human "
            "touches the PR after Liam's 2026-07-06 nudge.\n\n"
            "PR: https://github.com/RabbyHub/Rabby/pull/3826",
            token, chat
        )
        state["hello_sent"] = True
        STATE_FILE.write_text(json.dumps(state, indent=2))

    check_pr_state(state, token, chat)
    check_new_comments(state, token, chat)
    check_new_review_comments(state, token, chat)

    STATE_FILE.write_text(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
