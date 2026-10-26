<div align="center">

# DSH Domain Proxy

**DeepSeek Harness API 域名分流与调用观测插件**

[English](README.md) · **简体中文** · [使用指南](docs/USAGE.zh-CN.md) · [验证范围](docs/VALIDATION.md)

![版本 0.1.1](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/version.svg)
![已验证 DSH 0.2.1-rc.3](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/dsh.svg)
![Node 22.19+](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/node.svg)
[![MIT License](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/badges/license.svg)](LICENSE)

</div>

**DSH Domain Proxy** 是专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 设计的域名分流插件。它可以直接读取已配置的 Provider 列表，将指定的模型 API 域名通过本地代理软件（如 Clash、FlClash）转发，并提供请求路径与调用指标的可视化观测，无需重复配置 API Key。

> **前置说明**：
> - **配合本地代理运行**：本插件负责识别并分流特定域名，不包含代理节点或订阅服务。请确保 Clash / FlClash 等代理客户端处于运行状态，并已开启本地 HTTP(S) 监听端口。
> - **按域名精确分流**：只有加入规则列表的 API 域名会交由本地代理转发，其他流量（包括未匹配的模型请求与外部链接）均保持原有网络路径。

![插件配置界面](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/config.jpg)

---

## 工作原理

插件拦截 DSH 发往模型 API 的网络请求，根据配置的域名规则进行本地分流：

![流量分流工作流程](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/workflow-zh.gif)

- **命中规则的 API 域名**：交由本地代理客户端（如 `http://127.0.0.1:7890`）转发，出口节点由代理软件的策略组决定。
- **未命中的其他流量**：沿用应用的原生网络路径，互不干扰。

> 提示：如需查看静态流程，可参阅 [工作流静态架构图](docs/images/workflow-zh-still.png)。

---

## 快速上手

目前已在 macOS Desktop / DSH `0.2.1-rc.3` 环境完成实机验证。

### 1. 打开插件管理器
确保已安装 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) 且本地代理软件处于运行状态。在客户端中进入：
**Plugins → Add plugin → Install a third-party plugin**。

### 2. 安装插件
在包名输入框填入 `dsh-domain-proxy`（或指定版本 `dsh-domain-proxy@0.1.1`），点击 **Install → Enable now**。安装完成后完全退出并重启 DSH Desktop。

> 离线安装：亦可直接输入维护者提供的 `.tgz` 文件本地绝对路径安装。

### 3. 配置并启用分流
打开 **Plugins → dsh-domain-proxy**（或在 **Settings** 中找到对应配置页）：

1. **添加域名**：从 **Provider 域名** 下拉菜单中选择已有服务商域名（支持自动解析），或手动输入目标 API 主机名。
2. **设置代理端口**：在 **本机代理地址** 中填入代理软件实际监听的 HTTP(S) 地址（例如 `http://127.0.0.1:7890`）。
3. **连通性测试与启用**：点击 **检查连接** 确认代理可用后，勾选 **启用域名分流** 并保存设置。

<details>
<summary><strong>查看界面配置控制项图解</strong></summary>

![启用、记录开关及保存按钮](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/config-controls.jpg)

*说明：代理地址中的端口需与代理软件实际监听端口一致；连通性检查仅测试网络传输层是否畅通，不涉及模型 API 鉴权。*

</details>

---

## 请求路径与耗时观测

开启 **记录最近调用** 开关后，在日常使用中点击相应界面的 **刷新记录**，即可查看透明的调用链路与响应耗时（仅分析当前调用，不产生额外测速请求）。

<details>
<summary><strong>1. 查看分流路径：确认请求分发与规则匹配</strong></summary>

![实际路径界面](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/routes.jpg)

实时显示每次调用的目标主机、命中的规则以及最终交付的代理地址，便于排查分流是否符合预期。

</details>

<details>
<summary><strong>2. 查看调用性能：首字等待、速率与耗时</strong></summary>

![最近表现界面](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/performance.jpg)

统计单次模型调用的关键指标，包括：
- **首内容等待（TTFT）**：从发起请求到接收首个有效 token / 推理增量的时间。
- **流式生成速度**：生成阶段的每秒 token 吞吐率（tok/s）。
- **最长内容间隔**：生成过程中相邻数据块的最大停顿时间，方便识别网络卡顿。

更多指标口径定义请参考 [使用指南·指标说明](docs/USAGE.zh-CN.md#指标口径)。

</details>

---

## 实测表现参考

在相同模型与多轮对话场景下的本地实测对照（历史案例参考）：

![设置前后流式速度中位数对比](https://cdn.jsdelivr.net/npm/dsh-domain-proxy@0.1.1/docs/images/routing-case-study-zh.svg)

- **未分流 / 原生路径**：中位数 **43.9 tok/s**（采样 28 次）
- **代理分流后**：中位数 **168.6 tok/s**（采样 24 次，峰值达 **332.8 tok/s**）

> **注**：以上数据来自开发阶段的历史采样，实际速度取决于所选代理节点质量、网络延迟与模型服务商实时负载。完整测试条件与分布请查看 [性能测试记录](docs/performance/README.md)。

---

## 注意事项

- **分流维度基于域名**：分流规则按主机名生效。若多个 Provider 共用相同域名（如自建网关或代理聚合），规则将同时对其生效。
- **代理协议支持**：支持 HTTP 与 HTTPS 协议的本机回环代理（如 `127.0.0.1`）；暂不支持 SOCKS/PAC 协议或带有认证凭据的远程代理。详情参阅 [代理地址与端口说明](docs/USAGE.zh-CN.md#代理地址与端口)。
- **网络拦截边界**：仅拦截 DSH 后端全局 Fetch/Undici 网络栈。若第三方扩展使用私有网络 SDK、独立子进程或纯 WebSocket 传输，可能不在拦截范围内。
- **数据隐私与留存**：调用记录默认关闭。开启后仅在内存中保留最近最多 100 次调用的元数据指标，不记录对话正文、提示词或 API Key。重启客户端或点击清空即全部释放。

---

## 文档与社区

[完整使用指南](docs/USAGE.zh-CN.md) · [架构设计](docs/DESIGN.md) · [验证规范](docs/VALIDATION.md) · [贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [更新日志](CHANGELOG.md)

本项目基于 MIT 协议开源，属于社区独立工具，与 DeepSeek 官方无隶属关系。
