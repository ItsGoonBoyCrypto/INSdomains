// File: src/background/service/insService.ts
// New service — INS (Igra Name Service) resolver. Mirrors the BlockscoutService
// pattern used for RNS resolution (PR #3544).
//
// Why hit our REST API instead of resolving on-chain:
//   - Avoids needing an Igra L2 RPC dependency in the wallet
//   - Our API unions V1 + V2 registries + handles caching server-side
//   - 1.3 KB response per lookup, fast (<300ms p95)
//   - Read-only — wallet doesn't sign anything, doesn't see private keys
//
// See https://insdomains.org/snap-help for full INS docs.

import { isAddress } from 'viem';
import { http } from '../utils/http';

const INS_API = 'https://insdomains.org/api';

type DomainResolveResult = {
  addr: string;
  name: string;
};

class InsService {
  /**
   * Forward resolution: .igra name → wallet address.
   *
   * Only matches names ending in `.igra`. Returns null for any other input
   * (including invalid suffixes or unregistered names) so the caller can
   * fall through to the next resolver in the chain.
   */
  getInsAddressByName = async (
    insName: string
  ): Promise<DomainResolveResult | null> => {
    const normalizedName = insName.trim().toLowerCase();
    if (!normalizedName || !normalizedName.endsWith('.igra')) {
      return null;
    }

    try {
      const { data } = await http.get(
        `${INS_API}/resolve?name=${encodeURIComponent(normalizedName)}`
      );

      if (!data?.exists || !data?.address) {
        return null;
      }

      const addr = String(data.address);
      if (!isAddress(addr.toLowerCase())) {
        return null;
      }

      return { addr, name: normalizedName };
    } catch {
      return null;
    }
  };
}

const insService = new InsService();

export default insService;
