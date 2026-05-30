# PR to add INS Snap to `awesome-metamask-snaps`

**Target repo:** https://github.com/piotr-roslaniec/awesome-metamask-snaps (94 stars, canonical Snaps list)
**Type:** Single-line edit to README.md
**Effort:** ~5 min via GitHub web UI (no clone needed)

## How to file (web UI only)

1. Go to https://github.com/piotr-roslaniec/awesome-metamask-snaps/blob/main/README.md
2. Click the **pencil ✏️ icon** top-right of the file
3. GitHub will fork the repo to your account automatically — accept the prompt
4. Scroll to the `Snaps` section (third-level heading near the top)
5. **Add this line** in alphabetical order (it goes between `airgap-it/tezos-metamask-snap` and `kleros/scout-snap`):

```markdown
*   [ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains/tree/main/snap) - Native `.igra` name resolution in MetaMask via INS (Igra Name Service) on Igra L2. Forward + reverse resolution, 1.3 KB bundle. - [Install](https://insdomains.org/snap) | [Demo](https://insdomains.org/snap-demo.mp4)
```

**⚠️ Format matters:** their list uses `*   ` (asterisk + 3 spaces), NOT `- `. Match the existing entries.

6. Scroll down to "Propose changes"
7. **Commit message:**
   ```
   Add INS Snap (ins-snap-resolver) — native .igra name resolution
   ```
8. **Commit description:**
   ```
   INS (Igra Name Service) Snap for native .igra name resolution in MetaMask.

   - Snap ID: npm:ins-snap-resolver
   - 1.3 KB bundle, MIT license
   - Read-only resolver (endowment:name-lookup + endowment:network-access)
   - Forward (name → address) + reverse (address → primary name) resolution
   - Multi-chain: Ethereum Mainnet + Igra L2 (chain 38833)
   - Snap Directory submission filed 2026-05-30 (pending review)
   - Threat model: https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md
   ```
9. **Select:** "Create a new branch for this commit and start a pull request"
10. **Branch name:** `add-ins-snap`
11. Click **Propose changes** → **Create pull request**
12. **PR title:** `Add INS Snap (ins-snap-resolver) — native .igra name resolution`
13. **PR description:** copy the commit description above + add `Thanks for maintaining this list!`
14. Click **Create pull request**

Done. Author (piotr-roslaniec) typically merges within a week.
