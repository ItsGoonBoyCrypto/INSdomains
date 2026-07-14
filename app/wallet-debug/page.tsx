"use client";

/**
 * /wallet-debug — diagnostic page for wallet-integration partners.
 *
 * Renders EVERYTHING a wallet could inject / announce / expose:
 *   - `window.ethereum` presence + isFoo flags
 *   - Wallet-y namespaces: window.kasperia, .kasware, .kastle, .kurncy, .kaspa
 *   - Full EIP-6963 announced-provider list (rdns / name / uuid / icon)
 *   - Timing info (how long after page load the first announce arrived)
 *
 * A wallet dev opens this in their in-app browser, screenshots the
 * dump, and sends back — we can then see the exact injection shape
 * without a debug ping-pong.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Eip6963Info = { uuid?: string; name?: string; icon?: string; rdns?: string };
type Eip6963Announce = { info: Eip6963Info };

type WindowCheck = { path: string; present: boolean; kind: string; sample?: string };

const CHECK_PATHS = [
  "ethereum",
  "ethereum.isMetaMask",
  "ethereum.isRabby",
  "ethereum.isCoinbaseWallet",
  "ethereum.isKasperia",
  "ethereum.isKasware",
  "ethereum.isKastle",
  "ethereum.isKurncy",
  "kasperia",
  "kasperia.ethereum",
  "kasperia.provider",
  "kasperia.request",
  "kasware",
  "kasware.ethereum",
  "kastle",
  "kastle.ethereum",
  "kastle.provider",
  "kurncy",
  "kurncy.ethereum",
  "kaspa",
  "kaspa.evm",
  "kaspaWallet",
  "webkit.messageHandlers",
];

function resolve(paths: string[]): unknown {
  const w = window as unknown as Record<string, unknown>;
  return paths.reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    w,
  );
}

function describe(v: unknown): { kind: string; sample?: string } {
  if (v === undefined) return { kind: "undefined" };
  if (v === null) return { kind: "null" };
  if (typeof v === "function") return { kind: "function" };
  if (typeof v === "boolean") return { kind: `boolean (${String(v)})` };
  if (typeof v === "string") return { kind: "string", sample: (v as string).slice(0, 80) };
  if (typeof v === "number") return { kind: `number (${v})` };
  if (typeof v === "object") {
    const keys = Object.keys(v as object).slice(0, 8).join(", ");
    return { kind: "object", sample: keys ? `keys: {${keys}}` : "(empty)" };
  }
  return { kind: typeof v };
}

export default function WalletDebugPage() {
  const [windowChecks, setWindowChecks] = useState<WindowCheck[]>([]);
  const [eipProviders, setEipProviders] = useState<Eip6963Announce[]>([]);
  const [ua, setUa] = useState<string>("");
  const [tSincePageLoad, setTSincePageLoad] = useState<number | null>(null);
  const [firstAnnounceMs, setFirstAnnounceMs] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t0 = performance.now();

    // Snapshot every window.* path we care about
    const snap: WindowCheck[] = CHECK_PATHS.map((path) => {
      const parts = path.split(".");
      const v = resolve(parts);
      const d = describe(v);
      return { path: `window.${path}`, present: v !== undefined, kind: d.kind, sample: d.sample };
    });
    setWindowChecks(snap);

    setUa(navigator.userAgent);
    setTSincePageLoad(Math.round(performance.now()));

    // Listen for EIP-6963 announces
    const seen = new Map<string, Eip6963Announce>();
    const handler = (event: Event) => {
      const custom = event as CustomEvent<Eip6963Announce>;
      const detail = custom.detail;
      if (!detail?.info?.uuid) return;
      seen.set(detail.info.uuid, detail);
      setEipProviders(Array.from(seen.values()));
      setFirstAnnounceMs((prev) => prev ?? Math.round(performance.now() - t0));
    };
    window.addEventListener("eip6963:announceProvider", handler as EventListener);
    // Request all wallets to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Re-request after 500ms in case some wallets late-init
    const t1 = setTimeout(() => window.dispatchEvent(new Event("eip6963:requestProvider")), 500);
    const t2 = setTimeout(() => window.dispatchEvent(new Event("eip6963:requestProvider")), 2000);

    return () => {
      window.removeEventListener("eip6963:announceProvider", handler as EventListener);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tick]);

  const copyReport = async () => {
    const report = {
      ua,
      timeSincePageLoadMs: tSincePageLoad,
      firstEip6963AnnounceMs: firstAnnounceMs,
      windowNamespaces: windowChecks.filter((c) => c.present).map((c) => ({
        path: c.path,
        kind: c.kind,
        ...(c.sample ? { sample: c.sample } : {}),
      })),
      eip6963Announces: eipProviders.map((p) => ({
        rdns: p.info?.rdns,
        name: p.info?.name,
        uuid: p.info?.uuid,
        icon: p.info?.icon?.slice(0, 60) + (p.info?.icon && p.info.icon.length > 60 ? "…" : ""),
      })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      alert("Report copied to clipboard. Paste in your bug report / DM.");
    } catch {
      alert("Clipboard blocked — long-press select the JSON below and copy manually.");
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-12 pb-24">
        <div className="mb-4 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-300/80">
          Wallet integration diagnostic
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          What is your wallet <span className="text-emerald-300">injecting</span>?
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Open this page in the wallet you&apos;re integrating (in-app browser, extension, or
          mobile browser). This page snapshots every EIP-1193 / EIP-6963 signal we can
          see — screenshot or copy the report and send it to us, we&apos;ll wire the connector.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={copyReport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-black text-black hover:brightness-110"
          >
            <Copy className="h-4 w-4" /> Copy full JSON report
          </button>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" /> Re-scan
          </button>
        </div>

        {/* Meta */}
        <Section title="Environment">
          <Row label="User-Agent" value={ua || "(unknown)"} />
          <Row label="Time since page load" value={tSincePageLoad !== null ? `${tSincePageLoad} ms` : "—"} />
          <Row
            label="First EIP-6963 announce"
            value={firstAnnounceMs !== null ? `${firstAnnounceMs} ms after load` : "not yet received"}
          />
        </Section>

        {/* EIP-6963 */}
        <Section title={`EIP-6963 announced providers (${eipProviders.length})`}>
          {eipProviders.length === 0 && (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.05] p-4 text-sm text-amber-200">
              No EIP-6963 announcements received yet. Either the wallet doesn&apos;t
              implement EIP-6963 (fine — window.* namespace fallback might still work),
              or its announcement arrives more than ~2s after page load (rare).
            </div>
          )}
          {eipProviders.map((p, i) => (
            <div key={i} className="rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-4 mb-2">
              <div className="grid gap-1 text-xs">
                <Row label="name" value={p.info?.name ?? "(missing)"} mono />
                <Row label="rdns" value={p.info?.rdns ?? "(missing)"} mono />
                <Row label="uuid" value={p.info?.uuid ?? "(missing)"} mono />
                <Row
                  label="icon"
                  value={p.info?.icon ? p.info.icon.slice(0, 100) + (p.info.icon.length > 100 ? "…" : "") : "(missing)"}
                  mono
                />
              </div>
            </div>
          ))}
        </Section>

        {/* Window namespaces */}
        <Section title="window.* namespace check">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono uppercase tracking-widest text-white/50">
                <tr>
                  <th className="px-3 py-2 font-normal">Path</th>
                  <th className="px-3 py-2 font-normal">Present</th>
                  <th className="px-3 py-2 font-normal">Kind</th>
                  <th className="px-3 py-2 font-normal">Sample</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {windowChecks.map((c, i) => (
                  <tr key={i} className={c.present ? "bg-emerald-400/[0.04]" : ""}>
                    <td className="px-3 py-2 font-mono text-white">{c.path}</td>
                    <td className="px-3 py-2">
                      {c.present ? (
                        <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                          YES
                        </span>
                      ) : (
                        <span className="text-white/30">·</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-white/70">{c.kind}</td>
                    <td className="px-3 py-2 font-mono text-white/50">{c.sample ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-mono uppercase tracking-widest text-white/50">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">{label}</div>
      <div className={"break-all text-sm text-white/85 " + (mono ? "font-mono" : "")}>{value}</div>
    </div>
  );
}
