# StatSeed 完全マニュアル

コメディカル（PT / OT / ST / 看護師 / 臨床検査技師など）のための医療統計アプリ
**StatSeed** の使い方マニュアルです。各ページはスクリーンショット付きで、検定の選び方から
結果の読み方、つまずきやすいポイントまでをやさしく解説します。

> このマニュアルのスクリーンショットと Markdown は `scripts/capture-full-manual.ts` と
> `scripts/generate-manual.ts` で自動生成されています。

## 目次

### はじめに
- [00. データの読み込みと基本操作](./00-getting-started.md)

### 統計検定（全10種）
- [01. Welch の t 検定（独立2群の平均）](./01-welch.md)
- [02. 対応のある t 検定（前後比較）](./02-paired-t.md)
- [03. Mann–Whitney U 検定（順位で2群）](./03-mannwhitney.md)
- [04. Wilcoxon 符号順位検定（対応ありノンパラ）](./04-wilcoxon.md)
- [05. カイ二乗検定（クロス集計の関連）](./05-chisquare.md)
- [06. Fisher 正確検定（少人数のクロス集計）](./06-fisher.md)
- [07. Pearson 相関（直線的な関連）](./07-pearson.md)
- [08. Spearman 相関（順位による関連）](./08-spearman.md)
- [09. 一元配置 ANOVA（3群以上の平均）](./09-anova.md)
- [10. 重回帰分析（複数要因で予測・調整）](./10-regression.md)

### グラフ
- [11. グラフ編集（論文・スライド品質に仕上げる）](./11-graph-editing.md)
- [12. 出力・エクスポート（PNG / SVG / PDF）](./12-export.md)

## 検定の選び方早見表

| やりたいこと | データの種類 | 使う検定 |
|--------------|--------------|----------|
| 別々の2群の平均を比べる | 連続・正規分布 | [Welch の t 検定](./01-welch.md) |
| 同じ人の前後を比べる | 連続・正規分布 | [対応のある t 検定](./02-paired-t.md) |
| 別々の2群を比べる | 非正規・順序 | [Mann–Whitney U](./03-mannwhitney.md) |
| 同じ人の前後を比べる | 非正規・順序 | [Wilcoxon](./04-wilcoxon.md) |
| 割合・人数を比べる | カテゴリ（十分な数） | [カイ二乗検定](./05-chisquare.md) |
| 割合・人数を比べる | カテゴリ（少人数） | [Fisher 正確検定](./06-fisher.md) |
| 2つの数値の関連を見る | 連続・直線的 | [Pearson 相関](./07-pearson.md) |
| 2つの数値の関連を見る | 非線形・順序 | [Spearman 相関](./08-spearman.md) |
| 3群以上の平均を比べる | 連続 | [一元配置 ANOVA](./09-anova.md) |
| 複数要因で予測・調整する | 連続アウトカム | [重回帰分析](./10-regression.md) |

