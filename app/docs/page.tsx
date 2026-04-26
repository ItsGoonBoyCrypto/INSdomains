import Link from "next/link";
import { Code2, Sparkles, ArrowRight, ExternalLink, Cpu, FileCode, Globe } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "API docs — INS · Igra Name Service",
  description:
    "Open, CORS-enabled HTTP endpoints for resolving INS names on Igra Network. One fetch() and you're done.",
};

const BASE = "https://insdomains.org/api";

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-14 pb-24">
        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan">
          <Code2 className="h-3 w-3" /> Public API
        </div>
        <h1 className="mt-4 text-5xl font-black tracking-tight">
          INS resolver <span className="ins-gradient-text">API</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-white/65">
          Free, open, CORS-enabled HTTP endpoints for resolving INS names on Igra
          Network. Use these if you&rsquo;d rather not read contracts directly —
          one <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-cyan">fetch()</code> and you&rsquo;re done.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/50">
          <Pill>Base URL <code className="font-mono text-cyan">{BASE}</code></Pill>
          <Pill>GET only</Pill>
          <Pill>JSON responses</Pill>
          <Pill>CORS open · <code className="font-mono">Access-Control-Allow-Origin: *</code></Pill>
          <Pill>60s edge cache</Pill>
          <Pill>No auth · no rate limit (please behave)</Pill>
          <Pill>All 3 TLDs · <span className="text-cyan">.ins</span> · <span className="text-plum">.igra</span> · <span className="text-emerald-300">.ikas</span></Pill>
        </div>

        {/* Anchor nav */}
        <nav className="mt-8 grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-3">
          <AnchorLink href="#resolve" icon={<Globe className="h-3.5 w-3.5" />} label="GET /api/resolve" hint="name → address" />
          <AnchorLink href="#reverse" icon={<Cpu className="h-3.5 w-3.5" />} label="GET /api/reverse" hint="address → name" />
          <AnchorLink href="#reserved" icon={<FileCode className="h-3.5 w-3.5" />} label="GET /api/reserved-labels" hint="reserved per TLD" />
        </nav>

        {/* /api/resolve */}
        <Section id="resolve" title="GET /api/resolve" subtitle="Forward resolution — name → address.">
          <H3>Query params</H3>
          <ParamTable
            rows={[
              ["name", "yes", "The label to resolve. Either \"alice.ins\" (full name with suffix) or just \"alice\" (use tld= to pick one)."],
              ["tld", "no", "ins | igra | ikas. Only used if name has no suffix. If both omitted, searches all 3 TLDs in order (.ins → .igra → .ikas) and returns first match."],
            ]}
          />

          <H3>Response — 200 (found)</H3>
          <Code lang="json">{`{
  "name": "alice.ins",
  "label": "alice",
  "tld": "ins",
  "tokenId": "1",
  "address": "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "owner":   "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "exists": true
}`}</Code>
          <ul className="mt-3 space-y-1 text-sm text-white/65">
            <li>• <code className="font-mono text-cyan">address</code> — resolver target. <strong className="text-white">Use this for send-to-name flows.</strong></li>
            <li>• <code className="font-mono text-cyan">owner</code> — current ERC-721 holder. Usually = <code className="font-mono">address</code>; diverges when the NFT is transferred without updating the target. Flag &ldquo;target stale&rdquo; warnings on mismatch.</li>
            <li>• <code className="font-mono text-cyan">tokenId</code> — on-chain ERC-721 token id (string, to dodge JS BigInt issues).</li>
          </ul>

          <H3>Response — 404 (not found)</H3>
          <Code lang="json">{`{
  "name": "nonexistent.ins",
  "label": "nonexistent",
  "tld": "ins",
  "address": null,
  "exists": false
}`}</Code>

          <H3>Response — 400 (invalid label)</H3>
          <Code lang="json">{`{ "error": "invalid_label", "label": "...", "tld": null }`}</Code>
          <p className="mt-2 text-sm text-white/60">
            Label rules: 1–32 chars, lowercase <code className="font-mono">a-z</code> / digits / hyphens, no leading or trailing hyphen.
          </p>

          <H3>Examples</H3>
          <Code lang="bash">{`# Full name with suffix
curl ${BASE}/resolve?name=alice.ins

# Label + explicit tld
curl "${BASE}/resolve?name=alice&tld=igra"

# Search all three TLDs (preference: .ins → .igra → .ikas)
curl ${BASE}/resolve?name=alice`}</Code>
          <Code lang="ts">{`// TypeScript / browser / Node
const r = await fetch(\`${BASE}/resolve?name=\${encodeURIComponent(input)}\`);
const data = await r.json();
if (data.exists) {
  send(data.address);
} else {
  showNotFound();
}`}</Code>
          <Code lang="python">{`import requests
r = requests.get("${BASE}/resolve", params={"name": "alice.ins"}).json()
if r["exists"]:
    address = r["address"]`}</Code>
        </Section>

        {/* /api/reverse */}
        <Section id="reverse" title="GET /api/reverse" subtitle="Reverse resolution — address → primary name(s). Fans out across all 3 per-TLD reverse resolvers.">
          <H3>Query params</H3>
          <ParamTable
            rows={[
              ["address", "yes", "EVM address to reverse-resolve. Any case."],
            ]}
          />

          <H3>Response — 200</H3>
          <Code lang="json">{`{
  "address": "0xf9d065b70c9357098dc7854d7a28b1498f6d125c",
  "primary": "alice.ins",
  "primaries": {
    "ins":  "alice.ins",
    "igra": "alice.igra",
    "ikas": null
  }
}`}</Code>
          <ul className="mt-3 space-y-1 text-sm text-white/65">
            <li>• <code className="font-mono text-cyan">primary</code> — single name picked in preference order <code className="font-mono">.ins → .igra → .ikas</code>. Use this for the &ldquo;name next to 0x…&rdquo; UI in wallets / explorers.</li>
            <li>• <code className="font-mono text-cyan">primaries</code> — per-TLD breakdown. Use to show every primary the user has set, or pick by a different rule.</li>
          </ul>
          <p className="mt-2 text-sm text-white/55">
            If the user has set no primary on any TLD, both <code className="font-mono">primary</code> and all three <code className="font-mono">primaries.*</code> entries are <code className="font-mono">null</code>. The endpoint <strong className="text-white">always returns 200</strong> on a valid-address input — &ldquo;no primary&rdquo; is a valid state, not an error.
          </p>

          <H3>Stale-safety</H3>
          <p className="mt-1 text-sm text-white/65">
            The underlying contracts return <code className="font-mono">""</code> if the user no longer owns the token they previously set as primary, so you&rsquo;ll never see a name that&rsquo;s been transferred away. The API preserves this — sold-off names disappear from the response automatically.
          </p>

          <H3>Response — 400 (invalid address)</H3>
          <Code lang="json">{`{ "error": "invalid_address", "address": "not-an-address" }`}</Code>

          <H3>Examples</H3>
          <Code lang="bash">{`curl ${BASE}/reverse?address=0xF9d065b70C9357098dc7854D7A28B1498f6d125c`}</Code>
          <Code lang="ts">{`// Display name-or-0x in a UI
async function displayName(addr: \`0x\${string}\`) {
  const r = await fetch(\`${BASE}/reverse?address=\${addr}\`);
  const { primary } = await r.json();
  return primary ?? \`\${addr.slice(0, 6)}…\${addr.slice(-4)}\`;
}`}</Code>
          <Code lang="ts">{`// Show every primary the user has set, per-TLD
async function allPrimaries(addr: \`0x\${string}\`) {
  const r = await fetch(\`${BASE}/reverse?address=\${addr}\`);
  const { primaries } = await r.json();
  return Object.entries(primaries).filter(([, name]) => name !== null);
}`}</Code>
        </Section>

        {/* /api/reserved-labels */}
        <Section id="reserved" title="GET /api/reserved-labels" subtitle="Returns labels reserved on a given TLD (from on-chain event history). Useful for admin dashboards + previewing locked brand labels.">
          <H3>Query params</H3>
          <ParamTable
            rows={[
              ["tld", "no", "ins | igra | ikas. Defaults to ins. Unknown values fall back to ins."],
            ]}
          />

          <H3>Response</H3>
          <Code lang="json">{`{
  "tld": "ins",
  "labels": ["alphaprism", "dao", "dev", "…", "zealous"]
}`}</Code>
          <p className="mt-2 text-sm text-white/55">
            First request per TLD can take several seconds while it scans the chain; subsequent calls are edge-cached.
          </p>
        </Section>

        {/* Reading contracts directly */}
        <Section title="Reading contracts directly" subtitle="If you'd rather not depend on this API. Everything above is a pass-through to public view functions on Igra mainnet.">
          <p className="mt-1 text-sm text-white/65">
            <strong className="text-white">Chain:</strong> Igra mainnet · chain ID <code className="font-mono text-cyan">38833</code> · RPC <code className="font-mono text-cyan">https://rpc.igralabs.com:8545</code>
          </p>

          <H3>Forward resolution (name → address)</H3>
          <p className="mt-1 text-sm text-white/65">Call on the Registry for the TLD you want:</p>
          <Code lang="solidity">{`.ins    0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46
.igra   0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c
.ikas   0xe705e38DeF4970e23617d30D9774062FEeEBA610

function tokenIdOf(string label) external view returns (uint256);
function targetOf(uint256 tokenId) external view returns (address);
function ownerOf(uint256 tokenId) external view returns (address);`}</Code>
          <p className="mt-2 text-sm text-white/55">
            If <code className="font-mono">tokenIdOf</code> returns 0, the name isn&rsquo;t minted. Pass the label <strong>without</strong> the suffix — the registry contract you call IS the TLD.
          </p>

          <H3>Reverse resolution (address → primary name)</H3>
          <p className="mt-1 text-sm text-white/65">Call on the ReverseResolver for each TLD you care about:</p>
          <Code lang="solidity">{`.ins    0x9afb263be198c35159FafDafa0729Fc8B13562DA
.igra   0x1bbd46aec04330a90832faf1da91889dee67d931
.ikas   0x9963aa24327f513b4cd5ce8118027a1da2fe76b5

function primaryName(address user) external view returns (string memory);`}</Code>
          <p className="mt-2 text-sm text-white/55">
            Returns the full name (e.g. <code className="font-mono">"alice.ins"</code>) or empty string if no primary set or the user no longer owns the token.
          </p>

          <H3>ENS-compatible namehash resolver (shared across all 3 TLDs)</H3>
          <p className="mt-1 text-sm text-white/65">
            Available at <code className="font-mono text-cyan">0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A</code>:
          </p>
          <Code lang="solidity">{`function addr(bytes32 node) external view returns (address);
function text(bytes32 node, string calldata key) external view returns (string memory);
function cacheNode(string calldata label, bytes32 node) external;  // trust-on-first-write`}</Code>
          <p className="mt-2 text-sm text-white/55">
            Use this if you&rsquo;re integrating via a system that already speaks ENS-style namehash resolution (Blockscout BENS, existing ENS SDKs, etc.).
          </p>
        </Section>

        {/* Verification */}
        <Section title="Contract verification">
          <ul className="mt-2 space-y-2 text-sm text-white/65">
            <li>• Deployed from the <a href="https://github.com/ItsGoonBoyCrypto/INSdomains" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">INSdomains repo</a> (MIT license, 116 Foundry tests)</li>
            <li>• Owned by the Igra Safe <code className="font-mono text-cyan">0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1</code></li>
            <li>• All 10 contracts source-verified on the <a href="https://explorer.igralabs.com" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">Igra explorer</a></li>
            <li>• Verifiable on-chain via <code className="font-mono">cast call</code> too</li>
          </ul>
        </Section>

        {/* Status */}
        <Section title="Status / changelog">
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-sm text-white/65">
              <strong className="text-white">v1</strong> (2026-04-24) — Initial public API. <code className="font-mono">/api/resolve</code>, <code className="font-mono">/api/reverse</code>, <code className="font-mono">/api/reserved-labels</code>.
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <ul className="mt-2 space-y-2 text-sm text-white/65">
            <li>
              • Telegram: <a href="https://t.me/IgraNameService" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">@IgraNameService</a>
            </li>
            <li>
              • Repo / issues: <a href="https://github.com/ItsGoonBoyCrypto/INSdomains" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">github.com/ItsGoonBoyCrypto/INSdomains</a>
            </li>
            <li>
              • Site: <a href="https://insdomains.org" className="text-cyan underline decoration-dotted underline-offset-2">insdomains.org</a>
            </li>
          </ul>
        </Section>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-6">
          <div>
            <div className="text-sm font-bold text-white">Need a name to test against?</div>
            <div className="mt-0.5 text-xs text-white/60">
              <code className="font-mono text-cyan">alphaprism.ins</code> is live; try{" "}
              <Link href="/n/alphaprism.ins" className="underline decoration-dotted underline-offset-2 hover:text-cyan">/n/alphaprism.ins</Link>{" "}
              for the public profile.
            </div>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-bold text-cyan hover:bg-cyan/20"
          >
            Search names <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ── Style primitives ─────────────────────────────────────── */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{children}</span>
  );
}

function AnchorLink({
  href, icon, label, hint,
}: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <a href={href} className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm hover:border-cyan/30">
      <span className="flex items-center gap-2 text-white/80">
        {icon}<span className="font-mono text-xs">{label}</span>
      </span>
      <span className="text-[10px] text-white/40 group-hover:text-cyan">{hint} →</span>
    </a>
  );
}

function Section({
  id, title, subtitle, children,
}: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-white/45">{children}</h3>;
}

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {lang && (
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/40">
          <span>{lang}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-cyan">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function ParamTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/45">
          <tr>
            <th className="px-3 py-2 text-left font-bold">Param</th>
            <th className="px-3 py-2 text-left font-bold">Required</th>
            <th className="px-3 py-2 text-left font-bold">Description</th>
          </tr>
        </thead>
        <tbody className="text-white/70">
          {rows.map(([p, req, desc], i) => (
            <tr key={p} className={i % 2 === 0 ? "bg-white/[0.01]" : ""}>
              <td className="px-3 py-2 font-mono text-cyan">{p}</td>
              <td className="px-3 py-2 text-white/60">{req}</td>
              <td className="px-3 py-2">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
