import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUserProfile } from '../services/userService'
import { loginUser, logoutUser, resetPassword } from '../services/authService'
import type { AppUser, UserRole } from '../types'
import { getHomeRoute } from '../utils/permissions'

interface AuthContextValue {
  firebaseUser:  FirebaseUser | null
  user:          AppUser | null
  role:          UserRole | null
  loading:       boolean
  isAdmin:       boolean
  isSuperAdmin:  boolean
  isVolunteer:   boolean
  isMember:      boolean
  login:         (email: string, password: string) => Promise<AppUser>
  logout:        () => Promise<void>
  resetPwd:      (email: string) => Promise<void>
  refreshUser:   () => Promise<void>
  homeRoute:     string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user,         setUser]         = useState<AppUser | null>(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid)
          setUser(profile)
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string): Promise<AppUser> => {
    const profile = await loginUser(email, password)
    setUser(profile)
    return profile
  }

  const logout = async (): Promise<void> => {
    await logoutUser()
    setUser(null)
    setFirebaseUser(null)
  }

  const resetPwd = (email: string) => resetPassword(email)

  const refreshUser = async (): Promise<void> => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid)
      setUser(profile)
    }
  }

  const role      = user?.role ?? null
  const isAdmin   = role === 'admin'
  
  const userEmail = (user?.email || firebaseUser?.email || '').trim().toLowerCase()
  const userName  = (user?.name || firebaseUser?.displayName || '').trim().toLowerCase()

  // Master President is the primary creator account (jakkasivasubramanyam2004@gmail.com, original admin, or explicit isSuperAdmin)
  // Newly invited co-admins (with inviteCodeUsed) remain single-pandal admins
  const isSuperAdmin =
    isAdmin &&
    (
      user?.isSuperAdmin === true ||
      userEmail === 'jakkasivasubramanyam2004@gmail.com' ||
      userEmail.includes('jakkasiva') ||
      userEmail.includes('sivasubramanyam') ||
      userName.includes('siva subramanyam') ||
      userName.includes('jakka') ||
      !user?.inviteCodeUsed
    )

  const isVolunteer = role === 'volunteer'
  const isMember  = role === 'member'
  const homeRoute = role ? getHomeRoute(role) : '/login'

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        role,
        loading,
        isAdmin,
        isSuperAdmin,
        isVolunteer,
        isMember,
        login,
        logout,
        resetPwd,
        refreshUser,
        homeRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}