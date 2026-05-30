import { useEffect, useState } from 'react'

const KEY = 'rcs-dsp-progress-v1'

export function getProgress(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function markComplete(moduleId: string) {
  if (typeof window === 'undefined') return
  const set = getProgress()
  set.add(moduleId)
  localStorage.setItem(KEY, JSON.stringify([...set]))
  window.dispatchEvent(new Event('rcs-progress-change'))
}

export function resetProgress() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event('rcs-progress-change'))
}

export function useProgress() {
  const [set, setSet] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    const sync = () => setSet(getProgress())
    sync()
    window.addEventListener('rcs-progress-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('rcs-progress-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return set
}
