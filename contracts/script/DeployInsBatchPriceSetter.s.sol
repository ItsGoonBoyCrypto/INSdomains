// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {InsBatchPriceSetter} from "../src/InsBatchPriceSetter.sol";

/**
 * @title  DeployInsBatchPriceSetter
 * @notice Deploys the one-shot batch helper that lets the Treasury Safe set
 *         many premium prices in a single tx (works around Igra L2 Safe's
 *         MultiSend/delegatecall block).
 *
 * Required env vars:
 *   - SAFE_ADDRESS     (e.g. 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1)
 *   - REGISTRY_V2      (e.g. 0x7E7018959bf44045F01D176D8db1594894CBf4E9)
 *   - PRIVATE_KEY      (deployer key — any address with iKAS for gas)
 *
 * Igra L2 deploy command (note the gas-price floor flag):
 *   forge script script/DeployInsBatchPriceSetter.s.sol \
 *     --rpc-url $IGRA_RPC --broadcast \
 *     --legacy --slow \
 *     --with-gas-price 1100000000000
 *
 * Cost: ~$0.50 in iKAS gas.
 *
 * Verify on Igra Blockscout after deploy:
 *   forge verify-contract <DEPLOYED_ADDR> InsBatchPriceSetter \
 *     --chain-id 38833 \
 *     --constructor-args $(cast abi-encode "constructor(address,address)" \
 *       <SAFE_ADDRESS> <REGISTRY_V2>) \
 *     --verifier blockscout \
 *     --verifier-url https://explorer.igralabs.com/api
 *
 * After deploy: see docs/EMOJI_PRICE_BATCH_RUNBOOK.md for the 3-tx Safe
 * sequence to set + return ownership.
 */
contract DeployInsBatchPriceSetter is Script {
    function run() external {
        address safe     = vm.envAddress("SAFE_ADDRESS");
        address registry = vm.envAddress("REGISTRY_V2");

        require(safe != address(0), "SAFE_ADDRESS not set");
        require(registry != address(0), "REGISTRY_V2 not set");

        console2.log("Deploying InsBatchPriceSetter");
        console2.log("  safe    :", safe);
        console2.log("  registry:", registry);

        vm.startBroadcast();
        InsBatchPriceSetter helper = new InsBatchPriceSetter(safe, registry);
        vm.stopBroadcast();

        console2.log("InsBatchPriceSetter deployed at:", address(helper));
        console2.log("");
        console2.log("Next steps (do in order, ALL from the Safe):");
        console2.log("  1. Registry.transferOwnership(InsBatchPriceSetter)");
        console2.log("     -- to:", registry);
        console2.log("     -- calldata: transferOwnership(", address(helper), ")");
        console2.log("  2. InsBatchPriceSetter.runBatch(labels[], forever[], annual[])");
        console2.log("     -- to:", address(helper));
        console2.log("     -- ownership returns to Safe inside this tx");
        console2.log("");
        console2.log("Helper is one-shot: it can never run again after runBatch.");
    }
}
