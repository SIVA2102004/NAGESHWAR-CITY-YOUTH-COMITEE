import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getDefaultFestival, updateFestival } from '../services/festivalService'
import type { Festival } from '../types'

interface FestivalContextValue {
  festival:       Festival | null
  festivalLoading: boolean
  refreshFestival: () => Promise<void>
  updateSettings:  (data: Partial<Omit<Festival, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>
}

const FestivalContext = createContext<FestivalContextValue | null>(null)

export function FestivalProvider({ children }: { children: ReactNode }) {
  const [festival, setFestival] = useState<Festival | null>(null)
  const [festivalLoading, setFestivalLoading] = useState(true)

  const loadFestival = async () => {
    try {
      const f = await getDefaultFestival()
      setFestival(f)
    } catch {
      setFestival(null)
    } finally {
      setFestivalLoading(false)
    }
  }

  useEffect(() => { loadFestival() }, [])

  const refreshFestival = async () => {
    await loadFestival()
  }

  const updateSettings = async (
    data: Partial<Omit<Festival, 'id' | 'createdAt' | 'createdBy'>>
  ) => {
    if (!festival) return
    await updateFestival(festival.id, data)
    await refreshFestival()
  }

  return (
    <FestivalContext.Provider
      value={{ festival, festivalLoading, refreshFestival, updateSettings }}
    >
      {children}
    </FestivalContext.Provider>
  )
}

export function useFestival(): FestivalContextValue {
  const ctx = useContext(FestivalContext)
  if (!ctx) throw new Error('useFestival must be used inside FestivalProvider')
  return ctx
}