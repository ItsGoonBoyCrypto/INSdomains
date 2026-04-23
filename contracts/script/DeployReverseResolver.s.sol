// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSReverseResolver} from "../src/INSReverseResolver.sol";

/**
 * @dev Standalone post-launch deploy. Reads:
 *        PRIVATE_KEY   — deployer (any funded wallet)
 *        INS_REGISTRY  — existing INSRegistry address
 *
 *      Contract has no privileged functions, so there's no ownership
 *      transfer to do.
 */
contract DeployReverseResolver is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address registry = vm.envAddress("INS_REGISTRY");
        require(registry != address(0), "INS_REGISTRY unset");

        vm.startBroadcast(pk);
        INSReverseResolver rev = new INSReverseResolver(registry);
        vm.stopBroadcast();

        console.log("ReverseResolver:", address(rev));
        console.log("Registry:       ", registry);
    }
}
