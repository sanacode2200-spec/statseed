# Statseed

コメディカル（PT / OT / ST / 看護師 / 臨床検査技師など）向けの医療統計 Web アプリ。
ブラウザだけで完結し、完全日本語 UI・論文品質のグラフ出力・検定選択ガイドを備える。

- 公開URL: https://statseed.vercel.app/dashboard
- フロントエンド: Next.js 14 (App Router) + TypeScript + Tailwind CSS（Vercel）
- バックエンド: FastAPI (Python 3.11+)（Render）

設計方針・ディレクトリ構成・実装状況の詳細は [CLAUDE.md](./CLAUDE.md) を参照。

## ローカル開発

```bash
# バックエンド起動
STATSEED_ENABLE_SCIPY=1 .venv/bin/uvicorn backend.main:app --reload

# フロントエンド起動
cd frontend && npm run dev

# テスト
STATSEED_ENABLE_SCIPY=1 .venv/bin/pytest backend/tests/ -v
cd frontend && npm run test:e2e   # PlaywrightフルスタックE2E
```

## 完全マニュアルの自動生成

`docs/manual/` の使い方マニュアル（スクリーンショット + Markdown）は、本番環境を Playwright で
操作して自動生成している。トップ画面〜全機能・全10検定・グラフ編集・出力まで網羅する。

### 1. スクリーンショット撮影

本番環境（既定）を操作し、`screenshots/manual/{カテゴリ}/{連番}_{説明}.png` に保存する。
Playwright は `frontend/node_modules` に同梱のため `NODE_PATH` を渡して実行する。

```bash
# 本番環境を撮影（ヘッドレス）
MANUAL_HEADLESS=1 NODE_PATH=frontend/node_modules node scripts/capture-full-manual.ts

# ブラウザを表示して撮影（既定 headless:false）
NODE_PATH=frontend/node_modules node scripts/capture-full-manual.ts

# 撮影対象URLを変える場合
MANUAL_BASE_URL=http://127.0.0.1:3100 NODE_PATH=frontend/node_modules node scripts/capture-full-manual.ts
```

グループ箱ひげ図は凡例を持たないため、凡例の表示/非表示・位置デモ（graph-edit/06〜11）は
凡例を持つカプランマイヤー曲線で撮り直す補助スクリプトを用意している。

```bash
MANUAL_HEADLESS=1 NODE_PATH=frontend/node_modules node scripts/capture-legend-fix.ts
```

### 2. Markdown 生成

撮影済みスクショを取り込み、`docs/manual/00-getting-started.md … 12-export.md` を生成する。

```bash
node scripts/generate-manual.ts
```

### 出力

| パス | 内容 |
|------|------|
| `screenshots/manual/` | 漫画・note 記事にも転用できる高解像度スクショ（deviceScaleFactor 2） |
| `docs/manual/` | 検定ごとの「いつ使うか／手順／結果の読み方／つまずき」マニュアル |
| `docs/manual/README.md` | 目次・検定選び方早見表 |

サンプルデータは `verify/data/`（検定別ダミー）と `sample-data/`（KM・ROC・ヒストグラム用）を使用する。
