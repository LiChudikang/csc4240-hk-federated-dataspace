// Build CSC4240 Final Project deck
// Based on /Users/lichudikang/MVD/final/PPT-BRIEF.md

const PptxGenJS = require("pptxgenjs");
const path = require("path");

const DIAGRAMS = "/sessions/intelligent-keen-cerf/mnt/final/diagrams";
const SHOTS = "/sessions/intelligent-keen-cerf/mnt/final/screenshots";
const OUT = "/sessions/intelligent-keen-cerf/mnt/final/slides/final-presentation.pptx";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "HK Transport Federated Dataspace";
pres.author = "Zhao Yuxuan, Li Chudikang";
pres.company = "CUHK-Shenzhen · CSC4240";

// Palette
const C = {
    edc: "0066CC",          // EDC blue
    edcDark: "003E80",
    hk: "D71920",           // HK red
    ink: "1A1A1A",          // primary text
    body: "3A3A3A",          // body text
    muted: "6B7280",        // labels
    line: "D9DEE3",
    bgSoft: "F4F6F8",
    cardBg: "FFFFFF",
    success: "108043",
    danger: "B00020",
    code: "0F172A",
    codeFg: "E2E8F0",
};

const F = {
    head: "Calibri",        // headings (Inter not avail in PPT default)
    body: "Calibri",
    mono: "Consolas",
};

// Helpers --------------------------------------------------------------
function addBaseFrame(slide, title, eyebrow) {
    // Top bar accent
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: C.edc }, line: { color: C.edc } });
    // HK red micro-mark (right side)
    slide.addShape(pres.ShapeType.rect, { x: 12.6, y: 0, w: 0.733, h: 0.18, fill: { color: C.hk }, line: { color: C.hk } });

    if (eyebrow) {
        slide.addText(eyebrow, {
            x: 0.5, y: 0.32, w: 12.3, h: 0.32,
            fontFace: F.head, fontSize: 11, color: C.muted, bold: true, charSpacing: 4,
        });
    }
    if (title) {
        slide.addText(title, {
            x: 0.5, y: 0.62, w: 12.3, h: 0.7,
            fontFace: F.head, fontSize: 26, color: C.ink, bold: true,
        });
        // thin underline divider
        slide.addShape(pres.ShapeType.line, {
            x: 0.5, y: 1.32, w: 12.3, h: 0,
            line: { color: C.line, width: 0.75 },
        });
    }
    // footer
    slide.addText("CSC4240 Data Spaces  ·  HK Transport Federated Dataspace", {
        x: 0.5, y: 7.18, w: 11, h: 0.24,
        fontFace: F.body, fontSize: 9, color: C.muted,
    });
}

function addPageNumber(slide, n, total) {
    slide.addText(`${n} / ${total}`, {
        x: 12.0, y: 7.18, w: 0.85, h: 0.24,
        fontFace: F.body, fontSize: 9, color: C.muted, align: "right",
    });
}

const TOTAL = 16;

// --- Slide 1 · Cover ---------------------------------------------------
{
    const s = pres.addSlide();
    // dark band background
    s.background = { color: "FFFFFF" };
    // big left accent panel
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 4.6, h: 7.5, fill: { color: C.edcDark }, line: { color: C.edcDark } });
    // red horizontal mark on accent panel
    s.addShape(pres.ShapeType.rect, { x: 0.6, y: 1.6, w: 0.6, h: 0.08, fill: { color: C.hk }, line: { color: C.hk } });
    s.addText("CSC4240  ·  Data Spaces", {
        x: 0.6, y: 1.78, w: 4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: "BFD7EE", bold: true, charSpacing: 6,
    });
    s.addText("Final\nProject", {
        x: 0.6, y: 2.3, w: 4, h: 2.4,
        fontFace: F.head, fontSize: 60, color: "FFFFFF", bold: true, lineSpacingMultiple: 0.95,
    });
    s.addText("Spring 2026 · CUHK-Shenzhen", {
        x: 0.6, y: 6.55, w: 4, h: 0.3,
        fontFace: F.body, fontSize: 11, color: "BFD7EE",
    });

    // Right content panel
    s.addText("HK Transport", {
        x: 5.1, y: 1.7, w: 8, h: 0.85,
        fontFace: F.head, fontSize: 40, color: C.ink, bold: true,
    });
    s.addText("Federated Dataspace", {
        x: 5.1, y: 2.45, w: 8, h: 0.85,
        fontFace: F.head, fontSize: 40, color: C.edc, bold: true,
    });
    s.addText("Federation, Policy, and Trust on EDC MVD", {
        x: 5.1, y: 3.4, w: 8, h: 0.4,
        fontFace: F.head, fontSize: 17, color: C.muted, italic: true,
    });

    // separator
    s.addShape(pres.ShapeType.line, {
        x: 5.1, y: 4.0, w: 1.2, h: 0,
        line: { color: C.hk, width: 2 },
    });

    s.addText([
        { text: "Team\n", options: { bold: true, fontSize: 12, color: C.muted, charSpacing: 4 } },
        { text: "Zhao Yuxuan", options: { fontSize: 16, color: C.ink, bold: true } },
        { text: "  ·  124090921\n", options: { fontSize: 13, color: C.muted } },
        { text: "Li Chudikang", options: { fontSize: 16, color: C.ink, bold: true } },
        { text: "  ·  122040057", options: { fontSize: 13, color: C.muted } },
    ], { x: 5.1, y: 4.2, w: 8, h: 1.4, fontFace: F.body, lineSpacingMultiple: 1.3 });

    // Instructor
    s.addText("INSTRUCTOR", {
        x: 5.1, y: 5.75, w: 3.5, h: 0.28,
        fontFace: F.head, fontSize: 10, color: C.muted, bold: true, charSpacing: 4,
    });
    s.addText("Prof. George Polyzos", {
        x: 5.1, y: 6.02, w: 3.5, h: 0.36,
        fontFace: F.body, fontSize: 14, color: C.ink, bold: true,
    });
    // Date
    s.addText("DATE", {
        x: 9.0, y: 5.75, w: 3.5, h: 0.28,
        fontFace: F.head, fontSize: 10, color: C.muted, bold: true, charSpacing: 4,
    });
    s.addText("27 April 2026", {
        x: 9.0, y: 6.02, w: 3.5, h: 0.36,
        fontFace: F.body, fontSize: 14, color: C.ink, bold: true,
    });

    // EDC pill
    s.addShape(pres.ShapeType.roundRect, {
        x: 5.1, y: 6.7, w: 4.6, h: 0.4,
        fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 },
        rectRadius: 0.2,
    });
    s.addText("Built on Eclipse Dataspace Components MVD", {
        x: 5.1, y: 6.7, w: 4.6, h: 0.4,
        fontFace: F.body, fontSize: 10, color: C.body, align: "center", valign: "middle",
    });
}

// --- Slide 2 · Why -----------------------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Why a Hong Kong Transport Dataspace?", "THE PROBLEM");

    // 4 silos icons row
    const actors = [
        { name: "KMB", sub: "Bus operator", color: C.hk },
        { name: "MTR", sub: "Rail operator", color: "0F8A4F" },
        { name: "TD", sub: "Transport Dept.", color: "1B4F92" },
        { name: "Academia", sub: "Research labs", color: "8E5BA6" },
    ];
    const startX = 0.9, gap = 0.35, boxW = 2.7, boxH = 1.5, top = 1.85;
    actors.forEach((a, i) => {
        const x = startX + i * (boxW + gap);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: top, w: boxW, h: boxH,
            fill: { color: "FFFFFF" }, line: { color: C.line, width: 1 },
            rectRadius: 0.08,
        });
        s.addShape(pres.ShapeType.rect, { x, y: top, w: boxW, h: 0.18, fill: { color: a.color }, line: { color: a.color } });
        s.addText(a.name, {
            x: x + 0.1, y: top + 0.32, w: boxW - 0.2, h: 0.55,
            fontFace: F.head, fontSize: 22, color: C.ink, bold: true, align: "center",
        });
        s.addText(a.sub, {
            x: x + 0.1, y: top + 0.95, w: boxW - 0.2, h: 0.4,
            fontFace: F.body, fontSize: 12, color: C.muted, align: "center",
        });
    });
    // broken connectors
    const yLine = top + boxH + 0.35;
    for (let i = 0; i < 3; i++) {
        const lx = startX + boxW + i * (boxW + gap);
        s.addShape(pres.ShapeType.line, {
            x: lx - 0.3, y: yLine, w: 0.45, h: 0,
            line: { color: C.muted, width: 1.5, dashType: "dash" },
        });
        s.addText("✕", {
            x: lx - 0.05, y: yLine - 0.18, w: 0.3, h: 0.35,
            fontFace: F.head, fontSize: 18, color: C.hk, bold: true, align: "center",
        });
        s.addShape(pres.ShapeType.line, {
            x: lx + 0.2, y: yLine, w: 0.45, h: 0,
            line: { color: C.muted, width: 1.5, dashType: "dash" },
        });
    }
    s.addText("Data silos: no shared trust, no shared protocol", {
        x: 0.5, y: yLine + 0.15, w: 12.3, h: 0.32,
        fontFace: F.body, fontSize: 12, color: C.muted, italic: true, align: "center",
    });

    // 3 issue cards
    const issues = [
        { h: "Bilateral, ad-hoc", t: "Each pair exchanges API keys privately. No common protocol; integration cost grows O(N²)." },
        { h: "No policy, no audit", t: "Access control is server-side hard code. Who used what under which condition is invisible." },
        { h: "Academia locked out", t: "Research teams cannot legally obtain commercial real-time data without long contractual paperwork." },
    ];
    const iY = 4.55, iH = 1.85, iW = 4.05, iGap = 0.18;
    issues.forEach((iss, i) => {
        const x = 0.5 + i * (iW + iGap);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: iY, w: iW, h: iH,
            fill: { color: C.bgSoft }, line: { color: C.line, width: 0.75 },
            rectRadius: 0.08,
        });
        s.addShape(pres.ShapeType.rect, { x: x + 0.18, y: iY + 0.22, w: 0.05, h: 0.42, fill: { color: C.hk }, line: { color: C.hk } });
        s.addText(iss.h, {
            x: x + 0.4, y: iY + 0.18, w: iW - 0.5, h: 0.5,
            fontFace: F.head, fontSize: 16, color: C.ink, bold: true,
        });
        s.addText(iss.t, {
            x: x + 0.4, y: iY + 0.75, w: iW - 0.55, h: 1.0,
            fontFace: F.body, fontSize: 12.5, color: C.body, lineSpacingMultiple: 1.2,
        });
    });

    addPageNumber(s, 2, TOTAL);
}

// --- Slide 3 · Why a Dataspace Runtime? --------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Why a Dataspace Runtime?", "DESIGN RATIONALE");

    const rows = [
        { dim: "Identity",  left: "Shared API keys",            right: "DID + Verifiable Credentials" },
        { dim: "Contract",  left: "Implicit terms of service",  right: "ODRL + DSP negotiated" },
        { dim: "Policy",    left: "Hard-coded server-side",     right: "Composable in contract definition" },
        { dim: "Audit",     left: "Custom application logs",    right: "Built-in state machine (INITIAL → FINALIZED → TERMINATED)" },
        { dim: "Protocol",  left: "Ad hoc, vendor-specific",    right: "DSP + DCP open standards" },
    ];

    const tx = 0.5, ty = 1.55, tw = 12.3;
    const colDim = 1.7, colLeft = 4.5, colRight = tw - colDim - colLeft;
    const headerH = 0.55, rowH = 0.7;

    // Header row background
    s.addShape(pres.ShapeType.rect, {
        x: tx, y: ty, w: tw, h: headerH,
        fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 },
    });
    s.addText("DIMENSION", {
        x: tx + 0.2, y: ty, w: colDim - 0.2, h: headerH,
        fontFace: F.head, fontSize: 10.5, color: C.muted, bold: true, charSpacing: 4, valign: "middle",
    });
    s.addText("Plain HTTP / S3 sharing", {
        x: tx + colDim, y: ty, w: colLeft, h: headerH,
        fontFace: F.head, fontSize: 13, color: C.body, bold: true, valign: "middle",
    });
    // Right header with EDC blue accent stripe
    s.addShape(pres.ShapeType.rect, {
        x: tx + colDim + colLeft, y: ty, w: colRight, h: headerH,
        fill: { color: C.edc }, line: { color: C.edc },
    });
    s.addText("Eclipse Dataspace Components", {
        x: tx + colDim + colLeft + 0.2, y: ty, w: colRight - 0.4, h: headerH,
        fontFace: F.head, fontSize: 13, color: "FFFFFF", bold: true, valign: "middle",
    });

    // Rows
    rows.forEach((r, i) => {
        const ry = ty + headerH + i * rowH;
        if (i % 2 === 1) {
            s.addShape(pres.ShapeType.rect, {
                x: tx, y: ry, w: tw, h: rowH,
                fill: { color: "FAFBFC" }, line: { color: "FAFBFC" },
            });
        }
        s.addText(r.dim, {
            x: tx + 0.2, y: ry, w: colDim - 0.2, h: rowH,
            fontFace: F.head, fontSize: 13, color: C.ink, bold: true, valign: "middle",
        });
        s.addText(r.left, {
            x: tx + colDim, y: ry, w: colLeft - 0.2, h: rowH,
            fontFace: F.body, fontSize: 12.5, color: C.muted, valign: "middle",
        });
        s.addText(r.right, {
            x: tx + colDim + colLeft, y: ry, w: colRight - 0.2, h: rowH,
            fontFace: F.body, fontSize: 12.5, color: C.body, bold: true, valign: "middle",
        });
        // bottom border per row
        s.addShape(pres.ShapeType.line, {
            x: tx, y: ry + rowH, w: tw, h: 0,
            line: { color: C.line, width: 0.5 },
        });
    });

    // Takeaway box
    const tkY = ty + headerH + rows.length * rowH + 0.4;
    s.addShape(pres.ShapeType.roundRect, {
        x: tx, y: tkY, w: tw, h: 0.85,
        fill: { color: C.edcDark }, line: { color: C.edcDark }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, {
        x: tx, y: tkY, w: 0.18, h: 0.85,
        fill: { color: C.hk }, line: { color: C.hk },
    });
    s.addText([
        { text: "EDC isn't another HTTP library — it makes ", options: { color: "FFFFFF" } },
        { text: "\"dataspace\"", options: { color: "FCD34D", bold: true } },
        { text: " a first-class runtime.", options: { color: "FFFFFF" } },
    ], {
        x: tx + 0.45, y: tkY, w: tw - 0.6, h: 0.85,
        fontFace: F.head, fontSize: 16, italic: true, valign: "middle",
    });

    addPageNumber(s, 3, TOTAL);
}

// --- Slide 4 · What We Built -------------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "What We Built", "PROJECT OVERVIEW");

    // Three columns
    const parts = [
        {
            tag: "PART 1", color: C.edc,
            title: "Real HK Data Flows",
            bullets: [
                "5-participant dataspace on EDC MVD",
                "4 real Hong Kong datasets",
                "Pull + Push transfer (HttpData)",
            ],
            stat: "1,611",
            statLabel: "KMB routes pulled live",
        },
        {
            tag: "PART 2", color: "0F8A4F",
            title: "HKU Joins as Dual-Role",
            bullets: [
                "HKU Transport Lab — new participant",
                "Acts as both consumer & provider",
                "Federated catalog crawler aggregates 4 nodes",
            ],
            stat: "Dual",
            statLabel: "consumer + provider",
        },
        {
            tag: "PART 3 · BONUS", color: C.hk,
            title: "Custom ODRL in Java",
            bullets: [
                "Extended EDC policy engine",
                "Permission constraint: ParticipantTier",
                "Duty constraint: Attribution whitelist",
            ],
            stat: "2",
            statLabel: "new evaluation functions",
        },
    ];

    const colW = 4.05, colGap = 0.18, colY = 1.55, colH = 5.1;
    parts.forEach((p, i) => {
        const x = 0.5 + i * (colW + colGap);
        // Card
        s.addShape(pres.ShapeType.roundRect, {
            x, y: colY, w: colW, h: colH,
            fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 },
            rectRadius: 0.1,
        });
        // Top color stripe
        s.addShape(pres.ShapeType.rect, { x, y: colY, w: colW, h: 0.22, fill: { color: p.color }, line: { color: p.color } });

        // Tag
        s.addText(p.tag, {
            x: x + 0.3, y: colY + 0.4, w: colW - 0.6, h: 0.32,
            fontFace: F.head, fontSize: 11, color: p.color, bold: true, charSpacing: 4,
        });
        // Title
        s.addText(p.title, {
            x: x + 0.3, y: colY + 0.78, w: colW - 0.6, h: 0.85,
            fontFace: F.head, fontSize: 20, color: C.ink, bold: true, lineSpacingMultiple: 1.05,
        });
        // Bullets
        s.addText(p.bullets.map(b => ({ text: b, options: { bullet: { code: "25CF" }, fontSize: 12.5, color: C.body, paraSpaceAfter: 6 } })), {
            x: x + 0.3, y: colY + 1.85, w: colW - 0.55, h: 1.7,
            fontFace: F.body, lineSpacingMultiple: 1.2,
        });
        // Stat box
        s.addShape(pres.ShapeType.line, {
            x: x + 0.3, y: colY + 3.7, w: colW - 0.6, h: 0,
            line: { color: C.line, width: 0.75 },
        });
        s.addText(p.stat, {
            x: x + 0.3, y: colY + 3.85, w: colW - 0.6, h: 0.75,
            fontFace: F.head, fontSize: 38, color: p.color, bold: true,
        });
        s.addText(p.statLabel, {
            x: x + 0.3, y: colY + 4.6, w: colW - 0.6, h: 0.4,
            fontFace: F.body, fontSize: 11, color: C.muted,
        });
    });

    // Bottom strip
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 6.78, w: 12.3, h: 0.32,
        fill: { color: C.edcDark }, line: { color: C.edcDark }, rectRadius: 0.05,
    });
    s.addText("Built on Eclipse MVD  ·  Runs locally on k3d Kubernetes  ·  21 pods across 5 participants", {
        x: 0.5, y: 6.78, w: 12.3, h: 0.32,
        fontFace: F.body, fontSize: 11, color: "FFFFFF", align: "center", valign: "middle", bold: true,
    });

    addPageNumber(s, 4, TOTAL);
}

// --- Slide 5 · Architecture --------------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Federated Architecture · 5 Participants", "SYSTEM DESIGN");

    // Architecture image on the left
    s.addImage({
        path: path.join(DIAGRAMS, "02-architecture.png"),
        x: 0.5, y: 1.5, w: 7.4, h: 5.4,
        sizing: { type: "contain", w: 7.4, h: 5.4 },
    });

    // Right side annotations
    const rx = 8.1, rw = 4.7;
    s.addText("Each participant runs its own stack", {
        x: rx, y: 1.55, w: rw, h: 0.4,
        fontFace: F.head, fontSize: 14, color: C.ink, bold: true,
    });
    s.addText([
        { text: "Control plane", options: { bold: true, color: C.edc } }, { text: " · contract & catalog\n" },
        { text: "Data plane", options: { bold: true, color: C.edc } }, { text: " · token-bound transfer\n" },
        { text: "Identity Hub", options: { bold: true, color: C.edc } }, { text: " · DID + VC presentation\n" },
        { text: "Vault", options: { bold: true, color: C.edc } }, { text: " · key material" },
    ], {
        x: rx, y: 1.95, w: rw, h: 1.5,
        fontFace: F.body, fontSize: 12, color: C.body, lineSpacingMultiple: 1.4,
    });

    s.addShape(pres.ShapeType.line, { x: rx, y: 3.55, w: rw, h: 0, line: { color: C.line, width: 0.75 } });
    s.addText("Trust is built on standards", {
        x: rx, y: 3.65, w: rw, h: 0.4,
        fontFace: F.head, fontSize: 14, color: C.ink, bold: true,
    });
    s.addText([
        { text: "DID + Verifiable Credentials", options: { bold: true } },
        { text: " establish participant identity\n" },
        { text: "DSP (Dataspace Protocol)", options: { bold: true } },
        { text: " carries catalog + negotiation\n" },
        { text: "DCP (Decentralized Claims)", options: { bold: true } },
        { text: " carries credential presentation" },
    ], {
        x: rx, y: 4.05, w: rw, h: 1.7,
        fontFace: F.body, fontSize: 12, color: C.body, lineSpacingMultiple: 1.4,
    });

    s.addShape(pres.ShapeType.line, { x: rx, y: 5.85, w: rw, h: 0, line: { color: C.line, width: 0.75 } });
    s.addText("Centralised only where needed", {
        x: rx, y: 5.95, w: rw, h: 0.4,
        fontFace: F.head, fontSize: 14, color: C.ink, bold: true,
    });
    s.addText([
        { text: "Dataspace Issuer", options: { bold: true } }, { text: " issues VCs\n" },
        { text: "Catalog Server", options: { bold: true } }, { text: " mirrors a federated index" },
    ], {
        x: rx, y: 6.35, w: rw, h: 0.7,
        fontFace: F.body, fontSize: 12, color: C.body, lineSpacingMultiple: 1.4,
    });

    addPageNumber(s, 5, TOTAL);
}

// --- Slide 6 · Actors & Datasets ---------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Actors & Datasets", "WHO AND WHAT");

    // Two columns
    // LEFT — Actors
    const lx = 0.5, lw = 6.1, ty = 1.6;
    s.addShape(pres.ShapeType.roundRect, {
        x: lx, y: ty, w: lw, h: 5.3,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: lx, y: ty, w: lw, h: 0.22, fill: { color: C.edc }, line: { color: C.edc } });
    s.addText("ACTORS · 5 participants", {
        x: lx + 0.3, y: ty + 0.32, w: lw - 0.6, h: 0.4,
        fontFace: F.head, fontSize: 12, color: C.edc, bold: true, charSpacing: 4,
    });

    const actors = [
        { tag: "PROVIDER", color: C.edc, name: "HK Transport Hub", sub: "(bob) — KMB / MTR / Government feeds" },
        { tag: "CONSUMER · COMMERCIAL", color: "8E5BA6", name: "HKTaxi", sub: "(alice) — fleet routing platform" },
        { tag: "DUAL-ROLE · ACADEMIC", color: "0F8A4F", name: "HKU Transport Lab", sub: "consumer for KMB · provider of research data" },
        { tag: "TRUST ROOT", color: C.hk, name: "Dataspace Issuer", sub: "issues Verifiable Credentials to all parties" },
    ];
    actors.forEach((a, i) => {
        const ay = ty + 0.95 + i * 1.05;
        s.addShape(pres.ShapeType.rect, { x: lx + 0.35, y: ay + 0.06, w: 0.07, h: 0.78, fill: { color: a.color }, line: { color: a.color } });
        s.addText(a.tag, {
            x: lx + 0.55, y: ay, w: lw - 0.7, h: 0.3,
            fontFace: F.head, fontSize: 9.5, color: a.color, bold: true, charSpacing: 4,
        });
        s.addText(a.name, {
            x: lx + 0.55, y: ay + 0.27, w: lw - 0.7, h: 0.36,
            fontFace: F.head, fontSize: 15, color: C.ink, bold: true,
        });
        s.addText(a.sub, {
            x: lx + 0.55, y: ay + 0.63, w: lw - 0.7, h: 0.32,
            fontFace: F.body, fontSize: 11, color: C.muted,
        });
    });

    // RIGHT — Datasets
    const rx = 6.85, rw = 6.0;
    s.addShape(pres.ShapeType.roundRect, {
        x: rx, y: ty, w: rw, h: 5.3,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: rx, y: ty, w: rw, h: 0.22, fill: { color: C.hk }, line: { color: C.hk } });
    s.addText("DATASETS · real HK feeds", {
        x: rx + 0.3, y: ty + 0.32, w: rw - 0.6, h: 0.4,
        fontFace: F.head, fontSize: 12, color: C.hk, bold: true, charSpacing: 4,
    });

    const datasets = [
        { name: "KMB Routes", count: "1,611", src: "data.etabus.gov.hk · LIVE" },
        { name: "KMB ETA",     count: "live", src: "data.etabus.gov.hk" },
        { name: "HK Traffic Incidents", count: "feed", src: "data.gov.hk" },
        { name: "MTR Patronage", count: "feed", src: "opendata.mtr.com.hk" },
        { name: "HKU Transit Equity 2026", count: "ACADEMIC", src: "internal research dataset" },
    ];
    datasets.forEach((d, i) => {
        const dy = ty + 0.95 + i * 0.83;
        s.addText(d.name, {
            x: rx + 0.35, y: dy, w: rw * 0.55, h: 0.4,
            fontFace: F.head, fontSize: 14, color: C.ink, bold: true,
        });
        s.addText(d.src, {
            x: rx + 0.35, y: dy + 0.34, w: rw * 0.55, h: 0.32,
            fontFace: F.body, fontSize: 10.5, color: C.muted,
        });
        s.addText(d.count, {
            x: rx + rw * 0.6, y: dy + 0.05, w: rw * 0.36, h: 0.45,
            fontFace: F.head, fontSize: 18, color: d.count === "ACADEMIC" ? "0F8A4F" : C.edc, bold: true, align: "right",
        });
        if (i < datasets.length - 1) {
            s.addShape(pres.ShapeType.line, {
                x: rx + 0.35, y: dy + 0.7, w: rw - 0.7, h: 0,
                line: { color: C.line, width: 0.5 },
            });
        }
    });

    addPageNumber(s, 6, TOTAL);
}

// --- Slide 7 · Implementation Highlights -------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Implementation Highlights", "8 ENGINEERING CHANGES ON TOP OF UPSTREAM MVD");

    const items = [
        { n: "01", title: "Scenario reskin",                 note: "MVD alice/bob → HK Transport Hub / HKTaxi / HKU",      path: "brief, postman, identityhub seed",          color: C.edc },
        { n: "02", title: "Live KMB API integration",        note: "Real 1,611 routes via dataplane HTTP source",          path: "scripts/seed-hk-extra.sh",                  color: C.edc },
        { n: "03", title: "New HKU participant",             note: "Independent control plane + IdentityHub + vault",      path: "deployment/hku.tf  (20 K8s resources)",     color: "0F8A4F" },
        { n: "04", title: "Tier-based policy + asset split", note: "COMMERCIAL / ACADEMIC / PROVIDER on diverged catalogs", path: "scripts/seed-hk-extra.sh",                  color: C.edc },
        { n: "05", title: "S3 push backend (MinIO)",         note: "edc-dataplane-aws-s3 wired to in-cluster MinIO",       path: "minio-deploy.yaml · libs.versions.toml",    color: C.edc },
        { n: "06", title: "Live DCP credential issuance",    note: "Issuer activated, runtime VC mint via state machine",  path: "scripts/demo-live-issuance.sh",             color: "0F8A4F" },
        { n: "07", title: "Custom Permission (claim-based)", note: "ParticipantTier reads VC participantTier claim",       path: "ParticipantTierFunction.java + add-tier-claim.py", color: C.hk },
        { n: "08", title: "Custom Duty (Attribution)",       note: "Whitelist check on consumer-declared origin",          path: "AttributionDutyFunction.java",              color: C.hk },
    ];

    // 4 rows × 2 cols of cards
    const cardW = 6.05, cardH = 0.95, gapX = 0.2, gapY = 0.12;
    const startX = 0.5, startY = 1.55;
    items.forEach((it, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        s.addShape(pres.ShapeType.roundRect, {
            x, y, w: cardW, h: cardH,
            fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.6 }, rectRadius: 0.06,
        });
        // Number badge
        s.addShape(pres.ShapeType.roundRect, {
            x: x + 0.18, y: y + 0.18, w: 0.65, h: cardH - 0.36,
            fill: { color: it.color }, line: { color: it.color }, rectRadius: 0.05,
        });
        s.addText(it.n, {
            x: x + 0.18, y: y + 0.18, w: 0.65, h: cardH - 0.36,
            fontFace: F.head, fontSize: 17, color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
        // Title
        s.addText(it.title, {
            x: x + 1.0, y: y + 0.13, w: cardW - 1.15, h: 0.35,
            fontFace: F.head, fontSize: 14, color: C.ink, bold: true,
        });
        // Note
        s.addText(it.note, {
            x: x + 1.0, y: y + 0.43, w: cardW - 1.15, h: 0.28,
            fontFace: F.body, fontSize: 11, color: C.body,
        });
        // Path (mono, muted)
        s.addText(it.path, {
            x: x + 1.0, y: y + 0.69, w: cardW - 1.15, h: 0.24,
            fontFace: F.mono, fontSize: 9.5, color: C.muted, italic: true,
        });
    });

    // Engineering caveats strip
    const cvY = startY + 4 * cardH + 3 * gapY + 0.18;
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: cvY, w: 12.3, h: 0.95,
        fill: { color: "0F2742" }, line: { color: "0F2742" }, rectRadius: 0.06,
    });
    s.addText("ENGINEERING CAVEATS", {
        x: 0.7, y: cvY + 0.05, w: 4, h: 0.3,
        fontFace: F.head, fontSize: 10, color: "9CC2FA", bold: true, charSpacing: 4,
    });
    s.addText([
        { text: "•  ", options: { color: "9CC2FA", bold: true } },
        { text: "KinD → k3d", options: { fontFace: F.mono, color: "FCD34D", bold: true } },
        { text: " migration:  Traefik grabbed :80  →  ", options: { color: "E2E8F0" } },
        { text: "helm uninstall", options: { fontFace: F.mono, color: "FCD34D", bold: true } },
        { text: " for ingress-nginx\n", options: { color: "E2E8F0" } },
        { text: "•  ", options: { color: "9CC2FA", bold: true } },
        { text: "host.docker.internal", options: { fontFace: F.mono, color: "FCD34D", bold: true } },
        { text: " VPN-hijacked  →  switched to 127.0.0.1\n", options: { color: "E2E8F0" } },
        { text: "•  ", options: { color: "9CC2FA", bold: true } },
        { text: "EDC dataplane ", options: { color: "E2E8F0" } },
        { text: "chunked-transfer-encoding", options: { fontFace: F.mono, color: "FCD34D", bold: true } },
        { text: " compat resolved", options: { color: "E2E8F0" } },
    ], {
        x: 3.0, y: cvY + 0.05, w: 9.2, h: 0.85,
        fontFace: F.body, fontSize: 10.5, lineSpacingMultiple: 1.25, valign: "middle",
    });

    addPageNumber(s, 7, TOTAL);
}

// --- Slide 8 · Pull Transfer -------------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Live Pull from KMB Public API", "PART 1 · PULL TRANSFER");

    // Big stat
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 1.55, w: 12.3, h: 1.2,
        fill: { color: "0F2742" }, line: { color: "0F2742" }, rectRadius: 0.08,
    });
    s.addText("1,611", {
        x: 0.7, y: 1.6, w: 3.0, h: 1.1,
        fontFace: F.head, fontSize: 60, color: C.hk, bold: true, valign: "middle",
    });
    s.addText("KMB routes pulled in 14 seconds", {
        x: 3.7, y: 1.7, w: 9, h: 0.5,
        fontFace: F.head, fontSize: 22, color: "FFFFFF", bold: true, valign: "middle",
    });
    s.addText("end-to-end through DSP catalog → negotiation → transfer → EDR → public endpoint", {
        x: 3.7, y: 2.18, w: 9, h: 0.45,
        fontFace: F.body, fontSize: 12, color: "BFD7EE", italic: true, valign: "middle",
    });

    // Pipeline strip
    const steps = ["Catalog", "Negotiation", "Agreement", "Transfer", "EDR", "Endpoint", "Data"];
    const px = 0.5, py = 3.0, pw = 12.3, ph = 0.55;
    const stepW = (pw - 0.2 * (steps.length - 1)) / steps.length;
    steps.forEach((st, i) => {
        const x = px + i * (stepW + 0.2);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: py, w: stepW, h: ph,
            fill: { color: i === 6 ? C.hk : C.edc }, line: { color: i === 6 ? C.hk : C.edc },
            rectRadius: 0.06,
        });
        s.addText(`${i + 1} · ${st}`, {
            x, y: py, w: stepW, h: ph,
            fontFace: F.head, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
    });

    // Two evidence cards
    const ey = 3.85, eh = 3.0, ew = 6.05, gap = 0.2;
    // LEFT — Negotiation FINALIZED
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: ey, w: ew, h: eh,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("Contract negotiation · FINALIZED", {
        x: 0.7, y: ey + 0.15, w: ew - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: ey + 0.65, w: ew - 0.4, h: eh - 0.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "POST", options: { color: "7DD3FC", bold: true } },
        { text: " /v3/contractnegotiations\n", options: { color: C.codeFg } },
        { text: "{\n", options: { color: C.codeFg } },
        { text: "  \"state\"", options: { color: "FCD34D" } },
        { text: ": ", options: { color: C.codeFg } },
        { text: "\"FINALIZED\"", options: { color: "86EFAC", bold: true } },
        { text: ",\n", options: { color: C.codeFg } },
        { text: "  \"contractAgreementId\"", options: { color: "FCD34D" } },
        { text: ":\n    ", options: { color: C.codeFg } },
        { text: "\"58c37388-c733-4013-94a8-69934833...\"", options: { color: "86EFAC" } },
        { text: "\n}", options: { color: C.codeFg } },
    ], {
        x: 0.85, y: ey + 0.78, w: ew - 0.6, h: eh - 1.05,
        fontFace: F.mono, fontSize: 12, lineSpacingMultiple: 1.25, valign: "top",
    });

    // RIGHT — KMB JSON sample
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5 + ew + gap, y: ey, w: ew, h: eh,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("KMB route data · pulled via EDR", {
        x: 0.7 + ew + gap, y: ey + 0.15, w: ew - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7 + ew + gap, y: ey + 0.65, w: ew - 0.4, h: eh - 0.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "{ ", options: { color: C.codeFg } },
        { text: "\"sample_count\"", options: { color: "FCD34D" } },
        { text: ": ", options: { color: C.codeFg } },
        { text: "1611", options: { color: "F87171", bold: true } },
        { text: ",\n  ", options: { color: C.codeFg } },
        { text: "\"sample_first_3\"", options: { color: "FCD34D" } },
        { text: ": [{\n", options: { color: C.codeFg } },
        { text: "    \"route\"", options: { color: "FCD34D" } },
        { text: ": ", options: { color: C.codeFg } },
        { text: "\"1\"", options: { color: "86EFAC" } },
        { text: ", ", options: { color: C.codeFg } },
        { text: "\"orig_en\"", options: { color: "FCD34D" } },
        { text: ":\n        ", options: { color: C.codeFg } },
        { text: "\"CHUK YUEN ESTATE\"", options: { color: "86EFAC" } },
        { text: ",\n    ", options: { color: C.codeFg } },
        { text: "\"dest_en\"", options: { color: "FCD34D" } },
        { text: ": ", options: { color: C.codeFg } },
        { text: "\"STAR FERRY\"", options: { color: "86EFAC" } },
        { text: " }] }", options: { color: C.codeFg } },
    ], {
        x: 0.85 + ew + gap, y: ey + 0.78, w: ew - 0.6, h: eh - 1.05,
        fontFace: F.mono, fontSize: 11, lineSpacingMultiple: 1.25, valign: "top",
    });

    addPageNumber(s, 8, TOTAL);
}

// --- Slide 9 · Push Transfer to S3 -------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Push Transfer to a Real S3 Destination", "PART 1 · PUSH TRANSFER");

    // Hero strip with key numbers
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 1.55, w: 12.3, h: 1.1,
        fill: { color: "0F2742" }, line: { color: "0F2742" }, rectRadius: 0.08,
    });
    s.addText("344 KiB", {
        x: 0.7, y: 1.6, w: 2.6, h: 1.0,
        fontFace: F.head, fontSize: 44, color: C.hk, bold: true, valign: "middle",
    });
    s.addText("delivered to MinIO bucket  edc-push-bucket", {
        x: 3.4, y: 1.65, w: 9.3, h: 0.45,
        fontFace: F.head, fontSize: 18, color: "FFFFFF", bold: true, valign: "middle",
    });
    s.addText("HK Hub dataplane → AmazonS3-PUSH transferType → MinIO  (S3-compatible, in-cluster)", {
        x: 3.4, y: 2.13, w: 9.3, h: 0.45,
        fontFace: F.body, fontSize: 12, color: "BFD7EE", italic: true, valign: "middle",
    });

    // Pipeline strip
    const steps = [
        { t: "Negotiate asset-1-push", c: C.edc },
        { t: "Submit S3 destination", c: C.edc },
        { t: "Provider dataplane PUSH", c: C.edc },
        { t: "Object lands in bucket", c: C.hk },
    ];
    const px = 0.5, py = 2.85, pw = 12.3, ph = 0.5;
    const stepW = (pw - 0.18 * (steps.length - 1)) / steps.length;
    steps.forEach((st, i) => {
        const x = px + i * (stepW + 0.18);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: py, w: stepW, h: ph,
            fill: { color: st.c }, line: { color: st.c }, rectRadius: 0.06,
        });
        s.addText(`${i + 1} · ${st.t}`, {
            x, y: py, w: stepW, h: ph,
            fontFace: F.head, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
    });

    // Two evidence cards
    const eY = 3.55, eH = 3.5, eW = 6.05, eGap = 0.2;

    // LEFT — S3 transferType + DataAddress
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: eY, w: eW, h: eH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("Transfer spec · AmazonS3-PUSH", {
        x: 0.7, y: eY + 0.15, w: eW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: eY + 0.65, w: eW - 0.4, h: eH - 0.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText(
        "{\n" +
        "  \"transferType\": \"AmazonS3-PUSH\",\n" +
        "  \"dataDestination\": {\n" +
        "    \"type\": \"AmazonS3\",\n" +
        "    \"bucket\": \"edc-push-bucket\",\n" +
        "    \"object\": \"kmb-routes-...\",\n" +
        "    \"endpoint\": \"minio:9000\",\n" +
        "    \"region\": \"us-east-1\"\n" +
        "  }\n" +
        "}",
        {
            x: 0.85, y: eY + 0.78, w: eW - 0.6, h: eH - 1.05,
            fontFace: F.mono, fontSize: 11, color: C.codeFg, lineSpacingMultiple: 1.25, valign: "top",
        }
    );

    // RIGHT — MinIO bucket listing
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5 + eW + eGap, y: eY, w: eW, h: eH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("MinIO bucket listing · object landed", {
        x: 0.7 + eW + eGap, y: eY + 0.15, w: eW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7 + eW + eGap, y: eY + 0.65, w: eW - 0.4, h: eH - 0.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText(
        "$ mc ls minio/edc-push-bucket\n\n" +
        "2026-04-27 14:11   344 KiB\n" +
        "kmb-routes-via-s3-...json\n\n" +
        "# object preview\n" +
        "{ \"type\": \"RouteList\",\n" +
        "  \"data\": [{ \"route\": \"1\",\n" +
        "    \"orig_en\": \"CHUK YUEN ESTATE\",\n" +
        "    \"dest_en\": \"STAR FERRY\" }] }",
        {
            x: 0.85 + eW + eGap, y: eY + 0.78, w: eW - 0.6, h: eH - 1.05,
            fontFace: F.mono, fontSize: 11, color: C.codeFg, lineSpacingMultiple: 1.25, valign: "top",
        }
    );

    addPageNumber(s, 9, TOTAL);
}

// --- Slide 10 · HKU Dual-Role ------------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "HKU as Both Consumer and Provider", "PART 2 · DUAL-ROLE PARTICIPANT");

    // Center HKU box with two arrows
    // Provider on right, Consumer on left of HKU? brief says: HKU center, left arrow consume, right arrow provide
    const cx = 5.5, cy = 1.65, cw = 2.3, ch = 1.5;
    s.addShape(pres.ShapeType.roundRect, {
        x: cx, y: cy, w: cw, h: ch,
        fill: { color: "0F8A4F" }, line: { color: "0F8A4F" }, rectRadius: 0.1,
    });
    s.addText("HKU\nTransport Lab", {
        x: cx, y: cy, w: cw, h: ch,
        fontFace: F.head, fontSize: 20, color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });
    s.addText("ACADEMIC tier", {
        x: cx, y: cy + ch + 0.05, w: cw, h: 0.28,
        fontFace: F.body, fontSize: 10, color: "0F8A4F", bold: true, align: "center", charSpacing: 4,
    });

    // CONSUME arrow (points to HKU from left)
    s.addShape(pres.ShapeType.line, {
        x: 1.7, y: cy + ch / 2, w: cx - 1.7 - 0.05, h: 0,
        line: { color: C.edc, width: 3, endArrowType: "triangle" },
    });
    s.addText("CONSUME academic data", {
        x: 1.7, y: cy + ch / 2 - 0.4, w: cx - 1.7 - 0.05, h: 0.32,
        fontFace: F.head, fontSize: 11, color: C.edc, bold: true, align: "center", charSpacing: 3,
    });

    // PROVIDE arrow (points away from HKU to right)
    s.addShape(pres.ShapeType.line, {
        x: cx + cw + 0.05, y: cy + ch / 2, w: 13.0 - cx - cw - 0.05 - 1.5, h: 0,
        line: { color: C.hk, width: 3, endArrowType: "triangle" },
    });
    s.addText("PROVIDE research data", {
        x: cx + cw + 0.05, y: cy + ch / 2 - 0.4, w: 13.0 - cx - cw - 0.05 - 1.5, h: 0.32,
        fontFace: F.head, fontSize: 11, color: C.hk, bold: true, align: "center", charSpacing: 3,
    });

    // Left actor
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: cy + 0.2, w: 1.15, h: 1.1,
        fill: { color: C.edc }, line: { color: C.edc }, rectRadius: 0.08,
    });
    s.addText("HK Hub\n(provider)", {
        x: 0.5, y: cy + 0.2, w: 1.15, h: 1.1,
        fontFace: F.head, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });
    // Right actor
    s.addShape(pres.ShapeType.roundRect, {
        x: 11.65, y: cy + 0.2, w: 1.15, h: 1.1,
        fill: { color: C.hk }, line: { color: C.hk }, rectRadius: 0.08,
    });
    s.addText("HKTaxi /\nresearchers", {
        x: 11.65, y: cy + 0.2, w: 1.15, h: 1.1,
        fontFace: F.head, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });

    // Two evidence cards below
    const evY = 3.7, evH = 3.25, evW = 6.05, evGap = 0.2;
    // LEFT — HKU as PROVIDER
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: evY, w: evW, h: evH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: evY, w: evW, h: 0.22, fill: { color: C.hk }, line: { color: C.hk } });
    s.addText("HKU as PROVIDER · catalog & data pulled by alice", {
        x: 0.7, y: evY + 0.32, w: evW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 12.5, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: evY + 0.78, w: evW - 0.4, h: evH - 0.95,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "# alice queries HKU catalog\n", options: { color: "94A3B8" } },
        { text: "{ \"asset\": ", options: { color: C.codeFg } },
        { text: "\"transit-equity-2026\"", options: { color: "86EFAC" } },
        { text: " }\n\n", options: { color: C.codeFg } },
        { text: "# negotiation\n", options: { color: "94A3B8" } },
        { text: "{ \"state\": ", options: { color: C.codeFg } },
        { text: "\"FINALIZED\"", options: { color: "86EFAC", bold: true } },
        { text: " }\n\n", options: { color: C.codeFg } },
        { text: "# data pulled\n", options: { color: "94A3B8" } },
        { text: "{ \"district_count\": ", options: { color: C.codeFg } },
        { text: "18", options: { color: "F87171", bold: true } },
        { text: " }", options: { color: C.codeFg } },
    ], {
        x: 0.85, y: evY + 0.92, w: evW - 0.6, h: evH - 1.15,
        fontFace: F.mono, fontSize: 12, lineSpacingMultiple: 1.3, valign: "top",
    });

    // RIGHT — HKU as CONSUMER
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5 + evW + evGap, y: evY, w: evW, h: evH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: 0.5 + evW + evGap, y: evY, w: evW, h: 0.22, fill: { color: C.edc }, line: { color: C.edc } });
    s.addText("HKU as CONSUMER · academic-tier-only asset", {
        x: 0.7 + evW + evGap, y: evY + 0.32, w: evW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 12.5, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7 + evW + evGap, y: evY + 0.78, w: evW - 0.4, h: evH - 0.95,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "# negotiation\n", options: { color: "94A3B8" } },
        { text: "{ \"state\": ", options: { color: C.codeFg } },
        { text: "\"FINALIZED\"", options: { color: "86EFAC", bold: true } },
        { text: " }\n\n", options: { color: C.codeFg } },
        { text: "# academic data pulled\n", options: { color: "94A3B8" } },
        { text: "{ \"asset\":\n    \"hk-academic-research-archive\",\n  \"tier_required\": ", options: { color: C.codeFg } },
        { text: "\"ACADEMIC\"", options: { color: "FCD34D", bold: true } },
        { text: " }", options: { color: C.codeFg } },
    ], {
        x: 0.85 + evW + evGap, y: evY + 0.92, w: evW - 0.6, h: evH - 1.15,
        fontFace: F.mono, fontSize: 12, lineSpacingMultiple: 1.3, valign: "top",
    });

    addPageNumber(s, 10, TOTAL);
}

// --- Slide 11 · Federated Catalog Crawler ------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Federated Catalog Aggregation", "PART 2 · CRAWLER");

    // 4 providers → funnel → unified
    const pY = 1.65, pW = 2.1, pH = 0.65, gap = 0.2;
    const provs = ["qna", "manufacturing", "catalog-server", "hku"];
    provs.forEach((p, i) => {
        const x = 0.7 + i * (pW + gap);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: pY, w: pW, h: pH,
            fill: { color: "FFFFFF" }, line: { color: C.edc, width: 1.25 }, rectRadius: 0.08,
        });
        s.addText(p, {
            x, y: pY, w: pW, h: pH,
            fontFace: F.head, fontSize: 13, color: C.edc, bold: true, align: "center", valign: "middle",
        });
        // arrow down
        s.addShape(pres.ShapeType.line, {
            x: x + pW / 2, y: pY + pH + 0.05, w: 0, h: 0.55,
            line: { color: C.muted, width: 1.5, endArrowType: "triangle" },
        });
    });

    // Funnel bar
    const fY = 2.95, fH = 0.6;
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: fY, w: 12.0, h: fH,
        fill: { color: C.edc }, line: { color: C.edc }, rectRadius: 0.08,
    });
    s.addText("Federated Crawler  ·  parallel DSP catalog requests", {
        x: 0.7, y: fY, w: 12.0, h: fH,
        fontFace: F.head, fontSize: 14, color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });
    // arrow down to aggregated index
    s.addShape(pres.ShapeType.line, {
        x: 6.7, y: fY + fH + 0.05, w: 0, h: 0.4,
        line: { color: C.muted, width: 2, endArrowType: "triangle" },
    });

    // Aggregated index card
    const aY = 4.05, aH = 2.95;
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: aY, w: 12.0, h: aH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("Aggregated Federation Index", {
        x: 0.95, y: aY + 0.08, w: 7.0, h: 0.3,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addText("12 assets across 4 providers  ·  2 push-test variants hidden", {
        x: 6.5, y: aY + 0.1, w: 6.0, h: 0.28,
        fontFace: F.body, fontSize: 11, color: C.hk, bold: true, italic: true, align: "right",
    });

    // Table — 10 representative rows
    s.addTable([
        [
            { text: "PROVIDER", options: { bold: true, color: C.muted, fontSize: 10, fill: { color: C.bgSoft } } },
            { text: "ASSET ID", options: { bold: true, color: C.muted, fontSize: 10, fill: { color: C.bgSoft } } },
            { text: "NOTE", options: { bold: true, color: C.muted, fontSize: 10, fill: { color: C.bgSoft } } },
        ],
        [{ text: "qna", options: { bold: true, color: C.edc } }, "asset-1", "KMB Routes (live)"],
        [{ text: "qna", options: { bold: true, color: C.edc } }, "asset-2", "KMB ETA (live)"],
        [{ text: "qna", options: { bold: true, color: C.edc } }, "asset-with-attribution", { text: "attribution-duty demo", options: { color: C.hk, italic: true } }],
        [{ text: "manufacturing", options: { bold: true, color: C.edc } }, "asset-1", "independent same-id asset"],
        [{ text: "manufacturing", options: { bold: true, color: C.edc } }, "asset-2", "independent same-id asset"],
        [{ text: "manufacturing", options: { bold: true, color: C.edc } }, "hk-traffic-incidents", "data.gov.hk"],
        [{ text: "manufacturing", options: { bold: true, color: C.edc } }, "mtr-patronage", "opendata.mtr.com.hk"],
        [{ text: "manufacturing", options: { bold: true, color: C.edc } }, "hk-academic-research-archive", { text: "ACADEMIC tier · Part 3 demo", options: { color: "0F8A4F", italic: true } }],
        [{ text: "catalog-server", options: { bold: true, color: C.edc } }, "normal-asset-1", "federated mirror sample"],
        [{ text: "hku", options: { bold: true, color: "0F8A4F" } }, "hku-transit-equity-2026", { text: "HKU research dataset", options: { color: "0F8A4F", italic: true } }],
    ], {
        x: 0.95, y: aY + 0.4, w: 11.5, colW: [2.5, 4.7, 4.3],
        rowH: 0.20,
        fontFace: F.mono, fontSize: 9.5, color: C.body,
        border: { type: "solid", pt: 0.4, color: C.line },
    });

    addPageNumber(s, 11, TOTAL);
}

// --- Slide 12 · Live DCP Credential Issuance ---------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Live Credential Issuance", "DECENTRALIZED CLAIMS PROTOCOL · END-TO-END");

    // Pipeline strip — DCP state machine
    const states = [
        { t: "CredentialRequest", c: C.edc },
        { t: "CREATED", c: C.edc },
        { t: "REQUESTING", c: C.edc },
        { t: "REQUESTED", c: C.edc },
        { t: "ISSUED", c: "0F8A4F" },
    ];
    const px = 0.5, py = 1.55, pw = 12.3, ph = 0.55;
    const stepW = (pw - 0.18 * (states.length - 1)) / states.length;
    states.forEach((st, i) => {
        const x = px + i * (stepW + 0.18);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: py, w: stepW, h: ph,
            fill: { color: st.c }, line: { color: st.c }, rectRadius: 0.06,
        });
        s.addText(st.t, {
            x, y: py, w: stepW, h: ph,
            fontFace: F.head, fontSize: 11, color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
    });

    // Story strip
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 2.3, w: 12.3, h: 0.55,
        fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 }, rectRadius: 0.06,
    });
    s.addText([
        { text: "HKU asks the issuer for a fresh ", options: { color: C.body } },
        { text: "FoobarCredential", options: { fontFace: F.mono, color: C.edc, bold: true } },
        { text: ".  The issuer signs ", options: { color: C.body } },
        { text: "now", options: { color: C.hk, bold: true, italic: true } },
        { text: ".  HKU's wallet grows by 1.  Trust root is operational at runtime — not just at boot.", options: { color: C.body } },
    ], {
        x: 0.7, y: 2.3, w: 11.9, h: 0.55,
        fontFace: F.body, fontSize: 12, valign: "middle",
    });

    // Two evidence cards
    const eY = 3.05, eH = 3.85, eW = 6.05, eGap = 0.2;

    // LEFT — Wallet diff
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: eY, w: eW, h: eH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("HKU wallet · before vs after", {
        x: 0.7, y: eY + 0.15, w: eW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });

    // BEFORE box
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: eY + 0.65, w: eW - 0.4, h: 1.4,
        fill: { color: "F4F6F8" }, line: { color: C.line, width: 0.5 }, rectRadius: 0.05,
    });
    s.addText("BEFORE  ·  3 VCs already in wallet", {
        x: 0.85, y: eY + 0.72, w: eW - 0.7, h: 0.3,
        fontFace: F.head, fontSize: 11, color: C.muted, bold: true,
    });
    s.addText([
        { text: "DataProcessorCredential", options: { fontFace: F.mono, fontSize: 11, color: C.body } },
        { text: "  preloaded\n", options: { fontFace: F.mono, fontSize: 10, color: C.muted, italic: true } },
        { text: "MembershipCredential", options: { fontFace: F.mono, fontSize: 11, color: C.body } },
        { text: "     preloaded\n", options: { fontFace: F.mono, fontSize: 10, color: C.muted, italic: true } },
        { text: "FoobarCredential", options: { fontFace: F.mono, fontSize: 11, color: C.body } },
        { text: "         prior test", options: { fontFace: F.mono, fontSize: 10, color: C.muted, italic: true } },
    ], {
        x: 0.85, y: eY + 1.0, w: eW - 0.7, h: 1.0,
        lineSpacingMultiple: 1.3, valign: "top",
    });

    // arrow
    s.addText("↓", {
        x: 0.85, y: eY + 2.05, w: eW - 0.7, h: 0.25,
        fontFace: F.head, fontSize: 14, color: "0F8A4F", bold: true, align: "center",
    });

    // AFTER box
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: eY + 2.3, w: eW - 0.4, h: 1.4,
        fill: { color: "EAF7EE" }, line: { color: "0F8A4F", width: 0.75 }, rectRadius: 0.05,
    });
    s.addText("AFTER  ·  4 VCs — newest issued during demo", {
        x: 0.85, y: eY + 2.37, w: eW - 0.7, h: 0.3,
        fontFace: F.head, fontSize: 11, color: "0F8A4F", bold: true,
    });
    s.addText([
        { text: "DataProcessorCredential\nMembershipCredential\nFoobarCredential\n", options: { fontFace: F.mono, fontSize: 11, color: C.body } },
        { text: "FoobarCredential  ", options: { fontFace: F.mono, fontSize: 11, color: "0F8A4F", bold: true } },
        { text: "← signed seconds ago", options: { fontFace: F.mono, fontSize: 10, color: "0F8A4F", italic: true } },
    ], {
        x: 0.85, y: eY + 2.65, w: eW - 0.7, h: 1.0,
        lineSpacingMultiple: 1.25, valign: "top",
    });

    // RIGHT — JWT payload + state machine log
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5 + eW + eGap, y: eY, w: eW, h: eH,
        fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
    });
    s.addText("Decoded JWT  ·  signed at runtime", {
        x: 0.7 + eW + eGap, y: eY + 0.15, w: eW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 13, color: C.ink, bold: true,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7 + eW + eGap, y: eY + 0.65, w: eW - 0.4, h: eH - 0.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText(
        "{\n" +
        "  \"iss\": \"did:web:dataspace-issuer-\n" +
        "          service%3A10016:issuer\",\n" +
        "  \"sub\": \"did:web:hku-identityhub\n" +
        "          %3A7083:hku\",\n" +
        "  \"iat\": 1777301085,   // signed now\n" +
        "  \"vc_type\": [\"FoobarCredential\"]\n" +
        "}\n\n" +
        "// DID resolved via /.well-known/did.json\n" +
        "hku-live-1777301085  →  ISSUED",
        {
            x: 0.85 + eW + eGap, y: eY + 0.78, w: eW - 0.6, h: eH - 1.05,
            fontFace: F.mono, fontSize: 10.5, color: C.codeFg, lineSpacingMultiple: 1.25, valign: "top",
        }
    );

    addPageNumber(s, 12, TOTAL);
}

// --- Slide 13 · Custom Permission ParticipantTier ----------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Custom Permission Constraint · ParticipantTier", "PART 3 · CUSTOM ODRL");

    // Before/after framing strip
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 1.55, w: 12.3, h: 0.5,
        fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 }, rectRadius: 0.05,
    });
    s.addText([
        { text: "BEFORE  ", options: { color: C.muted, bold: true, charSpacing: 3 } },
        { text: "DID-substring matching (hack)  ", options: { color: C.hk, italic: true } },
        { text: "    →    ", options: { color: C.muted } },
        { text: "AFTER  ", options: { color: C.muted, bold: true, charSpacing: 3 } },
        { text: "VC claim lookup (issuer-attested, standards-aligned)", options: { color: "0F8A4F", bold: true } },
    ], {
        x: 0.5, y: 1.55, w: 12.3, h: 0.5,
        fontFace: F.body, fontSize: 12, align: "center", valign: "middle",
    });

    // Left — code
    const lx = 0.5, lw = 6.6, top = 2.2;
    s.addText("Java function in the EDC policy engine", {
        x: lx, y: top, w: lw, h: 0.32,
        fontFace: F.head, fontSize: 12, color: C.muted, bold: true, charSpacing: 4,
    });
    s.addText("ParticipantTierFunction.evaluate()", {
        x: lx, y: top + 0.34, w: lw, h: 0.42,
        fontFace: F.head, fontSize: 18, color: C.ink, bold: true,
    });

    s.addShape(pres.ShapeType.roundRect, {
        x: lx, y: top + 0.85, w: lw, h: 3.85,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.06,
    });
    s.addText(
        "@Override\n" +
        "public boolean evaluate(Operator op, Object rhs,\n" +
        "        Permission p, C ctx) {\n" +
        "  if (op != Operator.EQ) return false;\n" +
        "  var creds = getCredentialList(ctx.participantAgent());\n" +
        "  if (creds.failed()) return false;\n" +
        "  return creds.getContent().stream()\n" +
        "    .filter(vc -> vc.getType().stream()\n" +
        "      .anyMatch(t -> t.endsWith(\"MembershipCredential\")))\n" +
        "    .flatMap(vc -> vc.getCredentialSubject().stream())\n" +
        "    .map(cs -> cs.getClaim(MVD_NAMESPACE, \"participantTier\"))\n" +
        "    .filter(Objects::nonNull)\n" +
        "    .anyMatch(t -> t.toString()\n" +
        "      .equalsIgnoreCase(rhs.toString()));\n" +
        "}",
        {
            x: lx + 0.2, y: top + 0.95, w: lw - 0.4, h: 3.65,
            fontFace: F.mono, fontSize: 10.5, color: C.codeFg, lineSpacingMultiple: 1.25, valign: "top",
        }
    );

    // Right — Demo evidence
    const rx = 7.35, rw = 5.45;
    s.addText("Demo · alice attempts academic asset", {
        x: rx, y: top, w: rw, h: 0.32,
        fontFace: F.head, fontSize: 12, color: C.muted, bold: true, charSpacing: 4,
    });
    s.addText("Negotiation TERMINATED", {
        x: rx, y: top + 0.34, w: rw, h: 0.42,
        fontFace: F.head, fontSize: 18, color: C.hk, bold: true,
    });

    // Verdict box
    s.addShape(pres.ShapeType.roundRect, {
        x: rx, y: top + 0.85, w: rw, h: 0.95,
        fill: { color: "FDE7E9" }, line: { color: C.hk, width: 1 }, rectRadius: 0.06,
    });
    s.addText("✕  TERMINATED", {
        x: rx + 0.25, y: top + 0.92, w: rw - 0.5, h: 0.4,
        fontFace: F.head, fontSize: 16, color: C.hk, bold: true,
    });
    s.addText("Policy in scope contract.negotiation not fulfilled", {
        x: rx + 0.25, y: top + 1.32, w: rw - 0.5, h: 0.4,
        fontFace: F.body, fontSize: 11, color: C.danger,
    });

    // JSON snippet
    s.addShape(pres.ShapeType.roundRect, {
        x: rx, y: top + 1.95, w: rw, h: 2.75,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.06,
    });
    s.addText([
        { text: "{\n", options: { color: C.codeFg } },
        { text: "  \"state\"", options: { color: "FCD34D" } },
        { text: ": ", options: { color: C.codeFg } },
        { text: "\"TERMINATED\"", options: { color: "F87171", bold: true } },
        { text: ",\n", options: { color: C.codeFg } },
        { text: "  \"errorDetail\": ", options: { color: "FCD34D" } },
        { text: "\n", options: { color: C.codeFg } },
        { text: "    Permission constraints:\n", options: { color: "94A3B8" } },
        { text: "    [Constraint ", options: { color: C.codeFg } },
        { text: "'ParticipantTier'", options: { color: "86EFAC" } },
        { text: "\n     EQ ", options: { color: C.codeFg } },
        { text: "'ACADEMIC'", options: { color: "86EFAC", bold: true } },
        { text: "]\n}", options: { color: C.codeFg } },
    ], {
        x: rx + 0.2, y: top + 2.05, w: rw - 0.4, h: 2.55,
        fontFace: F.mono, fontSize: 11.5, lineSpacingMultiple: 1.3, valign: "top",
    });

    // Source line
    s.addText("Source: extensions/dcp-impl/.../ParticipantTierFunction.java  ·  Issuer-signed claim — no DID syntax assumed", {
        x: 0.5, y: 6.85, w: 11.4, h: 0.24,
        fontFace: F.mono, fontSize: 9.5, color: C.muted, italic: true,
    });

    addPageNumber(s, 13, TOTAL);
}

// --- Slide 14 · Custom Duty Attribution --------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Custom Duty Constraint · Attribution", "PART 3 · ODRL DUTY");

    // Top explainer
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: 1.55, w: 12.3, h: 0.85,
        fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 }, rectRadius: 0.06,
    });
    s.addText([
        { text: "ODRL distinguishes ", options: { color: C.body } },
        { text: "PERMISSION ", options: { bold: true, color: C.edc } },
        { text: "(allowed actions) and ", options: { color: C.body } },
        { text: "DUTY ", options: { bold: true, color: C.hk } },
        { text: "(must-do obligations).  ", options: { color: C.body } },
        { text: "Consumers must declare data attribution against a whitelist.", options: { color: C.body, italic: true } },
    ], {
        x: 0.7, y: 1.55, w: 12.0, h: 0.85,
        fontFace: F.body, fontSize: 13, valign: "middle", lineSpacingMultiple: 1.25,
    });

    // Two outcome cards
    const cY = 2.6, cH = 4.05, cW = 6.05, cGap = 0.2;
    // SUCCESS
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.5, y: cY, w: cW, h: cH,
        fill: { color: "FFFFFF" }, line: { color: "0F8A4F", width: 1.5 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: cY, w: cW, h: 0.32, fill: { color: "0F8A4F" }, line: { color: "0F8A4F" } });
    s.addText("✓  FINALIZED", {
        x: 0.7, y: cY + 0.02, w: cW - 0.4, h: 0.32,
        fontFace: F.head, fontSize: 13, color: "FFFFFF", bold: true, valign: "middle",
    });
    s.addText("Authorised attribution", {
        x: 0.7, y: cY + 0.45, w: cW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 16, color: C.ink, bold: true,
    });
    s.addText("alice declares: ", {
        x: 0.7, y: cY + 0.85, w: cW - 0.4, h: 0.32,
        fontFace: F.body, fontSize: 12, color: C.muted,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: cY + 1.18, w: cW - 0.4, h: 0.5,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "attribution = ", options: { color: C.codeFg } },
        { text: "\"HK Transport Hub\"", options: { color: "86EFAC", bold: true } },
    ], {
        x: 0.85, y: cY + 1.18, w: cW - 0.7, h: 0.5,
        fontFace: F.mono, fontSize: 12.5, valign: "middle",
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: 0.7, y: cY + 1.85, w: cW - 0.4, h: 2.0,
        fill: { color: "EAF7EE" }, line: { color: "0F8A4F", width: 0.5 }, rectRadius: 0.06,
    });
    s.addText([
        { text: "Whitelist match\n", options: { fontSize: 13, color: "0F8A4F", bold: true } },
        { text: "AttributionDutyFunction.evaluate()  ⇒  true\n\n", options: { fontSize: 11, color: C.body, fontFace: F.mono } },
        { text: "Negotiation completes\n", options: { fontSize: 13, color: "0F8A4F", bold: true } },
        { text: "{ \"state\": \"FINALIZED\" }", options: { fontSize: 11, color: C.body, fontFace: F.mono } },
    ], {
        x: 0.85, y: cY + 1.95, w: cW - 0.7, h: 1.8,
        fontFace: F.body, lineSpacingMultiple: 1.25, valign: "top",
    });

    // FAILURE
    const fx = 0.5 + cW + cGap;
    s.addShape(pres.ShapeType.roundRect, {
        x: fx, y: cY, w: cW, h: cH,
        fill: { color: "FFFFFF" }, line: { color: C.hk, width: 1.5 }, rectRadius: 0.08,
    });
    s.addShape(pres.ShapeType.rect, { x: fx, y: cY, w: cW, h: 0.32, fill: { color: C.hk }, line: { color: C.hk } });
    s.addText("✕  TERMINATED", {
        x: fx + 0.2, y: cY + 0.02, w: cW - 0.4, h: 0.32,
        fontFace: F.head, fontSize: 13, color: "FFFFFF", bold: true, valign: "middle",
    });
    s.addText("Unauthorised attribution", {
        x: fx + 0.2, y: cY + 0.45, w: cW - 0.4, h: 0.4,
        fontFace: F.head, fontSize: 16, color: C.ink, bold: true,
    });
    s.addText("alice declares: ", {
        x: fx + 0.2, y: cY + 0.85, w: cW - 0.4, h: 0.32,
        fontFace: F.body, fontSize: 12, color: C.muted,
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: fx + 0.2, y: cY + 1.18, w: cW - 0.4, h: 0.5,
        fill: { color: C.code }, line: { color: C.code }, rectRadius: 0.04,
    });
    s.addText([
        { text: "attribution = ", options: { color: C.codeFg } },
        { text: "\"Unauthorized Reseller\"", options: { color: "F87171", bold: true } },
    ], {
        x: fx + 0.35, y: cY + 1.18, w: cW - 0.7, h: 0.5,
        fontFace: F.mono, fontSize: 12.5, valign: "middle",
    });
    s.addShape(pres.ShapeType.roundRect, {
        x: fx + 0.2, y: cY + 1.85, w: cW - 0.4, h: 2.0,
        fill: { color: "FDE7E9" }, line: { color: C.hk, width: 0.5 }, rectRadius: 0.06,
    });
    s.addText([
        { text: "Whitelist miss\n", options: { fontSize: 13, color: C.hk, bold: true } },
        { text: "AttributionDutyFunction.evaluate()  ⇒  false\n\n", options: { fontSize: 11, color: C.body, fontFace: F.mono } },
        { text: "Negotiation rejected\n", options: { fontSize: 13, color: C.hk, bold: true } },
        { text: "{ \"state\": \"TERMINATED\" }", options: { fontSize: 11, color: C.body, fontFace: F.mono } },
    ], {
        x: fx + 0.35, y: cY + 1.95, w: cW - 0.7, h: 1.8,
        fontFace: F.body, lineSpacingMultiple: 1.25, valign: "top",
    });

    // Source line
    s.addText("Source: extensions/dcp-impl/.../AttributionDutyFunction.java", {
        x: 0.5, y: 6.85, w: 11.4, h: 0.24,
        fontFace: F.mono, fontSize: 9.5, color: C.muted, italic: true,
    });

    addPageNumber(s, 14, TOTAL);
}

// --- Slide 15 · Closing the Loop ---------------------------------------
{
    const s = pres.addSlide();
    addBaseFrame(s, "Closing the Loop", "WE IDENTIFIED GAPS — AND CLOSED THEM");

    // Top row — 3 before/after cards
    const tY = 1.55, tH = 3.05, tW = 4.05, tGap = 0.18;
    const closures = [
        {
            was:    "HKU full DCP issuance flow not end-to-end",
            shipped:"Issuer participant context activated, attestations seeded, DCP state machine drives CREATED → REQUESTING → REQUESTED → ISSUED",
            file:   "scripts/demo-live-issuance.sh",
        },
        {
            was:    "Push proven only on cluster-internal HTTP sink",
            shipped:"edc-dataplane-aws-s3 + MinIO; 344 KiB landed in edc-push-bucket via AmazonS3-PUSH transferType",
            file:   "minio-deploy.yaml + demo-push-s3.sh",
        },
        {
            was:    "ParticipantTier resolved by DID-substring matching",
            shipped:"All 3 MembershipCredentials carry a participantTier claim; evaluator reads VC, not DID syntax",
            file:   "ParticipantTierFunction.java + add-tier-claim.py",
        },
    ];
    closures.forEach((c, i) => {
        const x = 0.5 + i * (tW + tGap);
        s.addShape(pres.ShapeType.roundRect, {
            x, y: tY, w: tW, h: tH,
            fill: { color: "FFFFFF" }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08,
        });
        // WAS section
        s.addShape(pres.ShapeType.rect, { x, y: tY, w: tW, h: 0.22, fill: { color: C.hk }, line: { color: C.hk } });
        s.addText("WAS · GAP", {
            x: x + 0.25, y: tY + 0.32, w: tW - 0.5, h: 0.3,
            fontFace: F.head, fontSize: 10, color: C.hk, bold: true, charSpacing: 4,
        });
        s.addText(c.was, {
            x: x + 0.25, y: tY + 0.62, w: tW - 0.5, h: 0.7,
            fontFace: F.head, fontSize: 13, color: C.ink, bold: true, lineSpacingMultiple: 1.2,
        });
        // arrow
        s.addText("↓  SHIPPED", {
            x: x + 0.25, y: tY + 1.45, w: tW - 0.5, h: 0.3,
            fontFace: F.head, fontSize: 10, color: "0F8A4F", bold: true, charSpacing: 4,
        });
        // SHIPPED body
        s.addText(c.shipped, {
            x: x + 0.25, y: tY + 1.78, w: tW - 0.5, h: 0.95,
            fontFace: F.body, fontSize: 11, color: C.body, lineSpacingMultiple: 1.25, valign: "top",
        });
        // file
        s.addText(c.file, {
            x: x + 0.25, y: tY + 2.72, w: tW - 0.5, h: 0.28,
            fontFace: F.mono, fontSize: 9.5, color: C.muted, italic: true,
        });
    });

    // Bottom row — Lessons learned chips
    const bY = tY + tH + 0.3;
    s.addText("LESSONS LEARNED", {
        x: 0.5, y: bY, w: 6, h: 0.32,
        fontFace: F.head, fontSize: 11, color: C.muted, bold: true, charSpacing: 4,
    });

    const lessons = [
        { k: "Dataspace ≠ data API.",        v: "the real abstraction is a policy-bound contract." },
        { k: "DCP and DSP are orthogonal.",  v: "credentials and protocol layer cleanly." },
        { k: "LoadBalancer is the surprise.", v: "debug who owns :80 before debugging your app." },
        { k: "VC holder rebind matters.",    v: "re-sign at the right boundary or get 401." },
    ];
    const chipH = 0.95, chipW = (12.3 - 3 * 0.18) / 4;
    lessons.forEach((l, i) => {
        const x = 0.5 + i * (chipW + 0.18);
        const y = bY + 0.4;
        s.addShape(pres.ShapeType.roundRect, {
            x, y, w: chipW, h: chipH,
            fill: { color: C.bgSoft }, line: { color: C.line, width: 0.5 }, rectRadius: 0.06,
        });
        s.addShape(pres.ShapeType.rect, {
            x, y, w: 0.07, h: chipH,
            fill: { color: "0F8A4F" }, line: { color: "0F8A4F" },
        });
        s.addText([
            { text: l.k + "\n", options: { color: C.ink, bold: true, fontSize: 12 } },
            { text: l.v, options: { color: C.body, fontSize: 10.5 } },
        ], {
            x: x + 0.2, y: y + 0.05, w: chipW - 0.3, h: chipH - 0.1,
            fontFace: F.body, lineSpacingMultiple: 1.25, valign: "top",
        });
    });

    addPageNumber(s, 15, TOTAL);
}

// --- Slide 16 · Summary & Q&A ------------------------------------------
{
    const s = pres.addSlide();
    s.background = { color: "0F2742" };

    // top accents
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: C.edc }, line: { color: C.edc } });
    s.addShape(pres.ShapeType.rect, { x: 12.6, y: 0, w: 0.733, h: 0.18, fill: { color: C.hk }, line: { color: C.hk } });

    s.addText("SUMMARY", {
        x: 0.7, y: 0.7, w: 12, h: 0.4,
        fontFace: F.head, fontSize: 13, color: "9CC2FA", bold: true, charSpacing: 6,
    });
    s.addText("What we shipped", {
        x: 0.7, y: 1.05, w: 12, h: 0.85,
        fontFace: F.head, fontSize: 38, color: "FFFFFF", bold: true,
    });

    // Three takeaway lines
    const items = [
        { num: "01", body: "Extended EDC MVD into a 5-participant Hong Kong transport dataspace with real KMB live data." },
        { num: "02", body: "HKU joins as a dual-role academic participant — exercising both consumer and provider flows." },
        { num: "03", body: "Two custom Java ODRL constraints (Permission + Duty) prove the policy engine is extensible." },
    ];
    items.forEach((it, i) => {
        const ty = 2.35 + i * 1.0;
        s.addText(it.num, {
            x: 0.7, y: ty, w: 1.0, h: 0.85,
            fontFace: F.head, fontSize: 40, color: C.hk, bold: true,
        });
        s.addText(it.body, {
            x: 1.85, y: ty + 0.1, w: 10.8, h: 0.85,
            fontFace: F.body, fontSize: 17, color: "FFFFFF", lineSpacingMultiple: 1.25,
        });
    });

    // Bottom strip
    s.addShape(pres.ShapeType.line, {
        x: 0.7, y: 5.7, w: 12, h: 0,
        line: { color: "1F4063", width: 1 },
    });
    s.addText("Code · MinimumViableDataspace (HK fork)", {
        x: 0.7, y: 5.85, w: 7.5, h: 0.3,
        fontFace: F.body, fontSize: 12, color: "9CC2FA",
    });
    s.addText("Demo scripts · final/scripts/", {
        x: 0.7, y: 6.13, w: 7.5, h: 0.3,
        fontFace: F.body, fontSize: 12, color: "9CC2FA",
    });
    s.addText([
        { text: "Future work  ·  ", options: { color: "FCD34D", bold: true } },
        { text: "official EDC FederatedCatalog component  ·  dataplane mTLS  ·  multi-cluster deployment", options: { color: "BFD7EE" } },
    ], {
        x: 0.7, y: 6.5, w: 7.8, h: 0.34,
        fontFace: F.body, fontSize: 11, italic: true, valign: "middle",
    });

    // Q&A big text on right
    s.addText("Q & A", {
        x: 8.5, y: 5.6, w: 4.2, h: 1.4,
        fontFace: F.head, fontSize: 64, color: C.hk, bold: true, align: "right", valign: "middle",
    });
    s.addText("Thank you.", {
        x: 8.5, y: 6.55, w: 4.2, h: 0.45,
        fontFace: F.body, fontSize: 14, color: "9CC2FA", italic: true, align: "right",
    });
}

// Save -------------------------------------------------------------------
pres.writeFile({ fileName: OUT })
    .then(file => console.log("Wrote:", file))
    .catch(err => { console.error(err); process.exit(1); });
