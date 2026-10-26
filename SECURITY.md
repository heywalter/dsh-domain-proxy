# Security and privacy

This release does not collect model credentials, request bodies or Authorization headers. Provider selection reads the host's redacted settings and returns only provider labels and hostnames; the stream observer inspects chunk types and timing without retaining content. Diagnostics use a fixed unauthenticated HTTPS HEAD and return controlled errors. There is no telemetry or remote report upload.

HTTPS certificate verification is not disabled. Proxies must use HTTP(S) and a loopback address; URL credentials are rejected. Matching requests fail when their proxy fails rather than silently taking a different path.

The settings endpoint requires a loopback peer and Host, a plugin-specific header, same Host for a supplied Origin, and no cross-site Fetch metadata. It never grants CORS. This is not a remote multi-user administration API. A local process running as the same user already has access to the user's DSH configuration and is not isolated by this mechanism.

Coverage is limited to the backend global Fetch/Undici dispatcher. Explicit SDK dispatchers, other network stacks, children and WebSockets may bypass it. Existing routes may themselves use proxies. Other plugins can replace the dispatcher; the UI reports observed ownership changes but cannot police arbitrary code.

Diagnostics contain selected API hostnames and local endpoint addresses. Review before sharing. Do not attach credentials, complete profiles, prompts or conversation logs to public issues. Reproduce with local fixtures or synthetic inputs.

The GitHub repository is not public yet and no dedicated private vulnerability-reporting channel is available. Do not post credentials, conversation logs or sensitive vulnerability details to public forums. A private reporting route remains a prerequisite for the public repository launch. This release does not promise a security-response SLA.

## Optional recent-call observation

Opt-in in-memory metadata only, 100 calls and 16 host-only paths per call. Disabled/cleared/unloaded/restarted records are discarded; active old calls cannot resurrect cleared records. No disk history or prompt/response/header/full-URL/session-ID storage. Provider/model/host labels can still identify internal services. The local API exposes this metadata under the same source checks as configuration. Native DSH adapters already process usage; this plugin does not tokenize or retain content. Background work inheriting a model async context can appear in its path list.
