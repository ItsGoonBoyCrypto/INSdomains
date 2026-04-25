/**
 * Wallets, explorers, and dApps that integrate INS name resolution.
 *
 * Adding a new entry (the 30-second flow):
 *   1. Drop the logo SVG/PNG in `public/integration-logos/<slug>.svg`
 *   2. Append an entry below
 *   3. Push — IntegrationsRow auto-renders the new tile
 *
 * Status:
 *   "live"        — integration is shipped + showing INS names to their users
 *   "in-progress" — outreach started, integration in flight (renders with
 *                   a subtle "soon" badge, signals momentum without
 *                   over-claiming)
 *   "deferred"    — declined or paused; do not render. Kept here for
 *                   record-keeping; remove if cleanup is desired.
 */

export type IntegrationKind = "wallet" | "explorer" | "dapp";
export type IntegrationStatus = "live" | "in-progress" | "deferred";

export type Integration = {
  /** Display name shown under the logo. */
  name: string;
  kind: IntegrationKind;
  /** Outbound link — where users go when they click the logo. */
  url: string;
  /** Path under /public — e.g. "/integration-logos/kasware.svg" */
  logoSrc: string;
  logoAlt: string;
  status: IntegrationStatus;
};

export const INTEGRATIONS: Integration[] = [
  // Empty until the first wallet / explorer wires up INS resolution.
  // Outreach in flight — replies tracked in TG.
];

export const LIVE_INTEGRATIONS = INTEGRATIONS.filter((i) => i.status === "live");
export const IN_PROGRESS_INTEGRATIONS = INTEGRATIONS.filter(
  (i) => i.status === "in-progress",
);
export const VISIBLE_INTEGRATIONS = INTEGRATIONS.filter(
  (i) => i.status !== "deferred",
);
