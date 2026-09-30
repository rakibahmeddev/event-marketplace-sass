'use client';

import { useEffect, useState } from 'react';

/** mm:ss until `expiresAt`; calls onExpire once when it reaches zero. */
export function useCountdown(expiresAt: number, onExpire?: () => void) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, expiresAt - Date.now());
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  const s = Math.ceil(left / 1000);
  return {
    expired: left === 0,
    label: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
  };
}
