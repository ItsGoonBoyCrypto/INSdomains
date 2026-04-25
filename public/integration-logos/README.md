# Integration Logos

Drop wallet / explorer / dApp logos here that integrate INS name resolution.

## Adding a new integration

1. Save the logo as a square SVG (preferred) or 256×256+ PNG, named `<slug>.svg` or `<slug>.png` (lowercase, hyphenated).
2. Append an entry to `lib/integrations.ts`:

```ts
{
  name: "KasWare",
  kind: "wallet",      // "wallet" | "explorer" | "dapp"
  url: "https://kasware.xyz",
  logoSrc: "/integration-logos/kasware.svg",
  logoAlt: "KasWare wallet logo",
  status: "live",      // "live" | "in-progress" | "deferred"
}
```

3. Push — `IntegrationsRow` on the homepage auto-renders the new tile.

## Status meaning

- `live`        — integration is shipped and showing INS names to users
- `in-progress` — integration in flight; renders with a "soon" badge so visitors see momentum without over-claiming
- `deferred`    — declined or paused; not rendered (kept for record-keeping)
