<div align="center">

# DSH Domain Proxy

**Proxy the API domains you choose. See where model calls go and how they perform.**

**English** · [简体中文](README.zh-CN.md) · [User guide](docs/USAGE.en.md) · [Validation](docs/VALIDATION.md)

![Version 0.1.1](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/version.svg)
![Tested with DSH 0.2.1-rc.3](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/dsh.svg)
![Node 22.19+](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/node.svg)
[![MIT License](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/license.svg)](LICENSE)

</div>

A **domain-routing plugin for DeepSeek Harness**. Pick API hostnames from configured providers, route them through your existing local proxy (such as FlClash or Clash), and inspect routes and recent call performance. No API keys to copy.

**Requires an existing proxy application.** This plugin does not provide a VPN, proxy subscription or exit nodes. Start your proxy app (such as Clash or FlClash), confirm its HTTP(S) listening address and port, then enter that address in the plugin. Keep the proxy app running.

**The plugin selects domains; your proxy app selects exit nodes.** Other destinations keep their existing route. The plugin does not manage subscriptions or guarantee faster generation.

![Choose provider domains and set your proxy address](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/en/config.jpg)

*Actual isolated UI with synthetic hosts and an example port. English and Chinese supported.*

## Get started in three steps

This is the **0.1.1 release on npm’s latest channel**. Tested on macOS Desktop with DSH `0.2.1-rc.3`; other versions and platforms are not yet verified on real machines.

### 1. Open the plugin manager

You need [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) and a running local proxy.

In Desktop, open **Plugins → Add plugin → Install a third-party plugin**.

### 2. Enter the package name and install

Enter `dsh-domain-proxy`, or pin this release with `dsh-domain-proxy@0.1.1`. Choose **Install → Enable now**, then quit and restart Desktop.

No source checkout or build is needed. Installation downloads the npm package and dependencies. If you already have a maintainer-provided `.tgz`, its absolute local path also works; do not extract it. Version 0.1.1 uses the `latest` tag.

The GitHub source and Release pages are not public yet. Full documentation and example images ship in the npm package; marketplace listing is separate.

### 3. Choose domains and enable routing

Open **Plugins → dsh-domain-proxy**:

1. Select a hostname from **Provider domain** and add it, or enter a hostname manually.
2. Enter your proxy app's local HTTP(S) address, such as `http://127.0.0.1:7890`.
3. **Check connection**, enable **Enable domain routing**, then **Save settings**.

Fresh installs start disabled with no domains. Keep your proxy app running; port `7890` is only an example and can be changed in **Local proxy address**. HTTP and HTTPS loopback proxies are supported; SOCKS/PAC and remote proxies are not. [Address and protocol examples](docs/USAGE.en.md#proxy-address-and-port). The same configuration page is also available in Settings.

<details>
<summary><strong>Configuration walkthrough: domains, proxy address and save controls</strong></summary>

Select domains and enter your proxy app's actual listening port. The screenshot's 7897 is also just an example.

Check the connection, select Enable domain routing, then save. Record recent calls is a separate, optional setting.

![Enable routing, optional recording and save controls](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/en/config-controls.jpg)

Actual isolated UI with synthetic hostnames; routing is not yet enabled in these screenshots. Fix an unreachable proxy address before enabling it. A connection check does not prove model availability.

</details>

## The workflow in 8 seconds

![An eight-second workflow: matched domains use the local proxy; others keep their route](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/workflow-en.gif)

Conceptual animation, with no UI captures or measured timing. Your proxy app selects exit nodes; the existing route may already use a proxy. [View the static diagram](docs/images/workflow-en-still.png)

## Before and after routing setup

![Median per-call streaming speed across all before and after samples](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/routing-case-study-en.svg)

Before: **43.9 tok/s** (28 calls). After: **168.6 tok/s** (24 calls). The post-setup median is recalculated from all short- and long-context calls; the single-call peak is **332.8 tok/s**.

Historical observations from an earlier prototype, not controlled A/B. Tasks, context and load differ; this is not an 0.1.1 speedup promise. [Group statistics, means and individual calls](docs/performance/README.md)

## See the path and the wait

Enable **Record recent calls** and save. Use DSH normally, then open either observation page and choose **Refresh records**. No extra benchmark requests are sent.

<details>
<summary><strong>Actual routes: which rule matched, and which proxy received the request?</strong></summary>

![Actual routes: a synthetic request was dispatched to a proxy but failed to connect](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/en/routes.jpg)

Proxy dispatch is evidence of routing, not exit-node identity or model success. The original route may already use a proxy; an unobserved route is never assumed direct.

</details>

<details>
<summary><strong>Recent performance: first content, generation speed and pauses</strong></summary>

![Recent performance: call timings, token usage and explicit unknown values](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/en/performance.jpg)

These are local synthetic calls, **not model performance benchmarks**. First content includes text, reasoning or tool arguments. Duration covers one model call, excluding subsequent tools. [Metric definitions](docs/USAGE.en.md#metrics).

</details>

## Know the boundaries

- **Domain routing, not provider isolation.** Providers sharing a hostname share its rule.
- **Reachable does not mean model-ready.** Connection checks send no model credentials; verify availability with an actual call.
- **Recording is opt-in.** Up to 100 calls of metadata stay in memory. No prompt, response or key storage. Disable, clear or restart to erase records.
- **Limited transport coverage.** DSH backend global Fetch/Undici only. Private SDK transports, WebSockets and child processes are not guaranteed.

Developers can [build from source](CONTRIBUTING.md#develop). This package uses DSH’s documented [tarball installation flow](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch); no extra installer is required.

## Documentation and contributing

[User guide](docs/USAGE.en.md) · [Design](docs/DESIGN.md) · [Validation](docs/VALIDATION.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

MIT licensed. A community tool, not an official DeepSeek or proxy-provider product.
