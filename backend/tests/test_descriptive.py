import math

import pytest
from pydantic import ValidationError

from backend.schemas.descriptive import CategoricalRequest, DescriptiveRequest
from backend.services.stats.descriptive import summarize_categorical, summarize_continuous


def test_summarize_continuous_returns_basic_statistics() -> None:
    request = DescriptiveRequest(variable_name="年齢", values=[20, 22, 24, 26, 28])

    result = summarize_continuous(request)

    assert result.n == 5
    assert result.missing == 0
    assert result.mean == 24
    assert math.isclose(result.sd or 0, 3.1622776601683795)
    assert result.median == 24
    assert result.q1 == 22
    assert result.q3 == 26
    assert result.iqr == 4
    assert result.minimum == 20
    assert result.maximum == 28
    assert result.ci95_low is not None
    assert result.ci95_high is not None
    assert "年齢は平均 24.00" in result.interpretation


def test_summarize_continuous_counts_missing_values() -> None:
    request = DescriptiveRequest(variable_name="握力", values=[10, None, 20, None])

    result = summarize_continuous(request)

    assert result.n == 2
    assert result.missing == 2
    assert "欠損値は2件あります" in result.interpretation


@pytest.mark.parametrize("value", [math.nan, math.inf, -math.inf])
def test_descriptive_rejects_non_finite_values(value: float) -> None:
    with pytest.raises(ValidationError):
        DescriptiveRequest(values=[value])


def test_summarize_categorical_frequency_and_percent() -> None:
    request = CategoricalRequest(
        variable_name="性別",
        values=["男性", "女性", "男性", "男性", "女性"],
    )

    result = summarize_categorical(request)

    assert result.n == 5
    assert result.missing == 0
    labels = {c.label: c for c in result.categories}
    assert labels["男性"].count == 3
    assert math.isclose(labels["男性"].percent, 60.0)
    assert labels["女性"].count == 2
    assert math.isclose(labels["女性"].percent, 40.0)
    assert result.categories[0].label == "男性"  # sorted by count desc
    assert "男性" in result.interpretation
    assert "60.0" in result.interpretation


def test_summarize_categorical_counts_missing() -> None:
    request = CategoricalRequest(
        variable_name="診断名",
        values=["脳梗塞", None, "骨折", "NA", "脳梗塞"],
    )

    result = summarize_categorical(request)

    assert result.n == 3
    assert result.missing == 2
    assert "欠損値は2件あります" in result.interpretation


def test_summarize_categorical_single_category() -> None:
    request = CategoricalRequest(variable_name="群", values=["A", "A", "A"])

    result = summarize_categorical(request)

    assert result.n == 3
    assert len(result.categories) == 1
    assert result.categories[0].percent == 100.0
