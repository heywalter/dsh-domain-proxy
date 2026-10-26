# Architecture

DSH Domain Proxy adds domain-selective routing and opt-in model-call observations to DSH 0.2.1-rc.3.

## Components

| Module | Responsibility |
| --- | --- |
| config.js | Validate hostnames and loopback HTTP(S) proxy URLs |
| providers.js | Extract hostnames from the host provider directory and redacted settings |
| router.js | Select the owned proxy or inherited dispatcher; manage connection ownership |
| observation.js | Correlate model streams and dispatches using AsyncLocalStorage; retain bounded metadata |
| doctor.js | Unauthenticated, time-limited HTTPS HEAD checks |
| http.js / index.js | Local API guards and native DSH settings integration |
| client/client.js | Shared plugin-detail and Settings UI |
| bin/cli.js | Standalone transport-check CLI |

## Routing and lifecycle

Enabling captures the current global Undici dispatcher. Matching hostnames go to the configured ProxyAgent; other requests return to the captured dispatcher. The inherited route may already use a proxy.

Matching is exact by default. Optional subdomain matching respects dot boundaries. Routing is hostname-based, so providers sharing a hostname share the rule. Provider selection only imports hostnames into a draft; it never rewrites provider settings.

Configuration is validated before the active route changes. Ordinary routing changes drain owned connections without an arbitrary stream deadline. Retired routers become pass-through if another plugin still references them. Final disposal has bounded cleanup for owned pools; the inherited dispatcher is never closed. Dispatcher ownership conflicts are reported rather than fought over.

## Observations

The llm/stream waterfall is wrapped without changing chunk identity. Async context covers iterator next/return, associating dispatches with concurrent calls without timestamp guessing. Private SDK transports may bypass observation, and background work inheriting the async context may appear in a call's routes.

Recording defaults off. At most 100 calls and 16 host-only paths per call are kept in memory. Clear, disable or restart removes records; old in-flight calls cannot resurrect cleared records. No prompt, response, reasoning text, tool arguments, full URLs, headers, keys or session IDs are retained.

Timing and usage limits are documented in the [user guide](USAGE.en.md#metrics). Missing usage and retries remain unknown. Observations do not identify exit nodes or diagnose root causes.

## Settings and trust boundary

Both UI entries share native versioned settings. Stale edits are rejected. The local API requires loopback peer/Host, a custom header, matching Origin when supplied, and no cross-site Fetch metadata. Desktop's authenticated bridge may omit Origin. No CORS grants or remote administration are provided.

Proxy URLs accept HTTP/HTTPS loopback endpoints with configurable ports; embedded credentials, paths, queries and fragments are rejected. TLS verification remains enabled. See [SECURITY.md](../SECURITY.md) for the threat boundary.
