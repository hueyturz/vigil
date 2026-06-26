'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CommandPalette } from './CommandPalette'

interface SearchContextValue {
  open: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

// Opens the global command palette. Safe to call from any client component
// rendered inside <SearchProvider> (Sidebar, BottomNav, etc.).
export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>')
  return ctx
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open  = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  // Global Cmd+K (Mac) / Ctrl+K (Windows/Linux) toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <SearchContext.Provider value={{ open }}>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} />
    </SearchContext.Provider>
  )
}
