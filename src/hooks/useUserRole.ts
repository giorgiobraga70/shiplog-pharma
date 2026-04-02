import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useUserRole() {
  const [role, setRole] = useState<'admin' | 'user' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setRole(null); setLoading(false); return }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        setRole((profile?.role as 'admin' | 'user') ?? 'user')
      } catch {
        setRole('user')
      } finally {
        setLoading(false)
      }
    }
    loadRole()
  }, [])

  return { role, isAdmin: role === 'admin', loading }
}
