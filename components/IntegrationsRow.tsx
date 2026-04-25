import {
  VISIBLE_INTEGRATIONS,
  LIVE_INTEGRATIONS,
  type Integration,
} from "@/lib/integrations";

/**
 * Homepage strip listing wallets / explorers / dApps that resolve INS names.
 *
 * Renders nothing while the list is empty (no awkward "your logo here"
 * placeholder). The moment the first integration ships, append to
 * `lib/integrations.ts` and this strip auto-appears on the homepage.
 *
 * Live integrations render at full opacity; in-progress ones get a
 * "soon" badge + slight desaturation so the reader can tell what's
 * already shipped vs what's announced.
 */
export function IntegrationsRow() {
  if (VISIBLE_INTEGRATIONS.length === 0) return null;

  const liveCount = LIVE_INTEGRATIONS.length;

  return (
    <section className="mt-24 w-full">
      <div className="mb-6 flex items-center justify-center gap-3">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          {liveCount > 0 ? "Resolves natively in" : "Integrating soon with"}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {VISIBLE_INTEGRATIONS.map((i) => (
          <Tile key={i.name} integration={i} />
        ))}
      </div>
    </section>
  );
}

function Tile({ integration: i }: { integration: Integration }) {
  const isLive = i.status === "live";
  return (
    <a
      href={i.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
        isLive ? "opacity-90 hover:opacity-100" : "opacity-50 hover:opacity-75"
      }`}
      title={isLive ? `${i.name} — INS names live` : `${i.name} — integration in progress`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={i.logoSrc}
        alt={i.logoAlt}
        className="h-8 w-8 rounded-md object-contain"
      />
      <span className="flex flex-col items-start">
        <span className="text-sm font-semibold text-white/85">{i.name}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/35">
          {labelForKind(i.kind)}
        </span>
      </span>
      {!isLive && (
        <span className="ml-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">
          soon
        </span>
      )}
    </a>
  );
}

function labelForKind(kind: Integration["kind"]): string {
  switch (kind) {
    case "wallet":   return "wallet";
    case "explorer": return "explorer";
    case "dapp":     return "dapp";
  }
}
