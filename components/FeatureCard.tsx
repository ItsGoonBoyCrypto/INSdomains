import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function FeatureCard({
  icon, title, body, href, tint,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  href: string;
  tint: "cyan" | "plum" | "mix";
}) {
  const tintRing = {
    cyan: "bg-cyan/10 text-cyan border-cyan/30",
    plum: "bg-plum/10 text-plum border-plum/30",
    mix: "bg-gradient-to-br from-cyan/20 to-plum/20 text-white border-white/20",
  }[tint];

  const halo = tint === "plum" ? "bg-plum/20" : "bg-cyan/20";

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-left transition hover:-translate-y-1 hover:border-cyan/30"
    >
      <div
        className={cn(
          "pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-0 transition group-hover:opacity-100",
          halo
        )}
      />
      <div
        className={cn(
          "relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border",
          tintRing
        )}
      >
        {icon}
      </div>
      <h3 className="relative mt-6 text-xl font-bold">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-white/60">{body}</p>
      <span className="relative mt-6 inline-flex items-center gap-1 text-sm font-medium text-cyan">
        Learn more <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
