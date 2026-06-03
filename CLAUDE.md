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
DB         PostgreSQL (Supabase)
認証       Supabase Auth
インフラ   Vercel (Frontend) + Railway (Backend)
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
│   │   ├── ui/                # Button / Card / ErrorMessage
│   │   ├── charts/            # PlotlyChart（動的import）
│   │   └── stats/             # DescriptiveResultTable / TestResultCard
│   └── lib/
│       ├── api.ts             # バックエンドAPI呼び出し
│       └── types.ts           # 型定義（バックエンドスキーマと対応）
│
├── backend/                   # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── descriptive.py     # 記述統計API
│   │   ├── test.py            # 検定API（9種）
│   │   ├── graph.py           # グラフ出力API
│   │   ├── upload.py          # CSV/Excelアップロード
│   │   └── guide.py           # 検定選択ガイド
│   ├── services/
│   │   ├── stats/
│   │   │   ├── descriptive.py
│   │   │   └── hypothesis.py
│   │   ├── graph/
│   │   │   ├── theme.py           # Statseedテーマ定義
│   │   │   ├── plotly_charts.py   # Plotly JSON生成
│   │   │   └── matplotlib_export.py  # 論文用出力
│   │   ├── upload.py          # CSV/Excel解析（pandas）
│   │   └── guide.py           # 検定提案ルールエンジン
│   ├── schemas/               # Pydanticスキーマ
│   │   ├── descriptive.py
│   │   ├── test.py
│   │   ├── graph.py
│   │   ├── upload.py
│   │   └── guide.py
│   └── tests/                 # 計算検証テスト（36本）
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

## Phase 1 MVP 機能リスト（完了）

### データ入力
- [x] CSV インポート
- [x] Excel (.xlsx) インポート
- [x] データプレビュー・変数型の確認
- [x] 欠損値の検出と表示

### 記述統計
- [x] 連続変数: 平均・SD・中央値・IQR・最小・最大・95%CI
- [ ] カテゴリ変数: 頻度・割合（Phase 2）
- [ ] Table 1 自動生成（Phase 2）
- [x] 正規性検定（Shapiro-Wilk、STATSEED_ENABLE_SCIPY=1 時のみ）

### 検定
- [x] 2群比較: t検定（Welch）/ Mann-Whitney U検定
- [x] 対応あり: 対応t検定 / Wilcoxon符号順位検定
- [x] 3群以上: 一元配置ANOVA / Kruskal-Wallis検定
- [x] 比率比較: χ²検定（Yates補正） / Fisher正確検定
- [x] 相関: Pearson（95%CI付き） / Spearman
- [x] **検定選択ガイド** — 5ステップウィザードで最適な検定を提案

### グラフ
- [x] ヒストグラム（正規分布曲線オーバーレイ）
- [x] 箱ひげ図（jitterプロット付き）
- [x] 散布図（回帰直線付き）
- [ ] 棒グラフ（Phase 2）
- [x] PNG 300dpi / SVG / PDF 出力
- [ ] フォントプリセット切り替えUI（Phase 2）

---

## Phase 2 候補

- Table 1 自動生成（論文の背景データ表）
- カテゴリ変数の記述統計（頻度・割合）
- 多重比較（Tukey法・Bonferroni法）
- 棒グラフ（エラーバー付き）
- カプランマイヤー曲線
- ROC曲線・AUC計算
- Supabase Auth 認証
- データ保存（セッション管理）
- CSV エクスポート（解析結果）

---

## 実装済みAPIエンドポイント

```
GET  /health                   # ヘルスチェック

POST /api/descriptive          # 記述統計（連続変数）

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
POST /api/graph/export         # 論文用出力（PNG/SVG/PDF）

POST /api/upload/csv           # CSVアップロード（最大10MB）
POST /api/upload/excel         # Excelアップロード（最大10MB）

POST /api/guide/suggest        # 検定選択ガイド
```

---

## 開発上の注意

1. **日本語を優先** — エラーメッセージ・結果解釈・UIテキストはすべて日本語
2. **グラフは妥協しない** — デザイン仕様から逸脱しない。テーマファイルを必ず使う
3. **計算は必ずテストを書く** — `backend/tests/` に既知の答えで検証（現在36テスト）
4. **型安全** — TypeScript / Pydantic を徹底する
5. **コメディカル視点** — 医療統計初学者が迷わない設計を常に意識する
6. **高速起動を維持** — 本番ランタイムで不要な依存・不要なimport・不要なAPIドキュメント生成を避ける

## ローカル開発

```bash
# バックエンド起動
STATSEED_ENABLE_SCIPY=1 .venv/bin/uvicorn backend.main:app --reload

# フロントエンド起動
cd frontend && npm run dev

# テスト実行
STATSEED_ENABLE_SCIPY=1 .venv/bin/pytest backend/tests/ -v
```
