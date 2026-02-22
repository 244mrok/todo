import fs from "fs";
import path from "path";
import { BOARDS_DIR } from "./db";

// ─────────────────────────────────────────
// Board 1: Product Launch
// ─────────────────────────────────────────

const productLaunch = {
  id: "board-product-launch",
  name: "Product Launch — v2.0",
  lists: [
    {
      id: "list-ideas",
      title: "Ideas & Research",
      cardIds: ["card-pl-1", "card-pl-2", "card-pl-3"],
    },
    {
      id: "list-design",
      title: "Design",
      cardIds: ["card-pl-4", "card-pl-5"],
    },
    {
      id: "list-dev",
      title: "Development",
      cardIds: ["card-pl-6", "card-pl-7", "card-pl-8", "card-pl-9"],
    },
    {
      id: "list-qa",
      title: "QA & Testing",
      cardIds: ["card-pl-10", "card-pl-11"],
    },
    {
      id: "list-launch",
      title: "Launch Prep",
      cardIds: ["card-pl-12", "card-pl-13", "card-pl-14"],
    },
    {
      id: "list-done",
      title: "Shipped",
      cardIds: ["card-pl-15", "card-pl-16", "card-pl-17"],
    },
  ],
  cards: {
    "card-pl-1": {
      id: "card-pl-1",
      title: "Competitive analysis — feature gap report",
      description:
        "Compare our v2.0 feature set against Notion, Linear, and Monday.com. Focus on collaboration, real-time sync, and mobile support.",
      labels: ["purple"],
      startDate: "2026-02-01",
      dueDate: "2026-02-10",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-28T09:00:00Z",
    },
    "card-pl-2": {
      id: "card-pl-2",
      title: "User interview synthesis — power users",
      description:
        "Analyze 12 user interviews. Key themes: need for keyboard shortcuts, better search, and team collaboration. Write up findings doc.",
      labels: ["purple", "blue"],
      startDate: "2026-02-03",
      dueDate: "2026-02-14",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-30T10:00:00Z",
    },
    "card-pl-3": {
      id: "card-pl-3",
      title: "Define v2.0 success metrics & KPIs",
      description:
        "Target: 40% increase in weekly active users, <2s page load, 4.5+ app store rating. Get sign-off from product lead.",
      labels: ["green"],
      startDate: "",
      dueDate: "2026-02-18",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-01T08:00:00Z",
    },
    "card-pl-4": {
      id: "card-pl-4",
      title: "Design system refresh — color palette & typography",
      description:
        "Update design tokens for the new brand direction. Ensure WCAG AA contrast ratios. Deliver Figma library update.",
      labels: ["purple", "orange"],
      startDate: "2026-02-10",
      dueDate: "2026-02-21",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-05T09:00:00Z",
    },
    "card-pl-5": {
      id: "card-pl-5",
      title: "Prototype real-time collaboration UI",
      description:
        "Interactive Figma prototype showing cursor presence, live card updates, and conflict resolution flow. Include 3 user testing scenarios.",
      labels: ["purple", "blue"],
      startDate: "2026-02-14",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-08T11:00:00Z",
    },
    "card-pl-6": {
      id: "card-pl-6",
      title: "Implement SSE-based real-time sync",
      description:
        "Server-Sent Events for board updates. Version-based conflict detection with 409 responses. Exponential backoff reconnection.",
      labels: ["blue", "red"],
      startDate: "2026-02-17",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-10T09:00:00Z",
    },
    "card-pl-7": {
      id: "card-pl-7",
      title: "Keyboard navigation & shortcuts",
      description:
        "Arrow keys for card/list navigation, Tab between lists, Enter to open, Space to toggle, N for new card, ? for help overlay.",
      labels: ["blue"],
      startDate: "2026-02-20",
      dueDate: "2026-03-05",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-12T14:00:00Z",
    },
    "card-pl-8": {
      id: "card-pl-8",
      title: "Drag-and-drop improvements — cross-list & reorder",
      description:
        "Support dragging cards between lists and reordering lists via drag handle. Smooth animations with CSS transitions.",
      labels: ["blue", "orange"],
      startDate: "2026-02-24",
      dueDate: "2026-03-07",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-14T10:00:00Z",
    },
    "card-pl-9": {
      id: "card-pl-9",
      title: "Timeline / Gantt view with drag resize",
      description:
        "Horizontal timeline showing cards with date ranges. Drag to move, resize handles for start/end dates. Today marker line.",
      labels: ["blue", "yellow"],
      startDate: "2026-02-26",
      dueDate: "2026-03-10",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-15T09:00:00Z",
    },
    "card-pl-10": {
      id: "card-pl-10",
      title: "E2E test suite — Playwright",
      description:
        "Cover critical flows: create board, add/move/complete cards, drag-and-drop, keyboard shortcuts, real-time sync between tabs.",
      labels: ["green", "blue"],
      startDate: "2026-03-01",
      dueDate: "2026-03-10",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-18T09:00:00Z",
    },
    "card-pl-11": {
      id: "card-pl-11",
      title: "Performance audit — Lighthouse & Core Web Vitals",
      description:
        "Target: LCP < 1.5s, CLS < 0.1, FID < 100ms. Profile with React DevTools, fix any re-render bottlenecks.",
      labels: ["orange", "green"],
      startDate: "2026-03-05",
      dueDate: "2026-03-12",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-20T10:00:00Z",
    },
    "card-pl-12": {
      id: "card-pl-12",
      title: "Write launch blog post & changelog",
      description:
        "Highlight: real-time collab, keyboard shortcuts, timeline view, performance improvements. Include GIFs for key features.",
      labels: ["yellow"],
      startDate: "2026-03-08",
      dueDate: "2026-03-14",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-22T09:00:00Z",
    },
    "card-pl-13": {
      id: "card-pl-13",
      title: "Update demo environment with sample data",
      description:
        "Create 3 demo boards: Product Launch, Sales Pipeline, and Japanese localization showcase. Seed script for easy reset.",
      labels: ["yellow", "green"],
      startDate: "2026-03-10",
      dueDate: "2026-03-14",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-24T11:00:00Z",
    },
    "card-pl-14": {
      id: "card-pl-14",
      title: "Prepare investor demo script — 5 min walkthrough",
      description:
        "Flow: board overview → create card → drag between lists → open timeline → show real-time sync (2 tabs) → keyboard shortcuts.",
      labels: ["red", "yellow"],
      startDate: "2026-03-12",
      dueDate: "2026-03-15",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-25T09:00:00Z",
    },
    "card-pl-15": {
      id: "card-pl-15",
      title: "Set up CI/CD pipeline — GitHub Actions",
      description:
        "Lint, type-check, unit tests, build. Auto-deploy to Vercel on main branch push. Badge in README.",
      labels: ["green"],
      startDate: "2026-01-20",
      dueDate: "2026-01-28",
      completed: true,
      completedAt: "2026-01-27T16:00:00Z",
      createdAt: "2026-01-18T09:00:00Z",
    },
    "card-pl-16": {
      id: "card-pl-16",
      title: "Board CRUD API — file-based storage",
      description:
        "REST API: GET/PUT/DELETE /api/board/[id], GET /api/board for listing. JSON file storage in data/boards/.",
      labels: ["green", "blue"],
      startDate: "2026-01-25",
      dueDate: "2026-02-05",
      completed: true,
      completedAt: "2026-02-04T14:30:00Z",
      createdAt: "2026-01-22T10:00:00Z",
    },
    "card-pl-17": {
      id: "card-pl-17",
      title: "Card labels with custom naming",
      description:
        "6 color labels (green, yellow, orange, red, purple, blue) with user-editable names per board. Show on cards and in detail modal.",
      labels: ["green"],
      startDate: "2026-02-01",
      dueDate: "2026-02-08",
      completed: true,
      completedAt: "2026-02-07T12:00:00Z",
      createdAt: "2026-01-28T09:00:00Z",
    },
  },
  labelNames: {
    green: "Done / Infra",
    yellow: "Content",
    orange: "Design",
    red: "Critical Path",
    purple: "Research",
    blue: "Engineering",
  },
  version: 1,
};

// ─────────────────────────────────────────
// Board 2: Sales Pipeline
// ─────────────────────────────────────────

const salesPipeline = {
  id: "board-demo-sales",
  name: "Salesforce Sales Pipeline",
  lists: [
    {
      id: "list-leads",
      title: "New Leads",
      cardIds: ["card-l1", "card-l2", "card-l3", "card-l4"],
    },
    {
      id: "list-qualified",
      title: "Qualified",
      cardIds: ["card-q1", "card-q2", "card-q3"],
    },
    {
      id: "list-proposal",
      title: "Proposal Sent",
      cardIds: ["card-p1", "card-p2", "card-p3"],
    },
    {
      id: "list-negotiation",
      title: "Negotiation",
      cardIds: ["card-n1", "card-n2"],
    },
    {
      id: "list-closed",
      title: "Closed Won",
      cardIds: ["card-c1", "card-c2", "card-c3"],
    },
  ],
  cards: {
    "card-l1": {
      id: "card-l1",
      title: "Acme Corp — Enterprise License",
      description:
        "Inbound lead from website. VP of Sales interested in 200-seat Enterprise plan. Follow up scheduled for next week.",
      labels: ["blue"],
      startDate: "2026-02-10",
      dueDate: "2026-02-20",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-10T09:00:00.000Z",
    },
    "card-l2": {
      id: "card-l2",
      title: "GlobalTech Inc — Platform Migration",
      description:
        "Referred by existing customer. Looking to migrate from HubSpot to Salesforce. ~$85K ARR potential.",
      labels: ["purple"],
      startDate: "2026-02-12",
      dueDate: "2026-02-25",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-12T10:30:00.000Z",
    },
    "card-l3": {
      id: "card-l3",
      title: "Pinnacle Health — CRM Setup",
      description:
        "Healthcare vertical. Need HIPAA-compliant CRM solution. Initial discovery call completed.",
      labels: ["orange"],
      startDate: "2026-02-14",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-14T08:00:00.000Z",
    },
    "card-l4": {
      id: "card-l4",
      title: "StartupXYZ — Sales Cloud Starter",
      description:
        "Small team of 15. Interested in Sales Cloud starter pack. Low ACV but fast close potential.",
      labels: ["green"],
      startDate: "2026-02-15",
      dueDate: "2026-02-22",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-15T14:00:00.000Z",
    },
    "card-q1": {
      id: "card-q1",
      title: "Meridian Financial — Full Suite",
      description:
        "BANT qualified. Budget: $150K. Authority: CTO + CFO. Need: unified sales & service platform. Timeline: Q1 close.",
      labels: ["blue", "red"],
      startDate: "2026-01-20",
      dueDate: "2026-03-01",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-20T09:00:00.000Z",
    },
    "card-q2": {
      id: "card-q2",
      title: "NovaBuild Construction — Field Service",
      description:
        "Qualified for Field Service Lightning. 50 field reps. Demo went well, awaiting technical review.",
      labels: ["orange"],
      startDate: "2026-01-28",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-28T11:00:00.000Z",
    },
    "card-q3": {
      id: "card-q3",
      title: "EduLearn — Marketing Cloud",
      description:
        "EdTech company. Needs marketing automation + journey builder. Champion is Head of Growth.",
      labels: ["purple"],
      startDate: "2026-02-01",
      dueDate: "2026-03-10",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-01T13:00:00.000Z",
    },
    "card-p1": {
      id: "card-p1",
      title: "Orion Logistics — $120K Proposal",
      description:
        "Sent SOW for Sales Cloud + Service Cloud bundle. 100 users. Awaiting legal review on their end. Follow up Feb 20.",
      labels: ["blue", "yellow"],
      startDate: "2026-01-15",
      dueDate: "2026-02-20",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-15T09:00:00.000Z",
    },
    "card-p2": {
      id: "card-p2",
      title: "BrightRetail — Commerce Cloud",
      description:
        "E-commerce platform migration. $200K deal. Proposal includes implementation services. Competitor: Shopify Plus.",
      labels: ["red", "purple"],
      startDate: "2026-01-25",
      dueDate: "2026-02-25",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-25T10:00:00.000Z",
    },
    "card-p3": {
      id: "card-p3",
      title: "Atlas Manufacturing — CPQ",
      description:
        "Configure-Price-Quote solution for complex product catalog. Sent revised proposal after feedback. $75K ARR.",
      labels: ["orange", "yellow"],
      startDate: "2026-02-01",
      dueDate: "2026-03-05",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-01T09:00:00.000Z",
    },
    "card-n1": {
      id: "card-n1",
      title: "Zenith Media — $250K Enterprise Deal",
      description:
        "Final pricing negotiation. They want 15% discount on 3-year commitment. VP of Sales leading. Legal redlines in progress.",
      labels: ["red", "blue"],
      startDate: "2026-01-02",
      dueDate: "2026-02-15",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-05T09:00:00.000Z",
    },
    "card-n2": {
      id: "card-n2",
      title: "ClearPath Insurance — Service Cloud",
      description:
        "Negotiating implementation timeline & support SLA. Deal value $95K. Verbal commitment received, pending signature.",
      labels: ["yellow", "green"],
      startDate: "2026-01-12",
      dueDate: "2026-02-22",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-12T10:00:00.000Z",
    },
    "card-c1": {
      id: "card-c1",
      title: "Summit Energy — Sales Cloud ($80K)",
      description:
        "3-year deal signed. 60 users. Kickoff scheduled for March 1. CSM assigned: Sarah Chen.",
      labels: ["green"],
      startDate: "2025-12-01",
      dueDate: "2026-02-05",
      completed: true,
      completedAt: "2026-02-05T16:00:00.000Z",
      createdAt: "2025-12-01T09:00:00.000Z",
    },
    "card-c2": {
      id: "card-c2",
      title: "Velocity Motors — Pardot + Sales Cloud ($110K)",
      description:
        "Automotive dealership group. 12 locations. Signed after competitive POC vs. Microsoft Dynamics.",
      labels: ["green", "blue"],
      startDate: "2025-11-15",
      dueDate: "2026-01-30",
      completed: true,
      completedAt: "2026-01-30T14:00:00.000Z",
      createdAt: "2025-11-15T09:00:00.000Z",
    },
    "card-c3": {
      id: "card-c3",
      title: "FreshFoods Co-op — Starter Pack ($15K)",
      description:
        "Quick close. Small deal but strategic — opens door to 200+ member co-ops in their network.",
      labels: ["green"],
      startDate: "2026-01-20",
      dueDate: "2026-02-10",
      completed: true,
      completedAt: "2026-02-10T11:00:00.000Z",
      createdAt: "2026-01-20T09:00:00.000Z",
    },
  },
  labelNames: {
    green: "Won / Low Risk",
    yellow: "Pending Review",
    orange: "Medium Priority",
    red: "High Priority",
    purple: "New Business",
    blue: "Enterprise",
  },
  version: 1,
};

// ─────────────────────────────────────────
// Board 3: Sales Pipeline (Japanese)
// ─────────────────────────────────────────

const salesPipelineJP = {
  id: "board-demo-sales-jp",
  name: "Salesforce 営業パイプライン",
  lists: [
    {
      id: "list-leads-jp",
      title: "新規リード",
      cardIds: ["card-jl1", "card-jl2", "card-jl3", "card-jl4"],
    },
    {
      id: "list-qualified-jp",
      title: "商談化済み",
      cardIds: ["card-jq1", "card-jq2", "card-jq3"],
    },
    {
      id: "list-proposal-jp",
      title: "提案書送付済み",
      cardIds: ["card-jp1", "card-jp2", "card-jp3"],
    },
    {
      id: "list-negotiation-jp",
      title: "交渉中",
      cardIds: ["card-jn1", "card-jn2"],
    },
    {
      id: "list-closed-jp",
      title: "受注",
      cardIds: ["card-jc1", "card-jc2", "card-jc3"],
    },
  ],
  cards: {
    "card-jl1": {
      id: "card-jl1",
      title: "丸紅商事 — エンタープライズライセンス",
      description:
        "Webサイトからのインバウンドリード。営業部長が200席のEnterprise版に興味あり。来週フォローアップ予定。",
      labels: ["blue"],
      startDate: "2026-02-10",
      dueDate: "2026-02-20",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-10T09:00:00.000Z",
    },
    "card-jl2": {
      id: "card-jl2",
      title: "グローバルテック — プラットフォーム移行",
      description:
        "既存顧客からの紹介。HubSpotからSalesforceへの移行を検討中。年間契約額 約¥1,200万の見込み。",
      labels: ["purple"],
      startDate: "2026-02-12",
      dueDate: "2026-02-25",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-12T10:30:00.000Z",
    },
    "card-jl3": {
      id: "card-jl3",
      title: "湘南メディカル — CRM導入",
      description:
        "医療業界向け。セキュリティ要件の高いCRMソリューションが必要。初回ヒアリング完了。",
      labels: ["orange"],
      startDate: "2026-02-14",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-14T08:00:00.000Z",
    },
    "card-jl4": {
      id: "card-jl4",
      title: "ネクストイノベーション — Sales Cloud スターター",
      description:
        "15名の小規模チーム。Sales Cloudスターターパックに興味あり。単価は低いが早期クロージング見込み。",
      labels: ["green"],
      startDate: "2026-02-16",
      dueDate: "2026-02-23",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-15T14:00:00.000Z",
    },
    "card-jq1": {
      id: "card-jq1",
      title: "三井ファイナンス — フルスイート導入",
      description:
        "BANT確認済み。予算: ¥2,200万。決裁者: CTO＋CFO。ニーズ: 営業＆サービス統合基盤。クロージング目標: Q1。",
      labels: ["blue", "red"],
      startDate: "2026-01-20",
      dueDate: "2026-03-01",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-20T09:00:00.000Z",
    },
    "card-jq2": {
      id: "card-jq2",
      title: "大成建設工業 — Field Service導入",
      description:
        "Field Service Lightningの導入検討。現場作業員50名。デモ好評、技術レビュー待ち。",
      labels: ["orange"],
      startDate: "2026-01-28",
      dueDate: "2026-02-28",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-28T11:00:00.000Z",
    },
    "card-jq3": {
      id: "card-jq3",
      title: "エデュラーン — Marketing Cloud",
      description:
        "EdTech企業。マーケティングオートメーション＋ジャーニービルダーが必要。推進者はグロース責任者。",
      labels: ["purple"],
      startDate: "2026-02-01",
      dueDate: "2026-03-10",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-01T13:00:00.000Z",
    },
    "card-jp1": {
      id: "card-jp1",
      title: "オリオン物流 — ¥1,800万 提案",
      description:
        "Sales Cloud + Service Cloudバンドルの作業範囲記述書を送付。100ユーザー。先方の法務レビュー待ち。2/20フォロー予定。",
      labels: ["blue", "yellow"],
      startDate: "2026-01-15",
      dueDate: "2026-02-20",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-15T09:00:00.000Z",
    },
    "card-jp2": {
      id: "card-jp2",
      title: "ブライトリテール — Commerce Cloud",
      description:
        "ECプラットフォーム移行。¥3,000万案件。導入支援サービス含む。競合: Shopify Plus。",
      labels: ["red", "purple"],
      startDate: "2026-01-25",
      dueDate: "2026-02-25",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-25T10:00:00.000Z",
    },
    "card-jp3": {
      id: "card-jp3",
      title: "アトラス製造 — CPQ導入",
      description:
        "複雑な製品カタログ向けのConfigure-Price-Quoteソリューション。フィードバック後の修正提案書を送付済み。年間¥1,100万。",
      labels: ["orange", "yellow"],
      startDate: "2026-02-01",
      dueDate: "2026-03-05",
      completed: false,
      completedAt: "",
      createdAt: "2026-02-01T09:00:00.000Z",
    },
    "card-jn1": {
      id: "card-jn1",
      title: "ゼニスメディア — ¥3,700万 エンタープライズ案件",
      description:
        "最終価格交渉中。3年契約で15%ディスカウントを要求。営業部長が主導。法務のレッドライン対応中。",
      labels: ["red", "blue"],
      startDate: "2026-01-05",
      dueDate: "2026-02-18",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-05T09:00:00.000Z",
    },
    "card-jn2": {
      id: "card-jn2",
      title: "クリアパス保険 — Service Cloud",
      description:
        "導入スケジュールとサポートSLAを交渉中。案件規模¥1,400万。口頭コミットあり、署名待ち。",
      labels: ["yellow", "green"],
      startDate: "2026-01-12",
      dueDate: "2026-02-22",
      completed: false,
      completedAt: "",
      createdAt: "2026-01-12T10:00:00.000Z",
    },
    "card-jc1": {
      id: "card-jc1",
      title: "サミットエナジー — Sales Cloud (¥1,200万)",
      description:
        "3年契約締結。60ユーザー。3/1キックオフ予定。CSM担当: 田中さくら。",
      labels: ["green"],
      startDate: "2025-12-21",
      dueDate: "2026-02-05",
      completed: true,
      completedAt: "2026-02-05T16:00:00.000Z",
      createdAt: "2025-12-01T09:00:00.000Z",
    },
    "card-jc2": {
      id: "card-jc2",
      title: "ベロシティモーターズ — Pardot + Sales Cloud (¥1,650万)",
      description:
        "自動車ディーラーグループ。12拠点。Microsoft Dynamicsとの競合POC後に受注。",
      labels: ["green", "blue"],
      startDate: "2025-12-12",
      dueDate: "2026-01-30",
      completed: true,
      completedAt: "2026-01-30T14:00:00.000Z",
      createdAt: "2025-11-15T09:00:00.000Z",
    },
    "card-jc3": {
      id: "card-jc3",
      title: "フレッシュフーズ協同組合 — スターターパック (¥220万)",
      description:
        "スピードクロージング。小規模案件だが戦略的 — ネットワーク内200以上の組合への展開が見込める。",
      labels: ["green"],
      startDate: "2026-01-20",
      dueDate: "2026-02-10",
      completed: true,
      completedAt: "2026-02-10T11:00:00.000Z",
      createdAt: "2026-01-20T09:00:00.000Z",
    },
  },
  labelNames: {
    green: "受注 / 低リスク",
    yellow: "レビュー待ち",
    orange: "中優先度",
    red: "高優先度",
    purple: "新規ビジネス",
    blue: "エンタープライズ",
  },
  version: 1,
};

export const DEMO_BOARDS = [productLaunch, salesPipeline, salesPipelineJP];

export function seedDemoBoards() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
  for (const board of DEMO_BOARDS) {
    const filePath = path.join(BOARDS_DIR, `${board.id}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(board, null, 2), "utf-8");
    }
  }
}
