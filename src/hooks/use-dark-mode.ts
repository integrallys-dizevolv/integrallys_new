'use client'

import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'darkMode'
const EVENT_NAME = 'dark-mode-change'

function getSnapshot() {
  if (typeof window === 'undefined') {
    return false
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    return saved === 'true'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => callback()
  media.addEventListener('change', handler)
  window.addEventListener('storage', handler)
  window.addEventListener(EVENT_NAME, handler)

  return () => {
    media.removeEventListener('change', handler)
    window.removeEventListener('storage', handler)
    window.removeEventListener(EVENT_NAME, handler)
  }
}

export function useDarkMode() {
  const isDarkMode = useSyncExternalStore(subscribe, getSnapshot, () => false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    window.localStorage.setItem(STORAGE_KEY, String(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = () => {
    const nextValue = !getSnapshot()
    window.localStorage.setItem(STORAGE_KEY, String(nextValue))
    window.dispatchEvent(new Event(EVENT_NAME))
  }

  return { isDarkMode, toggleDarkMode }
}
