import type { SnapConfig } from "@metamask/snaps-cli";

const config: SnapConfig = {
  bundler: "webpack",
  input: "src/index.ts",
  output: {
    path: "dist",
    filename: "snap.js",
    clean: true,
  },
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
  },
};

export default config;
