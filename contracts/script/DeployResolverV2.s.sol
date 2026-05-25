// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSResolverV2} from "../src/INSResolverV2.sol";

/**
 * @title DeployResolverV2
 * @notice Deploys the hardened INSResolverV2 (fixes the namehash-poisoning
 *         bug in the original INSResolver). Points at the V2 .igra Registry.
 *
 *         The resolver has no owner / no admin functions — node→label
 *         bindings are trustless (derived on-chain), text records are
 *         owner-gated by the Registry. So there's no transferOwnership step.
 *
 *         Reads:
 *           PRIVATE_KEY        — deployer (any funded throwaway EOA)
 *           V2_REGISTRY_IGRA   — V2 Registry address
 *
 *         Igra mainnet gas: use `--legacy --slow --with-gas-price 1100000000000`
 *
 *         After deploy:
 *           1. Verify on Igra explorer (blockscout verifier)
 *           2. NEXT_PUBLIC_INS_RESOLVER = <new address> on VPS .env.local
 *              (non-urgent — not used in any live dApp read path today)
 *           3. Update deployments/README.md + docs/INTEGRATION.md address
 *           4. Drain deployer back to the Safe
 */
contract DeployResolverV2 is Script {
    function run() external {
        uint256 pk         = vm.envUint("PRIVATE_KEY");
        address v2Registry = vm.envAddress("V2_REGISTRY_IGRA");

        require(v2Registry != address(0), "V2_REGISTRY_IGRA must be set");

        vm.startBroadcast(pk);
        INSResolverV2 resolver = new INSResolverV2(v2Registry);
        vm.stopBroadcast();

        console.log("");
        console.log("======================================================");
        console.log("INSResolverV2 (hardened) deployed:", address(resolver));
        console.log("======================================================");
        console.log("parent registry (V2):", v2Registry);
        console.log("PARENT_NODE namehash('igra'): 0x845ae117fa3f88f78ba0d236aa4592959057d520889c7edd86b74d4123cc73e1");
        console.log("");
        console.log("Next steps:");
        console.log(" 1. forge verify-contract <addr> src/INSResolverV2.sol:INSResolverV2 \\");
        console.log("      --rpc-url https://rpc.igralabs.com:8545 \\");
        console.log("      --verifier blockscout --verifier-url https://explorer.igralabs.com/api \\");
        console.log("      --constructor-args $(cast abi-encode 'constructor(address)' <v2Registry>) \\");
        console.log("      --via-ir --compiler-version 0.8.24");
        console.log(" 2. VPS .env.local: NEXT_PUBLIC_INS_RESOLVER=<addr> (non-urgent)");
        console.log(" 3. Update deployments/README.md + docs/INTEGRATION.md");
        console.log(" 4. Drain deployer EOA back to the Safe");
    }
}
