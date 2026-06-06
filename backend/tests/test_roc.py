import pytest
from pydantic import ValidationError

from backend.schemas.graph import ROCRequest
from backend.services.graph.roc import compute_roc
from backend.services.graph.plotly_charts import roc_figure


# ── compute_roc ───────────────────────────────────────────────────────────────

def test_perfect_classifier_auc_is_one() -> None:
    scores = [0.9, 0.8, 0.2, 0.1]
    labels = [1, 1, 0, 0]
    result = compute_roc(scores, labels)
    assert result.auc == pytest.approx(1.0)


def test_random_classifier_auc_near_half() -> None:
    # Alternating gives AUC close to 0.5
    scores = list(range(10, 0, -1))
    labels = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    result = compute_roc(scores, labels)
    assert 0.4 <= result.auc <= 0.6


def test_roc_fpr_tpr_start_at_zero() -> None:
    result = compute_roc([0.9, 0.8, 0.7, 0.2, 0.1], [1, 1, 0, 0, 1])
    assert result.fpr[0] == pytest.approx(0.0)
    assert result.tpr[0] == pytest.approx(0.0)


def test_roc_fpr_tpr_end_at_one() -> None:
    result = compute_roc([0.9, 0.8, 0.7, 0.2, 0.1], [1, 1, 0, 0, 1])
    assert result.fpr[-1] == pytest.approx(1.0)
    assert result.tpr[-1] == pytest.approx(1.0)


def test_roc_optimal_threshold_maximizes_youden() -> None:
    scores = [0.9, 0.8, 0.4, 0.2, 0.1]
    labels = [1, 1, 0, 0, 0]
    result = compute_roc(scores, labels)
    # score >= 0.8 を陽性とすると TPR=1.0, FPR=0.0 → Youden=1.0
    assert result.optimal_threshold == pytest.approx(0.8)
    assert result.optimal_tpr == pytest.approx(1.0)
    assert result.optimal_fpr == pytest.approx(0.0)


def test_roc_coordinates_match_each_threshold() -> None:
    scores = [0.9, 0.8, 0.8, 0.2]
    labels = [1, 0, 1, 0]
    result = compute_roc(scores, labels)

    for threshold, fpr, tpr in zip(
        result.thresholds[1:], result.fpr[1:], result.tpr[1:]
    ):
        predicted = [score >= threshold for score in scores]
        assert tpr == pytest.approx(
            sum(pred and label == 1 for pred, label in zip(predicted, labels)) / 2
        )
        assert fpr == pytest.approx(
            sum(pred and label == 0 for pred, label in zip(predicted, labels)) / 2
        )


def test_roc_ci_within_bounds() -> None:
    scores = [0.9, 0.8, 0.7, 0.3, 0.2, 0.1]
    labels = [1, 1, 0, 0, 0, 1]
    result = compute_roc(scores, labels)
    assert 0.0 <= result.auc_ci_lower <= result.auc <= result.auc_ci_upper <= 1.0


def test_roc_raises_when_only_one_class() -> None:
    with pytest.raises(ValueError, match="陽性例と陰性例"):
        compute_roc([0.9, 0.8, 0.7], [1, 1, 1])


# ── schema validation ─────────────────────────────────────────────────────────

def test_roc_schema_rejects_length_mismatch() -> None:
    with pytest.raises(ValidationError, match="長さが一致しません"):
        ROCRequest(scores=[0.9, 0.8, 0.7, 0.6], labels=[1, 0, 1, 0, 1])


def test_roc_schema_rejects_invalid_label() -> None:
    with pytest.raises(ValidationError, match="0.*1"):
        ROCRequest(scores=[0.9, 0.8, 0.7, 0.5], labels=[1, 0, 2, 1])


# ── roc_figure ────────────────────────────────────────────────────────────────

def test_roc_figure_returns_plotly_and_response() -> None:
    req = ROCRequest(scores=[0.9, 0.8, 0.3, 0.2], labels=[1, 1, 0, 0])
    fig, stats = roc_figure(req)
    assert len(fig.data) == 3  # diagonal + ROC + optimal point
    assert "AUC" in stats.interpretation
    assert stats.auc == pytest.approx(1.0)
