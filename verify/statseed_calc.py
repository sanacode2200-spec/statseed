"""
StatSeed verification: call StatSeed's ACTUAL backend functions
(backend.services.stats.hypothesis / regression) on the shared datasets,
so the comparison reflects the real production code path, not a generic
scipy reimplementation.
"""
import json
import os
import sys
from pathlib import Path

import pandas as pd

STATSEED_PATH = os.environ.get("STATSEED_PATH", str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, STATSEED_PATH)

from backend.schemas.test import (  # noqa: E402
    ChiSquareRequest,
    CorrelationRequest,
    MultiGroupRequest,
    PairedRequest,
    TwoGroupRequest,
)
from backend.schemas.regression import LinearRegressionRequest, Predictor  # noqa: E402
from backend.services.stats import hypothesis as h  # noqa: E402
from backend.services.stats import regression as reg  # noqa: E402

DATA = os.path.join(os.path.dirname(__file__), "data")
results = {}

# 1. Welch's t-test
df = pd.read_csv(f"{DATA}/two_groups.csv")
a = df.loc[df.group == "A", "value"].tolist()
b = df.loc[df.group == "B", "value"].tolist()
res = h.run_ttest_ind(TwoGroupRequest(variable_name="value", group_a=a, group_b=b, group_a_name="A", group_b_name="B"))
results["welch_t"] = {"statistic": res.statistic, "p_value": res.p_value}

# 2. Paired t-test (before=pre, after=post)
dfp = pd.read_csv(f"{DATA}/paired.csv")
pre = dfp["pre"].tolist()
post = dfp["post"].tolist()
res = h.run_ttest_paired(PairedRequest(variable_name="value", before=pre, after=post))
results["paired_t"] = {"statistic": res.statistic, "p_value": res.p_value}

# 3. Mann-Whitney U
res = h.run_mannwhitney(TwoGroupRequest(variable_name="value", group_a=a, group_b=b, group_a_name="A", group_b_name="B"))
results["mannwhitney_u"] = {"statistic": res.statistic, "p_value": res.p_value}

# 4. Wilcoxon signed-rank
res = h.run_wilcoxon(PairedRequest(variable_name="value", before=pre, after=post))
results["wilcoxon"] = {"statistic": res.statistic, "p_value": res.p_value}

# 5. Chi-square
chisq_df = pd.read_csv(f"{DATA}/chisq_table.csv", index_col=0)
res = h.run_chisquare(ChiSquareRequest(observed=chisq_df.values.tolist()))
results["chi_square"] = {"statistic": res.statistic, "p_value": res.p_value}

# 6. Fisher's exact test
fisher_df = pd.read_csv(f"{DATA}/fisher_table.csv", index_col=0)
res = h.run_fisher(ChiSquareRequest(observed=fisher_df.values.tolist()))
results["fisher_exact"] = {"statistic": res.statistic, "p_value": res.p_value}

# 7,8. Pearson / Spearman
corr_df = pd.read_csv(f"{DATA}/correlation.csv")
x = corr_df["x"].tolist()
y = corr_df["y"].tolist()
res = h.run_correlation(CorrelationRequest(variable_x_name="x", variable_y_name="y", x=x, y=y, method="pearson"))
results["pearson"] = {"statistic": res.r, "p_value": res.p_value}
res = h.run_correlation(CorrelationRequest(variable_x_name="x", variable_y_name="y", x=x, y=y, method="spearman"))
results["spearman"] = {"statistic": res.r, "p_value": res.p_value}

# 9. ANOVA
anova_df = pd.read_csv(f"{DATA}/anova.csv")
groups = [g["value"].tolist() for _, g in anova_df.groupby("group")]
res = h.run_anova(MultiGroupRequest(variable_name="value", groups=groups, group_names=None))
results["anova"] = {"statistic": res.statistic, "p_value": res.p_value}

# 10. Multiple regression
reg_df = pd.read_csv(f"{DATA}/regression.csv")
req = LinearRegressionRequest(
    outcome_name="y",
    outcome=reg_df["y"].tolist(),
    predictors=[
        Predictor(name="x1", values=reg_df["x1"].tolist()),
        Predictor(name="x2", values=reg_df["x2"].tolist()),
        Predictor(name="x3", values=reg_df["x3"].tolist()),
    ],
)
res = reg.run_linear_regression(req)
coefs = {c.name: c.coef for c in res.coefficients}
coef_p = {c.name: c.p_value for c in res.coefficients}
results["regression"] = {
    "f_statistic": res.f_statistic,
    "f_p_value": res.f_pvalue,
    "r_squared": res.r_squared,
    "coefficients": {"Intercept" if k == "（切片）" else k: v for k, v in coefs.items()},
    "coef_p_values": {"Intercept" if k == "（切片）" else k: v for k, v in coef_p.items()},
}

out_path = os.path.join(os.path.dirname(__file__), "statseed_results.json")
with open(out_path, "w") as f:
    json.dump(results, f, indent=2, default=float)

print(f"Wrote {out_path}")
print(json.dumps(results, indent=2, default=float))
