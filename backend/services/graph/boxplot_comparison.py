from backend.schemas.graph import (
    BoxplotComparisonResult,
    BoxplotPairComparison,
    BoxplotRequest,
)
from backend.schemas.test import MultiGroupRequest, PosthocRequest, TwoGroupRequest
from backend.services.stats.hypothesis import (
    run_anova,
    run_kruskal,
    run_mannwhitney,
    run_posthoc,
    run_ttest_ind,
)


def compute_boxplot_comparison(request: BoxplotRequest) -> BoxplotComparisonResult | None:
    if not request.show_comparison:
        return None

    names = request.group_names or [f"群{i + 1}" for i in range(len(request.groups))]
    if len(request.groups) == 2:
        test_request = TwoGroupRequest(
            variable_name=request.y_label or "変数",
            group_a=request.groups[0],
            group_b=request.groups[1],
            group_a_name=names[0],
            group_b_name=names[1],
        )
        result = (
            run_ttest_ind(test_request)
            if request.comparison_method == "parametric"
            else run_mannwhitney(test_request)
        )
        return BoxplotComparisonResult(
            method=result.test_name,
            effect_size=result.effect_size,
            effect_size_label=result.effect_size_label,
            pairs=[
                BoxplotPairComparison(
                    group_a=names[0],
                    group_b=names[1],
                    p_value=result.p_value,
                    significant=result.p_value < 0.05,
                )
            ],
            note="2群を直接比較しています。p値は両側検定です。",
        )

    omnibus_request = MultiGroupRequest(
        variable_name=request.y_label or "変数",
        groups=request.groups,
        group_names=names,
    )
    if request.comparison_method == "parametric":
        omnibus = run_anova(omnibus_request)
        posthoc = run_posthoc(
            PosthocRequest(
                variable_name=request.y_label or "変数",
                groups=request.groups,
                group_names=names,
                method="tukey",
            )
        )
    else:
        omnibus = run_kruskal(omnibus_request)
        posthoc = run_posthoc(
            PosthocRequest(
                variable_name=request.y_label or "変数",
                groups=request.groups,
                group_names=names,
                method="steel_dwass",
            )
        )

    return BoxplotComparisonResult(
        method=f"{omnibus.test_name} + {posthoc.method}",
        omnibus_p_value=omnibus.p_value,
        effect_size=omnibus.effect_size,
        effect_size_label=omnibus.effect_size_label,
        pairs=[
            BoxplotPairComparison(
                group_a=pair.group_a,
                group_b=pair.group_b,
                p_value=pair.p_adjusted,
                significant=pair.significant,
            )
            for pair in posthoc.pairs
        ],
        note="3群以上のペア比較p値は多重比較補正後の値です。",
    )


def p_value_text(p_value: float) -> str:
    return "p < 0.001" if p_value < 0.001 else f"p = {p_value:.3f}"


def annotated_pairs(result: BoxplotComparisonResult | None) -> list[BoxplotPairComparison]:
    if result is None:
        return []
    # ペア数が少ない（2群=1ペア / 3群=3ペア）ときは、有意・非有意を問わず
    # 全ペアのp値をブラケット表示する。論文では通常このペアごとの比較が必要なため。
    if len(result.pairs) <= 3:
        return list(result.pairs)
    # 4群以上はペアが多すぎてブラケットが重なるため、有意なペアを優先表示（最大3）。
    # 有意ペアが無い場合は overall_fallback_label が全体検定p値を代わりに示す。
    significant = sorted(
        (pair for pair in result.pairs if pair.significant),
        key=lambda pair: pair.p_value,
    )
    return significant[:3]


def overall_fallback_label(result: BoxplotComparisonResult | None) -> str | None:
    """4群以上でどのペアも有意でなくブラケットを表示しないとき、全体検定のp値を代わりに示すラベル。

    3群以下では annotated_pairs が全ペアのp値を返すため、このフォールバックは使われない。
    """
    if (
        result is None
        or result.omnibus_p_value is None
        or len(result.pairs) <= 3
        or any(pair.significant for pair in result.pairs)
    ):
        return None
    return f"全体 {p_value_text(result.omnibus_p_value)}（有意差なし）"
