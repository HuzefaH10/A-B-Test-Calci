import styles from './SegmentedControl.module.css';

export default function SegmentedControl({ options, value, onChange, id }) {
  return (
    <div className={styles.control} role="group" id={id}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.segment} ${value === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
