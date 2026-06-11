import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts';
import styles from './ResultsPanel.module.css';

const VARIANT_LABELS = ['A', 'B', 'C', 'D'];
const VARIANT_COLORS = ['#94a3b8', '#6366f1', '#22c55e', '#f59e0b'];

function fmt(n, decimals = 2) {
  return typeof n === 'number' && isFinite(n)
    ? n.toFixed(decimals)
    : '—';
}

function fmtPct(n) {
  return typeof n === 'number' && isFinite(n)
    ? `${(n * 100).toFixed(2)}%`
    : '—';
}

// ─── Verdict Card ──────────────────────────────────────────────────────────────
function VerdictCard({ results, variants, confidenceLevel }) {
  const { comparisons, effectiveConfidence } = results;
  const significantComps = comparisons.filter(c => c.isSignificant);
  const hasMulitple = comparisons.length > 1;

  // Determine overall verdict
  let verdict, vClass, vIcon;
  if (significantComps.length > 0) {
    const best = significantComps.reduce((a, b) => a.uplift > b.uplift ? a : b);
    const label = VARIANT_LABELS[best.variantIndex];
    verdict = {
      badge: 'STATISTICALLY SIGNIFICANT',
      badgeClass: styles.badgeSuccess,
      headline: `Variant ${label} wins with ${(best.achievedConfidence * 100).toFixed(1)}% confidence`,
      sub: `p = ${best.pValue.toFixed(4)} · Uplift: ${best.uplift >= 0 ? '+' : ''}${best.uplift.toFixed(2)}%`,
    };
    vClass = styles.verdictSuccess;
    vIcon = '✓';
  } else {
    const maxConf = Math.max(...comparisons.map(c => c.achievedConfidence));
    if (maxConf > 0.7) {
      verdict = {
        badge: 'INCONCLUSIVE',
        badgeClass: styles.badgeWarning,
        headline: 'No clear winner detected yet',
        sub: `Highest confidence achieved: ${(maxConf * 100).toFixed(1)}% (target: ${(confidenceLevel * 100).toFixed(0)}%)`,
      };
      vClass = styles.verdictWarning;
      vIcon = '~';
    } else {
      verdict = {
        badge: 'NOT SIGNIFICANT',
        badgeClass: styles.badgeDanger,
        headline: 'No clear winner detected',
        sub: `Highest confidence achieved: ${(maxConf * 100).toFixed(1)}% (target: ${(confidenceLevel * 100).toFixed(0)}%)`,
      };
      vClass = styles.verdictDanger;
      vIcon = '✗';
    }
  }

  if (hasMulitple) {
    verdict.sub += ' · Bonferroni correction applied';
  }

  return (
    <div className={`${styles.verdictCard} ${vClass}`}>
      <div className={styles.verdictIcon}>{vIcon}</div>
      <div className={styles.verdictBody}>
        <span className={`${styles.verdictBadge} ${verdict.badgeClass}`}>
          {verdict.badge}
        </span>
        <h2 className={styles.verdictHeadline}>{verdict.headline}</h2>
        <p className={styles.verdictSub}>{verdict.sub}</p>
      </div>
    </div>
  );
}

// ─── Key Metrics Row ───────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className={`${styles.metricCard} ${highlight ? styles.metricHighlight : ''}`}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}

// ─── Conversion Rate Bar Chart ─────────────────────────────────────────────────
function ConversionChart({ results, variants }) {
  const { rates, comparisons } = results;
  const sigIndexes = new Set(
    comparisons.filter(c => c.isSignificant && c.uplift > 0).map(c => c.variantIndex)
  );

  const data = variants.map((_, i) => ({
    name: `Variant ${VARIANT_LABELS[i]}`,
    rate: rates[i] * 100,
    color: sigIndexes.has(i) ? '#22c55e' : VARIANT_COLORS[i],
  }));

  const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text
        x={x + width + 6}
        y={y + 12}
        fill="#94a3b8"
        fontSize={12}
        fontFamily="Inter"
        fontWeight={600}
      >
        {value.toFixed(2)}%
      </text>
    );
  };

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.sectionTitle}>Conversion Rate Comparison</h3>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fill: '#475569', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <RechartTooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              background: '#252836',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 13,
            }}
            formatter={(val) => [`${val.toFixed(3)}%`, 'Conv. Rate']}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList dataKey="rate" content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Confidence Interval Chart ─────────────────────────────────────────────────
function CIChart({ results, variants }) {
  const { rates, CIs } = results;

  return (
    <div className={styles.chartCard}>
      <div className={styles.ciHeader}>
        <h3 className={styles.sectionTitle}>Confidence Intervals</h3>
        <span className={styles.ciHint}>Non-overlapping intervals → stronger evidence</span>
      </div>
      <div className={styles.ciRows}>
        {variants.map((_, i) => {
          const lo = (CIs[i].lower * 100);
          const hi = (CIs[i].upper * 100);
          const mid = (rates[i] * 100);
          const color = VARIANT_COLORS[i];

          return (
            <div key={i} className={styles.ciRow}>
              <span className={styles.ciLabel}>
                <span className={styles.ciDot} style={{ background: color }} />
                Variant {VARIANT_LABELS[i]}
              </span>
              <div className={styles.ciTrack}>
                <CIBar lo={lo} hi={hi} mid={mid} color={color} variants={variants} rates={rates} CIs={CIs} />
              </div>
              <span className={styles.ciRange}>
                [{lo.toFixed(2)}%, {hi.toFixed(2)}%]
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CIBar({ lo, hi, mid, color, variants, rates, CIs }) {
  // Find global range for scaling
  const allLows = CIs.map(ci => ci.lower * 100);
  const allHighs = CIs.map(ci => ci.upper * 100);
  const globalMin = Math.min(...allLows) * 0.85;
  const globalMax = Math.max(...allHighs) * 1.15;
  const range = globalMax - globalMin || 1;

  const toPercent = (val) => ((val - globalMin) / range) * 100;

  return (
    <div className={styles.ciBarTrack}>
      <div
        className={styles.ciBarFill}
        style={{
          left: `${toPercent(lo)}%`,
          width: `${toPercent(hi) - toPercent(lo)}%`,
          background: `${color}30`,
          borderColor: color,
        }}
      />
      <div
        className={styles.ciMidPoint}
        style={{
          left: `${toPercent(mid)}%`,
          background: color,
        }}
      />
    </div>
  );
}

// ─── Sample Size Progress ──────────────────────────────────────────────────────
function SampleSizeCard({ results, variants, mde }) {
  const { nRequiredMDE, comparisons } = results;
  const minVisitors = Math.min(...variants.map(v => v.visitors));
  const pct = nRequiredMDE > 0 && isFinite(nRequiredMDE)
    ? Math.min(100, (minVisitors / nRequiredMDE) * 100)
    : 100;
  const sufficient = pct >= 100;

  return (
    <div className={styles.sampleCard}>
      <div className={styles.sampleHeader}>
        <h3 className={styles.sectionTitle}>Sample Size Analysis</h3>
        {!sufficient && (
          <span className={styles.warnBadge}>⚠ Insufficient Sample</span>
        )}
        {sufficient && (
          <span className={styles.okBadge}>✓ Adequate Sample</span>
        )}
      </div>
      <p className={styles.sampleDesc}>
        To detect a <strong>{(mde * 100).toFixed(0)}%</strong> relative effect, you need at least{' '}
        <strong className={styles.highlight}>
          {isFinite(nRequiredMDE) ? nRequiredMDE.toLocaleString() : '∞'}
        </strong>{' '}
        visitors per variant.
      </p>
      <div className={styles.progressRow}>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${sufficient ? styles.progressOk : styles.progressWarn}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={styles.progressLabel}>{pct.toFixed(0)}%</span>
      </div>
      <p className={styles.sampleSub}>
        Smallest variant has <strong>{minVisitors.toLocaleString()}</strong> visitors —{' '}
        {sufficient
          ? 'your sample is large enough for reliable results.'
          : `you need ${isFinite(nRequiredMDE) ? (nRequiredMDE - minVisitors).toLocaleString() : '∞'} more visitors per variant.`}
      </p>
    </div>
  );
}

// ─── Interpretation Guide ──────────────────────────────────────────────────────
function InterpretationCard({ results, variants, confidenceLevel, twoTailed }) {
  const [open, setOpen] = useState(false);
  const { comparisons } = results;

  const paragraphs = comparisons.map((c, idx) => {
    const vLabel = VARIANT_LABELS[c.variantIndex];
    const p = c.pValue;
    const z = c.z;
    const pThreshold = 1 - confidenceLevel;
    const sig = c.isSignificant;

    return (
      <p key={idx} className={styles.interpPara}>
        <strong>Variant {vLabel} vs Control:</strong> Your Z-score is{' '}
        <em>{fmt(z, 3)}</em> and your p-value is <em>{fmt(p, 4)}</em>. This
        means there is a <em>{(p * 100).toFixed(2)}%</em> probability that this
        result occurred by random chance.{' '}
        {sig
          ? `Since this is below your ${(pThreshold * 100).toFixed(0)}% threshold (${(confidenceLevel * 100).toFixed(0)}% confidence), the result is statistically significant. You can be ${(c.achievedConfidence * 100).toFixed(1)}% confident that Variant ${vLabel}'s ${c.uplift >= 0 ? 'improvement' : 'decline'} of ${Math.abs(c.uplift).toFixed(2)}% is real.`
          : `Since this is above your ${(pThreshold * 100).toFixed(0)}% threshold, the result is NOT statistically significant. Continue collecting data before drawing conclusions.`}
        {twoTailed
          ? ' (Two-tailed test: detecting differences in either direction.)'
          : ' (One-tailed test: detecting improvement only.)'}
      </p>
    );
  });

  return (
    <div className={styles.interpCard}>
      <button
        type="button"
        className={styles.interpToggle}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>📖 Interpretation Guide</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▾</span>
      </button>
      {open && (
        <div className={styles.interpBody}>
          {paragraphs}
          <p className={styles.interpNote}>
            <strong>Note on practical significance:</strong> Statistical significance
            does not always equal business significance. Always consider the actual
            magnitude of the effect, implementation costs, and your business context
            before acting on results.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main ResultsPanel ─────────────────────────────────────────────────────────
export default function ResultsPanel({ results, variants, config }) {
  if (!results) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📊</div>
        <h2 className={styles.emptyTitle}>Results will appear here</h2>
        <p className={styles.emptyDesc}>
          Fill in your test data on the left and click <strong>Calculate Results</strong> to
          see a full statistical analysis.
        </p>
        <p className={styles.emptyTip}>
          💡 Try <strong>Load Sample Data</strong> to see an example instantly.
        </p>
      </div>
    );
  }

  const { comparisons } = results;

  // Key metrics for the primary (first) comparison
  const primary = comparisons[0];

  return (
    <div className={styles.panel}>
      <VerdictCard results={results} variants={variants} confidenceLevel={config.confidenceLevel} />

      {/* Key Metrics Row */}
      <div className={styles.metricsRow}>
        <MetricCard
          label="Relative Uplift"
          value={`${primary.uplift >= 0 ? '+' : ''}${primary.uplift.toFixed(2)}%`}
          sub="Variant B vs Control"
          highlight={primary.isSignificant && primary.uplift > 0}
        />
        <MetricCard
          label="P-Value"
          value={primary.pValue.toFixed(4)}
          sub={primary.pValue < (1 - config.confidenceLevel) ? 'Significant ✓' : 'Not significant'}
        />
        <MetricCard
          label="Z-Score"
          value={primary.z.toFixed(3)}
          sub={`|z| > ${results.zAlpha.toFixed(2)} = significant`}
        />
        <MetricCard
          label="Required / Variant"
          value={isFinite(primary.nRequired) ? primary.nRequired.toLocaleString() : '∞'}
          sub={`for ${(config.mde * 100).toFixed(0)}% MDE`}
        />
      </div>

      <ConversionChart results={results} variants={variants} />
      <CIChart results={results} variants={variants} />
      <SampleSizeCard results={results} variants={variants} mde={config.mde} />
      <InterpretationCard
        results={results}
        variants={variants}
        confidenceLevel={config.confidenceLevel}
        twoTailed={config.twoTailed}
      />
    </div>
  );
}
