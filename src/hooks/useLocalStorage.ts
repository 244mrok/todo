"use client";

import { useState, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return initialValue;
  });

  const set = useCallback((v: T | ((p: T) => T)) => {
    setValue(prev => {
      const next = v instanceof Function ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  return [value, set];
}
