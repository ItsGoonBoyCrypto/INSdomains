import type { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "INS — Igra Name Service",
  description:
    "Your forever .ins name on Igra. Permanent on-chain identities. No renewals. Native to Igra L2, secured by Kaspa.",
  metadataBase: new URL("https://ins.klaudeonkas.xyz"),
  openGraph: {
    title: "Igra Name Service",
    description: "Permanent .ins names on Igra. Forever on-chain.",
    type: "website",
    url: "https://ins.klaudeonkas.xyz",
  },
  twitter: { card: "summary_large_image", title: "Igra Name Service" },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-white font-sans antialiased bg-orb bg-grid">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
