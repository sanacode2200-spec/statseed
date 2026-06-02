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
計算       scipy · statsmodels · pandas · numpy
グラフ     Plotly (画面表示・インタラクティブ) + matplotlib / seaborn (論文用出力)
DB         PostgreSQL (Supabase)
認証       Supabase Auth
インフラ   Vercel (Frontend) + Railway (Backend)
```

---

## ディレクトリ構成

```
statseed/
├── frontend/                  # Next.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # ランディング
│   │   └── dashboard/
│   │       ├── page.tsx       # メインダッシュボード
│   │       ├── descriptive/   # 記述統計
│   │       ├── test/          # 検定
│   │       ├── regression/    # 回帰・相関
│   │       ├── graph/         # グラフ作成
│   │       └── data/          # データ管理
│   ├── components/
│   │   ├── ui/                # 共通UIコンポーネント
│   │   ├── charts/            # グラフコンポーネント
│   │   └── stats/             # 統計結果表示
│   └── lib/
│       ├── api.ts             # バックエンドAPI呼び出し
│       └── types.ts           # 型定義
│
├── backend/                   # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── descriptive.py     # 記述統計API
│   │   ├── test.py            # 検定API
│   │   ├── regression.py      # 回帰・相関API
│   │   └── graph.py           # グラフ出力API
│   ├── services/
│   │   ├── stats/
│   │   │   ├── descriptive.py
│   │   │   ├── hypothesis.py
│   │   │   └── regression.py
│   │   └── graph/
│   │       ├── theme.py       # Statseedテーマ定義
│   │       ├── plotly_charts.py
│   │       └── matplotlib_export.py
│   ├── schemas/               # Pydanticスキーマ
│   └── tests/                 # 計算検証テスト
│
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
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
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

### フォント切り替え機能（Phase 1から実装）

```python
FONT_PRESETS = {
    "論文標準":   {"family": "Arial",        "size": 9},
    "日本語対応": {"family": "Noto Sans JP",  "size": 9},
    "ポスター":   {"family": "Helvetica Neue","size": 11},
    "カスタム":   None,  # ユーザーが自由入力
}
```

UIはプリセット選択 + カスタム入力の2段構え。

### グラフ種別ベストプラクティス

**箱ひげ図**
- 外れ値は個別jitterプロット
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

- **自前実装禁止** — scipy / statsmodels の関数を直接使う
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

## Phase 1 MVP 機能リスト

### データ入力
- [ ] CSV インポート
- [ ] Excel (.xlsx) インポート
- [ ] データプレビュー・変数型の確認
- [ ] 欠損値の検出と表示

### 記述統計
- [ ] 連続変数: 平均・SD・中央値・IQR・最小・最大・95%CI
- [ ] カテゴリ変数: 頻度・割合
- [ ] Table 1 自動生成（論文の背景データ表）
- [ ] 正規性検定（Shapiro-Wilk）

### 検定
- [ ] 2群比較: t検定 / Mann-Whitney U検定
- [ ] 対応あり: 対応t検定 / Wilcoxon符号順位検定
- [ ] 3群以上: 一元配置ANOVA / Kruskal-Wallis検定
- [ ] 比率比較: χ²検定 / Fisher正確検定
- [ ] 相関: Pearson / Spearman
- [ ] **検定選択ガイド** — データの種類・分布から自動提案

### グラフ
- [ ] ヒストグラム
- [ ] 箱ひげ図（jitterつき）
- [ ] 散布図
- [ ] 棒グラフ
- [ ] PNG / SVG / PDF 出力
- [ ] フォントプリセット切り替え

---

## API設計骨格

```
POST /api/descriptive          # 記述統計
POST /api/test/ttest           # t検定
POST /api/test/mannwhitney     # Mann-Whitney U
POST /api/test/chisquare       # χ²検定
POST /api/test/anova           # ANOVA
POST /api/correlation          # 相関
POST /api/graph/boxplot        # 箱ひげ図生成
POST /api/graph/histogram      # ヒストグラム生成
POST /api/graph/scatter        # 散布図生成
POST /api/graph/export         # 論文用出力（PNG/SVG/PDF）
POST /api/upload/csv           # CSVアップロード
POST /api/upload/excel         # Excelアップロード
GET  /api/guide/suggest        # 検定選択ガイド
```

---

## 開発上の注意

1. **日本語を優先** — エラーメッセージ・結果解釈・UIテキストはすべて日本語
2. **グラフは妥協しない** — デザイン仕様から逸脱しない。テーマファイルを必ず使う
3. **計算は必ずテストを書く** — `backend/tests/` に既知の答えで検証
4. **型安全** — TypeScript / Pydantic を徹底する
5. **コメディカル視点** — 医療統計初学者が迷わない設計を常に意識する
