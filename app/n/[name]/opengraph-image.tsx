import { ImageResponse } from "next/og";
import { resolveName } from "@/lib/server-resolver";
import { TLDS, tldSuffix, type Tld } from "@/lib/contracts";
import { isValidLabel } from "@/lib/names";

export const alt = "INS name on Igra Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const EMERALD = "#34d399";
const INK = "#0a0a0a";

const TLD_COLOR: Record<Tld, string> = {
  ins: CYAN,
  igra: PLUM,
  ikas: EMERALD,
};

function parseRouteName(raw: string): { label: string; tld: Tld | null } {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  for (const tld of TLDS) {
    if (s.endsWith("." + tld)) return { label: s.slice(0, -(tld.length + 1)), tld };
  }
  return { label: s, tld: null };
}

export default async function NameOG({ params }: { params: { name: string } }) {
  const parsed = parseRouteName(params.name);

  // Sanitise: invalid labels fall back to a generic INS card.
  const safeLabel = parsed.label && isValidLabel(parsed.label) ? parsed.label : "—";
  const tldsToTry: Tld[] = parsed.tld ? [parsed.tld] : [...TLDS];

  // Find the first minted TLD (if any). If none minted, default to the
  // requested TLD (or .ins) and render the "available" state.
  let chosenTld: Tld = parsed.tld ?? "ins";
  let exists = false;
  for (const t of tldsToTry) {
    const r = await resolveName(safeLabel, t).catch(() => null);
    if (r?.exists) {
      chosenTld = t;
      exists = true;
      break;
    }
  }

  const accent = TLD_COLOR[chosenTld];
  const display = `${safeLabel}${tldSuffix(chosenTld)}`;

  // Pick name font size based on length so it always fits.
  const nameSize =
    display.length <= 8 ? 220 :
    display.length <= 14 ? 160 :
    display.length <= 20 ? 120 :
    display.length <= 28 ? 90 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(900px 600px at 85% 110%, ${accent}33, transparent 70%), radial-gradient(700px 500px at 5% -10%, ${accent}22, transparent 70%)`,
          padding: "56px 70px",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* top brand strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              color: "#000",
              fontSize: 26,
              fontWeight: 900,
              boxShadow: `0 0 24px ${CYAN}55`,
            }}
          >
            i
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.2 }}>INS</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: -2 }}>
              Igra Name Service
            </div>
          </div>
        </div>

        {/* center — the name itself, large */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "100%",
            }}
          >
            <span style={{ color: "#fff" }}>{safeLabel}</span>
            <span style={{ color: accent }}>{tldSuffix(chosenTld)}</span>
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: 999,
              border: `1px solid ${exists ? accent : "#34d399"}88`,
              background: exists ? `${accent}1a` : "rgba(52,211,153,0.10)",
              color: exists ? accent : "#34d399",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 1.5,
            }}
          >
            {exists ? "MINTED ON IGRA" : "AVAILABLE TO CLAIM"}
          </div>
        </div>

        {/* bottom row — call-to-action + brand line */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>
              insdomains.org
            </div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>
              Pay once · 0 renewal fee · forever
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 13,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            chain 38833 · iKAS
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
