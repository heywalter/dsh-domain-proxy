# Changelog

## 0.1.2 — 2026-10-30

- Add DSH 0.2.1-rc.5 to the explicit compatibility list after isolated host verification; retain 0.2.1-rc.3.
- Report the actual tested host version in integration evidence instead of a hard-coded version.
- Routing and observation runtime code is unchanged from 0.1.1.

## 0.1.1 — 2026-10-26

- Fix npm README images with version-pinned public npm CDN URLs, independent of GitHub repository visibility.
- Make the existing local HTTP(S) proxy prerequisite explicit in both languages.
- Documentation and package metadata only; runtime code is unchanged from 0.1.0.

## 0.1.0 — 2026-10-26

- Remove the OpenDesign preset and brand-specific new-install domain.
- Add configured-provider hostname selection with explicit/default/unknown handling.
- Preserve manual entry, shared-domain routing semantics and existing settings.
- First stable release, promoted from the locally verified RC.1 runtime without runtime code changes; distributed through npm latest.
- Include bilingual setup guides, audited example screenshots, reproducible historical charts and a conceptual routing animation.


## 0.1.0-beta.3

- Opt-in recent model call metadata, in memory only.
- Actual dispatcher path attribution with per-call async context.
- Recent performance with explicit unknown usage/retries and documented timing.
- Real DSH waterfall integration tests using local fixtures.


## 0.1.0-beta.2

- Embed shared configuration in the native plugin detail page; keep Settings access.
- Add per-host rows and sequential per-host transport checks.
- Explain domain routing, proxy policy groups, node selection, migration and updates.

## 0.1.0-beta.1 — 2026-10-24

- Domain allowlist with exact matching by default and opt-in subdomains.
- Owned proxy connection lifecycle, singleton protection and conflict status.
- Local DSH settings UI, bounded transport diagnostics and CLI.
- Real local CONNECT/TLS/SSE integration tests.
- Local beta only; no public release has been made.
