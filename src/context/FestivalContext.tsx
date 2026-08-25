import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  getDefaultFestival,
  getAllFestivals,
  getFestival,
  createFestival,
  updateFestival,
} from '../services/festivalService'
import type { Festival } from '../types'

interface FestivalContextValue {
  festival:          Festival | null
  allFestivals:      Festival[]
  festivalLoading:   boolean
  selectFestival:    (id: string) => Promise<void>
  refreshFestival:   () => Promise<void>
  createAndSwitch:   (data: {
    name:          string
    committeeName: string
    festivalYear:  string
    targetAmount:  number
    upiId?:        string
    upiPayeeName?: string
    address?:      string
    contactNumber?: string
    createdBy:     string
  }) => Promise<string>
  updateSettings:    (data: Partial<Omit<Festival, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>
}

const FestivalContext = createContext<FestivalContextValue | null>(null)

export function FestivalProvider({ children }: { children: ReactNode }) {
  const [festival, setFestival] = useState<Festival | null>(null)
  const [allFestivals, setAllFestivals] = useState<Festival[]>([])
  const [festivalLoading, setFestivalLoading] = useState(true)

  const loadFestivals = async () => {
    try {
      const list = await getAllFestivals()
      setAllFestivals(list)

      const savedId = localStorage.getItem('active_festival_id')
      if (savedId) {
        const found = list.find((f) => f.id === savedId)
        if (found) {
          setFestival(found)
          return
        }
      }

      if (list.length > 0) {
        setFestival(list[0])
        localStorage.setItem('active_festival_id', list[0].id)
      } else {
        const def = await getDefaultFestival()
        setFestival(def)
      }
    } catch {
      setFestival(null)
    } finally {
      setFestivalLoading(false)
    }
  }

  useEffect(() => {
    loadFestivals()
  }, [])

  const selectFestival = async (id: string) => {
    setFestivalLoading(true)
    try {
      const target = allFestivals.find((f) => f.id === id) || (await getFestival(id))
      if (target) {
        setFestival(target)
        localStorage.setItem('active_festival_id', target.id)
      }
    } finally {
      setFestivalLoading(false)
    }
  }

  const refreshFestival = async () => {
    await loadFestivals()
  }

  const createAndSwitch = async (data: {
    name:          string
    committeeName: string
    festivalYear:  string
    targetAmount:  number
    upiId?:        string
    upiPayeeName?: string
    address?:      string
    contactNumber?: string
    createdBy:     string
  }) => {
    const newId = await createFestival(data)
    await loadFestivals()
    await selectFestival(newId)
    return newId
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
      value={{
        festival,
        allFestivals,
        festivalLoading,
        selectFestival,
        refreshFestival,
        createAndSwitch,
        updateSettings,
      }}
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