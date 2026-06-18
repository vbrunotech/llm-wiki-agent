'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext({ resolvedTheme: 'dark', toggleTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [resolvedTheme, setResolvedTheme] = useState('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') {
      apply(stored)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      apply(prefersDark ? 'dark' : 'light')
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        apply(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function apply(theme) {
    setResolvedTheme(theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', next)
    apply(next)
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
