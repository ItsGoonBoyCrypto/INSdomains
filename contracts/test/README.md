# INSdomains test suite

A reference Foundry test suite for an ENS-style name service deployed on
Igra L2. **170 tests, 0 failures, 4 fuzz suites at 256 runs each.**

If you're a wallet integrator, an Igra dev shipping your own naming layer,
or any Solidity developer building NFT-domain primitives, this is meant to
double as a worked example. The patterns here generalise: tiered pricing,
zero-custody marketplace fee math, custom-error ergonomics, namehash-keyed
resolvers, opt-in reverse resolution.

---

## Running locally

```bash
cd contracts
forge install                          # first run only
forge test -vvv                        # all suites
```

Faster targeted runs:

```bash
forge test --match-contract INSRegistryTest          -vv
forge test --match-contract INSMarketplaceTest       -vv
forge test --match-contract INSResolverTest          -vv
forge test --match-contract IntegrationTest          -vv
forge test --match-contract INSReverseResolverTest   -vv
forge test --match-contract INSSubnameExtensionTest  -vv

# Just the fuzz tests (slow, broader coverage)
forge test --match-test "^testFuzz" --fuzz-runs 512 -v

# Gas profile for a single function
forge test --match-test test_lifecycle_register_resolve_list_sell --gas-report
```

Watch mode is handy while editing:

```bash
forge test --watch -vv
```

---

## Suite breakdown

| File                           | Contract under test    | Tests | Notes                                                                  |
|--------------------------------|------------------------|-------|------------------------------------------------------------------------|
| `INSRegistry.t.sol`            | `INSRegistry`          | 55    | Tiered pricing, reserved names, ERC-721, admin, fuzz                   |
| `INSMarketplace.t.sol`         | `INSMarketplace`       | 43    | Zero-custody flow, fee math fuzz, reentrancy, receiver-rejection       |
| `INSReverseResolver.t.sol`     | `INSReverseResolver`   | 12    | Opt-in `setPrimary`, stale-safe reads, ownership-follow                |
| `INSSubnameExtension.t.sol`    | `INSSubnameExtension`  | 27    | Subname mint/lock/transfer (feature-flagged off until v1.1)            |
| `INSRegistryTldVariants.t.sol` | `INSRegistryIgra/Ikas` | 6     | TLD-suffix variants share the same Registry behaviour                  |
| `INSResolver.t.sol`            | `INSResolver`          | 18    | **Forward `addr()` + text records, fuzz round-trip on (key, value)**   |
| `Integration.t.sol`            | (cross-contract)       | 9     | **End-to-end UX flows: register → resolve → list → sell → rebrand**    |
| `BaseTest.sol`                 | —                      | —     | Shared fixtures, helpers, mock receivers                               |

The bottom three are new in this scaffold — the others are the existing
hardened battery shipped before mainnet.

---

## Things this suite catches that obvious tests don't

A handful of bugs / footguns these tests are designed to surface. Worth
copying the pattern even if your contracts are different shapes:

1. **Stale resolver target after sale.** `Integration.t.sol::test_lifecycle_register_resolve_list_sell`
   verifies that a marketplace fill does NOT update `Registry.targetOf`
   automatically. The new owner has to call `setTarget` themselves; the
   test enforces this by asserting `addr(node) == previousTarget` between
   the buy and the explicit `setTarget` call. Wallets need to surface
   this in their UX.

2. **Approval-revoke race.** `Integration.t.sol::test_revokingApproval_killsThePendingListing`
   pins the actual user-visible revert when a seller revokes approval
   between listing and fill. It bubbles up from the Registry as
   `NotAuthorized`, NOT from the Marketplace as `NotApproved`. If you're
   matching custom errors in a frontend, you'll want both selectors.

3. **Cancel always available under pause.** `Integration.t.sol::test_marketplacePaused_sellersCanStillCancel`
   asserts the kill-switch can't trap sellers. This is the kind of
   property an audit checklist will look for.

4. **Refund-on-overpay accounting.** `INSRegistry.t.sol` fuzzes a
   register-with-overpay flow against a balance-delta assertion — catches
   any drift in the refund branch under arbitrary inputs.

5. **Reentry on `createListing` AND `buyListing`.** Both paths are
   guarded with `nonReentrant`; the marketplace tests include attack
   contracts that try to nest.

6. **Stale-safe primary reverse.** `INSReverseResolver.t.sol` covers the
   case where the user transferred their primary token after setting it.
   The contract returns `""`, not the stale label, so explorers don't
   render incorrect identities.

---

## Custom-error ergonomics

All four contracts use Solidity custom errors (`error Foo()`) rather than
revert strings. When matching reverts in tests:

```solidity
// Right ✓
vm.expectRevert(INSRegistry.NameReserved.selector);
registry.register{value: price}("kcom", alice);

// Wrong ✗ (will silently mismatch — string-revert, not custom error)
vm.expectRevert("Name is reserved");
registry.register{value: price}("kcom", alice);
```

If you're writing a wallet UI that decodes contract reverts, the four
ABIs to keep on hand are exported from the contracts directly:

```ts
import { decodeErrorResult } from "viem";
import { abi as registryAbi } from "./abi/INSRegistry.json";

try { /* ... */ } catch (e: any) {
  const decoded = decodeErrorResult({ abi: registryAbi, data: e.data });
  // decoded.errorName === "NameReserved" | "InsufficientPayment" | ...
}
```

---

## CI

GitHub Actions workflow at `.github/workflows/contracts.yml` runs on every
push/PR that touches `contracts/**`:

- `build` — `forge build --sizes` (catches compile errors + EIP-170 size drift)
- `test`  — `forge test -vvv` plus a 512-run fuzz pass on the `testFuzz_*`
            tests (catches boundary cases the local 256-run default would miss)
- `coverage` — `forge coverage --report summary`, **non-blocking** drift signal

Forge is pinned to `stable` via the `foundry-rs/foundry-toolchain` action.

---

## Patterns reusable on other Igra deployments

If you're shipping your own naming or NFT marketplace on Igra, these
helpers from `BaseTest.sol` are likely worth copying verbatim:

```solidity
// ENS-spec namehash for "<label>.igra"
function namehashIgra(string memory label) internal pure returns (bytes32) {
    bytes32 node = keccak256(abi.encodePacked(bytes32(0), keccak256("igra")));
    return keccak256(abi.encodePacked(node, keccak256(bytes(label))));
}

// Funded test wallets — Igra's native iKAS gas works exactly like ETH in tests
vm.deal(alice, 100_000 ether);

// Mock ERC-721 receivers (positive + negative)
contract MockGoodReceiver { /* returns onERC721Received.selector */ }
contract MockBadReceiver  { /* always reverts */ }
```

Igra's chain ID is `38833`, native currency is `iKAS` (18 decimals,
`msg.value` works exactly as on Ethereum). Forge's default in-memory EVM
behaves identically — no `--rpc-url` flag needed for unit tests.

For fork tests against live Igra mainnet:

```bash
forge test --fork-url https://rpc.igralabs.com:8545 \
           --match-contract IntegrationTest -vvv
```

---

## Adding a new test file

1. Create `contracts/test/MyContract.t.sol`
2. `import "./BaseTest.sol";` and inherit from `BaseTest`
3. You get all four contracts deployed, three funded wallets, and the
   pricing / namehash / listing helpers automatically:

```solidity
pragma solidity 0.8.24;
import "./BaseTest.sol";

contract MyContractTest is BaseTest {
    function test_something() public {
        uint256 tokenId = registerName(alice, "alice");
        listForSale(alice, tokenId, 5 ether);
        // ...
    }
}
```

That's it — no per-test boilerplate. The pattern keeps test files focused
on the contract under test rather than re-deploying the world.

---

## Test count history

- 2026-04-23 — 110 tests (Registry 55 + Marketplace 43 + Reverse 12)
- 2026-04-26 — 143 tests (+ 27 SubnameExtension, + 6 TLD variants)
- 2026-04-27 — **170 tests** (+ 18 INSResolver, + 9 Integration)
