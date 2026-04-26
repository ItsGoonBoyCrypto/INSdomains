import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { REGISTRY_ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const client = createPublicClient({ transport: http(RPC) });

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

/** Tier band based on label length — must match the on-chain tiered pricing. */
function tierFor(label: string): { tag: string; price: string; color: string } {
  const n = label.length;
  if (n <= 1) return { tag: "ULTRA-PREMIUM", price: "1,000", color: "#ff5fa2" };
  if (n <= 2) return { tag: "PREMIUM",       price: "500",   color: "#fb7185" };
  if (n <= 3) return { tag: "RARE",          price: "250",   color: "#f59e0b" };
  if (n <= 4) return { tag: "UNCOMMON",      price: "50",    color: "#34d399" };
  return        { tag: "STANDARD",      price: "30",    color: PLUM };
}

/** Auto-fit the label so it never overflows the 200px card. */
function labelFontSize(len: number): number {
  if (len <= 6)  return 38;
  if (len <= 9)  return 30;
  if (len <= 14) return 22;
  if (len <= 20) return 16;
  return 12;
}

function suffixFontSize(labelLen: number): number {
  if (labelLen <= 6)  return 21;
  if (labelLen <= 9)  return 16;
  if (labelLen <= 14) return 13;
  if (labelLen <= 20) return 10;
  return 8;
}

/**
 * GET /api/nft-image/<tokenId>
 *
 * Returns a 200×200 PNG of the .igra NFT card for `tokenId`. Used by the
 * Telegram activity bot's sendPhoto + the on-site mint-success "Share to X"
 * card. Cached at the edge for 1h since the visual is deterministic per
 * tokenId (label never changes after mint).
 *
 * 2026-04-26 — sized down from 600 → 400 → 200 because TG was rendering
 * square photos chat-wide and dominating the feed. At 200px source, TG
 * keeps the photo at a sensible small-card size without scaling up.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId: tokenIdStr } = await params;
  const tokenId = (() => {
    try {
      return BigInt(tokenIdStr);
    } catch {
      return null;
    }
  })();

  if (tokenId === null || tokenId <= 0n) {
    return new Response("invalid tokenId", { status: 400 });
  }

  // Read label from the .igra Registry. If it fails or returns empty, render
  // a generic placeholder so we never 500 the image route (Telegram would
  // refuse to attach a broken image).
  let label = "";
  try {
    label = (await client.readContract({
      address: REGISTRY_ADDRESSES.igra,
      abi: REGISTRY_ABI,
      functionName: "labelOf",
      args: [tokenId],
    })) as string;
  } catch {
    /* fall through with empty label */
  }

  const safeLabel = label && /^[a-z0-9-]{1,32}$/.test(label) ? label : "igra";
  const tier = tierFor(safeLabel);
  const labelSize = labelFontSize(safeLabel.length);
  const suffSize = suffixFontSize(safeLabel.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(170px 140px at 80% 110%, rgba(168,85,247,0.32), transparent 70%), radial-gradient(140px 120px at 0% -10%, rgba(0,240,255,0.22), transparent 70%)`,
          padding: "11px 12px",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* ── Header row ───────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: 5,
                background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                color: "#000",
                fontSize: 11,
                fontWeight: 900,
                boxShadow: "0 0 8px rgba(0,240,255,0.35)",
              }}
            >
              i
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "1px 5px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 7,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            #{tokenIdStr}
          </div>
        </div>

        {/* ── Tier pill ───────────────────────────── */}
        <div
          style={{
            display: "flex",
            marginTop: 7,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "2px 6px",
              borderRadius: 999,
              border: `1px solid ${tier.color}66`,
              background: `${tier.color}1f`,
              color: tier.color,
              fontSize: 7,
              fontWeight: 800,
              letterSpacing: 1.2,
            }}
          >
            {tier.tag} · {tier.price} iKAS
          </div>
        </div>

        {/* ── Centered name ───────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            flex: 1,
            paddingTop: 3,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: labelSize,
              fontWeight: 900,
              letterSpacing: -0.8,
              backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.2,
              paddingBottom: 2,
              paddingRight: 2,
            }}
          >
            {safeLabel}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: suffSize,
              fontWeight: 700,
              color: PLUM,
              letterSpacing: -0.4,
              marginLeft: 1,
            }}
          >
            .igra
          </div>
        </div>

        {/* ── Footer row ─────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 6,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 7,
            letterSpacing: 0.8,
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                display: "flex",
                width: 4,
                height: 4,
                borderRadius: 999,
                background: PLUM,
                boxShadow: `0 0 4px ${PLUM}`,
              }}
            />
            <div style={{ display: "flex" }}>On-chain · Forever</div>
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.7)" }}>
            insdomains.org
          </div>
        </div>
      </div>
    ),
    {
      width: 200,
      height: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
