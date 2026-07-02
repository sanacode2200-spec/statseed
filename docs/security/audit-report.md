# npm audit レポート — 2026-07-01

実行環境: frontend/ (Next.js 14.2.35)

```
npm audit
5 vulnerabilities (1 moderate, 4 high)
```

自動修正の可否: `npm audit fix` → 変更なし（全修正が破壊的変更のため）
破壊的修正: `npm audit fix --force` → next@16.2.9 へのアップグレードが必要

---

## 脆弱性一覧

### 1. `glob` — high (GHSA-5j98-mcp5-4vw2)

| 項目 | 内容 |
|------|------|
| 影響パッケージ | `glob <10.4.5` → `eslint-config-next` 経由 |
| 概要 | glob CLI の `-c/--cmd` フラグでコマンドインジェクション |
| 実際のリスク | **低い** — `eslint-config-next` は lint（開発時）専用。本番サーバーには含まれない |
| 修正方法 | `eslint-config-next@16.x` へのアップグレード（Next.js 16 が必要） |

---

### 2. `next` — high (複数の CVE)

現在バージョン: **14.2.35**

| CVE | 概要 | Statseed への影響 |
|-----|------|-----------------|
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in rewrites | **⚠️ 要注意** — `/api/*` への rewrite を使用中 |
| GHSA-q4gf-8mx6-v5v3 | DoS with Server Components | 中程度（App Router 使用） |
| GHSA-8h8q-6873-q5fj | DoS with Server Components | 中程度（App Router 使用） |
| GHSA-wfc6-r584-vfw7 | Cache poisoning in RSC responses | 中程度（App Router 使用） |
| GHSA-vfv6-92ff-j949 | RSC cache-busting cache poisoning | 中程度（App Router 使用） |
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS | 中程度（RSC 使用） |
| GHSA-3g8h-86w9-wvmq | Middleware/Proxy redirects cache poisoning | Middleware 未使用のため影響小 |
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer remotePatterns | **非該当** — remotePatterns 未使用 |
| GHSA-3x4c-7xq6-9pq8 | next/image disk cache exhaustion | **非該当** — リモート画像最適化未使用 |
| GHSA-ffhc-5mcf-pf4q | XSS in App Router with CSP nonces | **非該当** — CSP nonce 未使用 |
| GHSA-gx5p-jg67-6x7h | XSS via beforeInteractive scripts | **非該当** — beforeInteractive 未使用 |
| GHSA-h64f-5h5j-jqjh | DoS in Image Optimization API | **非該当** — 外部画像最適化未使用 |
| GHSA-c4j6-mc7j-m34r | SSRF via WebSocket upgrades | **非該当** — WebSocket upgrade 未使用 |
| GHSA-36qx-fr4f-26g5 | Pages Router i18n Middleware bypass | **非該当** — App Router 使用 |

**最も優先度が高い CVE:**
- **GHSA-ggv3-7p47-pfv8** — next.config.mjs で `/api/:path*` → backend への rewrite を使用しているため、HTTP request smuggling の攻撃対象になりうる。Vercel 上のホスティングは追加の保護があるが、完全な保証ではない。

---

### 3. `postcss` — moderate (GHSA-qx2v-qp2m-jg93)

| 項目 | 内容 |
|------|------|
| 影響パッケージ | `postcss <8.5.10` （`next` の内部依存） |
| 概要 | CSS Stringify 出力での `</style>` タグのエスケープ漏れによる XSS |
| 実際のリスク | **低い** — postcss はビルド時ツール。ユーザー入力を直接 CSS に変換する処理は使っていない |
| 修正方法 | next@16.x のアップグレードに含まれる |

---

## 対応方針

### 即時対応（不要）

現時点で緊急性の高い悪用可能な経路はない:
- `glob` は CI/lint 環境のみ（本番非搭載）
- `postcss` はビルド時のみ
- `next` の HTTP smuggling は Vercel CDN が緩和要因

### 計画的対応（推奨）

| 優先度 | 対応 | 時期 |
|--------|------|------|
| 高 | Next.js 15 または 16 へのアップグレード計画を立てる | 2026Q3 |
| 高 | 依存関係の定期 audit を CI に組み込む | 次スプリント |
| 中 | rewrite の HTTP request smuggling 対策として Vercel の Security Headers 設定を確認 | 1ヶ月以内 |

### Next.js アップグレードのリスク

`npm audit fix --force` で next@16.2.9 へのアップグレードが可能だが以下の破壊的変更がある:
- API Routes の挙動変更
- App Router の一部 API 変更
- eslint-config-next の設定変更

アップグレード前に E2E テスト（`npm run test:e2e`）でリグレッションを確認すること。

---

*生成: 2026-07-01 / npm audit (frontend/)*
