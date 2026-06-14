from backend.schemas.guide import GuideRequest, GuideResponse, SuggestedTest


def suggest(req: GuideRequest) -> GuideResponse:
    if req.purpose == "correlate":
        return _correlate(req)
    if req.data_type == "categorical":
        return _categorical(req)
    return _continuous(req)


# --- 相関 ---

def _correlate(req: GuideRequest) -> GuideResponse:
    if req.normal == "yes":
        return GuideResponse(
            suggestions=[
                SuggestedTest(
                    test_name="Pearson積率相関係数",
                    endpoint="/api/test/correlation",
                    confidence="推奨",
                    reason="正規分布に従う2変数の線形相関を定量化します。95%信頼区間も計算できます。",
                ),
                SuggestedTest(
                    test_name="Spearman順位相関係数",
                    endpoint="/api/test/correlation",
                    confidence="代替案",
                    reason="正規性の仮定が厳密でない場合や外れ値がある場合はSpearmanが安定します。",
                ),
            ],
            summary="正規分布に従う連続変数の相関にはPearson相関係数が標準的です。",
        )
    return GuideResponse(
        suggestions=[
            SuggestedTest(
                test_name="Spearman順位相関係数",
                endpoint="/api/test/correlation",
                confidence="推奨",
                reason="正規性が確認できない・外れ値がある・順序尺度のデータに適した順位相関です。",
            ),
            SuggestedTest(
                test_name="Pearson積率相関係数",
                endpoint="/api/test/correlation",
                confidence="代替案",
                reason="線形関係の強さを評価したい場合の選択肢です。",
                caution="散布図で線形性と外れ値を確認してください。",
            ),
        ],
        summary="正規分布が確認できない場合はSpearman順位相関係数が適しています。",
    )


# --- カテゴリ変数 ---

def _categorical(req: GuideRequest) -> GuideResponse:
    return GuideResponse(
        suggestions=[
            SuggestedTest(
                test_name="Fisher正確検定",
                endpoint="/api/test/fisher",
                confidence="推奨",
                reason="2×2分割表で期待度数が5未満のセルがある場合はFisher正確検定が適切です。サンプルサイズが少ない医療研究に向いています。",
                caution="2×2の分割表専用です。3群以上のカテゴリ比較にはχ²検定を使用してください。",
            ),
            SuggestedTest(
                test_name="χ²検定（カイ二乗検定）",
                endpoint="/api/test/chisquare",
                confidence="代替案",
                reason="すべてのセルの期待度数が5以上であればχ²検定を使用できます。2×2以外の表にも対応しています。",
                caution="期待度数が5未満のセルが全体の20%を超える場合はFisher正確検定を推奨します。",
            ),
        ],
        summary="カテゴリ変数の群間比較には分割表を用いた検定を使います。小サンプルではFisher正確検定が安全です。",
    )


# --- 連続変数の比較 ---

def _continuous(req: GuideRequest) -> GuideResponse:
    if req.n_groups == 3:
        return _multigroup(req)
    if req.paired:
        return _paired(req)
    return _twogroup(req)


def _twogroup(req: GuideRequest) -> GuideResponse:
    if req.estimand == "mean" or (req.estimand is None and req.normal == "yes"):
        return GuideResponse(
            suggestions=[
                SuggestedTest(
                    test_name="Welchのt検定（独立2群）",
                    endpoint="/api/test/ttest",
                    confidence="推奨",
                    reason="研究目的である2群の平均値差を推定します。等分散を仮定しないWelch法を用います。",
                    caution="各群の分布、外れ値、平均値差の95%信頼区間を合わせて確認してください。",
                ),
                SuggestedTest(
                    test_name="Mann-Whitney U検定",
                    endpoint="/api/test/mannwhitney",
                    confidence="代替案",
                    reason="正規性が完全に確認できない場合や外れ値が気になる場合の代替です。",
                ),
            ],
            summary="正規分布が確認できる2群の比較にはWelchのt検定が標準的です。",
        )
    return GuideResponse(
        suggestions=[
            SuggestedTest(
                test_name="Mann-Whitney U検定",
                endpoint="/api/test/mannwhitney",
                confidence="推奨",
                reason="正規分布が確認できない・サンプルサイズが小さい・順序尺度のデータに適したノンパラメトリック検定です。",
            ),
            SuggestedTest(
                test_name="Welchのt検定（独立2群）",
                endpoint="/api/test/ttest",
                confidence="代替案",
                reason="平均値差を推定したい場合の選択肢です。",
                caution="強い歪みや外れ値がある場合は、平均値差が研究目的に合うか再確認してください。",
            ),
        ],
        summary="正規分布が確認できない2群の比較にはMann-Whitney U検定が適しています。",
    )


def _paired(req: GuideRequest) -> GuideResponse:
    if req.estimand == "mean" or (req.estimand is None and req.normal == "yes"):
        return GuideResponse(
            suggestions=[
                SuggestedTest(
                    test_name="対応のあるt検定",
                    endpoint="/api/test/ttest-paired",
                    confidence="推奨",
                    reason="同一対象の前後差について、平均変化量を推定します。",
                    caution="元の各時点ではなく、対象ごとの差分の分布と外れ値を確認してください。",
                ),
                SuggestedTest(
                    test_name="Wilcoxon符号順位検定",
                    endpoint="/api/test/wilcoxon",
                    confidence="代替案",
                    reason="差分の正規性が完全に確認できない場合の代替です。",
                ),
            ],
            summary="介入前後など対応のある2群の比較には対応t検定が適しています。",
        )
    return GuideResponse(
        suggestions=[
            SuggestedTest(
                test_name="Wilcoxon符号順位検定",
                endpoint="/api/test/wilcoxon",
                confidence="推奨",
                reason="対応のある2群で正規性が確認できない場合のノンパラメトリック検定です。リハビリの前後比較などに適しています。",
            ),
            SuggestedTest(
                test_name="対応のあるt検定",
                endpoint="/api/test/ttest-paired",
                confidence="代替案",
                reason="平均変化量を推定したい場合の選択肢です。",
                caution="差分に強い歪みや外れ値がある場合は解釈に注意してください。",
            ),
        ],
        summary="正規性が確認できない対応2群にはWilcoxon符号順位検定が適しています。",
    )


def _multigroup(req: GuideRequest) -> GuideResponse:
    if req.estimand == "mean" or (req.estimand is None and req.normal == "yes"):
        return GuideResponse(
            suggestions=[
                SuggestedTest(
                    test_name="一元配置ANOVA",
                    endpoint="/api/test/anova",
                    confidence="推奨",
                    reason="研究目的である3群以上の平均値差を比較します。全体差の後にTukey法などで群間差を確認します。",
                    caution="ANOVA単体では「どの群間に差があるか」は判定できません。多重比較を合わせて行ってください。",
                ),
                SuggestedTest(
                    test_name="Kruskal-Wallis検定",
                    endpoint="/api/test/kruskal",
                    confidence="代替案",
                    reason="正規性が完全に確認できない場合の代替です。",
                ),
            ],
            summary="正規分布が確認できる3群以上の比較には一元配置ANOVAが標準的です。",
        )
    return GuideResponse(
        suggestions=[
            SuggestedTest(
                test_name="Kruskal-Wallis検定",
                endpoint="/api/test/kruskal",
                confidence="推奨",
                reason="正規分布が確認できない3群以上を比較するノンパラメトリック検定です。",
                caution="全体差だけでは群間差を特定できません。Dunn検定（Holm補正）などの多重比較も確認してください。",
            ),
            SuggestedTest(
                test_name="一元配置ANOVA",
                endpoint="/api/test/anova",
                confidence="代替案",
                reason="平均値の差を検討したい場合の代替です。各群の分布、外れ値、分散、サンプルサイズも合わせて確認します。",
                caution="n≥30だけを根拠に選択せず、研究目的とデータの性質に基づいて判断してください。",
            ),
        ],
        summary="正規性が確認できない3群以上の比較にはKruskal-Wallis検定が適しています。",
    )
