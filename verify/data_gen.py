"""
StatSeed verification: shared dummy data generator.
Generates fixed-seed datasets so Python (StatSeed/scipy side) and R (reference side)
compute statistics on identical inputs.
"""
import numpy as np
import pandas as pd
import os
from pathlib import Path

OUT = str(Path(__file__).resolve().parent / "data")
os.makedirs(OUT, exist_ok=True)

rng = np.random.default_rng(42)

# 1,3: Welch's t-test / Mann-Whitney U -> two independent groups, unequal n & variance
group_a = rng.normal(loc=50, scale=8, size=18)
group_b = rng.normal(loc=55, scale=14, size=22)
pd.DataFrame({
    "value": np.concatenate([group_a, group_b]),
    "group": ["A"] * len(group_a) + ["B"] * len(group_b),
}).to_csv(f"{OUT}/two_groups.csv", index=False)

# 2,4: Paired t-test / Wilcoxon signed-rank -> pre/post on same subjects
n_pair = 20
pre = rng.normal(loc=60, scale=10, size=n_pair)
post = pre + rng.normal(loc=3, scale=5, size=n_pair)  # slight improvement + noise
pd.DataFrame({"pre": pre, "post": post}).to_csv(f"{OUT}/paired.csv", index=False)

# 5: Chi-square test of independence -> 2x3 contingency table
chisq_table = np.array([
    [30, 14, 6],
    [12, 22, 18],
])
pd.DataFrame(chisq_table, columns=["Cat1", "Cat2", "Cat3"], index=["RowA", "RowB"]).to_csv(f"{OUT}/chisq_table.csv")

# 6: Fisher's exact test -> 2x2 contingency table (small counts)
fisher_table = np.array([
    [8, 2],
    [3, 9],
])
pd.DataFrame(fisher_table, columns=["Outcome+", "Outcome-"], index=["Exposed", "Unexposed"]).to_csv(f"{OUT}/fisher_table.csv")

# 7,8: Pearson / Spearman correlation
n_corr = 30
x = rng.normal(loc=100, scale=15, size=n_corr)
y = 0.6 * x + rng.normal(loc=0, scale=10, size=n_corr)
pd.DataFrame({"x": x, "y": y}).to_csv(f"{OUT}/correlation.csv", index=False)

# 9: One-way ANOVA -> 3 groups
n_per = 12
g1 = rng.normal(loc=20, scale=4, size=n_per)
g2 = rng.normal(loc=24, scale=4, size=n_per)
g3 = rng.normal(loc=27, scale=4, size=n_per)
pd.DataFrame({
    "value": np.concatenate([g1, g2, g3]),
    "group": ["G1"] * n_per + ["G2"] * n_per + ["G3"] * n_per,
}).to_csv(f"{OUT}/anova.csv", index=False)

# 10: Multiple regression -> y ~ x1 + x2 + x3
n_reg = 50
x1 = rng.normal(loc=50, scale=10, size=n_reg)
x2 = rng.normal(loc=30, scale=5, size=n_reg)
x3 = rng.normal(loc=10, scale=2, size=n_reg)
y_reg = 2.0 + 0.8 * x1 - 1.2 * x2 + 3.5 * x3 + rng.normal(loc=0, scale=5, size=n_reg)
pd.DataFrame({"y": y_reg, "x1": x1, "x2": x2, "x3": x3}).to_csv(f"{OUT}/regression.csv", index=False)

print("Generated datasets in", OUT)
for f in sorted(os.listdir(OUT)):
    print(" -", f)
