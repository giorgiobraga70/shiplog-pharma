'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const queryClient = new QueryClient()

function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      if (!data.user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => {
          setIsAdmin(profile?.role === 'admin')
        })
        .catch(() => {})
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
        className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
          active
            ? 'bg-gray-400 text-white'
            : 'text-gray-700 hover:bg-gray-400 hover:text-white'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <header className="flex-shrink-0 shadow-md" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* ── Barra superior: logo + título + user ── */}
      <div style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
        <div className="max-w-screen-xl mx-auto px-4 h-20 flex items-center justify-between" style={{ position: 'relative' }}>
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Shiplog Pharma"
              width={80}
              height={28}
              style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
              priority
            />
          </div>
          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '18px',
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#374151',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}>
            SHIPLOG PHARMA &nbsp;·&nbsp; GERENCIAMENTO DE VENDAS
          </span>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-gray-500 text-xs hidden sm:block truncate max-w-[200px]">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium px-3 py-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* ── Barra inferior: menu ── */}
      <div style={{ backgroundColor: '#CBD5E1' }}>
        <div className="max-w-screen-xl mx-auto px-4 h-10 flex items-center gap-1">
          {navLink('/cotacao', 'Cotação')}
          {navLink('/historico', 'Histórico')}
          {navLink('/admin/clientes', 'Clientes')}
          {navLink('/admin/produtos', 'Produtos')}
          {isAdmin && navLink('/admin/usuarios', 'Usuários')}
        </div>
      </div>
    </header>
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
