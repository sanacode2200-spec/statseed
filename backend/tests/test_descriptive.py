import math

from backend.schemas.descriptive import DescriptiveRequest
from backend.services.stats.descriptive import summarize_continuous


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
