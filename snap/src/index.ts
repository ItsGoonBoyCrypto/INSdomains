/**
 * INS — Igra Name Service · MetaMask Snap
 *
 * Resolves `.igra` names natively in MetaMask via two hooks:
 *
 *   • forward: user types "alice.igra" in the send field
 *              → snap calls insdomains.org/api/resolve?name=alice.igra
 *              → returns the wallet address
 *
 *   • reverse: MetaMask wants to display an address
 *              → snap calls insdomains.org/api/reverse?address=0x…
 *              → returns the holder's primary .igra name
 *
 * No on-chain calls from inside the snap — we hit our public REST API which
 * unions V1 + V2 reads and is cache-friendly. Keeps the snap bundle tiny
 * and makes upgrades centralised (any improvement to the API ships to
 * every installed snap user automatically).
 */

import type {
  OnNameLookupHandler,
  AddressLookupResult,
  DomainLookupResult,
} from "@metamask/snaps-sdk";

const API_BASE = "https://insdomains.org/api";
const PROTOCOL = "INS";
/** Hard cap so MetaMask never blocks waiting on a slow gateway response. */
const FETCH_TIMEOUT_MS = 5000;

/** Cheap client-side filter: ignore anything that obviously isn't a .igra name. */
function looksLikeIgraName(s: string): boolean {
  const lower = s.toLowerCase().trim();
  return lower.endsWith(".igra") && lower.length > 5;
}

/** Wrapper around fetch that aborts after FETCH_TIMEOUT_MS. */
async function fetchWithTimeout(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Forward resolution — name → address. */
async function resolveForward(name: string): Promise<AddressLookupResult | null> {
  const r = await fetchWithTimeout(
    `${API_BASE}/resolve?name=${encodeURIComponent(name.toLowerCase())}`,
  );
  if (!r || !r.ok) return null;
  try {
    const data = (await r.json()) as {
      exists?: boolean;
      address?: string;
    };
    if (!data.exists || !data.address) return null;
    return {
      resolvedAddresses: [
        {
          resolvedAddress: data.address,
          protocol: PROTOCOL,
          domainName: name,
        },
      ],
    };
  } catch {
    return null;
  }
}

/** Reverse resolution — address → primary name. */
async function resolveReverse(
  address: string,
): Promise<DomainLookupResult | null> {
  const r = await fetchWithTimeout(
    `${API_BASE}/reverse?address=${encodeURIComponent(address)}`,
  );
  if (!r || !r.ok) return null;
  try {
    const data = (await r.json()) as { primary?: string | null };
    if (!data.primary) return null;
    return {
      resolvedDomains: [
        {
          resolvedDomain: data.primary,
          protocol: PROTOCOL,
        },
      ],
    };
  } catch {
    return null;
  }
}

export const onNameLookup: OnNameLookupHandler = async (request) => {
  // The request shape from MetaMask gives us EITHER `domain` OR `address`
  // (not both), depending on which way the lookup is going.
  const { domain, address } = request as {
    domain?: string;
    address?: string;
    chainId: string;
  };

  if (domain) {
    if (!looksLikeIgraName(domain)) return null;
    return resolveForward(domain);
  }

  if (address) {
    return resolveReverse(address);
  }

  return null;
};
