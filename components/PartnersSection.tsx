/**
 * Partners section — surfaces the orgs/teams that endorse + collaborate
 * with INS. Distinct from `IntegrationsRow`: integrations are technical
 * wallet/explorer integrations (resolves names natively); partners are
 * formal collaborators / endorsers / treasury counterparties.
 *
 * Day-1 launch lineup: just Igra Labs (the chain INS is native to).
 * As wallet teams ship integration + want to be listed here as well,
 * append to PARTNERS below — tile auto-renders.
 *
 * To swap the placeholder Igra mark for a real logo file: drop the SVG
 * at `public/partner-logos/igra-labs.svg`, then change `mark` to
 * `{ kind: "image", src: "/partner-logos/igra-labs.svg" }`.
 */

import { ExternalLink } from "lucide-react";

type PartnerMark =
  | { kind: "image"; src: string; alt: string }
  | { kind: "stylized"; initial: string };

type Partner = {
  name: string;
  url: string;
  /** One-line role/relationship — keeps the section honest about why they're here. */
  role: string;
  mark: PartnerMark;
  /** Soft accent colour used on the card border + glow. Tailwind class. */
  accent: "cyan" | "plum" | "emerald";
  /** Set true if this partnership is announced + live, false for "coming soon" slots. */
  live: boolean;
};

const PARTNERS: Partner[] = [
  {
    name: "Igra Labs",
    url: "https://igralabs.com",
    role: "Chain · L2 home of INS",
    mark: { kind: "stylized", initial: "i" },
    accent: "plum",
    live: true,
  },
  // Coming soon — KasWare, Kastle, Igra explorer maintainers, ENS team
  // (.eth integration), DAO partner. Append as each lands.
];

export function PartnersSection() {
  return (
    <section className="mt-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Partners</h2>
          <p className="mt-2 text-sm text-white/60">
            The teams building alongside us. More coming as wallet &amp;
            explorer integrations land.
          </p>
        </div>
        <a
          href="mailto:hello@insdomains.org"
          className="hidden text-xs text-white/45 hover:text-cyan sm:inline"
        >
          Want to partner? →
        </a>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNERS.map((p) => (
          <PartnerTile key={p.name} partner={p} />
        ))}
        {/* Placeholder slots — ghost cards hint at "this section is going
            to grow" without faking integrations that aren't live. */}
        <PlaceholderTile />
        <PlaceholderTile />
      </div>
    </section>
  );
}

function PartnerTile({ partner: p }: { partner: Partner }) {
  const accentMap = {
    cyan:    { ring: "border-cyan/30 hover:border-cyan/60", glow: "shadow-[0_0_40px_rgba(0,240,255,0.10)]", chip: "bg-cyan/15 text-cyan" },
    plum:    { ring: "border-plum/30 hover:border-plum/60", glow: "shadow-[0_0_40px_rgba(168,85,247,0.12)]", chip: "bg-plum/15 text-plum" },
    emerald: { ring: "border-emerald-500/30 hover:border-emerald-500/60", glow: "shadow-[0_0_40px_rgba(52,211,153,0.10)]", chip: "bg-emerald-500/15 text-emerald-300" },
  } as const;
  const a = accentMap[p.accent];

  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${a.ring} ${a.glow}`}
    >
      <div className="flex items-center gap-3">
        <PartnerMarkBlock mark={p.mark} accent={p.accent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">{p.name}</span>
            <ExternalLink className="h-3.5 w-3.5 text-white/30 transition group-hover:text-white/70" />
          </div>
          <span className={`mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${a.chip}`}>
            {p.live ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                Active
              </>
            ) : (
              "Coming soon"
            )}
          </span>
        </div>
      </div>
      <p className="text-sm text-white/60">{p.role}</p>
    </a>
  );
}

function PartnerMarkBlock({ mark, accent }: { mark: PartnerMark; accent: Partner["accent"] }) {
  if (mark.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mark.src}
        alt={mark.alt}
        className="h-12 w-12 flex-none rounded-xl object-contain"
      />
    );
  }

  // Stylized initial — used as a tasteful placeholder until real logo arrives.
  // Same gradient mark used on the brand favicon + promo image, so it stays
  // visually consistent with the rest of the site.
  const grad =
    accent === "cyan"    ? "from-cyan to-plum"      :
    accent === "emerald" ? "from-emerald-400 to-cyan" :
                           "from-cyan to-plum";
  return (
    <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-2xl font-black text-black shadow-[0_0_20px_rgba(168,85,247,0.35)]`}>
      {mark.initial}
    </div>
  );
}

function PlaceholderTile() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-5 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-white/10 text-white/20">
        +
      </div>
      <div className="text-xs text-white/35">Partner slot</div>
      <div className="text-[10px] text-white/25">Email to apply</div>
    </div>
  );
}
