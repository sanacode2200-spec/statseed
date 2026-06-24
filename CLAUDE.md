# Statseed — CLAUDE.md

コメディカル向け医療統計Webアプリ。ブラウザで完結、完全日本語UI、論文品質グラフ出力。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | Statseed |
| 公開URL | https://statseed.vercel.app/dashboard |
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
インフラ   Vercel (Frontend) + Render (Backend, Docker対応)
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
│   │       ├── repeated/      # 反復測定ANOVA
│   │       ├── regression/    # 回帰分析（線形/ロジスティック/ポアソン）
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
│   │   ├── test.py            # 検定API（9種 + 事後検定 + 反復測定ANOVA）
│   │   ├── graph.py           # グラフ出力API
│   │   ├── table1.py          # Table 1 API
│   │   ├── regression.py      # 回帰分析API（線形・ロジスティック回帰）
│   │   ├── upload.py          # CSV/Excelアップロード
│   │   └── guide.py           # 検定選択ガイド
│   ├── services/
│   │   ├── stats/
│   │   │   ├── descriptive.py
│   │   │   ├── hypothesis.py  # 検定 + 事後検定（Tukey/Bonferroni/Holm/Dunn）+ 反復測定ANOVA
│   │   │   ├── table1.py      # Table 1 生成
│   │   │   └── regression.py  # 線形回帰（OLS）+ ロジスティック回帰（Logit・OR）+ 混合効果モデル（MixedLM）
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
│   │   ├── test.py            # 検定 + Posthoc + RepeatedMeasures
│   │   ├── graph.py           # グラフ各種リクエスト/レスポンス
│   │   ├── table1.py          # Table1Variable（discriminated union）
│   │   ├── regression.py      # 線形・ロジスティック・ポアソン回帰 + 混合効果モデル リクエスト/結果
│   │   ├── upload.py
│   │   └── guide.py
│   └── tests/                 # 計算・API契約検証テスト（204本）
│
├── verify/                    # 計算検証ハーネス（StatSeed実関数 vs R 突合）
│   ├── run_all.sh             # data_gen → statseed_calc → compare を一括実行
│   ├── data_gen.py            # シード固定（rng(42)）の共通ダミーデータ生成
│   ├── statseed_calc.py       # StatSeed実バックエンド関数で計算しJSON出力
│   ├── r_calc.R              # R側の基準計算（要 R + jsonlite）
│   ├── compare.py            # PASS / DIFF / METHOD_DIFF を相対誤差で判定
│   └── r_results.json        # R基準値スナップショット（commit対象・R無し環境用）
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
- 3群以上でどのペアも有意でない場合は、ブラケットを消さず全体検定（ANOVA/Kruskal-Wallis）のp値にフォールバック表示する（画面・export両対応）
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

### 外部突合検証ハーネス（`verify/`）

`backend/tests/` の単体テストとは別に、**StatSeedの実バックエンド関数の計算結果をR（独立した正解）と突き合わせる**検証ハーネスを用意している。

- `data_gen.py` がシード固定（`rng(42)`）で共通ダミーデータを生成 → どのマシンでも同一入力
- `statseed_calc.py` が `backend.services.stats` の実関数を呼んで `statseed_results.json` を出力
- `r_calc.R` がRで同じ計算を行い `r_results.json`（**commit対象の基準値スナップショット**）を出力
- `compare.py` が相対誤差で `PASS / DIFF / METHOD_DIFF` を判定（scipyとRで既定手法が違う既知ケースは `METHOD_DIFF` として注記）

実行（Rがあれば全工程、無ければ同梱の `r_results.json` を基準に突合）:

```bash
STATSEED_PATH=$(pwd) bash verify/run_all.sh
```

`r_results.json` のみRのあるマシンでR1回実行して生成・コミットしておく（`cd verify && Rscript r_calc.R`、要 `jsonlite`）。生成物（`verify/data/`・`statseed_results.json`）はgitignore済み。

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
- [x] **回帰分析（線形回帰）** — 単回帰 / 重回帰（共変量調整）。statsmodels OLS、偏回帰係数+95%CI+標準化係数、R²/調整済みR²/F検定、欠損リストワイズ除外、結果の日本語解釈
- [x] **回帰分析（ロジスティック回帰）** — 2値アウトカム。statsmodels Logit、オッズ比(OR)+95%CI、McFadden擬似R²/尤度比検定、完全分離の検出、結果の日本語解釈
- [x] **回帰分析（ポアソン回帰・GLM）** — カウントアウトカム。statsmodels GLM(Poisson)、発生率比(IRR)+95%CI、McFadden擬似R²/尤度比検定/逸脱度、結果の日本語解釈
- [x] **回帰分析（混合効果モデル・線形混合モデル）** — 患者IDなど繰り返し測定・クラスタリングの単位をランダム切片で調整。statsmodels MixedLM（REML、Wald z検定）、固定効果係数+95%CI、群間分散/残差分散/ICC（群内相関係数）、結果の日本語解釈。ランダム切片のみに対応（ランダム傾きは未対応）
- [x] **反復測定分散分析** — 同一対象3条件以上（対応あり一元配置ANOVA）。statsmodels AnovaRM、F/自由度/p・各条件平均、完全ケースのみ使用、結果の日本語解釈
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
- [x] **グラフ編集パネル** — グラフ描画後にタイトル・X/Y軸ラベル・軸範囲・凡例表示/非表示・凡例位置をリアルタイム編集。変更はPlotlyグラフに即時反映し、論文用export（matplotlib）にも反映される
  - **直接編集モード** — Plotlyの`editable`を有効化し、グラフ上の文字をダブルクリック編集。タイトル・凡例・注釈はドラッグ移動可（軸タイトルはPlotly仕様でドラッグ不可のため位置はフォームの「軸ラベル位置」で指定）。編集結果は`onRelayout`でフォーム状態へ戻り、exportにも反映
  - **タイトル表示ON/OFF** — 論文＝オフ（キャプション運用）／スライド＝オンの分岐点
  - **軸ラベルの文字サイズ・位置** — X/Y軸ラベルのフォントサイズと軸からの距離を指定（画面=Plotly `title.font.size`/`standoff`／export=matplotlib `fontsize`/`labelpad`）。軸ラベルは空欄で消去可能
  - **目盛り間隔** — X（数値軸グラフのみ）・Y軸のmajor tick間隔を指定
  - **データ値ラベル** — 棒グラフの各バーに数値を表示（画面=Plotly text／export=matplotlib `ax.bar_label`）
  - **サブタイトル** — 大見出しを左寄せ太字にし、その下にグレーの説明文（参考画像のレポート体裁）
  - **背景色** — 透過（論文・Word向け）／白／クリーム（スライド向け）を選択。画面・export両対応で、明色地でも文字・軸色が読めるよう調整。export専用の透過/白トグルは廃止し本設定に一本化
  - **一画面編集UI** — グラフを`sticky`固定し、右サイドバーを折りたたみセクション（テキスト/軸/スタイル/出力・エクスポート、`EditSection`）に整理。スクロール往復を排除。各セクションは初期状態で全て閉じる（`defaultOpen`なし）。右サイドバーはデスクトップ幅で`sticky`+`max-h-[calc(100vh-3rem)]`+`overflow-y-auto`とし、グラフ本体を固定したままサイドバーのみ独立スクロール
  - **編集⇄最終出力トグル** — 同じグラフ枠で「編集(Plotly)」と「最終出力(matplotlib 300dpi実画像)」を切替。別枠プレビューは廃止。出力（フォント/用途/形式/ダウンロード）もサイドバーに集約
  - ※論文モード（Okabe-Ito・装飾最小・透過）とスライドモード（カード地・大見出し・値ラベル）の2系統を想定して設計

### 研究ワークフロー・追加機能

- [x] **Table 1 自動生成** — 連続変数（mean±SD / median(IQR)）+ カテゴリ変数（n(%)）、TSVコピー対応
- [x] Table 1 の群間比較指標 — 標準化平均差（SMD、2群時）を絶対値（非負の効果量）で既定表示・p値は既定オフ（背景特性表でのp値は非推奨のため）
- [x] Table 1 の変数別欠損数・群分け列の除外数表示
- [x] **多重比較（事後検定）** — Tukey HSD / Bonferroni / Holm（パラメトリック）/ Dunn + Holm（ノンパラメトリック）
- [x] **棒グラフ** — エラーバー付き（SD / SEM / 95%CI 切り替え）
- [x] **カプランマイヤー曲線** — 打ち切りマーク・95%CIバンド・リスクテーブル・ログランク検定p値
- [x] **ROC曲線** — AUC + 95%CI（Hanley & McNeil 1982）・最適カットオフ（Youden指数）・感度/特異度表示
- [x] **CSVデータのページ間共有** — `DataContext`（React Context + sessionStorage、明示的オプトイン時のみlocalStorage）でアップロード済みCSV/Excelを保持し、記述統計・検定・反復測定ANOVA・回帰分析（線形/ロジスティック/ポアソン）・グラフ（全7種）・Table 1 の各ページで「CSVから選択」⇄「手入力」を切り替え可能
- [x] **レスポンシブUI** — モバイルヘッダー・ドロワーナビ、フォーム縦積み、結果カード・操作行の折り返し、表の横スクロール対応
- [x] **主要ワークフローE2Eテスト** — Playwrightで手入力記述統計、CSV読込 → 対応あり検定 → グラフ引き継ぎ、モバイルナビを検証

## 次の開発候補

- [ ] Supabase Auth 認証（ログインページ UI は完成済み、Auth 接続が未実装）
- [ ] 分析履歴・再実行可能な設定JSON・解析パッケージ出力
- [ ] 回帰分析の拡張 — 混合効果モデルのランダム傾き対応・他のGLM族（線形 / ロジスティック / ポアソン・反復測定ANOVA・混合効果モデル[ランダム切片]は実装済み）
- [ ] アクセシビリティ監査・E2Eテスト対象の拡張
  - フォームの `label` と `input` / `select` の関連付け（`htmlFor` / `id`）を含む

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
POST /api/test/repeated-anova  # 反復測定一元配置ANOVA（対応あり3条件以上）

POST /api/table1               # Table 1 生成

POST /api/regression/linear    # 線形回帰（単回帰 / 重回帰・共変量調整）
POST /api/regression/logistic  # ロジスティック回帰（オッズ比 + 95%CI）
POST /api/regression/poisson   # ポアソン回帰（発生率比 IRR + 95%CI）
POST /api/regression/mixed     # 混合効果モデル（ランダム切片付き線形混合モデル）
```

---

## 開発上の注意

1. **日本語を優先** — エラーメッセージ・結果解釈・UIテキストはすべて日本語
2. **グラフは妥協しない** — デザイン仕様から逸脱しない。テーマファイルを必ず使う
3. **計算は必ずテストを書く** — `backend/tests/` に既知の答えで検証（現在204テスト）
4. **型安全** — TypeScript / Pydantic を徹底する
5. **コメディカル視点** — 医療統計初学者が迷わない設計を常に意識する
6. **高速起動を維持** — 本番ランタイムで不要な依存・不要なimport・不要なAPIドキュメント生成を避ける
7. **誤解析を防ぐ** — 変数役割、解析使用数、欠損除外理由、推定対象を結果と一緒に示す
8. **データ保護を既定値にする** — アップロードデータは標準でタブ内のみ保持し、端末保存は明示的な選択時だけ許可する
9. **Notion報告** — CLAUDE.mdを更新したら変更内容を3行以内で日本語にまとめ、Notion MCPで以下のページの「次アクション」フィールドに追記する。フォーマット: `[YYYY-MM-DD] {変更内容の要約}` / page_id: `08e96ff6-653e-4c4c-a0a5-0fd874d8bb95`

## ローカル開発

```bash
# バックエンド起動
STATSEED_ENABLE_SCIPY=1 /home/haru/dev/statseed/.venv/bin/uvicorn backend.main:app --reload

# フロントエンド起動
cd frontend && npm run dev

# フロントエンドは同一オリジンの /api/* を呼び、Next.js rewrite がバックエンドへ転送する。
# バックエンドURLを変える場合は Next.js 起動時に API_URL を指定する。
cd frontend && API_URL=http://localhost:8000 npm run dev

# テスト実行
STATSEED_ENABLE_SCIPY=1 /home/haru/dev/statseed/.venv/bin/pytest backend/tests/ -v

# フルスタックE2Eテスト（Next.js / FastAPI はPlaywrightが自動起動）
cd frontend && npm run test:e2e
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

### ランディングページ
- 構成は **ヒーロー → 3つの価値軸 → 対応手法マーキー → 3ステップ → 解析画面プレビュー → CTA** とする
- ヒーローは短く強いコピー、大きな余白、統計グラフを想起させる背景でプロダクトの用途を即座に伝える
- プロダクトコンセプトは **「臨床研究に、やさしい統計を。」** とし、**信頼できる計算・理解しやすい結果・伝わる美しいグラフ**を価値の軸とする
- ヒーローの主要CTAは空のダッシュボードではなく、具体的な開始地点であるデータ読み込みへつなぐ
- 対応手法は2段のカードを左右互い違いにゆっくり流し、ホバー時は停止する
- `prefers-reduced-motion: reduce` ではマーキーを停止し、モバイルでも内容を読める静的表示にする
- 絵文字を主要アイコンに使わず、簡潔なSVG・グラフ・解析結果のプレビューで機能を見せる
- ヘッダーにはデスクトップ・モバイルともにダーク / ライト切り替えを表示する

### ダッシュボードホーム
- 開発状況・API数・技術スタックではなく、利用者が最初に選ぶ操作を表示する
- 主要導線は **データを読み込む / 解析方法を選ぶ / 手入力で解析する** の3つとする
- 解析機能は統計手法名だけでなく、「データを要約」「要因を調べる」など目的から選べる表現にする

### フォント
- **Inter** — `next/font/google` で読み込み（UI クロム・ラテン文字担当）
- **LINESeed JP** — `next/font/local` でローカル読み込み（日本語コンテンツ担当、woff2 × 4ウェイト）
- フォントスタック: `Inter → LINESeed JP → Noto Sans JP`
- フォントファイル: `frontend/public/fonts/line-seed-jp/`
- CSS 変数: `--font-inter` / `--font-line-seed-jp`

### フォントサイズ体系（px）

ランディングページは下表のサイズを使用する。ダッシュボード（トップページ以外の全ページ・共通コンポーネント）はPC画面での視認性を優先し、約1.2倍に拡大したサイズを使用する。

| 用途 | ランディング | ダッシュボード |
|------|------|--------|
| セクションラベル（uppercase） | 11px | 13px |
| 補助テキスト・説明文 | 12–13px | 14–16px |
| 本文・フォーム | 13px | 16px |
| 小見出し | 14–15px | 17–18px |
| ページタイトル | 20px | 24px |
| ヒーロー見出し | 40px | — |

- ダッシュボードホームの大見出し（「何から始めますか？」）のみ 31px（26pxの1.2倍）
- サイドバーのナビゲーションアイコン・ロゴ画像も同率（13px→16px、20px→24px、22px→26px）で拡大しバランスを保つ

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
- ラベルは初心者が目的から選べる**日本語**とし、**はじめる → 解析する → 仕上げる**の作業順で並べる
- 統計用語だけを項目名にせず、「データを要約」「群の差・関連」など操作目的を併記する
- アクティブ項目: `bg-neutral-800 text-white`
- セクションラベル: `text-[13px] uppercase tracking-wider text-neutral-600`
- アイコン: 16px SVG ストローク（`stroke="currentColor"` `strokeWidth={1.75}`）

### ログインページ
- `/login` — Vercel 風センタードカード
- OAuth: "Continue with GitHub" / "Continue with Google"
- メール magic link 対応（Supabase Auth 未接続、UI のみ）

### アイコン
- **sana2.png** — クラゲ猫ロゴ（757×757px、余白トリミング済み）
- 表示時は `overflow-hidden` + `object-cover` でフレームいっぱいに
- サイドバートップ・ランディング・ログインページで使用
- ガイドページの選択肢: SVG ストロークアイコン（絵文字ではない）
