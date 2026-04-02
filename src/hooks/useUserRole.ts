import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useUserRole() {
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setRole(null); setLoading(false); return }
      supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          setRole((profile?.role as 'admin' | 'user') ?? 'user')
          setLoading(false)
        })
        .catch(() => { setRole('user'); setLoading(false) })
    })
  }, [])

  return { role, isAdmin: role === 'admin', loading }
}
