import { useState, useEffect } from 'react';

export default function CountUp({ value, duration = 1000, decimals = 0, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(easeProgress * value);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  const formattedCount = typeof value === 'number' && isFinite(value)
    ? (decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString())
    : value;

  return <span>{prefix}{formattedCount}{suffix}</span>;
}
