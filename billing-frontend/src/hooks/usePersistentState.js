import { useState, useEffect } from 'react';

/**
 * usePersistentState
 * Like useState, but keeps the value in localStorage so it survives
 * page navigation and reloads.
 */
export default function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore write errors (e.g., storage full or disabled)
    }
  }, [key, state]);

  return [state, setState];
}

