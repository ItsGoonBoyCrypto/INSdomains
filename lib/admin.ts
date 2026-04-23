import { getAddress, isAddress } from "viem";

/**
 * Admin is the wallet that owns INSRegistry. Set NEXT_PUBLIC_ADMIN_WALLET
 * to the deploy wallet (or transfer ownership to a multisig and set that).
 * Until the registry is deployed we use this env value; after deploy we
 * can switch to reading `owner()` on-chain.
 */
export const ADMIN_WALLET: `0x${string}` | null = (() => {
  const raw = process.env.NEXT_PUBLIC_ADMIN_WALLET ?? "";
  if (!raw || !isAddress(raw)) return null;
  return getAddress(raw);
})();

export function isAdmin(address?: string | null): boolean {
  if (!ADMIN_WALLET || !address) return false;
  try {
    return getAddress(address) === ADMIN_WALLET;
  } catch {
    return false;
  }
}
