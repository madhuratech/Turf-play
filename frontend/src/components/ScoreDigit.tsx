import React, { useEffect, useState, useRef } from 'react';

interface ScoreDigitProps {
  value: number | string;
  size?: 'normal' | 'large' | 'giant';
  color?: string;
  className?: string;
}

export const ScoreDigit: React.FC<ScoreDigitProps> = ({
  value,
  size = 'giant',
  color = 'var(--text-primary)',
  className = '',
}) => {
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const fontSizeMap = {
    normal: '2.5rem',
    large: '4rem',
    giant: '5.2rem',
  };

  return (
    <span
      className={`${animating ? 'score-digit-updating' : ''} ${className}`}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-scoreboard)',
        fontWeight: 800,
        fontSize: fontSizeMap[size],
        lineHeight: 0.95,
        color,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  );
};
