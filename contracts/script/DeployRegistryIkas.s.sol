// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSRegistryIkas} from "../src/INSRegistryIkas.sol";

/**
 * @dev Deploys the .ikas Registry as a sibling to the live .ins Registry.
 *      Reads:
 *        PRIVATE_KEY — deployer (any funded wallet)
 *        INS_OWNER   — Safe (or EOA) to hand ownership to atomically
 */
contract DeployRegistryIkas is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address finalOwner = vm.envAddress("INS_OWNER");

        vm.startBroadcast(pk);
        INSRegistryIkas registry = new INSRegistryIkas();
        if (finalOwner != address(0) && finalOwner != msg.sender) {
            registry.transferOwnership(finalOwner);
        }
        vm.stopBroadcast();

        console.log("RegistryIkas:", address(registry));
        console.log("Owner:       ", finalOwner);
    }
}
