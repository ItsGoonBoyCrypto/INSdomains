// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSReverseResolver} from "../src/INSReverseResolver.sol";

/**
 * @title DeployReverseResolverV2
 * @notice Fresh INSReverseResolver instance bound to the V2 .igra Registry.
 *         Same contract code as the V1-bound instance — RR's `registry`
 *         is immutable, so V2 needs a fresh deploy.
 *
 *         RR has no owner, no admin functions — pure user-controlled
 *         primary-name mapping. So no transferOwnership step needed.
 *
 *         Reads:
 *           PRIVATE_KEY        — deployer (any funded wallet)
 *           V2_REGISTRY_IGRA   — V2 Registry address
 *
 *         Igra mainnet gas: use `--legacy --slow --with-gas-price 1100000000000`
 */
contract DeployReverseResolverV2 is Script {
    function run() external {
        uint256 pk         = vm.envUint("PRIVATE_KEY");
        address v2Registry = vm.envAddress("V2_REGISTRY_IGRA");

        require(v2Registry != address(0), "V2_REGISTRY_IGRA must be set");

        vm.startBroadcast(pk);
        INSReverseResolver rr = new INSReverseResolver(v2Registry);
        vm.stopBroadcast();

        console.log("INSReverseResolver (V2-bound):", address(rr));
        console.log("Parent Registry (V2):         ", v2Registry);
        console.log("");
        console.log("Next steps:");
        console.log(" 1. Verify on Igra explorer (forge verify-contract --verifier blockscout)");
        console.log(" 2. NEXT_PUBLIC_INS_REVERSE_RESOLVER_IGRA_V2 = above address (VPS .env.local)");
        console.log(" 3. LiveDomainCard: wire setPrimary for V2 NFTs (drop 'Primary . v2.1' pill)");
    }
}
