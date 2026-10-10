import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../../firebase'

const AuthContext = createContext(null)

// Trì hoãn một chút khi nhận null để tránh redirect trước khi Firebase khôi phục phiên (persistence) sau refresh.
const AUTH_RESOLVE_DELAY_MS = 400

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const resolveTimeoutRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current)
        resolveTimeoutRef.current = null
      }
      setUser(firebaseUser)
      if (firebaseUser) {
        setLoading(false)
      } else {
        resolveTimeoutRef.current = setTimeout(() => {
          resolveTimeoutRef.current = null
          setLoading(false)
        }, AUTH_RESOLVE_DELAY_MS)
      }
    })
    return () => {
      unsubscribe()
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current)
    }
  }, [])

  const logout = () => signOut(auth)

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
