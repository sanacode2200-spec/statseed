# サンプルデータ

Statseed のデータ読み込み画面からアップロードして利用できます。

| ファイル | 行数 | 主な用途 |
|---|---:|---|
| `01_rehab_pre_post.csv` | 40 | 対応あり検定、群間比較 |
| `02_pain_3groups.csv` | 45 | 3群比較、箱ひげ図 |
| `03_outcome_categorical.csv` | 60 | カテゴリ集計、カイ二乗検定 |
| `04_grip_walk_correlation.csv` | 50 | 相関、散布図 |
| `05_survival_followup.csv` | 50 | Kaplan-Meier曲線 |
| `06_roc_diagnostic.csv` | 50 | ROC曲線 |
| `07_histogram_large_normal.csv` | 600 | 滑らかな単峰型ヒストグラム、記述統計 |
| `08_histogram_bimodal_walk.csv` | 500 | 二峰性ヒストグラム、群別箱ひげ図 |
| `09_treatment_3groups_large.csv` | 360 | ANOVA、Kruskal-Wallis検定、箱ひげ図 |
| `10_rehab_pre_post_large.csv` | 250 | 対応あり検定、介入前後比較 |
| `11_correlation_large.csv` | 400 | 相関、散布図 |
| `12_categorical_outcomes_large.csv` | 450 | カイ二乗検定、Table 1 |

ヒストグラムを確認する場合は、まず `07_histogram_large_normal.csv` の `BMI` または
`収縮期血圧_mmHg` を選択してください。分布の山が複数ある例は
`08_histogram_bimodal_walk.csv` の `歩行速度_m_s` で確認できます。
