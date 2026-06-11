import styles from './Tooltip.module.css';
import { useState } from 'react';

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && <span className={styles.tip}>{text}</span>}
    </span>
  );
}
