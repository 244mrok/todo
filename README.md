# Task Board

[![CI](https://github.com/244mrok/todo/actions/workflows/ci.yml/badge.svg)](https://github.com/244mrok/todo/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/mroks-projects/todo)

A Trello-like task management application built with Next.js 16, React 19, and TypeScript. Supports Kanban board and Gantt/timeline views with real-time collaboration, user authentication, board sharing, and more.

## Features

### Board & Cards
- **Kanban Board View** -- Organize tasks in columns with drag-and-drop for cards and lists
- **Gantt / Timeline View** -- Visual timeline with drag-to-move, resize, click-to-create, and row reordering
- **Task Cards** -- Title, description, color labels, start/due dates, completion tracking
- **Labels** -- 6 color-coded labels with custom naming per board, filterable
- **CSV Import / Export** -- Bulk import cards from CSV or export board data
- **Hide Completed** -- Toggle visibility of completed cards

### Collaboration
- **Real-time Sync** -- Server-Sent Events (SSE) for live updates across connected clients
- **Version Conflict Resolution** -- Optimistic updates with automatic conflict detection
- **Board Sharing** -- Owners can add/remove editors by email
- **Access Control** -- Private boards restricted to owner and editors; public/demo boards open to all

### Authentication
- **Registration & Login** -- Email/password with optional "Remember Me"
- **JWT Sessions** -- HTTP-only secure cookies, 7 or 30 day expiration
- **Password Reset** -- Token-based reset flow with 1-hour expiration
- **Rate Limiting** -- IP-based protection on auth endpoints

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Arrow keys` | Navigate between lists and cards |
| `Tab` / `Shift+Tab` | Move between lists |
| `Enter` | Open card / enter list |
| `Space` | Toggle card completion |
| `N` | Add new card |
| `L` | Add new list |
| `Delete` | Delete focused card or list |
| `H` | Toggle hide completed |
| `?` | Show shortcuts help |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript
- **Auth**: JWT + bcryptjs
- **Database**: SQLite via @libsql/client (local) / Turso (production)
- **Board Storage**: JSON files (`data/boards/`)
- **Real-time**: Server-Sent Events
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+

### Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and set JWT_SECRET (32+ character hex string)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (32+ chars) |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for password reset links (default: `http://localhost:3000`) |
| `TURSO_DATABASE_URL` | No | Remote Turso database URL (production) |
| `TURSO_AUTH_TOKEN` | No | Turso authentication token |

### Scripts

```bash
npm run dev        # Development server with hot reload
npm run build      # Production build
npm start          # Production server
npm run lint       # Run ESLint
npm test           # Run tests
npm run seed       # Seed demo board data
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/            # register, login, logout, me, password reset
│   │   └── board/
│   │       ├── route.ts     # GET: list accessible boards
│   │       └── [id]/
│   │           ├── route.ts       # GET/PUT/DELETE board
│   │           ├── events/        # SSE real-time updates
│   │           └── sharing/       # GET/PUT sharing management
│   ├── auth/                # Login, register, password reset pages
│   ├── globals.css
│   └── page.tsx             # Home page
├── components/
│   ├── Board.tsx            # Main board component
│   ├── AuthProvider.tsx     # Auth context provider
│   └── Toast.tsx
├── hooks/
│   ├── useBoardSync.ts      # SSE subscription hook
│   └── useLocalStorage.ts
├── lib/
│   ├── auth.ts              # JWT, password hashing, user CRUD
│   ├── board-auth.ts        # Board access control
│   ├── board-utils.ts       # Card sorting, filtering helpers
│   ├── db.ts                # SQLite/Turso connection
│   ├── demo-boards.ts       # Demo board seed data
│   ├── event-bus.ts         # SSE broadcast system
│   ├── rate-limit.ts        # IP-based rate limiting
│   └── session.ts           # Session cookie management
├── types/
│   ├── auth.ts              # AuthUser, JwtPayload
│   └── board.ts             # BoardData, Card, List
└── middleware.ts            # Route protection
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Boards
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/board` | List accessible boards |
| `GET` | `/api/board/[id]` | Load board |
| `PUT` | `/api/board/[id]` | Save board (with conflict detection) |
| `DELETE` | `/api/board/[id]` | Delete board (owner only) |
| `GET` | `/api/board/[id]/events` | SSE stream for real-time updates |
| `GET` | `/api/board/[id]/sharing` | Get sharing info (owner only) |
| `PUT` | `/api/board/[id]/sharing` | Add/remove editor by email (owner only) |

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables: `JWT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
3. Deploy -- auto-builds on push

> **Note**: On Vercel, board files are stored in `/tmp/boards` (ephemeral). Use a database-backed solution for persistent board storage in production.

### Self-hosted

```bash
npm run build
npm start
```

Board data is stored in `data/boards/` and auth data in `data/auth.db`.

---

# Task Board (日本語)

Next.js 16、React 19、TypeScript で構築された Trello 風タスク管理アプリケーションです。カンバンボードとガントチャート / タイムラインビューに対応し、リアルタイムコラボレーション、ユーザー認証、ボード共有などの機能を備えています。

## 機能

### ボード & カード
- **カンバンボードビュー** -- カードとリストのドラッグ＆ドロップでタスクをカラムに整理
- **ガント / タイムラインビュー** -- ドラッグ移動、リサイズ、クリック作成、行並び替えに対応したビジュアルタイムライン
- **タスクカード** -- タイトル、説明、カラーラベル、開始日/期限、完了状態の管理
- **ラベル** -- ボードごとにカスタム名を設定できる 6 色のカラーラベル、フィルタリング対応
- **CSV インポート / エクスポート** -- CSV からのカード一括インポート、ボードデータのエクスポート
- **完了済み非表示** -- 完了カードの表示/非表示を切り替え

### コラボレーション
- **リアルタイム同期** -- Server-Sent Events (SSE) による接続クライアント間のライブ更新
- **バージョン競合解決** -- 楽観的更新と自動競合検出
- **ボード共有** -- オーナーがメールアドレスでエディターを追加/削除
- **アクセス制御** -- プライベートボードはオーナーとエディターに限定、パブリック/デモボードは全ユーザーに公開

### 認証
- **ユーザー登録 & ログイン** -- メール/パスワード認証、「ログイン状態を保持」オプション付き
- **JWT セッション** -- HTTP-only セキュアクッキー、7 日間または 30 日間の有効期限
- **パスワードリセット** -- 1 時間有効のトークンベースリセットフロー
- **レート制限** -- 認証エンドポイントへの IP ベース保護

### キーボードショートカット
| キー | 操作 |
|------|------|
| `矢印キー` | リスト・カード間の移動 |
| `Tab` / `Shift+Tab` | リスト間の移動 |
| `Enter` | カードを開く / リストに入る |
| `Space` | カードの完了状態を切り替え |
| `N` | 新しいカードを追加 |
| `L` | 新しいリストを追加 |
| `Delete` | フォーカス中のカードまたはリストを削除 |
| `H` | 完了済みの表示/非表示を切り替え |
| `?` | ショートカットヘルプを表示 |

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19、Tailwind CSS 4
- **言語**: TypeScript
- **認証**: JWT + bcryptjs
- **データベース**: SQLite (@libsql/client、ローカル) / Turso (本番)
- **ボードストレージ**: JSON ファイル (`data/boards/`)
- **リアルタイム通信**: Server-Sent Events
- **テスト**: Vitest

## セットアップ

### 前提条件

- Node.js 18 以上

### インストール

```bash
# 依存関係のインストール
npm install

# 環境ファイルの作成
cp .env.local.example .env.local
# .env.local を編集し、JWT_SECRET を設定（32 文字以上の16進数文字列）

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `JWT_SECRET` | はい | JWT トークン署名用のシークレットキー（32 文字以上） |
| `NEXT_PUBLIC_BASE_URL` | いいえ | パスワードリセットリンクのベース URL（デフォルト: `http://localhost:3000`） |
| `TURSO_DATABASE_URL` | いいえ | Turso リモートデータベース URL（本番用） |
| `TURSO_AUTH_TOKEN` | いいえ | Turso 認証トークン |

### スクリプト

```bash
npm run dev        # ホットリロード付き開発サーバー
npm run build      # 本番ビルド
npm start          # 本番サーバー
npm run lint       # ESLint 実行
npm test           # テスト実行
npm run seed       # デモボードデータのシード
```

## プロジェクト構成

```
src/
├── app/
│   ├── api/
│   │   ├── auth/            # 登録、ログイン、ログアウト、ユーザー情報、パスワードリセット
│   │   └── board/
│   │       ├── route.ts     # GET: アクセス可能なボード一覧
│   │       └── [id]/
│   │           ├── route.ts       # GET/PUT/DELETE ボード操作
│   │           ├── events/        # SSE リアルタイム更新
│   │           └── sharing/       # GET/PUT 共有管理
│   ├── auth/                # ログイン、登録、パスワードリセットページ
│   ├── globals.css
│   └── page.tsx             # ホームページ
├── components/
│   ├── Board.tsx            # メインボードコンポーネント
│   ├── AuthProvider.tsx     # 認証コンテキストプロバイダー
│   └── Toast.tsx
├── hooks/
│   ├── useBoardSync.ts      # SSE サブスクリプションフック
│   └── useLocalStorage.ts
├── lib/
│   ├── auth.ts              # JWT、パスワードハッシュ、ユーザー CRUD
│   ├── board-auth.ts        # ボードアクセス制御
│   ├── board-utils.ts       # カードソート、フィルタリングヘルパー
│   ├── db.ts                # SQLite/Turso 接続
│   ├── demo-boards.ts       # デモボードシードデータ
│   ├── event-bus.ts         # SSE ブロードキャストシステム
│   ├── rate-limit.ts        # IP ベースレート制限
│   └── session.ts           # セッションクッキー管理
├── types/
│   ├── auth.ts              # AuthUser、JwtPayload
│   └── board.ts             # BoardData、Card、List
└── middleware.ts            # ルート保護
```

## API エンドポイント

### 認証
| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/auth/register` | ユーザー登録 |
| `POST` | `/api/auth/login` | ログイン |
| `POST` | `/api/auth/logout` | ログアウト |
| `GET` | `/api/auth/me` | 現在のユーザー情報取得 |
| `POST` | `/api/auth/forgot-password` | パスワードリセットリクエスト |
| `POST` | `/api/auth/reset-password` | トークンによるパスワードリセット |

### ボード
| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/board` | アクセス可能なボード一覧 |
| `GET` | `/api/board/[id]` | ボード読み込み |
| `PUT` | `/api/board/[id]` | ボード保存（競合検出付き） |
| `DELETE` | `/api/board/[id]` | ボード削除（オーナーのみ） |
| `GET` | `/api/board/[id]/events` | リアルタイム更新用 SSE ストリーム |
| `GET` | `/api/board/[id]/sharing` | 共有情報取得（オーナーのみ） |
| `PUT` | `/api/board/[id]/sharing` | メールでエディターを追加/削除（オーナーのみ） |

## デプロイ

### Vercel

1. GitHub リポジトリを Vercel に接続
2. 環境変数を設定: `JWT_SECRET`、`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`
3. デプロイ -- プッシュ時に自動ビルド

> **注意**: Vercel 上ではボードファイルは `/tmp/boards` に保存されます（一時的）。本番環境で永続的なボードストレージが必要な場合は、データベースベースのソリューションをご利用ください。

### セルフホスト

```bash
npm run build
npm start
```

ボードデータは `data/boards/`、認証データは `data/auth.db` に保存されます。
