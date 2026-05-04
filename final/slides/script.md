# Federated HK Transport Dataspace — Final Presentation Script

> 12 张 slide。每张包含：标题 / 主要 bullet / 配图说明 / 讲述要点（约 30-60 秒）

---

## Slide 1: 封面

**标题（大字）**
基于 Eclipse Dataspace Components 的香港交通联邦数据空间
（Federated Hong Kong Transport Dataspace built on Eclipse EDC）

**副标题**
Final Project · CSC4240

**作者**
Zhao Yuxuan (124090921) · Li Chudikang (122040057)

**配图建议**：背景放一张地铁/巴士/海港城天际线低饱和图

**讲述要点**：
- 我们在 Eclipse EDC 的 Minimum Viable Dataspace 之上，把场景搬到香港，并把它扩展成一个真正多参与方的联邦数据空间。

---

## Slide 2: Problem & Scenario

**标题**
为什么香港交通数据需要数据空间？

**Bullets**
- 香港交通数据散落在 KMB、MTR、运输署、九巴等多个机构
- 任何要做路径优化、公共交通研究、出行 App 的下游方都要逐家谈数据
- 传统方案（开放 API + 文件下载）缺乏：可信身份、合约可执行、用途可审计、政策可拒绝

**配图**：用 `final/diagrams/01-scenario.png`

**4 角色**：
| 角色 | 类型 | 业务诉求 |
|---|---|---|
| HK Transport Hub | 提供方 | 统一发布 4 类数据资产 |
| HKTaxi | 商业消费方 | 拉实时巴士 ETA 做路径优化（pay-per-call）|
| HKU Transport Lab | 学术消费方 | 拉历史客流做交通公平研究（free + cite）|
| Dataspace Issuer | 身份发行方 | 给每个参与方发可验证凭证 |

**讲述要点**：
- 数据空间的真正价值在于"政策可执行"，不只是把数据放出来。

---

## Slide 3: 为什么选 Eclipse EDC（而不是直接 HTTP）

**标题**
EDC 给我们带来了什么？

**Bullets / 对比表**
| 维度 | 直接 HTTP/S3 共享 | Eclipse EDC |
|---|---|---|
| 身份 | API key（共享密钥）| Verifiable Credential + DID（去中心化）|
| 合约 | 隐式，靠条款 | ODRL 合约 + 协议化协商（可机器执行）|
| 政策 | 服务端硬编码 | Policy 在 contract definition 层，可灵活组合 |
| 审计 | 自定义日志 | 协商/合约状态机内建 |
| 协议 | 无标准 | DSP（Dataspace Protocol）+ DCP |

**讲述要点**：
- 这页强调我们不是"用 EDC 当 HTTP 库"，而是把它当作**真正的数据空间运行时**。

---

## Slide 4: System Architecture

**标题**
21 个 K8s pod 的完整部署

**配图**：用 `final/diagrams/02-architecture.png`（占满）

**核心说明（讲述时点出来）**：
- 单一 `mvd` namespace 下 4 个独立组：Provider 侧（HK Transport Hub，6 pod）、Consumer 1（HKTaxi，5 pod）、Consumer 2（HKU，5 pod）、Issuer（3 pod）+ Ingress（2 pod）
- 每个 Consumer 有自己的 vault、postgres、identityhub——**真正独立**，不是逻辑复制
- 外部出口：dataplane 通过 EDR pull 接到 `data.etabus.gov.hk`（KMB live API）

**讲述要点**：
- 这是我们做的最大改动之一：在原版 MVD 1 个 consumer 的基础上加了 HKU 整套独立部署。

---

## Slide 5: Data Assets & Policies

**标题**
4 类香港数据资产 × 4 类访问政策

**资产表**
| Asset ID | 数据类型 | 数据源 | Provider 子节点 |
|---|---|---|---|
| `asset-1` | KMB 巴士线路名录 | data.etabus.gov.hk **(真实 live API)** | provider-qna |
| `asset-2` | KMB 实时巴士 ETA | data.etabus.gov.hk | provider-qna |
| `hk-traffic-incidents` | 香港运输署交通事故 | data.gov.hk | provider-manufacturing |
| `mtr-patronage` | MTR 月度站点客流 | opendata.mtr.com.hk | provider-manufacturing |

**政策表**
| Policy ID | 含义 | 适用资产 |
|---|---|---|
| `require-membership` | 必须有 MembershipCredential | 几乎所有 |
| `require-dataprocessor` | 必须有 DataAccess.level=processing | asset-1 |
| `require-sensitive` | 必须有 DataAccess.level=sensitive | asset-2 |
| `academic-only-policy` | academic 资产专用（自定义新增）| hk-traffic-incidents, mtr-patronage |

**讲述要点**：
- KMB 那两条是**真实免认证公开 API**——演示时真的能拉到实时数据。

---

## Slide 6: Implementation & Improvements

**标题**
我们在 MVD 之上做了 6 个具体改进

| # | 改进 | 落地在 |
|---|---|---|
| 1 | 场景重映射：MVD alice/bob 抽象 → HK 真实角色 | postman collection / 文档 |
| 2 | 真实 live API 接入（KMB ETA）| `seed-hk-extra.sh` 资产定义 |
| 3 | **新增独立 HKU consumer**（20 个 K8s 资源）| `deployment/hku.tf` |
| 4 | 数据分化：provider-qna 与 provider-manufacturing 不再镜像 | `seed-hk-extra.sh` |
| 5 | Policy 双轨：commercial vs academic | `seed-hk-extra.sh` 中的 `academic-only-policy` |
| 6 | 部署适配：从 KinD 迁到 k3d，并修两个生产坑 | k3d cluster create + helm uninstall traefik |

**修过的两个坑（细节里见水平）**：
1. Docker Desktop 的 `host.docker.internal` 被 VPN 代理劫持到 `198.18.0.30` → 改成 `127.0.0.1`
2. k3d 默认装的 Traefik 抢了 80 端口 → uninstall 后 ingress-nginx 才拿到外部 IP

**讲述要点**：
- 这页是评分的"Logic & Improvements"硬通货，每条都有代码对应。

---

## Slide 7: Demo - Catalog Discovery (1/4)

**标题**
端到端演示 1/4：HKTaxi 发现 KMB 资产

**截图**：`final/screenshots/01-catalog.json`
```json
{
  "participantId": "did:web:provider-identityhub%3A7083:provider",
  "dataset_count": 2,
  "assets": ["asset-1", "asset-2"]
}
```

**讲述要点**：
- HKTaxi 通过 DSP 协议向 Provider 查询 catalog，Provider 返回它有权看到的 2 个资产。
- 注意：返回的不只是资产 ID，还包含每个资产挂的 ContractOffer（policy + 合约模板）。

---

## Slide 8: Demo - Negotiation FINALIZED (2/4)

**标题**
端到端演示 2/4：合约协商成功

**截图**：`final/screenshots/02-negotiation-finalized.json`
```json
{
  "state": "FINALIZED",
  "contractAgreementId": "58c37388-c733-4013-94a8-699348336f6c"
}
```

**讲述要点**：
- 协商在 4 秒内从 INITIAL → FINALIZED。
- Provider 校验了 HKTaxi 的 Membership + DataProcessor 凭证，签发合约。
- 拿到的 `contractAgreementId` 是后续传输的钥匙。

---

## Slide 9: Demo - Transfer + Real Data (3/4) ⭐

**标题**
端到端演示 3/4：拉到真实香港 KMB 数据

**截图（重头戏）**：`final/screenshots/05-real-kmb-data.json`
```json
{
  "type": "RouteList",
  "version": "1.0",
  "generated_timestamp": "2026-04-27T00:16:57+08:00",
  "sample_count": 1611,
  "sample_first_3": [
    { "route": "1", "orig_tc": "竹園邨", "dest_tc": "尖沙咀碼頭" },
    { "route": "1", "orig_tc": "尖沙咀碼頭", "dest_tc": "竹園邨" },
    { "route": "1A", "orig_tc": "中秀茂坪", "dest_tc": "尖沙咀碼頭" }
  ]
}
```

**讲述要点（这是 PPT 最有冲击力的一页！）**：
- 1611 条**真实**香港 KMB 巴士路线，trilingual（英/繁中/简中）
- 数据通过完整 7 步 EDC 管道：catalog → negotiation → contract → transfer → EDR → 实际 GET
- EDR（Endpoint Data Reference）里包含 Provider 用 EdDSA 签的 JWT，subject 是 consumer 的 DID——**机器对机器零信任**。

---

## Slide 10: Demo - Policy Enforcement (4/4)

**标题**
端到端演示 4/4：政策真的在执行

**截图**：`final/screenshots/08-policy-rejection.json`
```json
{
  "state": "TERMINATED",
  "errorDetail": "Failed to request contract to provider:
    {dspace:code: 400,
     dspace:reason: Contract offer is not valid:
       Policy in scope contract.negotiation not fulfilled:
       [Duty constraint: [Constraint 'DataAccess.level' EQ 'sensitive']]}"
}
```

**讲述要点**：
- 同一个 HKTaxi，去协商 `asset-2`（标记为 sensitive）时被拒。
- 拒绝原因明确指向缺失的 `DataAccess.level=sensitive` 约束。
- **Policy 不是装饰品**——它在 Provider 侧 ODRL 引擎里被严格评估，不满足就直接 TERMINATED。

---

## Slide 11: Future Work / Known Limitations

**标题**
诚实记录未完成的部分

**Bullets**
- **HKU 完整数据流**（catalog → transfer）尚未跑通
  - 原因：HKU 钱包目前装的是 Alice 签发的 VC，Provider 验签时 sub/aud 不匹配 → 401
  - 解决路径：通过 DCP credential issuance flow，让 Issuer 现场为 HKU 签发新 VC
  - 难点：需要 DID document 通过 did:web 解析、JWT 重签、challenge-response 三步
- **Push mode 传输**（S3 destination）：proposal 写了但本期未做
- **自定义 ODRL constraint**（如 attribution 义务）：需要在 Java side 注册 evaluation function

**讲述要点**：
- 这页给老师证明：我们理解 dataspace 完整边界，不是只做 happy path。

---

## Slide 12: Lessons Learned & Q&A

**标题**
我们学到了什么

**Bullets**
- Dataspace ≠ 数据 API。它的真正抽象是 **policy-bound contract**。
- DCP（凭证）和 DSP（协议）是正交的两套机制，分开理解才不混乱。
- k3d/KinD/EKS 等不同 K8s runtime 在 LoadBalancer 实现上差异巨大，调试要先看是谁占了 80 口。
- VPN/代理对 `host.docker.internal` 的劫持是 macOS 开发常见暗坑。

**致谢**
- 课程组的 EDC 教学材料
- Eclipse EDC 上游文档与 GitHub issues
- KMB Open Data Portal 提供免费 live API

**Q&A**

---

## 演讲节奏建议

| Slide | 用时 | 提示 |
|---|---|---|
| 1-2 | 1 分钟 | 慢速，建立场景 |
| 3 | 1 分钟 | 强调"为什么不是普通 API" |
| 4 | 1.5 分钟 | 架构图给观众消化时间 |
| 5 | 1 分钟 | 表格扫读 |
| 6 | 1.5 分钟 | 这是评分点，逐条讲 |
| 7-10 | 4 分钟 | demo 4 张，每张 1 分钟 |
| 11 | 1 分钟 | 体现工程素养 |
| 12 | 0.5 分钟 | 收尾 |
| **合计** | **~12 分钟** + Q&A |
