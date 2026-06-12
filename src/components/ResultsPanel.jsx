import { useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import CountUp from './CountUp';
import styles from './ResultsPanel.module.css';

const VARIANT_LABELS = ['A', 'B', 'C', 'D'];
// Control = purple, Variation = teal, extras = green/amber
const VARIANT_COLORS = ['#a78bfa', '#2dd4bf', '#22c55e', '#f59e0b'];

function fmt(n, decimals = 2) {
  return typeof n === 'number' && isFinite(n) ? n.toFixed(decimals) : '—';
}

// ─── Verdict Card ───────────────────────────────────────────────────────────────
function VerdictCard({ results, variants, confidenceLevel }) {
  const { comparisons } = results;
  const significantComps = comparisons.filter(c => c.isSignificant);
  const hasMultiple = comparisons.length > 1;

  let verdict, vClass, vIcon, vHeadline;

  if (significantComps.length > 0) {
    const best = significantComps.reduce((a, b) => a.uplift > b.uplift ? a : b);
    const label = VARIANT_LABELS[best.variantIndex];
    vHeadline = `Variation ${label} Wins!`;
    verdict = {
      badge: 'STATISTICALLY SIGNIFICANT',
      badgeClass: styles.badgeSuccess,
      headline: vHeadline,
      sub: `p = ${best.pValue.toFixed(4)} · Uplift: ${best.uplift >= 0 ? '+' : ''}${best.uplift.toFixed(2)}% · ${(best.achievedConfidence * 100).toFixed(1)}% confidence`,
    };
    vClass = styles.verdictSuccess;
    vIcon = (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    );
  } else {
    const maxConf = Math.max(...comparisons.map(c => c.achievedConfidence));
    if (maxConf > 0.7) {
      vHeadline = 'No Clear Winner Yet';
      verdict = {
        badge: 'INCONCLUSIVE',
        badgeClass: styles.badgeWarning,
        headline: vHeadline,
        sub: `Highest confidence achieved: ${(maxConf * 100).toFixed(1)}% (target: ${(confidenceLevel * 100).toFixed(0)}%) — keep collecting data.`,
      };
      vClass = styles.verdictWarning;
      vIcon = (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
    } else {
      vHeadline = 'More Data Needed';
      verdict = {
        badge: 'NOT SIGNIFICANT',
        badgeClass: styles.badgeDanger,
        headline: vHeadline,
        sub: `Highest confidence achieved: ${(maxConf * 100).toFixed(1)}% (target: ${(confidenceLevel * 100).toFixed(0)}%) — continue running the test.`,
      };
      vClass = styles.verdictDanger;
      vIcon = (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      );
    }
  }

  if (hasMultiple) {
    verdict.sub += ' · Bonferroni correction applied';
  }

  return (
    <div className={`${styles.verdictCard} ${vClass} ${styles.fadeIn}`}>
      <div className={styles.verdictIconWrap}>{vIcon}</div>
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

// ─── Key Metrics Row ────────────────────────────────────────────────────────────
function MetricCard({ label, valueNode, sub, topColor, isLift, liftPositive, delayIndex = 0 }) {
  return (
    <div
      className={`${styles.metricCard} ${styles.fadeIn}`}
      style={{ animationDelay: `${delayIndex * 100}ms`, '--top-color': topColor }}
    >
      <div className={styles.metricCardTopBar} />
      <div className={`${styles.metricValue} ${isLift ? (liftPositive ? styles.metricValueGreen : styles.metricValueRed) : ''}`}>
        {isLift && (
          <span className={styles.liftArrow}>{liftPositive ? '↑' : '↓'}</span>
        )}
        {valueNode}
      </div>
      <div className={styles.metricLabel}>{label}</div>
      {sub && <div className={styles.metricSub}>{sub}</div>}
    </div>
  );
}

// ─── Conversion Rate Bar Chart ──────────────────────────────────────────────────
function ConversionChart({ results, variants }) {
  const { rates, comparisons } = results;
  const sigIndexes = new Set(
    comparisons.filter(c => c.isSignificant && c.uplift > 0).map(c => c.variantIndex)
  );

  const data = variants.map((_, i) => ({
    name: i === 0 ? 'Control (A)' : `Variation ${VARIANT_LABELS[i]}`,
    rate: rates[i] * 100,
    color: sigIndexes.has(i) ? '#22c55e' : VARIANT_COLORS[i],
  }));

  const CustomLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width + 6} y={y + 12} fill="#94a3b8" fontSize={12} fontFamily="Inter" fontWeight={600}>
        {value.toFixed(2)}%
      </text>
    );
  };

  return (
    <div className={`${styles.chartCard} ${styles.fadeIn}`} style={{ animationDelay: '400ms' }}>
      <h3 className={styles.sectionTitle}>Conversion Rate Comparison</h3>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 64, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} tickLine={false} axisLine={false} width={100} />
          <RechartTooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ background: '#252836', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f1f5f9', fontSize: 13 }}
            formatter={(val) => [`${val.toFixed(3)}%`, 'Conv. Rate']}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={28} isAnimationActive={true} animationDuration={1000}>
            {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            <LabelList dataKey="rate" content={<CustomLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Improved CI Chart with overlap detection ───────────────────────────────────
function CIChart({ results, variants }) {
  const { rates, CIs } = results;

  // Global range for scaling
  const allLows = CIs.map(ci => ci.lower * 100);
  const allHighs = CIs.map(ci => ci.upper * 100);
  const padding = (Math.max(...allHighs) - Math.min(...allLows)) * 0.15 || 0.5;
  const globalMin = Math.min(...allLows) - padding;
  const globalMax = Math.max(...allHighs) + padding;
  const range = globalMax - globalMin || 1;
  const toPercent = (val) => ((val - globalMin) / range) * 100;

  // Detect overlap between control (0) and first variant (1)
  const ctrlLo = CIs[0].lower * 100;
  const ctrlHi = CIs[0].upper * 100;
  const varLo = CIs[1]?.lower * 100;
  const varHi = CIs[1]?.upper * 100;
  const hasOverlap = variants.length >= 2 && varLo !== undefined && ctrlHi > varLo && varHi > ctrlLo;
  const overlapLo = hasOverlap ? Math.max(ctrlLo, varLo) : null;
  const overlapHi = hasOverlap ? Math.min(ctrlHi, varHi) : null;

  return (
    <div className={`${styles.chartCard} ${styles.fadeIn}`} style={{ animationDelay: '500ms' }}>
      <div className={styles.ciHeader}>
        <h3 className={styles.sectionTitle}>Confidence Intervals</h3>
        <span className={`${styles.ciSignalBadge} ${hasOverlap ? styles.ciSignalWeak : styles.ciSignalStrong}`}>
          {hasOverlap ? '⚠ Overlap — uncertainty area' : '✓ No overlap — strong signal'}
        </span>
      </div>

      <div className={styles.ciRows}>
        {variants.map((_, i) => {
          const lo = CIs[i].lower * 100;
          const hi = CIs[i].upper * 100;
          const mid = rates[i] * 100;
          const color = VARIANT_COLORS[i];
          const label = i === 0 ? 'Control (A)' : `Variation ${VARIANT_LABELS[i]}`;

          return (
            <div key={i} className={styles.ciRow}>
              <span className={styles.ciLabel}>
                <span className={styles.ciDot} style={{ background: color }} />
                {label}
              </span>
              <div className={styles.ciTrack}>
                <div className={styles.ciBarTrack}>
                  {/* Range bar */}
                  <div
                    className={styles.ciBarFill}
                    style={{
                      left: `${toPercent(lo)}%`,
                      width: `${toPercent(hi) - toPercent(lo)}%`,
                      background: `${color}25`,
                      borderColor: color,
                    }}
                  />
                  {/* Overlap zone */}
                  {hasOverlap && overlapLo !== null && overlapHi !== null && (
                    <div
                      className={styles.ciOverlapZone}
                      style={{
                        left: `${toPercent(overlapLo)}%`,
                        width: `${toPercent(overlapHi) - toPercent(overlapLo)}%`,
                      }}
                    />
                  )}
                  {/* Center dot */}
                  <div
                    className={styles.ciMidPoint}
                    style={{ left: `${toPercent(mid)}%`, background: color }}
                  />
                </div>
              </div>
              <span className={styles.ciRange}>
                {mid.toFixed(2)}%
                <span className={styles.ciRangeSub}> ({lo.toFixed(2)}% – {hi.toFixed(2)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sample Size Progress ───────────────────────────────────────────────────────
function SampleSizeCard({ results, variants, mde }) {
  const { nRequiredMDE } = results;
  const minVisitors = Math.min(...variants.map(v => v.visitors));
  const pct = nRequiredMDE > 0 && isFinite(nRequiredMDE)
    ? Math.min(100, (minVisitors / nRequiredMDE) * 100)
    : 100;
  const sufficient = pct >= 100;

  const progressClass = pct >= 80 ? styles.progressOk : pct >= 50 ? styles.progressAmber : styles.progressWarn;

  return (
    <div className={`${styles.sampleCard} ${styles.fadeIn}`} style={{ animationDelay: '600ms' }}>
      <div className={styles.sampleHeader}>
        <h3 className={styles.sectionTitle}>Sample Size Analysis</h3>
        {!sufficient && <span className={styles.warnBadge}>⚠ Insufficient Sample</span>}
        {sufficient && <span className={styles.okBadge}>✓ Adequate Sample</span>}
      </div>
      <p className={styles.sampleDesc}>
        To detect a <strong>{(mde * 100).toFixed(0)}%</strong> relative effect, you need at least{' '}
        <strong className={styles.highlight}>
          {isFinite(nRequiredMDE) ? nRequiredMDE.toLocaleString() : '∞'}
        </strong>{' '}
        visitors per variant.
      </p>
      <div className={styles.sampleAdequacy}>
        <span className={styles.sampleAdequacyLabel}>Sample size adequacy: <strong>{pct.toFixed(0)}%</strong></span>
      </div>
      <div className={styles.progressRow}>
        <div className={styles.progressBar}>
          <div className={`${styles.progressFill} ${progressClass}`} style={{ width: `${pct}%` }} />
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

// ─── Interpretation Guide ───────────────────────────────────────────────────────
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
    <div className={`${styles.interpCard} ${styles.fadeIn}`} style={{ animationDelay: '700ms' }}>
      <button type="button" className={styles.interpToggle} onClick={() => setOpen(o => !o)} aria-expanded={open}>
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

// ─── Main ResultsPanel ──────────────────────────────────────────────────────────
export default function ResultsPanel({ results, variants, config, testName, hypothesis, onOpenDrawer, showOnboarding }) {
  const panelRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!results) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📊</div>
        <h2 className={styles.emptyTitle}>A/B Test Results</h2>
        <p className={styles.emptyDesc}>
          Set up your test parameters and click <strong>Calculate Results</strong> to
          see a full statistical analysis with charts, confidence intervals, and more.
        </p>
        {showOnboarding && (
          <div className={styles.onboardingHint}>
            <span className={styles.onboardingText}>Click the button to set up your test</span>
            <span className={styles.onboardingArrow}>↘</span>
          </div>
        )}
        {onOpenDrawer && (
          <button className={styles.emptyAction} onClick={onOpenDrawer}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="currentColor"/>
              <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="currentColor"/>
              <line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="currentColor"/>
            </svg>
            Configure Test
          </button>
        )}
      </div>
    );
  }

  const { comparisons } = results;
  const primary = comparisons[0];
  const liftPositive = primary.uplift >= 0;

  const handleExportPDF = async () => {
    if (!panelRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(panelRef.current, {
        scale: 2,
        backgroundColor: '#0f1117',
        ignoreElements: (element) => element.classList.contains(styles.exportActions),
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const date = new Date().toISOString().split('T')[0];
      const name = testName ? `${testName.replace(/[^a-z0-9]/gi, '_')}_` : 'AB_Test_';
      pdf.save(`${name}Results_${date}.pdf`);
    } catch (e) {
      console.error('Failed to export PDF', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.exportActions}>
        <button className={styles.btnExport} onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? '⏳ Exporting...' : '↓ Export PDF'}
        </button>
      </div>

      <VerdictCard results={results} variants={variants} confidenceLevel={config.confidenceLevel} />

      {/* Key Metrics Row */}
      <div className={styles.metricsRow}>
        <MetricCard
          label="Relative Uplift"
          valueNode={<CountUp value={primary.uplift} decimals={2} prefix={liftPositive ? '+' : ''} suffix="%" />}
          sub="Variation vs Control"
          topColor={liftPositive ? '#22c55e' : '#ef4444'}
          isLift={true}
          liftPositive={liftPositive}
          delayIndex={1}
        />
        <MetricCard
          label="P-Value"
          valueNode={<CountUp value={primary.pValue} decimals={4} />}
          sub={primary.pValue < (1 - config.confidenceLevel) ? 'Significant ✓' : 'Not significant'}
          topColor="#a78bfa"
          delayIndex={2}
        />
        <MetricCard
          label="Z-Score"
          valueNode={<CountUp value={primary.z} decimals={3} />}
          sub={`|z| > ${results.zAlpha.toFixed(2)} = significant`}
          topColor="#2dd4bf"
          delayIndex={3}
        />
        <MetricCard
          label="Required / Variant"
          valueNode={isFinite(primary.nRequired) ? <CountUp value={primary.nRequired} /> : '∞'}
          sub={`for ${(config.mde * 100).toFixed(0)}% MDE`}
          topColor="#64748b"
          delayIndex={4}
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
