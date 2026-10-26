# Security and Privacy Policy

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive issue in this project, please do **not** disclose it in public issues, discussions, or social media.

Please report vulnerabilities through either of the following private channels:
- **GitHub Private Vulnerability Reporting**: Go to the **Security** tab of the repository and click **Report a vulnerability**.
- **Maintainer Email**: Send an email directly to `walter@flowingdocs.com` with the details.

When reporting an issue, please include:
- A clear description of the potential vulnerability.
- Steps to reproduce the issue using synthetic hostnames or fixtures.
- Your runtime environment details (OS, Node version, DSH version).

**Never** attach private API keys, full user profiles, or proprietary conversation logs to your report.

---

## Data Privacy

- **No Credential Collection**: This plugin never reads, logs, or transmits model API keys, Authorization headers, or request/response bodies.
- **Redacted Configuration**: Provider auto-detection inspects DSH's local provider directory using sanitized settings, extracting only hostnames and provider labels.
- **In-Memory Observation**: When "Record recent calls" is explicitly enabled, the plugin retains only metadata (such as timestamps, token throughput, and TTFT) in memory for the most recent 100 calls.
- **No Disk Persistence**: Observation records are never written to disk and are completely cleared when recording is turned off, manually cleared, or upon application restart.
- **No Telemetry**: The plugin contains no analytics, tracking beacons, or remote telemetry reporting.

---

## Network and Threat Boundary

- **Local Loopback Only**: The local configuration and diagnostic endpoints strictly require requests to originate from loopback addresses (`127.0.0.1`, `localhost`, `[::1]`) with matching host headers and custom authentication headers. CORS is never enabled.
- **Proxy Endpoints**: Proxies must be local HTTP or HTTPS listeners. URLs containing embedded user credentials, paths, query strings, or fragments are rejected.
- **TLS Verification**: HTTPS certificate verification remains strictly enforced and is never bypassed. If the local proxy fails or certificate errors occur, requests will fail cleanly rather than fallback silently.
- **Transport Scope**: Interception applies only to the DSH backend's global Fetch/Undici dispatcher. Private network stacks inside custom SDKs, external child processes, or direct WebSockets operate outside this boundary.
