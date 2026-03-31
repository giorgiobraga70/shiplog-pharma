'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const queryClient = new QueryClient()

function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          active
            ? 'bg-white/20 text-white'
            : 'text-blue-100 hover:bg-white/10 hover:text-white'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="flex-shrink-0" style={{ backgroundColor: '#0C3460', height: '48px' }}>
      <div className="h-full max-w-screen-xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <span className="text-white font-bold text-base tracking-tight select-none">
            Shiplog Pharma
          </span>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLink('/cotacao', 'Cotação')}
            {navLink('/historico', 'Histórico')}
            {navLink('/entrada-dados', 'Entrada de Dados')}
            {navLink('/produtos', 'Produtos')}
          </div>
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-blue-200 text-xs hidden sm:block truncate max-w-[180px]">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-blue-100 hover:text-white text-sm font-medium px-3 py-1 rounded-md hover:bg-white/10 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1" style={{ backgroundColor: '#F9FAFB' }}>
          {children}
        </main>
      </div>
    </QueryClientProvider>
  )
}
