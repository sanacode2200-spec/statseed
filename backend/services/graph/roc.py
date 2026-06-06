"""ROC curve computation and AUC with 95%CI (DeLong's method approximation)."""

import math
from dataclasses import dataclass


@dataclass
class ROCResult:
    fpr: list[float]      # false positive rate (1 - specificity)
    tpr: list[float]      # true positive rate (sensitivity)
    thresholds: list[float]
    auc: float
    auc_ci_lower: float
    auc_ci_upper: float
    optimal_threshold: float
    optimal_fpr: float
    optimal_tpr: float
    n_pos: int
    n_neg: int


def compute_roc(scores: list[float], labels: list[int]) -> ROCResult:
    """
    Compute ROC curve and AUC.
    labels: 1 = positive, 0 = negative
    scores: continuous predictor (higher = more likely positive)
    """
    n = len(scores)
    n_pos = sum(labels)
    n_neg = n - n_pos

    if n_pos == 0 or n_neg == 0:
        raise ValueError("陽性例と陰性例の両方が必要です（labels に 0 と 1 が含まれていること）")

    # Sort by score descending
    pairs = sorted(zip(scores, labels), key=lambda x: -x[0])

    # Compute ROC points
    fpr_pts: list[float] = [0.0]
    tpr_pts: list[float] = [0.0]
    thresh_pts: list[float] = [pairs[0][0] + 1.0]  # sentinel above max

    tp = 0
    fp = 0
    prev_score = None

    for score, label in pairs:
        if score != prev_score and prev_score is not None:
            fpr_pts.append(fp / n_neg)
            tpr_pts.append(tp / n_pos)
            thresh_pts.append(score)
        if label == 1:
            tp += 1
        else:
            fp += 1
        prev_score = score

    fpr_pts.append(fp / n_neg)
    tpr_pts.append(tp / n_pos)
    thresh_pts.append(pairs[-1][0] - 1.0)

    # AUC via trapezoidal rule
    auc = _trapz(fpr_pts, tpr_pts)

    # 95%CI via Hanley & McNeil (1982) normal approximation
    q1 = auc / (2 - auc)
    q2 = 2 * auc ** 2 / (1 + auc)
    se_auc = math.sqrt(
        (auc * (1 - auc) + (n_pos - 1) * (q1 - auc ** 2) + (n_neg - 1) * (q2 - auc ** 2))
        / (n_pos * n_neg)
    )
    z = 1.96
    ci_lower = max(0.0, auc - z * se_auc)
    ci_upper = min(1.0, auc + z * se_auc)

    # Optimal threshold: Youden's index J = TPR - FPR (maximized)
    youden = [t - f for t, f in zip(tpr_pts, fpr_pts)]
    best_idx = max(range(len(youden)), key=lambda i: youden[i])
    optimal_threshold = thresh_pts[best_idx]
    optimal_fpr = fpr_pts[best_idx]
    optimal_tpr = tpr_pts[best_idx]

    return ROCResult(
        fpr=fpr_pts,
        tpr=tpr_pts,
        thresholds=thresh_pts,
        auc=round(auc, 4),
        auc_ci_lower=round(ci_lower, 4),
        auc_ci_upper=round(ci_upper, 4),
        optimal_threshold=round(optimal_threshold, 4),
        optimal_fpr=round(optimal_fpr, 4),
        optimal_tpr=round(optimal_tpr, 4),
        n_pos=n_pos,
        n_neg=n_neg,
    )


def _trapz(x: list[float], y: list[float]) -> float:
    area = 0.0
    for i in range(1, len(x)):
        area += (x[i] - x[i - 1]) * (y[i] + y[i - 1]) / 2
    return area
