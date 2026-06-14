from backend.schemas.guide import GuideRequest
from backend.services.guide import suggest


def test_ttest_suggested_for_normal_two_unpaired() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=2, paired=False, normal="yes")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/ttest"
    assert res.suggestions[0].confidence == "推奨"


def test_mannwhitney_suggested_for_nonnormal_two_unpaired() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=2, paired=False, normal="no")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/mannwhitney"
    assert res.suggestions[0].confidence == "推奨"


def test_paired_ttest_suggested_for_normal_paired() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=2, paired=True, normal="yes")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/ttest-paired"


def test_wilcoxon_suggested_for_nonnormal_paired() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=2, paired=True, normal="no")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/wilcoxon"


def test_anova_suggested_for_normal_multigroup() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=3, normal="yes")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/anova"


def test_kruskal_suggested_for_nonnormal_multigroup() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=3, normal="no")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/kruskal"


def test_fisher_suggested_for_categorical() -> None:
    req = GuideRequest(purpose="compare", data_type="categorical")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/fisher"


def test_pearson_suggested_for_normal_correlate() -> None:
    req = GuideRequest(purpose="correlate", normal="yes")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/correlation"
    assert "Pearson" in res.suggestions[0].test_name


def test_spearman_suggested_for_nonnormal_correlate() -> None:
    req = GuideRequest(purpose="correlate", normal="no")
    res = suggest(req)
    assert "Spearman" in res.suggestions[0].test_name


def test_always_has_summary() -> None:
    for purpose in ("compare", "correlate"):
        req = GuideRequest(purpose=purpose)  # type: ignore[arg-type]
        res = suggest(req)
        assert res.summary != ""


def test_unknown_normal_defaults_to_nonparametric() -> None:
    req = GuideRequest(purpose="compare", data_type="continuous", n_groups=2, paired=False, normal="unknown")
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/mannwhitney"


def test_mean_estimand_prioritizes_welch_when_normality_unknown() -> None:
    req = GuideRequest(
        purpose="compare",
        data_type="continuous",
        n_groups=2,
        paired=False,
        normal="unknown",
        estimand="mean",
    )
    res = suggest(req)
    assert res.suggestions[0].endpoint == "/api/test/ttest"
