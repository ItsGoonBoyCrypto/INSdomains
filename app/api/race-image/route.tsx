import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";

/**
 * GET /api/race-image?size=hd|qhd|4k
 *
 * "THE BIG 250" race-to-#250 promo. Live V2 supply read from /api/stats so the
 * progress bar is always current — fall back to a sensible snapshot if the
 * stats call fails. Reusable for any milestone race by bumping TARGET.
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const TARGET = 250;
const FALLBACK_SUPPLY = 134;

async function fetchSupply(): Promise<number | null> {
  try {
    const r = await fetch("https://insdomains.org/api/stats", { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    const n = Number(d?.v2?.total_supply);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const live = await fetchSupply();
  const supply = live ?? FALLBACK_SUPPLY;
  const pct = Math.min(100, Math.max(0, Math.round((supply / TARGET) * 100)));
  const togo = Math.max(0, TARGET - supply);

  const SPARKS: [number, number, number, number, number][] = [
    [10, 18, 14, 45, 0.45], [22, 75, 11, 30, 0.4], [40, 12, 13, 45, 0.4],
    [60, 84, 9, 20, 0.35], [78, 28, 18, 45, 0.45], [88, 68, 12, 30, 0.4],
    [70, 50, 8, 45, 0.5], [35, 88, 10, 20, 0.3], [92, 14, 9, 45, 0.4],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(900)}px ${s(680)}px at 50% 36%, rgba(0,240,255,0.28), transparent 64%), radial-gradient(${s(900)}px ${s(760)}px at 100% 100%, rgba(168,85,247,0.30), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 0% -8%, rgba(0,240,255,0.18), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        {/* Sparkles */}
        {SPARKS.map(([x, y, sz, rot, op], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              display: "flex",
              width: s(sz),
              height: s(sz),
              borderRadius: s(3),
              transform: `rotate(${rot}deg)`,
              background: i % 2 === 0 ? CYAN : PLUM,
              opacity: op,
              boxShadow: `0 0 ${s(18)}px ${i % 2 === 0 ? CYAN : PLUM}`,
            }}
          />
        ))}

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: `${s(54)}px ${s(80)}px` }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: s(18) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: s(62), height: s(62), borderRadius: s(17), background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`, color: "#000", fontSize: s(40), fontWeight: 900, boxShadow: `0 0 ${s(40)}px rgba(0,240,255,0.5)` }}>i</div>
              <div style={{ display: "flex", fontSize: s(26), fontWeight: 800, letterSpacing: s(6), color: "rgba(255,255,255,0.72)" }}>IGRA NAME SERVICE</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(12), padding: `${s(10)}px ${s(24)}px`, borderRadius: 999, border: `1px solid ${AMBER}77`, background: `${AMBER}22`, fontSize: s(22), fontWeight: 900, letterSpacing: s(5), color: "#fef3c7", boxShadow: `0 0 ${s(40)}px ${AMBER}55` }}>
              🎰 72-HOUR RACE
            </div>
          </div>

          {/* Hero title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(30) }}>
            <div style={{ display: "flex", fontSize: s(38), fontWeight: 800, letterSpacing: s(8), color: "rgba(255,255,255,0.65)" }}>THE BIG</div>
            <div style={{ display: "flex", fontSize: s(230), fontWeight: 900, letterSpacing: s(-6), lineHeight: 1.0, marginTop: s(-2), backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`, backgroundClip: "text", color: "transparent" }}>250</div>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 700, letterSpacing: s(4), color: "rgba(255,255,255,0.52)", marginTop: s(6) }}>RACE TO MINT #250</div>
          </div>

          {/* Progress bar */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: s(34), gap: s(10) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: s(20), fontWeight: 800, color: "rgba(255,255,255,0.65)", letterSpacing: s(2) }}>
              <div style={{ display: "flex" }}>{supply} MINTED</div>
              <div style={{ display: "flex" }}>{togo} TO GO · {pct}%</div>
            </div>
            <div style={{ display: "flex", width: "100%", height: s(20), borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", overflow: "hidden" }}>
              <div style={{ display: "flex", width: `${pct}%`, height: "100%", backgroundImage: `linear-gradient(90deg, ${CYAN} 0%, ${PLUM} 100%)`, boxShadow: `0 0 ${s(30)}px rgba(0,240,255,0.55)` }} />
            </div>
          </div>

          {/* Prizes */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: s(24), gap: s(10) }}>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: s(5) }}>PRIZES</div>
            <div style={{ display: "flex", gap: s(14) }}>
              <PrizeChip s={s} icon="🎰" title="#250 holder" sub="auto lucky winner" tint={AMBER} />
              <PrizeChip s={s} icon="★" title="1-char ULTRA-PREMIUM" sub="raffle · 4,000 iKAS value" tint="#f87171" />
              <PrizeChip s={s} icon="◆" title="3× 3-char Forever" sub="runner-ups · 1,200 iKAS each" tint={PLUM} />
            </div>
          </div>

          {/* Entry */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: s(18), gap: s(10) }}>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: s(5) }}>ENTER</div>
            <div style={{ display: "flex", gap: s(14) }}>
              <EntryChip s={s} n="1" tint={CYAN} title="Mint a .igra" sub="1 entry Annual · 3 entries Forever" />
              <EntryChip s={s} n="2" tint={EMERALD} title="Quote-tweet your card" sub="tag @IgraNameService · +2 entries" />
            </div>
          </div>

          {/* Spacer + Footer */}
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: s(18), borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", fontSize: s(32), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org</div>
            <div style={{ display: "flex", gap: s(18), fontSize: s(20), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
              <div style={{ display: "flex" }}>@IgraNameService</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
              <div style={{ display: "flex" }}>Live on Igra L2</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}

function PrizeChip({ s, icon, title, sub, tint }: { s: (n: number) => number; icon: string; title: string; sub: string; tint: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${s(16)}px ${s(22)}px`, borderRadius: s(18), background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", gap: s(4) }}>
      <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: s(38), height: s(38), borderRadius: 999, background: tint, color: "#000", fontSize: s(20), fontWeight: 900, boxShadow: `0 0 ${s(20)}px ${tint}77` }}>{icon}</div>
        <div style={{ display: "flex", fontSize: s(22), fontWeight: 800, color: "#fff" }}>{title}</div>
      </div>
      <div style={{ display: "flex", fontSize: s(18), fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: s(50) }}>{sub}</div>
    </div>
  );
}

function EntryChip({ s, n, tint, title, sub }: { s: (n: number) => number; n: string; tint: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${s(16)}px ${s(22)}px`, borderRadius: s(18), background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", gap: s(4) }}>
      <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: s(40), height: s(40), borderRadius: 999, background: tint, color: "#000", fontSize: s(22), fontWeight: 900, boxShadow: `0 0 ${s(22)}px ${tint}88` }}>{n}</div>
        <div style={{ display: "flex", fontSize: s(24), fontWeight: 800, color: "#fff" }}>{title}</div>
      </div>
      <div style={{ display: "flex", fontSize: s(18), fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: s(52) }}>{sub}</div>
    </div>
  );
}
