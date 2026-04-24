import { STATS } from "@/lib/mock-registry";

export function StatsRow() {
  return (
    <section className="relative mt-32 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-cyan/[0.04] via-white/[0.02] to-plum/[0.04] px-6 py-14">
      <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
        <Stat value={STATS.registered.toLocaleString()} label="domains registered" />
        <Stat value={STATS.owners.toLocaleString()} label="unique owners" />
        <Stat value={String(STATS.dapps)} label="dApps integrated" />
        <Stat value="0" label="renewal fees, ever" />
      </div>
    </section>
  );
}

function Stat({
  value, label,
}: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <div className="ins-gradient-text text-5xl font-black tracking-tight sm:text-6xl">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
    </div>
  );
}
