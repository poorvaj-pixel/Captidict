'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Small device-local preference store (UI preferences only — never financial data).
 * Returns `undefined` during SSR/hydration so callers can avoid flashing the wrong UI.
 */
export function createLocalPreference<T extends string>(key: string, validate: (raw: string | null) => T | null) {
  const listeners = new Set<() => void>()

  function read(): T | null {
    try {
      return validate(window.localStorage.getItem(key))
    } catch {
      return null
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  function write(value: T | null) {
    try {
      if (value === null) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, value)
    } catch {
      // Storage can be unavailable (private mode); state still updates in memory via listeners below.
    }
    listeners.forEach((listener) => listener())
  }

  function usePreference() {
    const value = useSyncExternalStore<T | null | undefined>(subscribe, read, () => undefined)
    const set = useCallback((next: T | null) => write(next), [])
    return [value, set] as const
  }

  return { usePreference, read, write }
}
