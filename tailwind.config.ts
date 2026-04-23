import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#0a0a0a",
        navy: "#0f172a",
        cyan: { DEFAULT: "#00f0ff", deep: "#00c8e0" },
        plum: { DEFAULT: "#a855f7", deep: "#7c3aed" },
      },
      boxShadow: {
        "glow-cyan": "0 0 40px rgba(0,240,255,0.35)",
        "glow-plum": "0 0 40px rgba(168,85,247,0.45)",
        "glow-mix": "0 0 48px rgba(0,240,255,0.3), 0 0 80px rgba(168,85,247,0.2)",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        marquee: { to: { transform: "translateX(-50%)" } },
        "pulse-soft": {
          "0%,100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "ins-gradient": "linear-gradient(120deg,#00f0ff 0%,#a855f7 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
