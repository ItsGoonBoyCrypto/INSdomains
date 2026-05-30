# MetaMask Snap Directory Submission Plan

**Goal:** Get `ins-snap-resolver` allowlisted in the MetaMask Snap Directory so it installs in regular MetaMask (not just Flask).

**Submission form:** https://go.metamask.io/snaps-directory-request

**Estimated time to fill:** 15 minutes once screenshots + demo video are captured.

**Estimated approval time:** 5-14 days. Two MetaMask reviewers must approve.

**Audit required:** No. We use `endowment:name-lookup` + `endowment:network-access` only — no key-management methods.

---

## Form fields (copy-paste ready)

### Identity

| Field | Value |
|---|---|
| **Snap name** | `INS - Igra Name Service` |
| **Snap ID** | `npm:ins-snap-resolver` |
| **Snap version** | `0.1.0` |
| **Category** | `name resolution` |

### Builder info

| Field | Value |
|---|---|
| **Builder / author name** | `Igra Name Service (INS)` |
| **Builder website** | `https://insdomains.org` |
| **Snap website** | `https://insdomains.org/snap` |
| **Repository (source code)** | `https://github.com/ItsGoonBoyCrypto/INSdomains/tree/main/snap` |
| **npm package URL** | `https://www.npmjs.com/package/ins-snap-resolver` |

### Support / contact

| Field | Value |
|---|---|
| **Customer support contact** | `GoonBoyCrypto@gmail.com` |
| **FAQ URL** | `https://insdomains.org/snap#faq` |
| **Knowledge base / docs** | `https://insdomains.org/snap-help` *(dedicated user help center — 14 sections, install through glossary)* |
| **X / Twitter** | `https://x.com/IgraNameService` |
| **Discord / community** | _(leave blank or use X DM)_ |

### Descriptions

**Short summary** (~80 chars, shows on the snap card):

```
Resolve .igra names natively in MetaMask — no copy-paste, no extension switching.
```

**Long description** (plain text, no HTML — appears on the snap detail page):

```
INS (Igra Name Service) maps human-readable names to wallet addresses on Igra Network, the L2 built on Kaspa. Once installed, this Snap lets you type any .igra name (like alice.igra) directly into the MetaMask recipient field and it resolves natively — no copy-pasting addresses, no switching extensions, no need to also own a .eth name.

Forward resolution (name to address) and reverse resolution (address to primary .igra name) both work out of the box. The Snap calls the public INS REST API (insdomains.org/api/resolve and /api/reverse), which unions reads across INS V1 and V2 registries on Igra L2 (chain ID 38833). All requests are read-only — the Snap never signs, never accesses keys, never manages accounts.

Currently enabled on Ethereum Mainnet (chain ID 1) and Igra L2 (chain ID 38833). The Snap bundle is 1.3 KB minified. Source is MIT-licensed and fully open on GitHub.

Use cases:
- Send tokens to a friend by their .igra name on either chain
- See who owns a wallet at a glance via reverse lookup
- Integrate INS resolution into any dapp without adding a separate SDK
```

### Audit documentation

| Field | Value |
|---|---|
| **Third-party audit** | _Leave blank or write "Not required — no key-management methods used (see SECURITY.md)"_ |
| **Internal security review** | `https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md` |

---

## Asset checklist — what you need to capture before submitting

### ✅ Already prepared (URLs ready to paste)

- [x] **Hero image** — https://insdomains.org/api/snap-launch-image?size=4k *(3840×2160, 925KB PNG)*
- [x] **Snap landing page** — https://insdomains.org/snap *(with FAQ section at /snap#faq)*
- [x] **README** — https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/README.md
- [x] **SECURITY.md** — https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md
- [x] **npm published page** — https://www.npmjs.com/package/ins-snap-resolver

### 🎬 Need to capture from MetaMask Flask (~10 minutes)

#### 3 screenshots (PNG, 1280px+ wide each)

**Screenshot 1: Install confirmation dialog**
1. Open Chrome
2. Visit https://insdomains.org/snap
3. Click the big "Install INS Snap" button
4. When Flask popup appears, use Windows Snipping Tool (`Win + Shift + S` → rectangle mode) to capture the full popup
5. Save as `screenshot-1-install.png`

**Screenshot 2: Snap settings / installed state**
1. In Flask, click the menu (☰) → **Settings → Snaps**
2. Scroll to find "INS - Igra Name Service"
3. Click into the snap to see its permission summary
4. Screenshot the entire snap detail panel showing the permissions list
5. Save as `screenshot-2-permissions.png`

**Screenshot 3: Resolution in action**
1. In Flask, make sure network is `Ethereum Mainnet`
2. Click `Send`
3. In the recipient field, type `igranetwork.igra`
4. Wait ~1 second for the snap to resolve
5. Screenshot the Send screen showing both the typed name AND the resolved address below it
6. Save as `screenshot-3-resolution.png`

#### 1 demo video (15-60 seconds, .mp4 preferred)

**Recording tool:** Windows Game Bar (`Win + G` → record screen icon) or [OBS Studio](https://obsproject.com)

**Shot list (target: ~30 seconds):**
1. (0-3s) Show https://insdomains.org/snap landing page in Chrome
2. (3-7s) Click "Install INS Snap" → Flask popup opens
3. (7-12s) Click through "Connect" → "Install" → "OK" in Flask
4. (12-15s) Briefly show the success message on the install page
5. (15-20s) Open Flask, click Send
6. (20-26s) Type `igranetwork.igra` — show the resolved address appearing
7. (26-30s) Hover/select the resolved address to make it obvious

**Optional caption text overlay** for each step (most screen recorders support this):
- "1. Visit insdomains.org/snap"
- "2. Click Install"
- "3. Approve in Flask"
- "4. Open Send"
- "5. Type alice.igra"
- "6. Resolved natively!"

Save as `demo-ins-snap.mp4`. Keep under 10MB if the form has a size limit.

---

## Pre-submission checklist

Before hitting submit, verify each of these:

- [ ] `https://insdomains.org/snap` loads and the install button works in Flask
- [ ] `https://insdomains.org/snap#faq` jumps to the FAQ section
- [ ] `https://www.npmjs.com/package/ins-snap-resolver` shows version `0.1.0`
- [ ] `package.json` version matches `snap.manifest.json` version (both should be `0.1.0`)
- [ ] GitHub repo is public and `snap/` directory shows README + SECURITY.md
- [ ] Snap installs cleanly in Flask via the public install page (do one fresh install test)
- [ ] Resolution test passes: `igranetwork.igra` resolves to `0x7447F0e5...07aA1`
- [ ] Reverse resolution test passes: `0x7447F0e5...07aA1` → `insdomains.igra`
- [ ] Both screenshots and demo video are captured + saved locally

---

## What happens after submission

1. **MetaMask team triages** — typically within 1-3 business days. They may reach out via the support contact (your Gmail) if anything is missing.

2. **Review process** — two MetaMask reviewers independently check:
   - Code quality + permission scope (matches what's documented)
   - Description accuracy
   - Website + supporting materials live as claimed
   - Snap installs + works in fresh Flask
   - No obvious malicious patterns

3. **Approval** — when both reviewers approve, a PR lands in [snaps-registry](https://github.com/MetaMask/snaps-registry) adding our entry to `src/registry.json`. The PR gets merged → snap is live in regular MetaMask within ~24 hours of merge.

4. **Distribution announcement** — once approved, the snap appears at https://snaps.metamask.io. We can then ship the "now in regular MetaMask" tweet + DM wallet partners (Kasware, Kastle, etc.) about resolution working natively for their users.

---

## If they ask for changes

Common reviewer asks + how we'll respond:

| Feedback | Response |
|---|---|
| "Add a category" | Already on form: `name resolution` |
| "Add a privacy policy" | Add a section to `/snap` page if requested; for a read-only resolver with no telemetry, statement is "INS Snap does not collect, store, or share user data beyond the temporary HTTP request to insdomains.org for the name being resolved." |
| "Audit required" | Politely point out we use no key-management methods (per [allowlisting guide](https://docs.metamask.io/snaps/how-to/get-allowlisted/)) |
| "Add error UX" | The snap returns null on any failure, which causes MetaMask to display the raw typed text — by-design fail-closed behavior |
| "Pin the version" | Already pinned via npm + shasum in `snap.manifest.json` |

---

## Reference snaps (look how Celestials + HemiNames are structured)

Both of these are name-resolution snaps already in the directory — use them as templates if anything is unclear:

- **Celestials** (`.i` names) — https://snaps.metamask.io/snap/npm/celestials-id/celestials-snap
- **HemiNames** (`.hemi` names by Unstoppable Domains) — https://snaps.metamask.io/snap/npm/getheminames_resolver

Both use the same `endowment:name-lookup` + `endowment:network-access` pattern we do.
