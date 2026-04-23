// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSRegistry} from "../src/INSRegistry.sol";
import {INSResolver} from "../src/INSResolver.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        // Tier prices are baked into the constructor:
        //   1-char = reserved, 2=5000, 3=500, 4=50, 5-32=10 iKAS.
        INSRegistry registry = new INSRegistry();
        INSResolver resolver = new INSResolver(address(registry));
        vm.stopBroadcast();

        console.log("Registry:", address(registry));
        console.log("Resolver:", address(resolver));
    }
}
