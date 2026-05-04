#!/usr/bin/env python3
"""Build the final presentation .pptx from script + screenshots + diagrams."""

import json
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

ROOT = Path("/Users/lichudikang/MVD/final")
DIAGRAMS = ROOT / "diagrams"
SCREENS = ROOT / "screenshots"
OUT = ROOT / "slides" / "final-presentation.pptx"

# --- Colors ---
NAVY = RGBColor(0x0B, 0x2E, 0x59)
ACCENT = RGBColor(0xCC, 0x66, 0x00)
ACADEMIC = RGBColor(0x00, 0x66, 0xCC)
PROVIDER = RGBColor(0x00, 0x66, 0x00)
TEXT = RGBColor(0x22, 0x22, 0x22)
MUTED = RGBColor(0x77, 0x77, 0x77)
GREEN = RGBColor(0x1E, 0x88, 0x4A)
RED = RGBColor(0xC0, 0x39, 0x2B)

# --- Helpers ---
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

BLANK = prs.slide_layouts[6]


def add_blank():
    return prs.slides.add_slide(BLANK)


def text(slide, x, y, w, h, content, *, size=18, bold=False, color=TEXT, align=PP_ALIGN.LEFT, mono=False):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    if isinstance(content, str):
        content = [content]
    for i, line in enumerate(content):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
        if mono:
            run.font.name = "Menlo"
    return box


def title_block(slide, title_text, *, sub=None):
    text(slide, 0.6, 0.4, 12.0, 0.7, title_text, size=32, bold=True, color=NAVY)
    if sub:
        text(slide, 0.6, 1.1, 12.0, 0.4, sub, size=14, color=MUTED)


def add_image(slide, path, x, y, w, h):
    if not Path(path).exists():
        print(f"  [skip] missing image: {path}")
        return None
    return slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))


def code_block(slide, x, y, w, h, code_text, *, size=11):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    box.fill.solid()
    box.fill.fore_color.rgb = RGBColor(0xF5, 0xF5, 0xF0)
    box.line.color.rgb = RGBColor(0xDD, 0xDD, 0xDD)
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.15)
    tf.margin_right = Inches(0.15)
    tf.margin_top = Inches(0.1)
    tf.margin_bottom = Inches(0.1)
    lines = code_text.splitlines() if isinstance(code_text, str) else code_text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        run = p.add_run()
        run.text = line if line else " "
        run.font.size = Pt(size)
        run.font.name = "Menlo"
        run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    return box


def bullet_list(slide, x, y, w, h, items, *, size=16, color=TEXT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(6)
        run = p.add_run()
        run.text = f"• {item}"
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return box


def table_block(slide, x, y, w, h, headers, rows, *, header_color=NAVY, font_size=12):
    rows_count = 1 + len(rows)
    cols_count = len(headers)
    tbl_shape = slide.shapes.add_table(rows_count, cols_count, Inches(x), Inches(y), Inches(w), Inches(h))
    tbl = tbl_shape.table
    for j, header in enumerate(headers):
        cell = tbl.cell(0, j)
        cell.text = header
        cell.fill.solid()
        cell.fill.fore_color.rgb = header_color
        for para in cell.text_frame.paragraphs:
            for run in para.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                run.font.size = Pt(font_size + 1)
    for i, row in enumerate(rows, start=1):
        for j, val in enumerate(row):
            cell = tbl.cell(i, j)
            cell.text = str(val)
            for para in cell.text_frame.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(font_size)
                    run.font.color.rgb = TEXT
    return tbl_shape


def load_screenshot_text(name):
    p = SCREENS / name
    if p.exists():
        return p.read_text()
    return f"<missing {name}>"


# ============================================================
# Slide 1: Cover
# ============================================================
s = add_blank()
# Background bar
bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(7.5))
bg.fill.solid()
bg.fill.fore_color.rgb = NAVY
bg.line.fill.background()

text(s, 0.6, 2.0, 12.0, 1.0, "Federated Hong Kong Transport Dataspace",
     size=44, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
text(s, 0.6, 3.1, 12.0, 0.6, "基于 Eclipse Dataspace Components 的香港交通联邦数据空间",
     size=24, color=RGBColor(0xCC, 0xDD, 0xFF))
text(s, 0.6, 5.5, 12.0, 0.5, "Final Project · CSC4240 · Spring 2026",
     size=18, color=RGBColor(0xAA, 0xBB, 0xDD))
text(s, 0.6, 6.0, 12.0, 0.5, "Zhao Yuxuan (124090921)  ·  Li Chudikang (122040057)",
     size=18, color=RGBColor(0xFF, 0xFF, 0xFF))


# ============================================================
# Slide 2: Problem & Scenario
# ============================================================
s = add_blank()
title_block(s, "为什么香港交通数据需要数据空间？", sub="Problem & Scenario")
bullet_list(s, 0.6, 1.6, 6.0, 3.5, [
    "香港交通数据散落在 KMB、MTR、运输署等多家机构",
    "下游做路径优化、出行 App、交通研究都要逐家谈数据",
    "传统方案（开放 API + 文件下载）缺乏：",
    "    · 可信身份（VC + DID）",
    "    · 合约可执行（ODRL + DSP 协议）",
    "    · 用途可审计 / 政策可拒绝",
])
add_image(s, DIAGRAMS / "01-scenario.png", 6.7, 1.5, 6.4, 5.6)


# ============================================================
# Slide 3: Why EDC vs HTTP
# ============================================================
s = add_blank()
title_block(s, "为什么选 Eclipse EDC（而非普通 HTTP）", sub="Why a Dataspace Runtime?")
table_block(s, 0.6, 1.6, 12.0, 4.5,
    ["维度", "直接 HTTP / S3 共享", "Eclipse EDC"],
    [
        ["身份", "API key（共享密钥）", "Verifiable Credential + DID"],
        ["合约", "隐式，靠条款", "ODRL + DSP 协议化协商"],
        ["政策", "服务端硬编码", "Policy 在 contract def 层，可组合"],
        ["审计", "自定义日志", "状态机内建（INITIAL→FINALIZED→TERMINATED）"],
        ["协议", "无标准", "DSP（Dataspace Protocol）+ DCP"],
    ], font_size=14)
text(s, 0.6, 6.4, 12.0, 0.5,
     '→ EDC 不是"另一个 HTTP 库"，而是把 dataspace 当作一等公民运行时',
     size=14, color=ACCENT, bold=True)


# ============================================================
# Slide 4: System Architecture
# ============================================================
s = add_blank()
title_block(s, "21 个 K8s Pod 的完整部署", sub="System Architecture · namespace `mvd`")
add_image(s, DIAGRAMS / "02-architecture.png", 0.4, 1.4, 12.6, 5.7)


# ============================================================
# Slide 5: Data Assets & Policies
# ============================================================
s = add_blank()
title_block(s, "4 类香港数据资产 × 4 类访问政策", sub="Data Assets & Policies")

text(s, 0.6, 1.5, 6.0, 0.4, "Data Assets", size=18, bold=True, color=NAVY)
table_block(s, 0.6, 1.95, 6.0, 3.5,
    ["Asset ID", "数据源", "Provider"],
    [
        ["asset-1\nKMB Routes", "data.etabus.gov.hk\n(LIVE)", "qna"],
        ["asset-2\nKMB ETA", "data.etabus.gov.hk", "qna"],
        ["hk-traffic-incidents", "data.gov.hk", "manufacturing"],
        ["mtr-patronage", "opendata.mtr.com.hk", "manufacturing"],
    ], font_size=10)

text(s, 6.9, 1.5, 6.0, 0.4, "Policies", size=18, bold=True, color=NAVY)
table_block(s, 6.9, 1.95, 6.0, 3.5,
    ["Policy ID", "约束"],
    [
        ["require-membership", "MembershipCredential = active"],
        ["require-dataprocessor", "DataAccess.level = processing"],
        ["require-sensitive", "DataAccess.level = sensitive"],
        ["academic-only-policy ⭐", "academic 资产专用（自定义新增）"],
    ], font_size=11)

text(s, 0.6, 6.0, 12.0, 0.5,
     "⭐ KMB Routes / ETA 是真实免认证公开 API — demo 时实际拉取",
     size=14, color=ACCENT, bold=True)


# ============================================================
# Slide 6: Implementation & Improvements
# ============================================================
s = add_blank()
title_block(s, "我们在 MVD 之上做了 6 个具体改进",
            sub='Implementation Highlights · the "Logic & Improvements" section')

table_block(s, 0.6, 1.5, 12.0, 4.5,
    ["#", "改进", "落地文件"],
    [
        ["1", "场景重映射：MVD alice/bob 抽象 → HK 真实角色", "postman / 文档"],
        ["2", "真实 live API 接入（KMB Routes/ETA）", "seed-hk-extra.sh"],
        ["3", "新增独立 HKU consumer（20 个 K8s 资源）", "deployment/hku.tf"],
        ["4", "数据分化：qna 与 manufacturing 不再镜像", "seed-hk-extra.sh"],
        ["5", "Policy 双轨：commercial vs academic", "seed-hk-extra.sh"],
        ["6", "部署适配：KinD → k3d，修两个生产坑", "k3d cluster create"],
    ], font_size=13)

text(s, 0.6, 6.3, 12.0, 0.4,
     "踩过的坑（细节里见水平）：", size=14, bold=True, color=NAVY)
text(s, 0.6, 6.7, 12.0, 0.4,
     "• host.docker.internal 被 VPN 代理劫持到 198.18.0.30 → 改用 127.0.0.1",
     size=12, color=TEXT)
text(s, 0.6, 7.0, 12.0, 0.4,
     "• k3d 默认 Traefik 抢 80 端口 → helm uninstall 让 ingress-nginx 接管",
     size=12, color=TEXT)


# ============================================================
# Slide 7: Demo 1/4 - Catalog Discovery
# ============================================================
s = add_blank()
title_block(s, "端到端演示 1/4：Catalog Discovery", sub="HKTaxi 通过 DSP 发现 KMB 资产")
text(s, 0.6, 1.5, 12.0, 0.5, "POST /consumer/cp/api/management/v3/catalog/request",
     size=14, mono=True, color=ACCENT, bold=True)
code_block(s, 0.6, 2.1, 12.0, 4.0, load_screenshot_text("01-catalog.json"), size=14)
text(s, 0.6, 6.4, 12.0, 0.5,
     "→ Provider 返回 dcat:dataset 数组，每个资产都附带 ODRL 合约模板",
     size=14, color=ACCENT)


# ============================================================
# Slide 8: Demo 2/4 - Negotiation FINALIZED
# ============================================================
s = add_blank()
title_block(s, "端到端演示 2/4：合约协商成功", sub="state: INITIAL → FINALIZED")
text(s, 0.6, 1.5, 12.0, 0.5, "POST /contractnegotiations  →  state polling",
     size=14, mono=True, color=ACCENT, bold=True)
code_block(s, 0.6, 2.1, 12.0, 3.0, load_screenshot_text("02-negotiation-finalized.json"), size=16)
bullet_list(s, 0.6, 5.4, 12.0, 1.8, [
    "Provider 校验 Membership + DataProcessor 凭证 → 签发合约",
    "4 秒内完成（INITIAL → REQUESTED → AGREED → FINALIZED）",
    "拿到的 contractAgreementId 是后续 transfer 的钥匙",
], size=14)


# ============================================================
# Slide 9: Demo 3/4 - Real KMB Data ⭐
# ============================================================
s = add_blank()
title_block(s, "端到端演示 3/4：拉到真实香港 KMB 数据 ⭐",
            sub="The hero shot — 1611 real Hong Kong bus routes")
# Code block with the JSON
real_data = load_screenshot_text("05-real-kmb-data.json")
code_block(s, 0.6, 1.5, 8.5, 5.5, real_data, size=11)
# Right-side highlights
text(s, 9.4, 1.5, 3.6, 0.5, "Highlights", size=18, bold=True, color=ACCENT)
bullet_list(s, 9.4, 2.0, 3.6, 5.0, [
    "1611 真实路线",
    "trilingual（EN/繁/简）",
    "竹園邨、尖沙咀碼頭等真站点",
    "通过 7 步 EDC 管道：",
    "  catalog → negotiation",
    "  → contract → transfer",
    "  → EDR → 实际 GET",
    "EDR 含 Provider 用 EdDSA",
    "  签的 JWT，机器对机器零信任",
], size=11, color=TEXT)


# ============================================================
# Slide 10: Demo 4/4 - Policy Enforcement
# ============================================================
s = add_blank()
title_block(s, "端到端演示 4/4：政策真的在执行",
            sub="Same HKTaxi tries asset-2 (sensitive) → REJECTED")
text(s, 0.6, 1.5, 12.0, 0.5, "Negotiation TERMINATED with explicit policy reason:",
     size=14, color=RED, bold=True)
code_block(s, 0.6, 2.1, 12.0, 3.5, load_screenshot_text("08-policy-rejection.json"), size=12)
bullet_list(s, 0.6, 5.9, 12.0, 1.5, [
    "同一个 HKTaxi，缺 DataAccess.level=sensitive 凭证 → 直接 TERMINATED",
    "ODRL 引擎在 Provider 侧严格评估，不满足约束就拒绝",
    "Policy 不是装饰品 —— 它真的在 contract negotiation scope 里执行",
], size=14, color=TEXT)


# ============================================================
# Slide 11: Future Work
# ============================================================
s = add_blank()
title_block(s, "诚实记录未完成的部分", sub="Future Work · Known Limitations")

text(s, 0.6, 1.6, 12.0, 0.4, "1. HKU 完整数据流（catalog → transfer）尚未跑通",
     size=18, bold=True, color=NAVY)
bullet_list(s, 0.9, 2.1, 12.0, 1.8, [
    "原因：HKU 钱包目前装 Alice 签发的 VC，Provider 验签 sub/aud 不匹配 → 401",
    "解决路径：通过 DCP credential issuance flow，让 Issuer 现场为 HKU 签新 VC",
    "难点：DID document 通过 did:web 解析 + JWT 重签 + challenge-response",
], size=14, color=TEXT)

text(s, 0.6, 4.3, 12.0, 0.4, "2. Push mode 传输（S3 destination）",
     size=18, bold=True, color=NAVY)
bullet_list(s, 0.9, 4.8, 12.0, 0.8, [
    "Proposal 写了 push 模式，本期重点放在了 HttpData-PULL 的端到端验证",
], size=14, color=TEXT)

text(s, 0.6, 5.8, 12.0, 0.4, "3. 自定义 ODRL constraint（如 attribution 义务）",
     size=18, bold=True, color=NAVY)
bullet_list(s, 0.9, 6.3, 12.0, 0.8, [
    "需要在 Java side 注册 evaluation function，纯 JSON 配置不能添加新 leftOperand",
], size=14, color=TEXT)


# ============================================================
# Slide 12: Lessons & Q&A
# ============================================================
s = add_blank()
title_block(s, "我们学到了什么", sub="Lessons Learned · Q&A")

bullet_list(s, 0.6, 1.5, 12.0, 4.5, [
    "Dataspace ≠ 数据 API；它的真正抽象是 policy-bound contract",
    "DCP（凭证）和 DSP（协议）是正交的两套机制，分开理解才不混乱",
    "k3d / KinD / EKS 在 LoadBalancer 实现上差异巨大 — 调试先看谁占了 80",
    "VPN/代理对 host.docker.internal 的 DNS 劫持是 macOS 常见暗坑",
    "Verifiable Credential 的 holder rebind 是 demo 设计的关键边界",
], size=18, color=TEXT)

text(s, 0.6, 5.6, 12.0, 0.5, "致谢", size=20, bold=True, color=NAVY)
bullet_list(s, 0.6, 6.0, 12.0, 1.5, [
    "课程组的 EDC 教学材料",
    "Eclipse EDC 上游文档与 GitHub issues",
    "KMB Open Data Portal 提供免费 live API",
], size=14)

text(s, 5.5, 7.0, 4.0, 0.5, "Q & A", size=36, bold=True, color=ACCENT, align=PP_ALIGN.CENTER)


# ============================================================
prs.save(str(OUT))
print(f"✓ Built {OUT}")
print(f"  Total slides: {len(prs.slides)}")
