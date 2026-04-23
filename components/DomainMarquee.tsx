import { TRENDING } from "@/lib/mock-registry";

export function DomainMarquee() {
  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex shrink-0 animate-marquee gap-3 pr-3">
        {[...TRENDING, ...TRENDING].map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-xl"
          >
            <div className="h-6 w-6 rounded-full bg-ins-gradient" />
            <span className="font-mono text-sm text-white/80">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
