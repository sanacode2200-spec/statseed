"""
StatSeed verification: compare python_results.json vs r_results.json.
Flags PASS / DIFF / METHOD_DIFF (known differing-method cases) for each test.
"""
import json
import os
import sys

BASE = os.path.dirname(__file__)
py_file = sys.argv[1] if len(sys.argv) > 1 else "python_results.json"
r_file = sys.argv[2] if len(sys.argv) > 2 else "r_results.json"
py = json.load(open(f"{BASE}/{py_file}"))
r = json.load(open(f"{BASE}/{r_file}"))

TOL = 1e-3  # relative tolerance for "PASS"

# Known cases where scipy and R use different estimators/algorithms by default,
# so a numeric mismatch is EXPECTED, not a bug -- but worth surfacing.
METHOD_NOTES = {
    "mannwhitney_u": "p値: scipyはmethod='auto'で小標本+tieなしの場合exact法、Rはexact=FALSE指定で正規近似。揃えるならscipyに method='asymptotic' を指定。",
    "wilcoxon": "統計量の定義が違う(W vs V、W+V=n(n+1)/2で相互変換可)。p値もscipy=exact法、R=asymptotic(exact=FALSE)。揃えるならscipyに mode='approx', correction=False。",
    "fisher_exact": "オッズ比の推定法が違う(scipy=標本オッズ比, R=条件付きMLE)。p値はexact法同士で一致。",
    "spearman": "p値の算出法が違う(scipy=t分布近似, Rはn<1290かつtieなしでAS89による正確法)。",
}


def rel_diff(a, b):
    if a == b:
        return 0.0
    denom = max(abs(a), abs(b), 1e-12)
    return abs(a - b) / denom


def compare_value(label, a, b, report):
    d = rel_diff(a, b)
    status = "PASS" if d <= TOL else "DIFF"
    report.append(f"  {label:18s} python={a!r:<24} R={b!r:<24} rel_diff={d:.2e} -> {status}")
    return status


print("=" * 70)
print("StatSeed統計計算 検証レポート (scipy/statsmodels vs R)")
print("=" * 70)

summary = []
for test in py:
    report = []
    statuses = []
    py_t = py[test]
    r_t = r[test]

    for key in py_t:
        if key in ("coefficients", "coef_p_values"):
            for coef_name, py_val in py_t[key].items():
                r_key = "(Intercept)" if coef_name == "Intercept" else coef_name
                if r_key in r_t.get(key, {}):
                    statuses.append(compare_value(f"{key}.{coef_name}", py_val, r_t[key][r_key], report))
            continue
        if key in r_t:
            statuses.append(compare_value(key, py_t[key], r_t[key], report))

    note = METHOD_NOTES.get(test)
    overall = "PASS" if all(s == "PASS" for s in statuses) else ("METHOD_DIFF" if note else "DIFF")
    summary.append((test, overall))

    print(f"\n[{test}]  => {overall}")
    for line in report:
        print(line)
    if note:
        print(f"  NOTE: {note}")

print("\n" + "=" * 70)
print("サマリー")
print("=" * 70)
for test, overall in summary:
    print(f"  {test:18s} {overall}")
