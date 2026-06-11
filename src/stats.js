/**
 * stats.js — All statistical math implemented from scratch
 */

// ─── Error Function (Abramowitz & Stegun approximation, max error 1.5e-7) ──────
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t * (0.254829592 +
      t * (-0.284496736 +
        t * (1.421413741 +
          t * (-1.453152027 +
            t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-x * x));
}

// Standard Normal CDF: Φ(x) = 0.5 * erfc(-x / √2)
export function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

// Inverse Normal CDF (Beasley-Springer-Moro algorithm approximation)
export function normalInvCDF(p) {
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ─── Z-critical values ─────────────────────────────────────────────────────────
export function getZAlpha(confidenceLevel, twoTailed = true) {
  const alpha = 1 - confidenceLevel;
  return twoTailed ? normalInvCDF(1 - alpha / 2) : normalInvCDF(1 - alpha);
}

export function getZBeta(power) {
  return normalInvCDF(power);
}

// ─── Core A/B Test calculation ─────────────────────────────────────────────────
export function calculateABTest({
  visitors,    // array of visitor counts [A, B, C?, D?]
  conversions, // array of conversion counts [A, B, C?, D?]
  confidenceLevel = 0.95,
  power = 0.80,
  mde = 0.05,
  twoTailed = true,
  bonferroni = false, // apply Bonferroni correction for multiple variants
}) {
  const n = visitors.length;
  const numComparisons = n - 1; // comparisons against control

  // Effective alpha with Bonferroni correction
  const effectiveAlpha = bonferroni && numComparisons > 1
    ? (1 - confidenceLevel) / numComparisons
    : (1 - confidenceLevel);
  const effectiveConfidence = 1 - effectiveAlpha;

  const rates = visitors.map((v, i) => v > 0 ? conversions[i] / v : 0);
  const zAlpha = getZAlpha(effectiveConfidence, twoTailed);
  const zBeta  = getZBeta(power);

  // Confidence intervals for each variant
  const CIs = rates.map((r, i) => {
    const v = visitors[i];
    const margin = v > 0 ? zAlpha * Math.sqrt(r * (1 - r) / v) : 0;
    return { lower: Math.max(0, r - margin), upper: Math.min(1, r + margin) };
  });

  // Per-comparison stats (each variant vs control = index 0)
  const comparisons = [];
  for (let i = 1; i < n; i++) {
    const rA = rates[0], rB = rates[i];
    const vA = visitors[0], vB = visitors[i];
    const cA = conversions[0], cB = conversions[i];

    // Pooled standard error
    const pooledRate = (cA + cB) / (vA + vB);
    const se = vA > 0 && vB > 0
      ? Math.sqrt(pooledRate * (1 - pooledRate) * (1/vA + 1/vB))
      : 0;

    const z = se > 0 ? (rB - rA) / se : 0;

    // P-value
    let pValue;
    if (twoTailed) {
      pValue = 2 * (1 - normalCDF(Math.abs(z)));
    } else {
      pValue = 1 - normalCDF(z);
    }
    pValue = Math.min(1, Math.max(0, pValue));

    const achievedConfidence = 1 - pValue;
    const isSignificant = pValue < effectiveAlpha;

    // Relative uplift
    const uplift = rA > 0 ? ((rB - rA) / rA) * 100 : 0;

    // Required sample size
    const rBExpected = rA * (1 + mde);
    const nRequired = (() => {
      const diff = rBExpected - rA;
      if (Math.abs(diff) < 1e-10) return Infinity;
      return Math.ceil(
        ((zAlpha + zBeta) ** 2 * (rA * (1 - rA) + rBExpected * (1 - rBExpected))) /
        (diff ** 2)
      );
    })();

    comparisons.push({
      variantIndex: i,
      z,
      pValue,
      achievedConfidence,
      isSignificant,
      uplift,
      nRequired,
      currentSampleA: vA,
      currentSampleB: vB,
    });
  }

  // Required sample size based on MDE (using control rate only)
  const rA = rates[0];
  const rBMDE = rA * (1 + mde);
  const diff = rBMDE - rA;
  const nRequiredMDE = Math.abs(diff) < 1e-10 ? Infinity : Math.ceil(
    ((zAlpha + zBeta) ** 2 * (rA * (1 - rA) + rBMDE * (1 - rBMDE))) /
    (diff ** 2)
  );

  return {
    rates,
    CIs,
    comparisons,
    nRequiredMDE,
    effectiveConfidence,
    effectiveAlpha,
    zAlpha,
  };
}
