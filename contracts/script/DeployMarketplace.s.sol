// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSMarketplace} from "../src/INSMarketplace.sol";

/**
 * @dev Standalone post-launch deploy. Reads:
 *        PRIVATE_KEY   — deployer (any funded wallet; becomes initial owner)
 *        INS_REGISTRY  — existing INSRegistry address
 *        INS_TREASURY  — address that receives sale + feature fees
 *        MARKET_NEW_OWNER (optional) — if set, transfers ownership to this
 *                                      address atomically in the same tx so
 *                                      the deployer EOA never retains control.
 */
contract DeployMarketplace is Script {
    function run() external {
        uint256 pk          = vm.envUint("PRIVATE_KEY");
        address registry    = vm.envAddress("INS_REGISTRY");
        address treasury    = vm.envAddress("INS_TREASURY");
        address newOwner    = _optAddress("MARKET_NEW_OWNER");

        require(registry != address(0), "INS_REGISTRY unset");
        require(treasury != address(0), "INS_TREASURY unset");

        vm.startBroadcast(pk);
        INSMarketplace mkt = new INSMarketplace(registry, treasury);
        if (newOwner != address(0)) {
            mkt.transferOwnership(newOwner);
        }
        vm.stopBroadcast();

        console.log("Marketplace:", address(mkt));
        console.log("Registry:   ", registry);
        console.log("Treasury:   ", treasury);
        console.log("Owner:      ", mkt.owner());
    }

    function _optAddress(string memory key) internal view returns (address) {
        try vm.envAddress(key) returns (address a) { return a; } catch { return address(0); }
    }
}
