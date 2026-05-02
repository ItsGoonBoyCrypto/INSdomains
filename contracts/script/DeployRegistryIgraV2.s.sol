// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSRegistryIgraV2} from "../src/INSRegistryIgraV2.sol";

/**
 * @title DeployRegistryIgraV2
 * @notice Mainnet deploy script for the V2 .igra Registry. Hands ownership
 *         to the Igra Treasury Safe (or any address you set via INS_OWNER)
 *         in the same broadcast that does the deployment, so the deployer
 *         EOA is never authoritative on chain.
 *
 *         Reads:
 *           PRIVATE_KEY      — deployer (any funded wallet)
 *           INS_OWNER        — Safe (or EOA) to receive ownership
 *           V1_REGISTRY_IGRA — address of the live V1 .igra Registry
 *                              (used by claimV1Forever for the migration)
 *
 *         Igra mainnet gas note: forge auto-estimates 1 wei below Igra's
 *         1000 gwei floor, so always invoke with `--legacy --slow
 *         --with-gas-price 1100000000000`.
 *
 * @dev    Usage (Igra mainnet, chain 38833):
 *
 *         forge script script/DeployRegistryIgraV2.s.sol:DeployRegistryIgraV2 \
 *             --rpc-url https://rpc.igralabs.com:8545 \
 *             --broadcast --legacy --slow \
 *             --with-gas-price 1100000000000 \
 *             --verify --verifier blockscout \
 *             --verifier-url https://explorer.igralabs.com/api
 *
 *         Then sanity-check with:
 *
 *         cast call $REGISTRY 'owner()(address)' --rpc-url $IGRA_RPC
 *         cast call $REGISTRY 'v1Registry()(address)' --rpc-url $IGRA_RPC
 *         cast call $REGISTRY 'lengthPrice(uint8)(uint256)' 5 --rpc-url $IGRA_RPC
 */
contract DeployRegistryIgraV2 is Script {
    function run() external {
        uint256 pk            = vm.envUint("PRIVATE_KEY");
        address finalOwner    = vm.envAddress("INS_OWNER");
        address v1Registry    = vm.envAddress("V1_REGISTRY_IGRA");

        require(v1Registry != address(0), "V1_REGISTRY_IGRA must be set");
        require(finalOwner != address(0), "INS_OWNER must be set");

        vm.startBroadcast(pk);
        INSRegistryIgraV2 registry = new INSRegistryIgraV2(v1Registry);
        // Hand ownership in the same tx so the deployer EOA never has admin
        // rights on the deployed contract — same pattern V1 used.
        if (finalOwner != msg.sender) {
            registry.transferOwnership(finalOwner);
        }
        vm.stopBroadcast();

        console.log("RegistryIgraV2:    ", address(registry));
        console.log("V1 Registry (ref): ", v1Registry);
        console.log("Final owner:       ", finalOwner);
        console.log("");
        console.log("Next steps:");
        console.log(" 1. Verify on explorer (--verify auto-runs above)");
        console.log(" 2. NEXT_PUBLIC_INS_REGISTRY_IGRA_V2 = above address");
        console.log(" 3. Update activity bot to watch V2 events");
        console.log(" 4. Deploy migration UI banner to /domains");
    }
}
