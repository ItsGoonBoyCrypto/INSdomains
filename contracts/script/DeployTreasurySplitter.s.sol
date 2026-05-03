// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {TreasurySplitter} from "../src/TreasurySplitter.sol";

/**
 * @title DeployTreasurySplitter
 * @notice Deploys TreasurySplitter and prints the env vars to wire into the
 *         dApp + the Safe txs needed to start routing through it.
 *
 *         The splitter is intentionally deployed BEFORE the DAO multisig
 *         address is necessarily known. If `DAO_ADDRESS` is the zero
 *         address (or unset), the splitter is deployed with dao=0 and
 *         daoBps=0 so flush() is callable immediately as a 100%-to-treasury
 *         passthrough. Once Igra DAO provides their multisig:
 *
 *           splitter.setDao(<dao multisig>)   # via Safe tx
 *           splitter.setSplit(<bps>)          # e.g. 3000 = 30% to DAO
 *
 *         Reads:
 *           PRIVATE_KEY   — deployer (any funded wallet)
 *           INS_TREASURY  — Treasury Safe (also gets ownership of splitter)
 *           DAO_ADDRESS   — DAO multisig (optional; defaults to 0x0)
 *           DAO_BPS       — DAO's basis-point share (optional; defaults to 0)
 *
 *         Igra mainnet gas: use `--legacy --slow --with-gas-price 1100000000000`
 */
contract DeployTreasurySplitter is Script {
    function run() external {
        uint256 pk           = vm.envUint("PRIVATE_KEY");
        address payable safe = payable(vm.envAddress("INS_TREASURY"));
        address payable dao  = payable(vm.envOr("DAO_ADDRESS", address(0)));
        uint256 daoBps       = vm.envOr("DAO_BPS", uint256(0));

        require(safe != address(0), "INS_TREASURY must be set");
        require(daoBps <= 10_000, "DAO_BPS must be <= 10000");
        if (dao == address(0)) require(daoBps == 0, "DAO_BPS must be 0 when DAO_ADDRESS unset");

        vm.startBroadcast(pk);
        // forge-lint: disable-next-line(unsafe-typecast)
        // safe: daoBps already require'd <= 10_000 above, fits in uint16.
        TreasurySplitter splitter = new TreasurySplitter(
            safe,
            dao,
            uint16(daoBps),
            safe // owner = Treasury Safe (admin via Safe txs going forward)
        );
        vm.stopBroadcast();

        console.log("");
        console.log("======================================================");
        console.log("TreasurySplitter deployed:", address(splitter));
        console.log("======================================================");
        console.log("treasury (recipient):     ", safe);
        console.log("treasury  bps:            ", uint256(10_000) - daoBps);
        console.log("dao      (recipient):     ", dao);
        console.log("dao       bps:            ", daoBps);
        console.log("owner    (Safe):          ", safe);
        console.log("");
        console.log("Wire into dApp .env.local on VPS:");
        console.log("  NEXT_PUBLIC_INS_TREASURY_SPLITTER=", address(splitter));
        console.log("");
        console.log("Verify on Igra explorer:");
        console.log("  forge verify-contract", address(splitter), "src/TreasurySplitter.sol:TreasurySplitter \\");
        console.log("    --rpc-url https://rpc.igralabs.com:8545 \\");
        console.log("    --verifier blockscout --verifier-url https://explorer.igralabs.com/api \\");
        console.log("    --constructor-args $(cast abi-encode 'constructor(address,address,uint16,address)' \\");
        console.log("    <treasury> <dao> <daoBps> <owner>) \\");
        console.log("    --via-ir --compiler-version 0.8.24");
        console.log("");
        console.log("Once DAO multisig is known (Safe-signed txs):");
        console.log("  splitter.setDao(<dao multisig>)");
        console.log("  splitter.setSplit(2000)   // 2000 bps = 20% to DAO (production split)");
        console.log("");
        console.log("Then to route a withdraw through the splitter (Safe-signed):");
        console.log("  Registry.withdraw(splitter)   // pulls full balance to splitter");
        console.log("  splitter.flush()              // anyone can call; splits + sends");
    }
}
