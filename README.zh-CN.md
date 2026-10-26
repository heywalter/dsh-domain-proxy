<div align="center">

# DSH Domain Proxy

**只让需要的 API 域名走代理，看清每次模型调用的路径与表现。**

[English](README.md) · **简体中文** · [使用指南](docs/USAGE.zh-CN.md) · [验证范围](docs/VALIDATION.md)

![版本 0.1.1](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/version.svg)
![已验证 DSH 0.2.1-rc.3](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/dsh.svg)
![Node 22.19+](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/node.svg)
[![MIT License](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/license.svg)](LICENSE)

</div>

这是 **DeepSeek Harness 的域名分流插件**：从已配置的 provider 选择 API 域名，通过已有的 FlClash / Clash 等本机代理转发，并查看实际路径与最近调用表现。无需复制 API Key。

**需要配合已有代理软件使用。** 本插件不提供 VPN、代理订阅或出口节点。请先启动 Clash / FlClash 等代理软件，确认其 HTTP(S) 监听地址和端口可用，再在插件中填写该地址；代理软件需保持运行。

**插件选域名，代理软件选出口节点。** 其他目标沿用原有网络路径；插件不管理订阅，也不保证提速。

![从 provider 选择域名并设置代理地址](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/config.jpg)

*真实隔离环境界面，使用合成域名和示例端口；支持中英文。*

## 三步上手

当前为 **0.1.1 正式版，使用 npm 的 latest 通道**。已验证 macOS Desktop / DSH `0.2.1-rc.3`，其他版本和平台尚未完成实机验证。

### 1. 打开插件管理器

前提：已安装 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness)，并有运行中的本机代理。

在 Desktop 打开 **Plugins → Add plugin → Install a third-party plugin**。

### 2. 输入包名并安装

输入 `dsh-domain-proxy`，或锁定本次版本 `dsh-domain-proxy@0.1.1`，点击 **Install → Enable now**，然后完全退出并重启 Desktop。

无需下载源码或自行构建。安装需要联网获取 npm 包及依赖。已有维护者提供的 `.tgz` 也可填入本机绝对路径安装，无需解压。正式版使用 `latest` 标签。

GitHub 源码与 Release 页面暂未公开；完整文档和示例图片随 npm 包提供，市场收录另行进行。

### 3. 选域名，检查并启用

打开 **Plugins → dsh-domain-proxy**：

1. 从 **Provider 域名** 下拉框选择并添加，或手动填写主机名。
2. 填入已有代理软件的 HTTP(S) 监听地址，例如 `http://127.0.0.1:7890`。
3. 点击 **检查连接**，勾选 **启用域名分流**，保存。

新安装默认关闭、域名列表为空。代理软件需保持运行；`7890` 只是示例端口，可在 **本机代理地址** 中修改。支持本机 HTTP/HTTPS 代理，不支持 SOCKS/PAC 或远程代理。[查看地址示例](docs/USAGE.zh-CN.md#代理地址与端口)。Settings 中也有同一配置页。

<details>
<summary><strong>配置图解：域名、代理地址、启用与保存</strong></summary>

选择域名并填写代理软件实际使用的端口；截图的 7897 也只是示例。

检查连接后勾选“启用域名分流”，再保存；“记录最近调用”是独立的可选开关。

![启用、可选记录及保存按钮](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/config-controls.jpg)

真实隔离环境截图，使用合成域名；图中分流尚未启用。代理不可用时请先修正地址，连接检查不代表模型调用成功。

</details>

## 8 秒看懂工作流程

![8秒流程示意：域名命中走本机代理，未命中沿用原路](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/workflow-zh.gif)

示意动画，无真实界面截图；动画节奏不是实测延迟。代理软件负责出口节点，未匹配的原有路线也可能已有代理。[查看静态图](docs/images/workflow-zh-still.png)

## 设置前后的表现

![设置前后全部样本的流式速度中位数对比](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/routing-case-study-zh.svg)

设置前 **43.9 tok/s**（28 次），设置后 **168.6 tok/s**（24 次）。设置后合并全部短、长会话调用重新取中位数，单次最高 **332.8 tok/s**。

这是早期原型的历史观察，非受控 A/B；任务、上下文和负载不同，不代表 0.1.1 的提速承诺。[分组统计、平均值与逐次调用](docs/performance/README.md)

## 想知道请求走哪里、为什么等得久？

开启 **记录最近调用** 并保存，正常发送模型消息，再到对应页面点击 **刷新记录**。不会额外发起测速请求。

<details>
<summary><strong>查看实际路径：命中了哪条规则，交给了哪个代理？</strong></summary>

![实际路径页面：合成调用已交给代理，但连接失败，两个状态分别显示](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/routes.jpg)

“已交给代理”是分发证据，不代表出口节点或模型成功。“原有路径”不一定直连，未观察到也不会被当成直连。

</details>

<details>
<summary><strong>查看最近表现：首内容等待、生成速度和最长停顿</strong></summary>

![最近表现页面：调用耗时、token 用量与未知字段](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/performance.jpg)

截图使用本地合成调用，**数值不是模型性能基准**。首内容包括文本、推理或工具参数；总耗时只覆盖单次模型调用，不含后续工具执行。[查看指标定义](docs/USAGE.zh-CN.md#指标口径)。

</details>

## 使用前了解这几条

- **只按域名分流。** 共用域名的多个 provider 共用规则；选择 provider 不代表按 provider 独立路由。
- **连接成功 ≠ 模型可用。** 检查连接不带模型密钥；模型是否成功要看实际调用。
- **记录默认关闭。** 开启后最多保存 100 次调用的内存元数据，不保存对话正文或密钥；关闭、清空或重启后删除。
- **有明确覆盖范围。** 仅覆盖 DSH 后端全局 Fetch/Undici 路径；私有 SDK 网络栈、WebSocket 和子进程不作保证。

仅开发者需要[从源码打包](CONTRIBUTING.md#develop)。采用 DSH 官方支持的 [tarball 安装流程](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md#installing-from-github-the-build-script-catch)，无需额外安装器。

## 文档与参与

[完整使用指南](docs/USAGE.zh-CN.md) · [设计](docs/DESIGN.md) · [验证](docs/VALIDATION.md) · [贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新记录](CHANGELOG.md)

MIT 开源许可。本项目是社区工具，与 DeepSeek 或代理服务商没有官方隶属关系。
