import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, Check, Hourglass, Lock, ShieldCheck, Users, Vote,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "INS DAO — Coming Soon",
  description:
    "The INS DAO will take ownership of the treasury Safe and steer the .ins / .igra / .ikas registries. Governance launch is queued — here's the phase-in plan.",
};

export default function DaoPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300">
          <Hourglass className="h-3.5 w-3.5" /> Coming Soon
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-6xl">
          INS <span className="ins-gradient-text">DAO</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/60">
          Ownership of the treasury Safe and the nine INS contracts will
          transition from the founding multisig to a community-governed DAO.
          This page tracks the handover plan — the steps are published in advance
          so you know exactly what happens, and when.
        </p>

        {/* Illustration */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan/[0.04] via-transparent to-plum/[0.06] p-10">
          <DaoIllustration />
        </div>

        {/* Roadmap */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Handover roadmap</h2>
          <p className="mt-3 text-sm text-white/60">
            Four phases over the first year of mainnet. Treasury stays Safe-controlled
            until phase 3; the DAO doesn&rsquo;t get the keys until the community is
            proven-in.
          </p>

          <ol className="mt-6 space-y-4">
            <Phase
              state="done"
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
              title="Phase 0 · Safe launch"
              body="All 9 contracts deployed with ownership atomically handed to the Igra Safe on the same block they were created — the deployer EOA never retained control. Confirmed on-chain: Registries, ReverseResolvers, Marketplaces, Resolver all owned by the same Safe."
              tag="Live now"
            />
            <Phase
              state="active"
              icon={<Lock className="h-5 w-5 text-cyan" />}
              title="Phase 1 · Treasury transparency"
              body="Every withdrawal, fee tuning, or reservation lands on-chain and can be read via /admin. The Safe publishes proposal IDs + signer rationale per tx. Treasury balance + fee bps visible in the app in real time."
              tag="In progress"
            />
            <Phase
              state="pending"
              icon={<Users className="h-5 w-5 text-plum" />}
              title="Phase 2 · Governance token + signal voting"
              body="INS governance token (or nominated proxy) issued to holders. Forum + off-chain snapshot voting for reserved-name policy, treasury spend proposals, marketplace fee-bps tuning. Safe signers take snapshot outcomes as guidance."
              tag="Q3 2026"
            />
            <Phase
              state="pending"
              icon={<Vote className="h-5 w-5 text-plum" />}
              title="Phase 3 · DAO key-handover"
              body="Safe ownership transferred to a DAO-controlled executor contract. Proposals that pass on-chain vote execute the admin call directly (setReserved, setLengthPrice, setTreasury, setPaused, etc.). Team signers burn their own keys."
              tag="Q4 2026 +"
            />
            <Phase
              state="pending"
              icon={<Check className="h-5 w-5 text-emerald-400" />}
              title="Phase 4 · Protocol-owned"
              body="No team-held keys remain. All protocol parameters move on a strictly governance-voted schedule. Subnames, additional TLDs, and cross-chain expansions ship by DAO vote, not founder fiat."
              tag="2027"
            />
          </ol>
        </section>

        {/* What participation will look like */}
        <section className="mt-16 rounded-3xl border border-plum/20 bg-plum/[0.04] p-8">
          <h2 className="text-xl font-bold">What you&rsquo;ll be able to vote on</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <VoteItem>Reserved-name policy per TLD (add / remove)</VoteItem>
            <VoteItem>Tier pricing tuning (2/3/4/5+ char, per TLD)</VoteItem>
            <VoteItem>Marketplace sale + featured-listing fee bps (capped at 500)</VoteItem>
            <VoteItem>Treasury spend proposals (grants, bounties, liquidity)</VoteItem>
            <VoteItem>Subname launch parameters</VoteItem>
            <VoteItem>Cross-chain expansion (L1 / other L2s)</VoteItem>
          </ul>
          <p className="mt-5 text-xs text-white/50">
            Hard-coded invariants — <strong>no custody of user funds</strong>, <strong>500 bps fee ceiling</strong>,
            <strong> no name expiry</strong> — are immutable on the Registry + Marketplace contracts.
            The DAO cannot override them without a new deploy + community migration.
          </p>
        </section>

        {/* CTA row */}
        <section className="mt-16 rounded-3xl border border-cyan/20 bg-cyan/[0.04] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-bold">Want to help shape it?</div>
              <p className="mt-1 text-sm text-white/60">
                Join the Telegram — governance discussions start there first.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://t.me/IgraNameService"
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary"
              >
                Join Telegram <ArrowRight className="ml-1 inline h-4 w-4" />
              </a>
              <Link href="/about" className="btn-ghost">
                Read the stack
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Phase({
  state, icon, title, body, tag,
}: {
  state: "done" | "active" | "pending";
  icon: React.ReactNode;
  title: string;
  body: string;
  tag: string;
}) {
  const ring =
    state === "done"   ? "border-emerald-500/30 bg-emerald-500/[0.04]" :
    state === "active" ? "border-cyan/40 bg-cyan/[0.05]" :
                         "border-white/10 bg-white/[0.02]";
  const tagColour =
    state === "done"   ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
    state === "active" ? "border-cyan/40 bg-cyan/10 text-cyan" :
                         "border-white/10 bg-white/[0.04] text-white/50";
  return (
    <li className={`relative overflow-hidden rounded-2xl border p-5 ${ring}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-white/10 bg-black/30">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tagColour}`}>
              {tag}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/65">{body}</p>
        </div>
      </div>
    </li>
  );
}

function VoteItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-white/75">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-cyan" />
      <span>{children}</span>
    </li>
  );
}

/**
 * Inline SVG: three overlapping circles (Safe signers) handing to a larger
 * circle (community), echoing the .ins / .igra / .ikas brand gradient.
 * Pure CSS-free SVG so it renders identically on all devices.
 */
function DaoIllustration() {
  return (
    <svg
      viewBox="0 0 600 280"
      className="mx-auto block h-auto w-full max-w-[720px]"
      role="img"
      aria-label="Multisig Safe handing governance to the INS DAO community"
    >
      <defs>
        <linearGradient id="dao-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#06c2d3" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="dao-plum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="dao-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="dao-big" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#00f0ff" />
          <stop offset="50%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <filter id="dao-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Left cluster — the Safe multisig (3 signers, one per brand colour) */}
      <g>
        <text x="120" y="36" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="#9aa0b4" textAnchor="middle" letterSpacing="1.5">MULTISIG SAFE</text>
        {/* signer dots */}
        <circle cx="70"  cy="100" r="30" fill="url(#dao-cyan)" />
        <circle cx="140" cy="80"  r="30" fill="url(#dao-plum)" />
        <circle cx="110" cy="160" r="30" fill="url(#dao-emerald)" />
        {/* connecting lines between signers */}
        <line x1="70"  y1="100" x2="140" y2="80"  stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
        <line x1="140" y1="80"  x2="110" y2="160" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
        <line x1="110" y1="160" x2="70"  y2="100" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
      </g>

      {/* Arrow — hand-over direction */}
      <g>
        <line x1="210" y1="120" x2="360" y2="120" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
        <polygon points="360,120 350,114 350,126" fill="#ffffff" fillOpacity="0.5" />
        <text x="285" y="108" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="#e8e8f5" textAnchor="middle" letterSpacing="1">HANDOVER</text>
      </g>

      {/* Right cluster — the DAO community */}
      <g>
        <text x="480" y="36" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="#9aa0b4" textAnchor="middle" letterSpacing="1.5">INS DAO</text>
        {/* big community circle with halo */}
        <circle cx="480" cy="140" r="85" fill="url(#dao-big)" fillOpacity="0.12" filter="url(#dao-glow)" />
        <circle cx="480" cy="140" r="60" fill="none" stroke="url(#dao-big)" strokeWidth="2" />
        {/* small community dots */}
        <circle cx="440" cy="100" r="7" fill="url(#dao-cyan)" />
        <circle cx="520" cy="100" r="7" fill="url(#dao-plum)" />
        <circle cx="435" cy="160" r="7" fill="url(#dao-emerald)" />
        <circle cx="520" cy="170" r="7" fill="url(#dao-cyan)" />
        <circle cx="470" cy="182" r="7" fill="url(#dao-plum)" />
        <circle cx="500" cy="112" r="7" fill="url(#dao-emerald)" />
        {/* centre label */}
        <text x="480" y="135" fontFamily="Inter,system-ui,sans-serif" fontSize="14" fontWeight="700" fill="#ffffff" textAnchor="middle">community</text>
        <text x="480" y="152" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="#e8e8f5" fillOpacity="0.7" textAnchor="middle">holders · voters</text>
      </g>

      {/* Footer caption */}
      <text x="300" y="260" fontFamily="Inter,system-ui,sans-serif" fontSize="11" fill="#9aa0b4" textAnchor="middle" letterSpacing="1.5">
        Safe-held today · DAO-held by phase 3 · protocol-owned by phase 4
      </text>
    </svg>
  );
}
