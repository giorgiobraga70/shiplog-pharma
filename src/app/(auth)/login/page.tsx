'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Recuperação de senha
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }
    router.push('/cotacao')
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetMsg('')
    setResetLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setResetLoading(false)
    if (resetError) {
      setResetMsg('Erro ao enviar e-mail. Verifique o endereço e tente novamente.')
    } else {
      setResetMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0C3460' }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 bg-white rounded-2xl px-8 py-4 shadow-lg">
            <Image src="/logo.png" alt="Shiplog Pharma" width={180} height={80} style={{ objectFit: 'contain' }} priority />
          </div>
          <p className="text-blue-200 mt-2 text-sm">Sistema de Cotação</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!showReset ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Acesse sua conta</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <input id="email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass}
                    style={{ '--tw-ring-color': '#0C3460' } as React.CSSProperties} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Senha</label>
                    <button type="button" onClick={() => { setShowReset(true); setResetEmail(email); setResetMsg('') }}
                      className="text-xs font-medium hover:underline" style={{ color: '#0C3460' }}>
                      Esqueceu a senha?
                    </button>
                  </div>
                  <input id="password" type="password" required autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass}
                    style={{ '--tw-ring-color': '#0C3460' } as React.CSSProperties} />
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#0C3460' }}>
                  {loading ? (
                    <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>Entrando...</>
                  ) : 'Entrar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Recuperar senha</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com" className={inputClass}
                    style={{ '--tw-ring-color': '#0C3460' } as React.CSSProperties} />
                </div>
                {resetMsg && (
                  <div className={`rounded-lg px-4 py-3 border text-sm ${
                    resetMsg.includes('enviado')
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>{resetMsg}</div>
                )}
                <button type="submit" disabled={resetLoading}
                  className="w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm disabled:opacity-70"
                  style={{ backgroundColor: '#0C3460' }}>
                  {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
                <button type="button" onClick={() => setShowReset(false)}
                  className="w-full py-2.5 px-4 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">
                  ← Voltar ao login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          Shiplog Pharma &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
