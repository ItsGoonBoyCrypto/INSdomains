// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSRegistryIgra} from "../src/INSRegistryIgra.sol";

/**
 * @dev Deploys the .igra Registry as a sibling to the live .ins Registry.
 *      Reads:
 *        PRIVATE_KEY — deployer (any funded wallet)
 *        INS_OWNER   — Safe (or EOA) to hand ownership to atomically
 */
contract DeployRegistryIgra is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address finalOwner = vm.envAddress("INS_OWNER");

        vm.startBroadcast(pk);
        INSRegistryIgra registry = new INSRegistryIgra();
        if (finalOwner != address(0) && finalOwner != msg.sender) {
            registry.transferOwnership(finalOwner);
        }
        vm.stopBroadcast();

        console.log("RegistryIgra:", address(registry));
        console.log("Owner:       ", finalOwner);
    }
}
