import { useState } from 'react';
import SegmentedControl from './components/SegmentedControl';
import Tooltip from './components/Tooltip';
import VariantInput from './components/VariantInput';
import ResultsPanel from './components/ResultsPanel';
import { calculateABTest } from './stats';
import styles from './App.module.css';

// ─── Constants ─────────────────────────────────────────────────────────────────
const SAMPLE_DATA = {
  testName: 'Checkout Button Color Test',
  hypothesis: 'A green CTA button will outperform the current grey button',
  twoTailed: true,
  confidenceLevel: 0.95,
  power: 0.80,
  mde: 0.05,
  variants: [
    { visitors: 2450, conversions: 98 },
    { visitors: 2380, conversions: 127 },
  ],
};

const DEFAULT_STATE = {
  testName: '',
  hypothesis: '',
  twoTailed: true,
  confidenceLevel: 0.95,
  power: 0.80,
  mde: 5,
  variants: [
    { visitors: 0, conversions: 0 },
    { visitors: 0, conversions: 0 },
  ],
};

const CONFIDENCE_OPTIONS = [
  { label: '90%', value: 0.90 },
  { label: '95%', value: 0.95 },
  { label: '99%', value: 0.99 },
];
const POWER_OPTIONS = [
  { label: '70%', value: 0.70 },
  { label: '80%', value: 0.80 },
  { label: '90%', value: 0.90 },
];
const TAIL_OPTIONS = [
  { label: 'Two-Tailed', value: 'two' },
  { label: 'One-Tailed', value: 'one' },
];

const VARIANT_LABELS = ['A', 'B', 'C', 'D'];

// ─── InputSection wrapper ───────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

// ─── Field wrapper ──────────────────────────────────────────────────────────
function Field({ label, tooltip, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>
        {label}
        {tooltip && (
          <Tooltip text={tooltip}>
            <span className={styles.infoIcon} aria-label="More info">ⓘ</span>
          </Tooltip>
        )}
      </label>
      {children}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState(DEFAULT_STATE);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateVariant = (index, data) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[index] = data;
      return { ...f, variants };
    });
  };

  const addVariant = () => {
    if (form.variants.length >= 4) return;
    setForm(f => ({ ...f, variants: [...f.variants, { visitors: 0, conversions: 0 }] }));
  };

  const removeVariant = (index) => {
    if (form.variants.length <= 2) return;
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  };

  const loadSample = () => {
    setForm({
      ...SAMPLE_DATA,
      mde: SAMPLE_DATA.mde * 100,
    });
    setResults(null);
    setError('');
  };

  const reset = () => {
    setForm(DEFAULT_STATE);
    setResults(null);
    setError('');
  };

  const calculate = () => {
    setError('');
    const { variants, confidenceLevel, power, mde, twoTailed } = form;
    const mdeDecimal = mde / 100;

    // Validation
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.visitors || v.visitors <= 0) {
        setError(`Variant ${VARIANT_LABELS[i]} needs at least 1 visitor.`);
        return;
      }
      if (v.conversions < 0 || v.conversions > v.visitors) {
        setError(`Variant ${VARIANT_LABELS[i]}: conversions must be between 0 and visitors.`);
        return;
      }
    }

    try {
      const res = calculateABTest({
        visitors: variants.map(v => v.visitors),
        conversions: variants.map(v => v.conversions),
        confidenceLevel,
        power,
        mde: mdeDecimal,
        twoTailed,
        bonferroni: variants.length > 2,
      });
      setResults(res);
    } catch (e) {
      setError('Calculation error: ' + e.message);
    }
  };

  const config = {
    confidenceLevel: form.confidenceLevel,
    power: form.power,
    mde: form.mde / 100,
    twoTailed: form.twoTailed,
  };

  return (
    <div className={styles.app}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>∿</span>
            <div>
              <div className={styles.logoTitle}>A/B Test Calculator</div>
              <div className={styles.logoSub}>Statistical Significance Engine</div>
            </div>
          </div>
          <a
            href="https://github.com/HuzefaH10/A-B-Test-Calci"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.891 1.529 2.341 1.087 2.91.832.091-.646.349-1.087.635-1.338-2.22-.252-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.165 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            GitHub
          </a>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className={styles.main}>
        {/* LEFT — Inputs */}
        <div className={styles.inputsColumn}>

          {/* Section 1: Test Configuration */}
          <Section title="Test Configuration">
            <Field label="Test Name (optional)">
              <input
                id="test-name"
                type="text"
                className={styles.textInput}
                placeholder="e.g. Homepage CTA Button Test"
                value={form.testName}
                onChange={e => set('testName', e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field label="Hypothesis (optional)">
              <textarea
                id="test-hypothesis"
                className={`${styles.textInput} ${styles.textarea}`}
                placeholder="e.g. Changing button color to green will increase sign-ups"
                value={form.hypothesis}
                onChange={e => set('hypothesis', e.target.value)}
                rows={2}
              />
            </Field>
            <Field
              label="Test Type"
              tooltip="Two-tailed: detects any difference (higher or lower). One-tailed: detects improvement only. Use two-tailed unless you specifically expect only improvement."
            >
              <SegmentedControl
                id="test-type"
                options={TAIL_OPTIONS}
                value={form.twoTailed ? 'two' : 'one'}
                onChange={v => set('twoTailed', v === 'two')}
              />
            </Field>
          </Section>

          {/* Section 2: Stats settings */}
          <Section title="Significance & Power">
            <Field label="Confidence Level">
              <SegmentedControl
                id="confidence-level"
                options={CONFIDENCE_OPTIONS}
                value={form.confidenceLevel}
                onChange={v => set('confidenceLevel', v)}
              />
            </Field>
            <Field label="Statistical Power">
              <SegmentedControl
                id="statistical-power"
                options={POWER_OPTIONS}
                value={form.power}
                onChange={v => set('power', v)}
              />
            </Field>
            <Field
              label="Minimum Detectable Effect (%)"
              tooltip="The smallest relative improvement you want to reliably detect. A smaller MDE requires a larger sample size."
            >
              <div className={styles.inputWithSuffix}>
                <input
                  id="mde-input"
                  type="number"
                  className={styles.textInput}
                  value={form.mde}
                  min="0.1"
                  max="100"
                  step="0.1"
                  onChange={e => set('mde', parseFloat(e.target.value) || 0)}
                />
                <span className={styles.suffix}>%</span>
              </div>
            </Field>
          </Section>

          {/* Sections 3-6: Variants */}
          <Section title="Variants">
            <div className={styles.variantList}>
              {form.variants.map((v, i) => (
                <VariantInput
                  key={i}
                  index={i}
                  data={v}
                  onChange={updateVariant}
                  onRemove={removeVariant}
                  canRemove={i >= 2}
                />
              ))}
            </div>

            {form.variants.length < 4 && (
              <button
                type="button"
                id="add-variant-btn"
                className={styles.addVariantBtn}
                onClick={addVariant}
              >
                + Add Variant {['C', 'D'][form.variants.length - 2]}
              </button>
            )}

            {form.variants.length > 2 && (
              <p className={styles.bonferroniNote}>
                ℹ Bonferroni correction will be applied to account for multiple comparisons.
              </p>
            )}
          </Section>

          {/* Error message */}
          {error && (
            <div className={styles.errorMsg} role="alert">
              ⚠ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              id="calculate-btn"
              className={styles.btnPrimary}
              onClick={calculate}
            >
              Calculate Results
            </button>
            <button
              type="button"
              id="reset-btn"
              className={styles.btnGhost}
              onClick={reset}
            >
              Reset
            </button>
            <button
              type="button"
              id="sample-data-btn"
              className={styles.btnSample}
              onClick={loadSample}
            >
              Load Sample Data
            </button>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div className={styles.resultsColumn}>
          {form.testName && results && (
            <div className={styles.testNameBanner}>
              <span className={styles.bannerLabel}>Analyzing:</span>
              <span className={styles.bannerName}>{form.testName}</span>
            </div>
          )}
          <ResultsPanel
            results={results}
            variants={form.variants}
            config={config}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <p>A/B Test Calculator · Built by HuzefaH10 ·{' '}
          <a href="https://github.com/HuzefaH10/A-B-Test-Calci" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
