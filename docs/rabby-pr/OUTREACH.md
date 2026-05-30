# Rabby Team Outreach

## X / Twitter DM to @Rabby_io

```
Hey Rabby team — built a small PR (~80 lines, 4 files) adding .igra name 
resolution from Igra Name Service to Rabby's send screen.

Same pattern as your RNS integration last month (PR #3544).

INS is live on MetaMask via our Snap (insdomains.org/snap) and our
.insdomains.eth wildcard CCIP-Read resolver works in MetaMask + Coinbase 
Wallet — but Rabby's ENS resolver doesn't follow OffchainLookup reverts, 
so we wrote a small native INS service instead.

Read-only REST call, zero key access, fails closed. Full security write-up 
at https://insdomains.org/snap-help

Would love a chance to get this in front of your reviewers. Happy to 
adjust to any concerns. PR going up shortly at github.com/RabbyHub/Rabby

Cheers — @GoonBoyCrypto
```

## Email backup

If you find a Rabby team email (their docs page, GitHub bio, or DeBank Discord):

Subject: `Small PR for .igra name resolution in Rabby send flow`

Body:
```
Hi Rabby team,

I've prepared a small pull request (~80 lines across 4 files) adding 
support for resolving .igra names — Igra Name Service, the canonical 
naming system for Igra Network (EVM L2 on Kaspa BlockDAG, chain ID 38833).

The PR mirrors the exact architecture pattern of your RNS integration 
(PR #3544 by ahsan-javaiid):

  src/background/service/insService.ts        — 50 lines NEW (REST client)
  src/background/service/index.ts             — 1 line  (barrel export)
  src/background/controller/wallet.ts         — 8 lines (method)
  src/ui/views/SelectToAddress/EnterAddress.tsx — 12 lines (tag + fallback)

Read-only HTTPS call to our public REST API. Zero private key access. 
Fails closed (any error returns null and falls back to RNS / ENS / 
direct-address paths). No regression risk on existing flows.

Background:
- INS has 150+ names registered on Igra mainnet
- We just shipped a MetaMask Snap (npm:ins-snap-resolver, directory 
  submission filed today, awaiting allowlist)
- We also have a CCIP-Read wildcard resolver on insdomains.eth, but 
  Rabby's ENS resolver doesn't currently follow OffchainLookup reverts, 
  which is why a direct integration is the cleanest path for Rabby users

Happy to address any feedback on architecture, security, or test coverage 
before merge. The PR description is at github.com/ItsGoonBoyCrypto/INSdomains 
(see docs/rabby-pr/).

Thanks for considering!

Liam (@GoonBoyCrypto on X)
GoonBoyCrypto@gmail.com
https://insdomains.org
```

## How to file the PR

1. Fork `RabbyHub/Rabby` to your GitHub account
2. Clone your fork locally (or use GitHub web UI for inline edits)
3. Create branch `feat/ins-igra-name-resolution`
4. Apply the 4 file changes from `docs/rabby-pr/`:
   - Create new file: `src/background/service/insService.ts` (copy from `insService.ts`)
   - Edit `src/background/service/index.ts` per `index.ts.diff`
   - Edit `src/background/controller/wallet.ts` per `wallet.ts.diff`
   - Edit `src/ui/views/SelectToAddress/components/EnterAddress.tsx` per `EnterAddress.tsx.diff`
5. Commit with message: `feat: add .igra (INS) name resolution to send flow`
6. Push branch + open PR against `RabbyHub/Rabby:master`
7. Paste `PR-DESCRIPTION.md` as the PR body
8. Tag `@cs1707 @vvvvvv1vvvvvv` in the description (the reviewers who looked at PR #3544)

If you'd rather I do this for you, I can spin up a Rabby fork on my end 
and prep the PR — but you'd still need to push it from your GitHub account 
or transfer ownership.
