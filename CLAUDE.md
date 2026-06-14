# Statseed — CLAUDE.md

コメディカル向け医療統計Webアプリ。ブラウザで完結、完全日本語UI、論文品質グラフ出力。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | Statseed |
| ターゲット | コメディカル（PT/OT/ST/看護師/臨床検査技師など） |
| 提供形態 | 無料公開 Webアプリ |
| 最大の差別化 | 論文品質グラフ出力 + 完全日本語UI + 検定選択ガイド |

---

## 技術スタック

```
Frontend   Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend    FastAPI (Python 3.11+)
計算       標準ライブラリ優先 + scipy · statsmodels · pandas · numpy（必要時のみ）
グラフ     Plotly（画面表示） + matplotlib / seaborn（論文用出力・必要時のみ）
DB         未接続（将来候補: PostgreSQL / Supabase）
認証       未接続（Supabase Auth用ログインUIのみ実装済み）
インフラ   Vercel (Frontend) + Docker対応バックエンド
フォント   LINESeed JP（ローカル読み込み、woff2）
```

### デプロイ高速化方針

初期デプロイと本番APIの体感速度を優先する。重い依存は最初から読み込まない。

| 区分 | 方針 |
|------|------|
| ベースAPI | `fastapi` / `uvicorn` / `pydantic` のみで起動 |
| 解析系依存 | `numpy` / `scipy` / `pandas` / `statsmodels` / `openpyxl` は `analysis` extra |
| グラフ出力依存 | `matplotlib` / `seaborn` は `graph` extra |
| 起動時import | 重いライブラリのトップレベルimportは禁止 |
| 本番Docs | Swagger / ReDoc / OpenAPI はデフォルト無効 |

環境変数:

```bash
STATSEED_ENABLE_DOCS=1       # /docs, /redoc, /openapi.json を有効化
STATSEED_ENABLE_SCIPY=1      # scipy が必要な正規性検定などを有効化
```

インストール例:

```bash
# 軽量なAPIサーバーのみ
pip install .

# 統計解析機能まで有効化（CSV/Excel含む）
pip install ".[analysis]"

# 論文用グラフ出力まで有効化
pip install ".[analysis,graph]"

# 開発環境（pytest含む）
pip install ".[analysis,graph,dev]"
```

---

## ディレクトリ構成

```
statseed/
├── frontend/                  # Next.js 14
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # ランディング
│   │   └── dashboard/
│   │       ├── layout.tsx     # ダッシュボード共通レイアウト
│   │       ├── page.tsx       # メインダッシュボード
│   │       ├── descriptive/   # 記述統計
│   │       ├── test/          # 統計検定（9種）
│   │       ├── graph/         # グラフ作成
│   │       ├── guide/         # 検定選択ガイド（ウィザード）
│   │       └── data/          # データ読み込み（CSV/Excel）
│   ├── components/
│   │   ├── ui/                # Button / Card / ErrorMessage / SegmentedControl
│   │   ├── charts/            # PlotlyChart（動的import）
│   │   └── stats/             # DescriptiveResultTable / TestResultCard
│   ├── contexts/
│   │   └── DataContext.tsx    # アップロード済みデータをページ間で共有（標準はsessionStorage）
│   └── lib/
│       ├── api.ts             # バックエンドAPI呼び出し
│       ├── types.ts           # 型定義（バックエンドスキーマと対応）
│       ├── parse.ts           # テキスト入力パース（数値・カテゴリ・行列）
│       ├── dataStore.ts       # データセットのsessionStorage / 明示的localStorage保存
│       ├── dataUtils.ts       # 列抽出・グループ分割などCSVデータ変換ユーティリティ
│       └── graphHandoff.ts    # 検定結果からグラフ画面へ設定を引き継ぐ
│
├── backend/                   # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── descriptive.py     # 記述統計API
│   │   ├── test.py            # 検定API（9種 + 事後検定）
│   │   ├── graph.py           # グラフ出力API
│   │   ├── table1.py          # Table 1 API
│   │   ├── upload.py          # CSV/Excelアップロード
│   │   └── guide.py           # 検定選択ガイド
│   ├── services/
│   │   ├── stats/
│   │   │   ├── descriptive.py
│   │   │   ├── hypothesis.py  # 検定 + 事後検定（Tukey/Bonferroni/Holm/Dunn）
│   │   │   └── table1.py      # Table 1 生成
│   │   ├── graph/
│   │   │   ├── theme.py           # Statseedテーマ定義
│   │   │   ├── plotly_charts.py   # Plotly JSON生成
│   │   │   ├── kaplan_meier.py    # KM推定・ログランク検定
│   │   │   ├── roc.py             # ROC曲線・AUC（Hanley & McNeil CI）
│   │   │   └── matplotlib_export.py  # 論文用出力
│   │   ├── upload.py          # CSV/Excel解析（pandas）
│   │   └── guide.py           # 検定提案ルールエンジン
│   ├── schemas/               # Pydanticスキーマ
│   │   ├── common.py          # FiniteFloat（NaN/Inf拒否）
│   │   ├── descriptive.py
│   │   ├── test.py            # 検定 + PosthocRequest/Result
│   │   ├── graph.py           # グラフ各種リクエスト/レスポンス
│   │   ├── table1.py          # Table1Variable（discriminated union）
│   │   ├── upload.py
│   │   └── guide.py
│   └── tests/                 # 計算・API契約検証テスト（126本）
│
├── pyproject.toml
└── CLAUDE.md                  # このファイル
```

---

## グラフ設計方針（最重要）

グラフ出力はStatseedの最大の強み。品質を絶対に妥協しない。

### 2層構造

| 用途 | ライブラリ | 特徴 |
|------|-----------|------|
| 画面表示 | Plotly | インタラクティブ（ズーム・ホバー） |
| 論文出力 | matplotlib + seaborn | 300dpi PNG / SVG / PDF |

### カラーパレット — Okabe-Ito CUD準拠

色覚多様性対応・論文掲載基準・白黒印刷対応。

```python
OKABE_ITO = {
    "blue":      "#0072B2",
    "orange":    "#E69F00",
    "green":     "#009E73",
    "pink":      "#CC79A7",
    "sky":       "#56B4E9",
    "vermilion": "#D55E00",
    "yellow":    "#F0E442",
    "charcoal":  "#373737",
}
# 1グラフあたり最大4色まで使用
```

### matplotlib テーマ — `backend/services/graph/theme.py`

```python
STATSEED_THEME = {
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Noto Sans CJK JP", "Noto Sans JP", "DejaVu Sans"],
    "font.size": 9,
    "axes.labelsize": 9,
    "axes.titlesize": 10,
    "axes.linewidth": 0.5,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": False,
    "lines.linewidth": 1.5,
    "xtick.major.width": 0.5,
    "ytick.major.width": 0.5,
    "xtick.major.size": 3,
    "ytick.major.size": 3,
    "legend.fontsize": 8,
    "legend.frameon": False,
    "figure.dpi": 100,
    "savefig.dpi": 300,
    "pdf.fonttype": 42,       # フォント埋め込み必須
    "svg.fonttype": "none",
    "text.color": "#373737",
    "axes.edgecolor": "#373737",
}
```

### フォント切り替え機能

```python
FONT_PRESETS = {
    "論文標準":   {"family": "Arial",        "size": 9},
    "日本語対応": {"family": "Noto Sans CJK JP", "size": 9},
    "ポスター":   {"family": "Helvetica Neue","size": 11},
    "カスタム":   None,  # ユーザーが自由入力
}
```

UIはプリセット選択 + カスタム入力の2段構え。

### グラフ種別ベストプラクティス

**箱ひげ図**
- 外れ値は個別jitterプロット（scatter + random seed固定）
- 有意差はブラケット + p値表示
- 棒グラフ+エラーバーは使わない（情報量が少ない）

**対応あり個別値プロット**
- 各対象の前後値を線で結ぶ
- 平均変化量（後 − 前）を明記する
- 欠損ペアはペア単位で除外数を表示する

**カプランマイヤー曲線**
- 打ち切りマーク（+）を必ず表示
- リスクテーブルを曲線直下に配置
- 95%CIは半透明バンドで表示
- ログランク検定p値を右上に配置

**ROC曲線**
- 対角線（AUC=0.5）を点線で表示
- AUCと95%CIを図内に表示
- 最適カットオフ点をマーク
- 軸は0〜1.0、目盛0.2間隔

**出力フォーマット**
- PNG 300dpi（学会発表・Word貼り付け）
- SVG ベクター（Illustratorで後編集可能）
- PDF フォント埋め込み（欧文誌投稿標準）
- 論文1段組 / 論文2段組 / 16:9スライドの実寸プリセット
- PNG / SVG の最終出力プレビュー

---

## 計算エンジン方針（計算ミス絶対防止）

- **本格的な推測統計は自前実装禁止** — t検定・ANOVA・回帰・多重比較などは scipy / statsmodels の関数を直接使う
- **軽量な記述統計は標準ライブラリ可** — 起動速度のため、平均・SD・中央値・四分位数などは依存追加なしで実装してよい
- **重い依存は遅延import** — scipy / pandas / matplotlib などは該当処理の内部で必要時のみimportする
- **入力バリデーション** — Pydanticで型・範囲を厳密にチェック
- **テスト必須** — 既知の答えがある問題で必ず検証テストを書く
- **結果の解釈文を自動生成** — 数値だけでなく「この結果は〜を意味します」を日本語で添える

```python
# 良い例
from scipy import stats
t_stat, p_value = stats.ttest_ind(group_a, group_b)

# 悪い例（自前実装しない）
# t_stat = (mean_a - mean_b) / ...  ← やらない
```

---

## 実装状況

### データ入力
- [x] CSV インポート
- [x] Excel (.xlsx) インポート
- [x] データプレビュー・変数役割（ID / 連続 / 順序 / カテゴリ / 日付 / 除外）の確認・上書き
- [x] 欠損値の検出と表示
- [x] 氏名・患者ID・生年月日・住所・連絡先等の個人識別情報候補警告
- [x] 標準はタブ内保存、端末への永続保存は明示的オプトイン

### 記述統計
- [x] 連続変数: 平均・SD・中央値・IQR・最小・最大・95%CI
- [x] カテゴリ変数: 頻度・割合（`POST /api/descriptive/categorical`）
- [x] 正規性検定（Shapiro-Wilk、STATSEED_ENABLE_SCIPY=1 時のみ）

### 検定
- [x] 2群比較: t検定（Welch）/ Mann-Whitney U検定
- [x] 対応あり: 対応t検定 / Wilcoxon符号順位検定
- [x] 3群以上: 一元配置ANOVA / Kruskal-Wallis検定
- [x] 比率比較: χ²検定（Yates補正） / Fisher正確検定
- [x] 相関: Pearson（95%CI付き） / Spearman
- [x] **検定選択ガイド** — 研究目的・推定対象・対応関係・分布を確認して検定を提案
- [x] CSV解析結果へ元データ数・使用数・除外数・除外理由を表示
- [x] Welch検定・対応t検定へ推定値と95%CIを表示

### グラフ
- [x] ヒストグラム（正規分布曲線オーバーレイ）
- [x] 箱ひげ図（jitterプロット付き）
- [x] 散布図（回帰直線付き）
- [x] 対応あり個別値プロット
- [x] PNG 300dpi / SVG / PDF 出力
- [x] フォントプリセット切り替えUI（論文標準 / 日本語対応 / ポスター / カスタム）
- [x] 論文1段組 / 論文2段組 / 16:9スライド出力プリセット
- [x] 最終出力プレビュー
- [x] 図注・方法文の自動生成とコピー
- [x] 検定結果から設定済みグラフ作成へ引き継ぎ
- [x] CSVグラフへ描画使用数・除外数・除外理由を表示

### 研究ワークフロー・追加機能

- [x] **Table 1 自動生成** — 連続変数（mean±SD / median(IQR)）+ カテゴリ変数（n(%)）、群比較p値付き、TSVコピー対応
- [x] Table 1 の変数別欠損数・群分け列の除外数表示
- [x] **多重比較（事後検定）** — Tukey HSD / Bonferroni / Holm（パラメトリック）/ Dunn + Holm（ノンパラメトリック）
- [x] **棒グラフ** — エラーバー付き（SD / SEM / 95%CI 切り替え）
- [x] **カプランマイヤー曲線** — 打ち切りマーク・95%CIバンド・リスクテーブル・ログランク検定p値
- [x] **ROC曲線** — AUC + 95%CI（Hanley & McNeil 1982）・最適カットオフ（Youden指数）・感度/特異度表示
- [x] **CSVデータのページ間共有** — `DataContext`（React Context + sessionStorage、明示的オプトイン時のみlocalStorage）でアップロード済みCSV/Excelを保持し、記述統計・検定・グラフ（全7種）・Table 1 の各ページで「CSVから選択」⇄「手入力」を切り替え可能
- [x] **レスポンシブUI** — モバイルヘッダー・ドロワーナビ、フォーム縦積み、結果カード・操作行の折り返し、表の横スクロール対応

## 次の開発候補

- [ ] Supabase Auth 認証（ログインページ UI は完成済み、Auth 接続が未実装）
- [ ] 分析履歴・再実行可能な設定JSON・解析パッケージ出力
- [ ] Table 1 のp値初期オフ化・standardized mean difference
- [ ] 回帰分析・共変量調整・反復測定・一般化線形モデル
- [ ] アクセシビリティ監査・主要ワークフローE2Eテスト

---

## 実装済みAPIエンドポイント

```
GET  /health                   # ヘルスチェック

POST /api/descriptive          # 記述統計（連続変数）
POST /api/descriptive/categorical  # 記述統計（カテゴリ変数 — 頻度・割合）

POST /api/test/ttest           # Welch t検定（独立2群）
POST /api/test/mannwhitney     # Mann-Whitney U検定
POST /api/test/ttest-paired    # 対応のある t検定
POST /api/test/wilcoxon        # Wilcoxon符号順位検定
POST /api/test/anova           # 一元配置ANOVA
POST /api/test/kruskal         # Kruskal-Wallis検定
POST /api/test/chisquare       # χ²検定
POST /api/test/fisher          # Fisher正確検定
POST /api/test/correlation     # Pearson / Spearman 相関

POST /api/graph/boxplot        # 箱ひげ図（Plotly JSON）
POST /api/graph/histogram      # ヒストグラム（Plotly JSON）
POST /api/graph/scatter        # 散布図（Plotly JSON）
POST /api/graph/paired         # 対応あり個別値プロット（Plotly JSON）
POST /api/graph/barplot        # 棒グラフ（Plotly JSON、SD/SEM/95%CIエラーバー）
POST /api/graph/kaplan-meier   # カプランマイヤー曲線（Plotly JSON）
POST /api/graph/roc            # ROC曲線（Plotly JSON + AUC統計量）
POST /api/graph/export         # 論文用出力（PNG/SVG/PDF）

POST /api/upload/csv           # CSVアップロード（最大10MB）
POST /api/upload/excel         # Excelアップロード（最大10MB）

POST /api/guide/suggest        # 検定選択ガイド

POST /api/test/posthoc         # 多重比較（Tukey/Bonferroni/Holm/Dunn+Holm）

POST /api/table1               # Table 1 生成
```

---

## 開発上の注意

1. **日本語を優先** — エラーメッセージ・結果解釈・UIテキストはすべて日本語
2. **グラフは妥協しない** — デザイン仕様から逸脱しない。テーマファイルを必ず使う
3. **計算は必ずテストを書く** — `backend/tests/` に既知の答えで検証（現在126テスト）
4. **型安全** — TypeScript / Pydantic を徹底する
5. **コメディカル視点** — 医療統計初学者が迷わない設計を常に意識する
6. **高速起動を維持** — 本番ランタイムで不要な依存・不要なimport・不要なAPIドキュメント生成を避ける
7. **誤解析を防ぐ** — 変数役割、解析使用数、欠損除外理由、推定対象を結果と一緒に示す
8. **データ保護を既定値にする** — アップロードデータは標準でタブ内のみ保持し、端末保存は明示的な選択時だけ許可する

## ローカル開発

```bash
# バックエンド起動
STATSEED_ENABLE_SCIPY=1 /home/haru/dev/statseed/.venv/bin/uvicorn backend.main:app --reload

# フロントエンド起動
cd frontend && npm run dev

# テスト実行
STATSEED_ENABLE_SCIPY=1 /home/haru/dev/statseed/.venv/bin/pytest backend/tests/ -v
```

---

## UI デザイン方針（2026-06-14 更新）

### レイアウト
- **デスクトップ** — Vercel 風200px固定サイドバー、グループ付きナビ、トップバーに `Statseed / Dashboard`
- **モバイル** — 48px固定ヘッダー + 左ドロワーナビ。ドロワー表示中は背景スクロールを止め、Escape・背景タップ・ページ遷移で閉じる
- **ダッシュボード** — `lg` 未満は縦積み、`lg` 以上は左カラム（概要・Quick Start・Stack）+ 右カラム（機能一覧）
- **ページ余白** — モバイル `px-3 py-5`、`sm` `px-5`、`md` 以上 `px-8 py-7`
- **フォーム** — モバイルは1列、`sm` 以上で必要に応じて2列、3項目フォームは `md` 以上で3列
- **表** — 列情報を省略せず、狭い画面では表コンテナ内だけ横スクロールを許可する
- **操作行** — ボタン・トグル・結果ヘッダーは `flex-wrap` を基本とし、ページ全体の横スクロールを発生させない

### フォント
- **Inter** — `next/font/google` で読み込み（UI クロム・ラテン文字担当）
- **LINESeed JP** — `next/font/local` でローカル読み込み（日本語コンテンツ担当、woff2 × 4ウェイト）
- フォントスタック: `Inter → LINESeed JP → Noto Sans JP`
- フォントファイル: `frontend/public/fonts/line-seed-jp/`
- CSS 変数: `--font-inter` / `--font-line-seed-jp`

### フォントサイズ体系（px）
| 用途 | サイズ |
|------|--------|
| セクションラベル（uppercase） | 11px |
| 補助テキスト・説明文 | 12–13px |
| 本文・フォーム | 13px |
| 小見出し | 14–15px |
| ページタイトル | 20px |
| ヒーロー見出し | 40px |

### カラー・ダークモード
- ダークモード: `darkMode: "class"` + `localStorage` 永続化 + フラッシュ防止スクリプト
- **デフォルトはダーク**（未設定時も dark クラスを付与）
- ダーク背景: `#0a0a0a`（ページ）/ `#111`（カード・入力）
- ボーダー: `gray-200` / `neutral-800`（dark）
- アクセントカラー: **なし**（Vercel スタイル — 黒/白/グレー階層のみ）

### ボタン・フォーム
- **Button primary**: `bg-black text-white dark:bg-white dark:text-black`（Vercel スタイル）
- **Button secondary**: `border border-gray-200 dark:border-neutral-800`
- **切り替えトグル**: 共通の `SegmentedControl` を使い、active = `bg-white text-black`（ダーク時）
- **input / textarea / select**: `border-gray-200 dark:border-neutral-800 dark:bg-[#111]`
- **フォーカスリング**: `focus:ring-neutral-400/30`
- **タップ領域**: 共通ボタンはモバイルで高さ44px以上を確保する

### サイドバーナビゲーション
- ラベルは**英語**（Overview / Analysis / Tests / Guide / Import など）
- アクティブ項目: `bg-neutral-800 text-white`
- セクションラベル: `text-[11px] uppercase tracking-wider text-neutral-600`
- アイコン: 13px SVG ストローク（`stroke="currentColor"` `strokeWidth={1.75}`）

### ログインページ
- `/login` — Vercel 風センタードカード
- OAuth: "Continue with GitHub" / "Continue with Google"
- メール magic link 対応（Supabase Auth 未接続、UI のみ）

### アイコン
- **sana2.png** — クラゲ猫ロゴ（757×757px、余白トリミング済み）
- 表示時は `overflow-hidden` + `object-cover` でフレームいっぱいに
- サイドバートップ・ランディング・ログインページで使用
- ガイドページの選択肢: SVG ストロークアイコン（絵文字ではない）
