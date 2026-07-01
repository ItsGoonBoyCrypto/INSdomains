import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/** Read a logo from public/wallet-logos and inline it as a data URL so
 *  next/og doesn't have to network-fetch during render. */
function logoDataUrl(filename: string, mime: string): string {
  const p = path.join(process.cwd(), "public", "wallet-logos", filename);
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}

const LOGOS = {
  kasware:  logoDataUrl("kasware.png",  "image/png"),
  kastle:   logoDataUrl("kastle.png",   "image/png"),
  kurncy:   logoDataUrl("kurncy.jpg",   "image/jpeg"),
  kasperia: logoDataUrl("kasperia.jpg", "image/jpeg"),
};

/**
 * GET /api/rollout-image?size=hd|qhd|4k
 *
 * "The Rollout" wallet-integration card. MetaMask went LIVE (0.1.1
 * merged in snaps-registry #1506 on 2026-07-01); Kastle, Kasware,
 * Kurncy and Kasperia are either shipped or confirmed integrating.
 *
 * Visual language matches the multitude-support redesign (Igra
 * palette: mint teal + warm sand + electric yellow, dark gray base
 * instead of pure ink) — deliberately not the snap-launch template.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

const TEAL = "#6bd1c3";
const TEAL_DIM = "#3a8e80";
const SAND = "#eed58a";
const ORANGE = "#ff8a5f";
const GRAY_950 = "#0a0a0a";
const GRAY_900 = "#141414";
const GRAY_800 = "#1a1a1a";
const GRAY_700 = "#2a2a2a";

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

type Wallet = {
  name: string;
  /** if set, use a real image logo; otherwise fall back to the monogram/mark */
  logoUrl?: string;
  monogram?: string;
  mark?: string;
  status: "LIVE" | "CONFIRMED";
};

const WALLETS: Wallet[] = [
  // MetaMask keeps the M-on-orange monogram treatment (looks clean, matches design)
  { name: "MetaMask", monogram: "M", mark: ORANGE, status: "LIVE" },
  // Kaspa-native wallets get their real brand logos
  { name: "Kastle",   logoUrl: LOGOS.kastle,   status: "CONFIRMED" },
  { name: "Kasware",  logoUrl: LOGOS.kasware,  status: "CONFIRMED" },
  { name: "Kurncy",   logoUrl: LOGOS.kurncy,   status: "CONFIRMED" },
  { name: "Kasperia", logoUrl: LOGOS.kasperia, status: "CONFIRMED" },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: GRAY_950,
          backgroundImage: `radial-gradient(${s(1200)}px ${s(900)}px at 15% 90%, rgba(107,209,195,0.18), transparent 62%), radial-gradient(${s(1000)}px ${s(800)}px at 95% 15%, rgba(255,138,95,0.10), transparent 60%)`,
          fontFamily: "sans-serif",
          padding: `${s(28)}px ${s(32)}px`,
        }}
      >
        {/* Inner framed card — that thin rounded-rect border is a signature of the original */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            borderRadius: s(20),
            border: `1px solid ${GRAY_700}`,
            background: `linear-gradient(180deg, ${GRAY_900} 0%, ${GRAY_950} 100%)`,
            padding: `${s(40)}px ${s(56)}px ${s(30)}px ${s(56)}px`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: s(15),
                fontWeight: 700,
                letterSpacing: s(5),
                color: TEAL,
                opacity: 0.9,
              }}
            >
              THE ROLLOUT
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: s(10),
                fontFamily: "monospace",
                fontSize: s(15),
                fontWeight: 700,
                letterSpacing: s(4),
                color: TEAL,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: s(9),
                  height: s(9),
                  borderRadius: 999,
                  background: TEAL,
                  boxShadow: `0 0 ${s(12)}px ${TEAL}`,
                }}
              />
              LIVE IN METAMASK
            </div>
          </div>

          {/* Hero block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: s(50),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(96),
                fontWeight: 800,
                letterSpacing: s(-2),
                color: "#fff",
                lineHeight: 1,
              }}
            >
              The first wallet.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(96),
                fontWeight: 800,
                letterSpacing: s(-2),
                color: TEAL,
                lineHeight: 1,
                marginTop: s(6),
                textShadow: `0 0 ${s(40)}px rgba(107,209,195,0.35)`,
              }}
            >
              Not the last.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: s(8),
                fontSize: s(26),
                fontWeight: 500,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.6)",
                marginTop: s(20),
                letterSpacing: s(1),
              }}
            >
              <span style={{ display: "flex" }}>One name, every app,</span>
              <span style={{ display: "flex", color: ORANGE, fontWeight: 700 }}>every wallet.</span>
            </div>
          </div>

          {/* 5-wallet row */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: s(16),
              marginTop: s(40),
            }}
          >
            {WALLETS.map((wallet) => {
              const isLive = wallet.status === "LIVE";
              return (
                <div
                  key={wallet.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: `${s(22)}px ${s(18)}px ${s(20)}px ${s(18)}px`,
                    borderRadius: s(16),
                    border: isLive
                      ? `1px solid ${TEAL}88`
                      : `1px solid ${GRAY_700}`,
                    background: isLive
                      ? `linear-gradient(180deg, ${TEAL}18 0%, ${GRAY_900} 100%)`
                      : GRAY_800,
                    boxShadow: isLive
                      ? `0 0 ${s(36)}px ${TEAL}30`
                      : "none",
                    minWidth: s(190),
                  }}
                >
                  {/* logo tile — real image for Kaspa-native wallets, monogram for MetaMask */}
                  {wallet.logoUrl ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: s(64),
                        height: s(64),
                        borderRadius: s(14),
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={wallet.logoUrl}
                        alt={wallet.name}
                        width={s(64)}
                        height={s(64)}
                        style={{ display: "block", objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: s(64),
                        height: s(64),
                        borderRadius: s(14),
                        background: wallet.mark ?? TEAL,
                        color: "#000",
                        fontSize: s(30),
                        fontWeight: 900,
                        letterSpacing: s(-1),
                      }}
                    >
                      {wallet.monogram}
                    </div>
                  )}

                  {/* name */}
                  <div
                    style={{
                      display: "flex",
                      marginTop: s(14),
                      fontSize: s(24),
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {wallet.name}
                  </div>

                  {/* status pill */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: s(7),
                      marginTop: s(8),
                      fontFamily: "monospace",
                      fontSize: s(13),
                      fontWeight: 700,
                      letterSpacing: s(2),
                      color: isLive ? TEAL : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: s(7),
                        height: s(7),
                        borderRadius: 999,
                        background: isLive ? TEAL : "rgba(255,255,255,0.35)",
                        boxShadow: isLive ? `0 0 ${s(8)}px ${TEAL}` : "none",
                      }}
                    />
                    {wallet.status}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: s(38),
              gap: s(16),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: s(10),
                fontSize: s(30),
                fontWeight: 700,
                color: "#fff",
              }}
            >
              <span style={{ display: "flex" }}>Grab your name while it's</span>
              <span style={{ display: "flex", color: TEAL, fontWeight: 900 }}>early.</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: `${s(14)}px ${s(38)}px`,
                borderRadius: s(14),
                background: TEAL,
                color: "#000",
                fontFamily: "monospace",
                fontSize: s(28),
                fontWeight: 900,
                letterSpacing: s(0.5),
                boxShadow: `0 0 ${s(50)}px ${TEAL}70`,
              }}
            >
              insdomains.org
            </div>
          </div>

          {/* spacer */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* Bottom-left brand strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(14),
              fontFamily: "monospace",
              fontSize: s(15),
              fontWeight: 700,
              letterSpacing: s(3),
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span style={{ display: "flex", color: "#fff" }}>INSDOMAINS</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ display: "flex" }}>insdomains.org</span>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      emoji: "twemoji",
      headers: {
        "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
