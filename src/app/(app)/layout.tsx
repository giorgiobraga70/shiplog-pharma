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
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav className="flex-shrink-0 border-b border-gray-200 shadow-sm" style={{ backgroundColor: '#F1F5F9', height: '64px' }}>
      <div className="h-full max-w-screen-xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Image
            src="/logo.png"
            alt="Shiplog Pharma"
            width={108}
            height={36}
            style={{ objectFit: 'contain', mixBlendMode: 'multiply' }}
            priority
          />

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLink('/cotacao', 'Cotação')}
            {navLink('/historico', 'Histórico')}
            {navLink('/admin/entrada', 'Setup')}
            {navLink('/admin/produtos', 'Produtos')}
          </div>
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-gray-500 text-xs hidden sm:block truncate max-w-[180px]">
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
