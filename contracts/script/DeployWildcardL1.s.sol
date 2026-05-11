// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import {INSWildcardL1} from "../src/INSWildcardL1.sol";

/**
 * @title  DeployWildcardL1
 * @notice Deploys the L1 wildcard resolver to Ethereum mainnet or Sepolia
 *         testnet. After deployment, point `igra.eth` (or `igra-test.eth` on
 *         Sepolia) at the deployed address from the ENS app.
 *
 *         Reads from env:
 *           PRIVATE_KEY        — Ethereum deployer (fresh, funded EOA)
 *           INS_OWNER          — Owner Safe (Igra Safe — same as INS Treasury)
 *           CCIP_GATEWAY_URL   — Gateway URL with {sender} + {data} tokens
 *                                e.g. "https://insdomains.org/api/ccip/{sender}/{data}.json"
 *           CCIP_SIGNER_ADDR   — Address of the off-chain signer EOA
 *
 *         Network: pass via `--rpc-url $ETH_MAINNET_RPC` (or Sepolia).
 *         Verify: pass `--verify --etherscan-api-key $ETHERSCAN_API_KEY`.
 *
 *         The deployer EOA can be DRAINED after deploy — admin is the Safe.
 */
contract DeployWildcardL1 is Script {
    function run() external {
        uint256 pk          = vm.envUint("PRIVATE_KEY");
        address owner       = vm.envAddress("INS_OWNER");
        string memory url   = vm.envString("CCIP_GATEWAY_URL");
        address signer      = vm.envAddress("CCIP_SIGNER_ADDR");

        require(owner != address(0), "INS_OWNER required");
        require(signer != address(0), "CCIP_SIGNER_ADDR required");
        require(bytes(url).length > 0, "CCIP_GATEWAY_URL required");
        // Sanity-check the URL contains both template tokens.
        require(_contains(url, "{sender}"), "url must contain {sender}");
        require(_contains(url, "{data}"),   "url must contain {data}");

        string[] memory urls = new string[](1);
        urls[0] = url;

        vm.startBroadcast(pk);
        INSWildcardL1 wc = new INSWildcardL1(owner, urls, signer);
        vm.stopBroadcast();

        console.log("");
        console.log("======================================================");
        console.log("INSWildcardL1 deployed:", address(wc));
        console.log("======================================================");
        console.log("owner (Safe):    ", owner);
        console.log("gateway URL:     ", url);
        console.log("initial signer:  ", signer);
        console.log("");
        console.log("Next steps:");
        console.log(" 1. Verify on Etherscan (forge verify-contract ...)");
        console.log(" 2. ENS App: set igra.eth resolver to ^^^ deployed address");
        console.log(" 3. VPS .env.local:");
        console.log("      CCIP_GATEWAY_ENABLED=true");
        console.log("      CCIP_SIGNER_PRIVATE_KEY=<the signer EOA's private key>");
        console.log("      CCIP_WILDCARD_L1_ADDRESS=", address(wc));
        console.log(" 4. systemctl restart ins-dapp");
        console.log(" 5. Smoke test from MetaMask: send 0-value tx to alice.igra.eth");
    }

    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0 || n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) { ok = false; break; }
            }
            if (ok) return true;
        }
        return false;
    }
}
