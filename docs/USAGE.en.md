# User Guide

[Back to Quick Start](../README.md) · [简体中文指南](USAGE.zh-CN.md)

---

## 1. Local Proxy Address and Port Configuration

Under **Local proxy address**, enter the local HTTP(S) listening address provided by your proxy client:

| Example Address | Description |
| :--- | :--- |
| `http://127.0.0.1:7890` | Local HTTP proxy (common default for Clash / FlClash) |
| `http://127.0.0.1:7897` | Local HTTP proxy (custom port) |
| `http://localhost:8080` | Local HTTP proxy (local gateway) |
| `https://127.0.0.1:8443`| Local HTTPS proxy (proxy certificate must be trusted by system) |
| `http://[::1]:8080` | Local IPv6 loopback HTTP proxy |

### Protocol Details and Common Notes
- **Scheme / Protocol**: The URL scheme describes the protocol used **between DSH and your local proxy**, not the target model API. Because HTTPS APIs are typically proxied via standard HTTP CONNECT tunnels, local proxy addresses almost always use `http://` even when proxying `https://` target domains.
- **Supported Protocols**: Only local loopback HTTP and HTTPS listeners are supported. SOCKS5, PAC scripts, remote/LAN proxy addresses, and embedded URL credentials (e.g. `user:pass@`) are not supported.
- **Configurable Port**: The port `7890` is merely an example default. Adjust this value to match your actual proxy application (Clash, v2rayN, Sing-box, etc.).

---

## 2. Provider Discovery and Domain Routing Rules

### Domain Discovery
- The plugin inspects configured providers in the local DSH environment and automatically extracts explicit `baseURL` hostnames.
- Dormant or unconfigured provider catalog entries, as well as endpoints injected dynamically via external environment variables, will not appear in the dropdown list. You can enter these target hostnames manually.

### Routing Behavior
- **Draft Workflow**: Adding or removing domains in the UI creates an unsaved draft. Click **Save settings** to persist and apply changes to the active network dispatcher.
- **Shared Hostnames**: Routing rules apply at the hostname level. If multiple providers share the same domain (e.g. an internal API gateway or proxy aggregator), they share the same routing rule.
- **Matching Scope**: Up to 32 hostnames can be configured. By default, **exact matching** is used (`api.example.com`). Enabling **Include subdomains** extends matching to all child subdomains (such as `v1.api.example.com`).
- **Input Format**: Enter fully qualified hostnames only. Do not include `http://`, URI paths, port numbers, or `*.` wildcards.

---

## 3. Connection Verification and Network Routing

### Connection Check (Doctor Check)
- Clicking **Check connection** sends sequential, unauthenticated HTTPS `HEAD` requests to the root path of each configured domain (with an ~8-second timeout per domain).
- **Interpreting Results**: Receiving HTTP 200, 401, 404, or 503 indicates that the network transport path to the target server through your proxy is functional. This check tests transport reachability only; **it sends no API credentials and does not consume model token quota**.

### Exit Nodes and Default Routes
- **Routing Scope**: The plugin routes matched domains to your local proxy listener. The actual egress path (e.g. exit nodes in Japan, US, etc.) is governed entirely by your proxy application's rules and policy groups.
- **Unmatched Traffic**: All requests to domains not listed in the rules continue along their original network route (which may already be subject to system proxies, TUN interfaces, or environment variables).

---

## 4. Call Observation and Metrics

### Activation and Memory Model
When **Record recent calls** is enabled and saved, DSH records lightweight diagnostic metadata for model streaming requests during standard interactions:
- **In-Memory Ring Buffer**: Retains metadata for up to the most recent 100 calls in memory.
- **Strict Privacy**: Records execution timings, throughput, and dispatch paths only. **Never records** prompt text, model responses, headers, full URLs, session IDs, or API keys.
- **Lifecycle**: Turning off recording, clicking **Clear records**, or restarting DSH completely discards all stored metadata. No data is ever written to disk.

### Metric Definitions

| Metric | Definition and Measurement Methodology |
| :--- | :--- |
| **First Content Wait (TTFT)** | Time elapsed from the start of consuming the model stream to the arrival of the first non-empty text, reasoning, or tool argument delta. Distinct from low-level TCP/HTTP time to first byte. |
| **Generation Speed** | Adapter-reported output tokens divided by the duration between the first content block start and the last block end (tok/s). Calculated only for successful, complete calls with sufficient data. |
| **Call Duration** | End-to-end elapsed time for a single model call (including initial wait), excluding subsequent client-side tool executions. |
| **Longest Content Gap** | Maximum pause between consecutive stream deltas during generation. Useful for spotting network jitter or streaming stalls. |
| **Token Usage** | Usage numbers reported directly by the DSH provider adapter; missing or omitted fields display as "Unknown". |
| **Retries** | Displayed as "Unknown" until a deterministic correlation with adapter-level retry attempts is available. |

> **Note**: Timings are observed at the client layer and include adapter processing and consumer delays. Due to variations in prompt complexity, context lengths, and provider cache states, these metrics are intended for diagnostics rather than formal cross-provider benchmarking.

---

## 5. Standalone CLI and Maintenance

### Standalone CLI Diagnostics
You can test domain reachability through a local proxy directly from your terminal without launching DSH:

```sh
node bin/cli.js doctor --domain api.example.com --proxy http://127.0.0.1:7890
```

- **Exit Codes**:
  - `0`: Transport connection successful.
  - `1`: Transport connection failed.
  - `2`: Invalid CLI arguments.

### Updating and Uninstalling
- **Desktop Application**: Manage installations, updates, and removals through the native **Plugins** interface. Wait for active generation tasks to finish before updating, then restart DSH.
- **Web CLI Profile**: Manage the plugin via the DSH CLI:
  ```sh
  # Install local package
  dsh plugin --profile web add /path/to/dsh-domain-proxy-0.1.1.tgz
  # Remove plugin
  dsh plugin --profile web remove dsh-domain-proxy
  ```
- **Clean Removal**: DSH may retain user configuration entries after plugin removal. To ensure clean removal, disable "Enable domain routing" and save settings before uninstalling.

---

## 6. Scope and Limitations

- **Transport Coverage**: The plugin hooks into DSH's global backend `Undici Dispatcher`, covering standard global `fetch` calls and official provider adapters.
- **Limitations**: Private network stacks inside custom SDKs, external child processes, or direct WebSockets operate outside this dispatcher hook and are not routed or observed.
- For additional architectural and validation details, see [Security Policy](../SECURITY.md) and [Validation Scope](VALIDATION.md).
