# CSC4240 Data Spaces 期末项目 — PPT 制作指南

> 给做 PPT 的同学：这份文件覆盖了你需要知道的全部内容。素材（图、截图、代码片段）都已就绪，路径在文末"素材清单"。如果有任何技术名词不确定，看文末"术语表"，不要自己瞎翻译。

## 1. 基本信息

- **课程**：CSC4240 Data Spaces（CUHK-Shenzhen，Prof. George Polyzos）
- **场合**：期末项目展示
- **建议时长**：讲 10–12 分钟 + Q&A 3–5 分钟
- **建议页数**：12 页主要内容（含封面、总结）
- **语言**：建议**英文 PPT** + 英文口播。教授和评委是国际学者，技术词全是英文。

## 2. 项目一句话

> 我们在 Eclipse Dataspace Components（EDC）官方的 Minimum Viable Dataspace（MVD）基础上，搭建了一个**香港交通数据的联邦共享空间**：5 个独立 participant（含 1 个我们自己加的学术机构 HKU），4 个真实 HK 数据集，pull + push 两种传输模式，并用 Java 扩展了 ODRL 策略引擎，完成了课程要求的 Part 1 / 2 / 3（含加分项）。

## 3. 受众假设

- 教授和同学**懂**分布式系统、policy enforcement、信任链
- 不一定**看过** EDC 源码，所以关键技术名词第一次出现要 1 句话解释
- "演示 = 看截图就懂"。不要照着 JSON 念，那很催眠

## 4. 整体故事线（页面顺序的逻辑）

```
[问题] 香港交通数据是孤岛
   ↓
[目标] dataspace 解决：每方各自管自己的数据，共享时受策略约束
   ↓
[方案] 基于 EDC MVD，加 HK 数据 reskin + HKU 双角色 + 自定义 ODRL
   ↓
[证据] 三个 Part 的 demo 截图
   ↓
[价值] 哪些是我们新加的（HKU dual-role、2 个自定义 Java 约束）
```

不要把架构图放第一页——观众看不懂。**先说"为什么"，再说"怎么做"**。

## 5. 逐页指南（12 页）

### Slide 1 · 封面
- **标题**：HK Transport Federated Dataspace — Federation, Policy, and Trust on EDC MVD
- **副标题**：CSC4240 Final Project · 2026 Spring
- **内容**：组员名单 / 学号 / 日期
- **设计**：留白干净，背景一张 HK 城市/交通弱化配图

### Slide 2 · 问题
- **标题**：Why a Hong Kong Transport Dataspace?
- **要点（3 条）**：
  - KMB / MTR / 运输署 / 学界各持有自己的交通数据，互相隔离
  - 现状是双边私下交换 API key —— 无审计、无策略、无信任根
  - 学术研究方很难合规地拿到商业方的实时数据
- **视觉**：4 个机构 logo/icon 横排，中间画**断裂**的连线表达 "silos"

### Slide 3 · 我们做了什么
- **标题**：What We Built
- **三栏布局**：
  | Part 1 | Part 2 | Part 3 (extra) |
  |---|---|---|
  | Real HK data + Pull & Push transfer | HKU joins as dual-role + Federated catalog crawler | 2 custom ODRL constraints in Java |
- **底部一行**：Built on Eclipse MVD · Runs locally on k3d Kubernetes

### Slide 4 · 架构图
- **标题**：Federated Architecture (5 Participants)
- **视觉**：直接用 `final/diagrams/02-architecture.png`
- **简短标注**（不超过 5 句，写在图旁边）：
  - 每个 participant 自带 control plane + identity hub + vault
  - 用 DID + Verifiable Credentials 建立信任
  - 中央仅有：Dataspace Issuer（颁 VC）+ Catalog Server（联邦索引）
- **不要**逐个解释每个框，观众只需要看到"5 个独立组件"

### Slide 5 · Actors & Datasets
- **标题**：Actors & Datasets
- **左半（角色）**：
  - **HK Transport Hub** (bob) — Provider，提供 KMB / MTR / 政府数据
  - **HKTaxi** (alice) — 商业消费方（COMMERCIAL tier）
  - **HKU Transport Lab** — 学术方，**dual-role：既是消费方也是提供方**
  - **Dataspace Issuer** — 信任根，颁发 VC
- **右半（数据）**：
  - KMB Routes（**1,611 条**）— 来自 data.etabus.gov.hk
  - KMB ETA、HK Traffic Incidents、MTR Patronage
  - HKU Transit Equity 2026（HKU 自己出的研究数据集）
- **设计**：左右两栏对齐，每行 icon + 一行说明

### Slide 6 · Part 1 — Pull Transfer (Live KMB Data)
- **标题**：Live Pull from KMB Public API
- **要点**：
  - alice 通过 dataspace 协议拉**真实** KMB 数据
  - 7 步 pipeline：catalog → negotiation → agreement → transferprocess → EDR → public endpoint → data
- **视觉**：拼贴 2 张截图（左右）
  - 左：协商 FINALIZED 状态
  - 右：拉到的 KMB 路线 JSON 前 5 条
- **关键数字（加粗大字）**：**1,611 routes pulled in 14 seconds**
- **素材**：`final/screenshots/01-…` 到 `09-…`（pull pipeline 系列，挑 2 张最有冲击的）

### Slide 7 · Part 1 — Push Transfer
- **标题**：Push Transfer (HttpData-PUSH)
- **要点**：
  - 与 pull 互补：provider 主动把数据**推**到 consumer 指定的 endpoint
  - 工程亮点：解决了 EDC dataplane 的 chunked transfer encoding 兼容性
- **视觉**：左=触发命令截图，右=接收方服务器收到的数据
- **素材**：`final/screenshots/10-push-transfer-*.json`、`11-push-receiver-*.txt`

### Slide 8 · Part 2 — HKU Dual-Role
- **标题**：HKU as Both Consumer and Provider
- **要点**：
  - 同一个 HKU participant 在不同方向上扮演两种角色
  - **作为 consumer**：拿到 academic-tier-only 的研究数据集
  - **作为 provider**：发布自己的 transit-equity-2026 数据集
- **视觉**：HKU 居中的箭头图 —— 左方箭头标"consume"、右方箭头标"provide"
- **素材**（4 张拼一页）：
  - HKU 当 provider：`12-hku-asset-published.json`、`13-hku-dual-role-pulled.json`
  - HKU 当 consumer：`17-hku-academic-agreement.json`、`18-hku-academic-data-pulled.json`

### Slide 9 · Part 2 — Federated Catalog Crawler
- **标题**：Federated Catalog Aggregation
- **要点**：
  - 一个 crawler 同时查询 4 个 provider 的 catalog endpoint
  - 聚合成统一的"全网 10 个资产"索引
  - 模拟真实 dataspace 中跨组织的资源发现
- **视觉**：4 个 provider 框 → 中间漏斗 → 1 个聚合视图。下面贴截图
- **素材**：`final/screenshots/14-federated-crawler.json`

### Slide 10 · Part 3 — Custom ODRL: Permission (ParticipantTier)
- **标题**：Custom Permission Constraint — `ParticipantTier`
- **要点**：
  - 我们用 Java 扩展了 EDC 的 policy engine
  - 新约束：`ParticipantTier eq ACADEMIC` —— 只有学术方能签约该资产
  - 测试：alice (COMMERCIAL) 尝试 → **TERMINATED**
- **视觉**：左=Java 关键代码片段，右=拒绝截图
- **代码块（原样保留）**：
  ```java
  static String tierOf(String did) {
      var lower = did.toLowerCase();
      if (lower.contains("hku"))      return TIER_ACADEMIC;
      if (lower.contains("consumer")) return TIER_COMMERCIAL;
      if (lower.contains("provider")) return TIER_PROVIDER;
      return TIER_UNKNOWN;
  }
  ```
- **素材**：`final/screenshots/15-custom-constraint-rejection.json`
- **底注**：Source: `extensions/dcp-impl/.../ParticipantTierFunction.java`

### Slide 11 · Part 3 — Custom ODRL: Duty (Attribution)
- **标题**：Custom Duty Constraint — `attribution`
- **要点**：
  - ODRL 区分 **PERMISSION**（允许做什么）和 **DUTY**（必须做什么）
  - 我们也实现了 DUTY：consumer 必须声明数据来源
  - whitelist 检查：只接受经认可的来源名
- **核心对比演示**（左右两栏）：
  - 左：alice 声明 `attribution = "HK Transport Hub"` → **FINALIZED ✅**
  - 右：alice 声明 `attribution = "Unauthorized Reseller"` → **TERMINATED ❌**
- **素材**：`19-attribution-duty-offer.json`、`20-attribution-success.json`、`21-attribution-rejection.json`
- **底注**：Source: `extensions/dcp-impl/.../AttributionDutyFunction.java`

### Slide 12 · Summary & Q&A
- **标题**：Summary
- **三句话**：
  1. We extended EDC MVD into a 5-participant HK transport dataspace with real KMB data.
  2. HKU joins as a dual-role academic participant, exercising both consumer and provider flows.
  3. Two custom Java ODRL constraints (Permission + Duty) prove the policy engine is extensible.
- **底部一行**：Code: `MinimumViableDataspace` (HK fork) · Demo scripts: `final/scripts/`
- **可选**：右下角"Q&A"大字 / 二维码指向 repo

## 6. 设计要求

### 风格
- **学术 / 简洁**。教授看过 100 个学生 PPT，干净的最讨喜
- **配色建议**：EDC 官方蓝 `#0066CC` + HK 红 `#D71920` + 中性灰。不要用渐变和荧光色
- **字体**：英文 Inter / Helvetica Neue；中文思源黑体 / 苹方；代码 JetBrains Mono / Fira Code
- **代码块**：白底深色字 + 圆角 + 浅灰边框
- **截图**：周围加 1px 浅灰边框，避免和白底糊在一起

### Do / Don't
| ✅ Do | ❌ Don't |
|---|---|
| 一页一个 main message | 一页 5 个并列要点 |
| 截图占主视觉、文字辅助 | 大段 JSON 全屏粘贴 |
| 关键数字加粗（1611 routes, 14s） | 全篇相同字号 |
| 箭头图表达"流向" | 一堆框框没连接 |
| 中英混排时技术词保持英文 | "数据空间"硬翻"控制平面" |

### 动画
- **不要**用 PowerPoint 花哨动画（飞入、旋转、淡出）
- 唯一可用：箭头按顺序出现（讲 pipeline 时）

## 7. 素材清单

### 图表（已生成 PNG，可直接插入）
路径前缀：`/Users/lichudikang/MVD/final/diagrams/`

| 文件 | 用在哪 |
|---|---|
| `02-architecture.png` | Slide 4 主图 |
| `01-scenario.png` | Slide 2 备选 |
| `03-pipeline.png` | Slide 6 备选 |

### 截图（共 21 张）
路径前缀：`/Users/lichudikang/MVD/final/screenshots/`

| 文件区段 | 用在哪 |
|---|---|
| `01-…` ~ `09-…` | Slide 6 (Pull pipeline) |
| `10-push-transfer-*.json`、`11-push-receiver-*.txt` | Slide 7 (Push) |
| `12-hku-asset-published.json`、`13-hku-dual-role-pulled.json` | Slide 8 (HKU as provider 半边) |
| `14-federated-crawler.json` | Slide 9 (Crawler) |
| `15-custom-constraint-rejection.json` | Slide 10 (ParticipantTier) |
| `16-hku-consumer-catalog.json` ~ `18-hku-academic-data-pulled.json` | Slide 8 (HKU as consumer 半边) |
| `19-attribution-duty-offer.json` ~ `21-attribution-rejection.json` | Slide 11 (Attribution) |

### Java 关键代码（slide 10 / 11 用）
路径前缀：`/Users/lichudikang/Projects/MinimumViableDataspace/extensions/dcp-impl/src/main/java/org/eclipse/edc/demo/dcp/policy/`

- `ParticipantTierFunction.java` — slide 10 用，截 `tierOf()` 静态方法
- `AttributionDutyFunction.java` — slide 11 用，截 `evaluate()` 方法主体

> 截代码时建议用 [Carbon](https://carbon.now.sh) 之类工具生成漂亮代码图，再插进去。

## 8. 术语表（不要翻译错）

| 术语 | 含义 | 不要翻译成 |
|---|---|---|
| Dataspace | 联邦数据共享生态 | 数据库 |
| EDC | Eclipse Dataspace Components（开源框架） | 协议 |
| MVD | Minimum Viable Dataspace（EDC 官方示例项目） | 最小可行产品 |
| DSP | Dataspace Protocol（首次出现要全称） | 数据协议 |
| DCP | Decentralized Claims Protocol（首次出现要全称） | 去中心化协议 |
| ODRL | Open Digital Rights Language（W3C 标准） | 一种语言 |
| DID | Decentralized Identifier（W3C 标准） | 数字身份 |
| VC | Verifiable Credential | 可验证证书 |
| VP | Verifiable Presentation | 可验证陈述 |
| Permission | ODRL 中"允许的动作" | 权限（容易混） |
| Duty | ODRL 中"必须履行的义务" | 责任 |
| Pull / Push | 数据传输方向 | 中文也行，但全篇要一致 |
| Participant | dataspace 中独立的一个组织 | 参与者（也行） |
| Catalog | 资产目录 | 列表 |
| Negotiation | 合约协商流程 | 谈判 |
| EDR | Endpoint Data Reference（拉数据时用的临时 URL+token） | 端点引用 |

## 9. 移交清单（确认这些都拿到了再开做）

- [ ] 这份 brief（`final/PPT-BRIEF.md`）
- [ ] `final/diagrams/` 三张 PNG
- [ ] `final/screenshots/` 21 张截图
- [ ] 两个 Java 类源码（slide 10/11 用）
- [ ] 组员名单 + 学号 + 教授名字（封面用）

**如果有任何技术内容看不懂、截图打不开、术语不确定 —— 不要瞎猜，直接问项目作者。**
