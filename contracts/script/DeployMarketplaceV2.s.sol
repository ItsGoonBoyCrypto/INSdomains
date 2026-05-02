// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSMarketplace} from "../src/INSMarketplace.sol";

/**
 * @title DeployMarketplaceV2
 * @notice Fresh INSMarketplace instance bound to the V2 .igra Registry.
 *         Same contract code as the V1-bound instance — Marketplace's
 *         `registry` is `IERC721Min immutable`, so swapping registries
 *         requires a new deploy.
 *
 *         Reads:
 *           PRIVATE_KEY        — deployer (any funded wallet)
 *           INS_OWNER          — Safe (or EOA) to receive ownership atomically
 *           INS_TREASURY       — Safe (or any payable address) for fee receipts
 *           V2_REGISTRY_IGRA   — V2 Registry address
 *
 *         Igra mainnet gas: use `--legacy --slow --with-gas-price 1100000000000`
 */
contract DeployMarketplaceV2 is Script {
    function run() external {
        uint256 pk          = vm.envUint("PRIVATE_KEY");
        address finalOwner  = vm.envAddress("INS_OWNER");
        address treasury    = vm.envAddress("INS_TREASURY");
        address v2Registry  = vm.envAddress("V2_REGISTRY_IGRA");

        require(v2Registry != address(0), "V2_REGISTRY_IGRA must be set");
        require(finalOwner != address(0), "INS_OWNER must be set");
        require(treasury != address(0), "INS_TREASURY must be set");

        vm.startBroadcast(pk);
        INSMarketplace mkt = new INSMarketplace(v2Registry, treasury);
        // Hand ownership to the Safe in the same broadcast — deployer EOA
        // never holds admin rights on the deployed contract.
        if (finalOwner != msg.sender) {
            mkt.transferOwnership(finalOwner);
        }
        vm.stopBroadcast();

        console.log("INSMarketplace (V2-bound):", address(mkt));
        console.log("Parent Registry (V2):     ", v2Registry);
        console.log("Treasury (fee receiver):  ", treasury);
        console.log("Final owner:              ", finalOwner);
        console.log("");
        console.log("Next steps:");
        console.log(" 1. Verify on Igra explorer (forge verify-contract --verifier blockscout)");
        console.log(" 2. NEXT_PUBLIC_INS_MARKETPLACE_IGRA_V2 = above address (VPS .env.local)");
        console.log(" 3. lib/contracts.ts: import + use for V2 list-for-sale");
        console.log(" 4. LiveDomainCard: drop the 'Sell . v2.1' pill, wire ListForSaleButton for V2");
    }
}
