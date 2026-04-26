import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { REGISTRY_ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const client = createPublicClient({ transport: http(RPC) });

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

/** Whitelist of allowed render sizes. 200 is the default (TG-friendly compact);
 *  larger sizes drive the on-site Share-to-X modal preview + the X intent
 *  card so they don't render upscaled-and-blurry. */
const ALLOWED_SIZES = [200, 400, 800, 1200] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];
const DEFAULT_SIZE: AllowedSize = 200;

/** Tier band based on label length — must match the on-chain tiered pricing. */
function tierFor(label: string): { tag: string; price: string; color: string } {
  const n = label.length;
  if (n <= 1) return { tag: "ULTRA-PREMIUM", price: "1,000", color: "#ff5fa2" };
  if (n <= 2) return { tag: "PREMIUM",       price: "500",   color: "#fb7185" };
  if (n <= 3) return { tag: "RARE",          price: "250",   color: "#f59e0b" };
  if (n <= 4) return { tag: "UNCOMMON",      price: "50",    color: "#34d399" };
  return        { tag: "STANDARD",      price: "30",    color: PLUM };
}

/** Auto-fit the label so it never overflows the card. Values returned at the
 *  200px baseline; the render multiplies by `scale` for larger renders. */
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
 * GET /api/nft-image/<tokenId>?size=<200|400|800|1200>
 *
 * Returns a square PNG of the .igra NFT card for `tokenId`. Used by the
 * Telegram activity bot's sendPhoto (default 200px = TG-compact) + the
 * on-site mint-success "Share to X" modal (1200px = sharp on retina).
 * Cached at the edge for 1h since the visual is deterministic per
 * (tokenId, size) combination.
 *
 * Design lives at the 200px baseline; larger sizes scale every numeric
 * value (fontSize / padding / borders / radii / shadows) by `size/200` so
 * the layout is identical at every supported resolution.
 *
 * 2026-04-26 — sized down from 600 → 400 → 200 to stop TG dominating the
 * feed. 2026-04-26 evening — added `?size=` so the modal can request a
 * crisp 1200px render without the bot losing its compact card.
 */
export async function GET(
  req: Request,
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

  // ── parse + validate ?size= ─────────────────────────────────
  const url = new URL(req.url);
  const sizeParam = parseInt(url.searchParams.get("size") ?? "", 10);
  const size: AllowedSize = (ALLOWED_SIZES as readonly number[]).includes(sizeParam)
    ? (sizeParam as AllowedSize)
    : DEFAULT_SIZE;
  const scale = size / 200;
  /** Helper: scale a 200-baseline pixel value to the chosen size. */
  const s = (n: number) => Math.round(n * scale * 100) / 100;

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
  const labelSize = s(labelFontSize(safeLabel.length));
  const suffSize  = s(suffixFontSize(safeLabel.length));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(170)}px ${s(140)}px at 80% 110%, rgba(168,85,247,0.32), transparent 70%), radial-gradient(${s(140)}px ${s(120)}px at 0% -10%, rgba(0,240,255,0.22), transparent 70%)`,
          padding: `${s(11)}px ${s(12)}px`,
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
          border: `1px solid rgba(255,255,255,0.08)`,
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
          <div style={{ display: "flex", alignItems: "center", gap: s(5) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: s(16),
                height: s(16),
                borderRadius: s(5),
                background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                color: "#000",
                fontSize: s(11),
                fontWeight: 900,
                boxShadow: `0 0 ${s(8)}px rgba(0,240,255,0.35)`,
              }}
            >
              i
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(7),
                fontWeight: 700,
                letterSpacing: s(1.5),
                color: "rgba(255,255,255,0.6)",
              }}
            >
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: `${s(1)}px ${s(5)}px`,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              fontSize: s(7),
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            #{tokenIdStr}
          </div>
        </div>

        {/* ── Tier pill ───────────────────────────── */}
        <div style={{ display: "flex", marginTop: s(7) }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: `${s(2)}px ${s(6)}px`,
              borderRadius: 999,
              border: `1px solid ${tier.color}66`,
              background: `${tier.color}1f`,
              color: tier.color,
              fontSize: s(7),
              fontWeight: 800,
              letterSpacing: s(1.2),
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
            paddingTop: s(3),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: labelSize,
              fontWeight: 900,
              letterSpacing: s(-0.8),
              backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.2,
              paddingBottom: s(2),
              paddingRight: s(2),
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
              letterSpacing: s(-0.4),
              marginLeft: s(1),
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
            paddingTop: s(6),
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: s(7),
            letterSpacing: s(0.8),
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: s(4) }}>
            <div
              style={{
                display: "flex",
                width: s(4),
                height: s(4),
                borderRadius: 999,
                background: PLUM,
                boxShadow: `0 0 ${s(4)}px ${PLUM}`,
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
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
