import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const DEMO_ACCOUNTS = {
  'user@campus.edu': {
    user: { id: 'demo-user-id', email: 'user@campus.edu' },
    profile: { id: 'demo-user-id', full_name: 'Mohammed Mehdi Hedayati', role: 'user', department: 'Information Technology' }
  },
  'student@vjti.ac.in': {
    user: { id: 'demo-user-id', email: 'student@vjti.ac.in' },
    profile: { id: 'demo-user-id', full_name: 'Mohammed Mehdi Hedayati', role: 'user', department: 'Information Technology' }
  },
  'worker@campus.edu': {
    user: { id: 'demo-worker-id', email: 'worker@campus.edu' },
    profile: { id: 'demo-worker-id', full_name: 'Ramesh Patil', role: 'worker', department: 'Sanitation' }
  },
  'worker@vjti.ac.in': {
    user: { id: 'demo-worker-id', email: 'worker@vjti.ac.in' },
    profile: { id: 'demo-worker-id', full_name: 'Ramesh Patil', role: 'worker', department: 'Sanitation' }
  },
  'admin@campus.edu': {
    user: { id: 'demo-admin-id', email: 'admin@campus.edu' },
    profile: { id: 'demo-admin-id', full_name: 'Campus Administrator', role: 'admin', department: 'Facilities Management' }
  },
  'admin@vjti.ac.in': {
    user: { id: 'demo-admin-id', email: 'admin@vjti.ac.in' },
    profile: { id: 'demo-admin-id', full_name: 'Campus Administrator', role: 'admin', department: 'Facilities Management' }
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedDemo = localStorage.getItem('ecowatch_demo_session')
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo)
        setUser(parsed.user)
        setProfile(parsed.profile)
        setLoading(false)
        return
      } catch {}
    }

    try {
      supabase.auth.getSession().then(({ data: { session } = {} }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      }).catch(() => {
        setLoading(false)
      })

      const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
        const currentSaved = localStorage.getItem('ecowatch_demo_session')
        if (currentSaved) return

        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      })

      return () => subscription?.unsubscribe?.()
    } catch {
      setLoading(false)
    }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const normalizedEmail = (email || '').trim().toLowerCase()
    const demoData = DEMO_ACCOUNTS[normalizedEmail]

    if (demoData && (password === 'password123' || !password)) {
      setUser(demoData.user)
      setProfile(demoData.profile)
      localStorage.setItem('ecowatch_demo_session', JSON.stringify(demoData))
      return { user: demoData.user, session: null }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      })
      if (error) throw error
      localStorage.removeItem('ecowatch_demo_session')
      return data
    } catch (err) {
      if (demoData) {
        setUser(demoData.user)
        setProfile(demoData.profile)
        localStorage.setItem('ecowatch_demo_session', JSON.stringify(demoData))
        return { user: demoData.user, session: null }
      }
      throw err
    }
  }

  const signUp = async (email, password, userData) => {
    const normalizedEmail = (email || '').trim().toLowerCase()
    const newDemoData = {
      user: { id: `user-${Date.now()}`, email: normalizedEmail },
      profile: {
        id: `user-${Date.now()}`,
        full_name: userData.fullName || 'Student Reporter',
        role: userData.role || 'user',
        department: userData.department || 'General',
        phone: userData.phone || ''
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password
      })
      if (error) throw error

      if (data?.user) {
        await supabase
          .from('profiles')
          .update({
            full_name: userData.fullName,
            role: userData.role || 'user',
            department: userData.department,
            phone: userData.phone
          })
          .eq('id', data.user.id)
      }

      localStorage.removeItem('ecowatch_demo_session')
      return data
    } catch (err) {
      setUser(newDemoData.user)
      setProfile(newDemoData.profile)
      localStorage.setItem('ecowatch_demo_session', JSON.stringify(newDemoData))
      return { user: newDemoData.user, session: null }
    }
  }

  const signOut = async () => {
    localStorage.removeItem('ecowatch_demo_session')
    try {
      await supabase.auth.signOut()
    } catch {}
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
