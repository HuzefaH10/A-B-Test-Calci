import styles from './VariantInput.module.css';

const VARIANT_LABELS = ['A', 'B', 'C', 'D'];
const VARIANT_COLORS = ['#94a3b8', '#6366f1', '#22c55e', '#f59e0b'];

export default function VariantInput({ index, data, onChange, onRemove, canRemove }) {
  const label = VARIANT_LABELS[index];
  const color = VARIANT_COLORS[index];
  const isControl = index === 0;
  const rate = data.visitors > 0
    ? ((data.conversions / data.visitors) * 100).toFixed(2)
    : '—';

  const handleChange = (field, raw) => {
    const val = raw === '' ? '' : parseInt(raw, 10);
    onChange(index, { ...data, [field]: isNaN(val) ? 0 : val });
  };

  return (
    <div className={styles.card} style={{ borderLeftColor: color }}>
      <div className={styles.header}>
        <div className={styles.label}>
          <span className={styles.badge} style={{ background: color }}>
            {label}
          </span>
          <span className={styles.name}>
            Variant {label} — {isControl ? 'Control' : 'Treatment'}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onRemove(index)}
            aria-label={`Remove Variant ${label}`}
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`visitors-${index}`}>
            Visitors
          </label>
          <input
            id={`visitors-${index}`}
            type="number"
            className={styles.input}
            value={data.visitors === 0 ? '' : data.visitors}
            placeholder="0"
            min="0"
            onChange={(e) => handleChange('visitors', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`conversions-${index}`}>
            Conversions
          </label>
          <input
            id={`conversions-${index}`}
            type="number"
            className={styles.input}
            value={data.conversions === 0 ? '' : data.conversions}
            placeholder="0"
            min="0"
            onChange={(e) => handleChange('conversions', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Conv. Rate</label>
          <div className={styles.rateDisplay}>
            {rate !== '—' ? `${rate}%` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
