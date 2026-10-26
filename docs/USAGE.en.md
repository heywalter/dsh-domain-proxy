# User guide

[Quick start](../README.md) · [简体中文](USAGE.zh-CN.md)

## Proxy address and port

Edit **Local proxy address**, then save. Port 7890 is a default, not a requirement. Use the HTTP(S) listener advertised by your own proxy app.

| Example | Meaning |
| --- | --- |
| `http://127.0.0.1:7897` | Local HTTP proxy on port 7897 |
| `http://localhost:8080` | Local HTTP proxy on port 8080 |
| `https://127.0.0.1:8443` | Local TLS-protected HTTPS proxy; its certificate must be trusted |
| `http://[::1]:8080` | IPv6 loopback HTTP proxy |

The scheme describes the connection **to the proxy**, not the model API. An HTTPS API normally works through an HTTP CONNECT proxy, so an HTTPS target does not require an `https://` proxy address.

SOCKS, PAC, remote/LAN proxy addresses and proxy URL credentials are unsupported. If your app exposes only SOCKS, enable its HTTP or HTTP-compatible mixed listener first; changing a SOCKS URL's scheme alone does not convert the protocol. Domain rows contain API hostnames only; put the proxy port in Local proxy address.

## Provider selection and rules

Candidates come from the host provider directory and redacted settings. Explicit provider/model baseURL hostnames are extracted; catalog defaults are labelled. Unconfigured dormant providers are omitted. Dynamic, environment-dependent or unavailable endpoints require manual input.

Adding a candidate changes the draft only; save to apply. Refreshing the provider list preserves drafts. Later provider endpoint changes do not silently rewrite saved rules. Shared hostnames share routing, regardless of provider or model identity.

Up to 32 hostnames share one local proxy. Exact matching is the default; Include subdomains applies to every listed domain. Do not enter URL schemes, paths, ports or wildcards in domain rows.

## Routes and exit nodes

The plugin chooses which hosts enter the local proxy. The proxy app's rules and policy groups select exit nodes. Non-matching requests keep their prior route, which may already involve a system/TUN/environment proxy.

Check connection tests each draft hostname sequentially with an unauthenticated HEAD to its HTTPS root, about 8 seconds maximum per host. HTTP 401/404/503 still means a response was received; it does not prove authentication or model availability. Checks do not save edits or call a model.

## Recent calls

Enable Record recent calls, save, use DSH normally, then refresh Actual routes or Recent performance. No extra benchmark requests are sent. Up to 100 calls remain in memory until disabled, cleared, unloaded or restarted. Historical sessions are not imported.

Proxy dispatch proves selection of the plugin's proxy, not network success or exit-node identity. Original dispatch does not necessarily mean direct. No observed dispatch means unknown. A call retains at most 16 host-only paths; dispatch count is not retry count. Configuration numbers identify routing changes within the current process.

## Metrics

| Metric | Definition |
| --- | --- |
| First content wait | Start of stream consumption to the first nonempty text, reasoning or tool-argument delta; not HTTP TTFB or necessarily visible text |
| Generation speed | Adapter output tokens divided by first block-start to last block-end; only complete successful calls with sufficient data |
| Call duration / end-to-end speed | One model call, including initial wait but excluding later tool execution |
| Longest content gap | Maximum interval between adjacent content deltas; unknown with fewer than two, excluding initial wait and final silence |
| Token usage | Adapter-reported counts; missing fields remain unknown |
| Retries | Unknown until reliable retry correlation is available |

Client-side timings may include adapter processing and consumer delays. Different tasks, contexts, output lengths or cache conditions do not form a controlled performance comparison. No content or keys are retained; provider/model/host labels can still identify internal services.

## CLI and updates

```sh
node bin/cli.js doctor --domain api.example.com --proxy http://127.0.0.1:7897
```

Replace the example hostname. Exit codes: 0 transport reachable, 1 transport failure, 2 invalid input. The CLI does not prove the running DSH plugin is active.

For Desktop, install/update/uninstall through its plugin manager. Wait for active tasks before replacing a package, then restart and check saved values. DSH retains user overrides after uninstall; disable routing and save before uninstall if you want reinstallation to stay off. Do not overwrite unrelated profile settings.

For a Web CLI profile:

```sh
dsh plugin --profile web add /absolute/path/package.tgz
dsh plugin --profile web remove dsh-domain-proxy
```

Disable older dispatcher scripts before enabling this plugin. Only the DSH global Fetch/Undici path is covered; private transports, WebSockets and child processes are not guaranteed. See [security](../SECURITY.md) and [validation](VALIDATION.md).
