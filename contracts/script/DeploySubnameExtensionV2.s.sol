// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSSubnameExtension} from "../src/INSSubnameExtension.sol";

/**
 * @title DeploySubnameExtensionV2
 * @notice Deploys a fresh INSSubnameExtension instance pointing at the V2
 *         .igra Registry. Same contract code as the V1-targeted instance —
 *         the contract is parent-Registry-agnostic, takes the parent
 *         Registry address as a constructor arg.
 *
 *         Ships with `enabled = false` (default). Per the v1.1 activation
 *         plan in `project_ins_dapp.md`, the Safe will flip
 *         `setEnabled(true)` ~3-4 weeks post-V2-launch once V2 root
 *         registrations are stable.
 *
 *         Reads:
 *           PRIVATE_KEY        — deployer (any funded wallet)
 *           INS_OWNER          — Safe (or EOA) to receive ownership
 *           V2_REGISTRY_IGRA   — V2 Registry address (parent Registry)
 *
 *         Igra mainnet gas: use `--legacy --slow --with-gas-price 1100000000000`
 *
 * @dev Usage:
 *
 *      forge script script/DeploySubnameExtensionV2.s.sol:DeploySubnameExtensionV2 \
 *        --rpc-url https://rpc.igralabs.com:8545 \
 *        --broadcast --legacy --slow \
 *        --with-gas-price 1100000000000
 */
contract DeploySubnameExtensionV2 is Script {
    function run() external {
        uint256 pk           = vm.envUint("PRIVATE_KEY");
        address finalOwner   = vm.envAddress("INS_OWNER");
        address v2Registry   = vm.envAddress("V2_REGISTRY_IGRA");

        require(v2Registry != address(0), "V2_REGISTRY_IGRA must be set");
        require(finalOwner != address(0), "INS_OWNER must be set");

        vm.startBroadcast(pk);
        // Constructor (parentRegistry, owner) — pass `finalOwner` directly
        // so the deployer EOA never holds the admin key (matches V2
        // Registry deploy pattern).
        INSSubnameExtension ext = new INSSubnameExtension(v2Registry, finalOwner);
        vm.stopBroadcast();

        console.log("INSSubnameExtension (V2-targeted):", address(ext));
        console.log("Parent Registry (V2):              ", v2Registry);
        console.log("Owner:                             ", finalOwner);
        console.log("Enabled state:                      false (v1.1 activation pending)");
        console.log("");
        console.log("Next steps:");
        console.log(" 1. Verify on explorer: forge verify-contract --verifier blockscout --verifier-url https://explorer.igralabs.com/api ... ");
        console.log(" 2. NEXT_PUBLIC_INS_SUBNAME_EXTENSION_IGRA = above address (on VPS .env.local)");
        console.log(" 3. Activity bot: SUBNAME_EXTENSION_IGRA = above address (env)");
        console.log(" 4. v1.1 activation: Safe tx setEnabled(true) when ready (~3-4 weeks)");
    }
}
