'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    // Supabase lê automaticamente o hash #access_token=...&type=recovery da URL
    // e dispara o evento PASSWORD_RECOVERY no onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      } else if (event === 'SIGNED_IN' && status === 'loading') {
        // Sessão ativa mas não é recovery — redireciona para cotação
        router.replace('/cotacao')
      }
    })

    // Timeout: se em 5s não detectou recovery, mostra erro
    const timer = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'loading') {
          setMsg('Link inválido ou expirado. Solicite um novo link de recuperação.')
          return 'error'
        }
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setMsg('As senhas não coincidem.')
      return
    }
    setSaving(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setMsg('Erro ao redefinir senha: ' + error.message)
    } else {
      setStatus('success')
      setTimeout(() => router.replace('/cotacao'), 2000)
    }
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0C3460' }}>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 bg-white rounded-2xl px-8 py-4 shadow-lg">
            <Image src="/logo.png" alt="Shiplog Pharma" width={180} height={80} style={{ objectFit: 'contain' }} priority />
          </div>
          <p className="text-blue-200 mt-2 text-sm">Sistema de Cotação</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {status === 'loading' && (
            <div className="text-center py-6">
              <svg className="animate-spin h-8 w-8 text-blue-900 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-500 text-sm">Verificando link de recuperação...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-5">
                <p className="text-sm text-red-700">{msg}</p>
              </div>
              <button
                onClick={() => router.replace('/login')}
                className="w-full py-2.5 px-4 rounded-lg border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                ← Voltar ao login
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Redefinir senha</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Digite sua nova senha abaixo.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputClass + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={inputClass + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600">
                      {showConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {msg && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <p className="text-sm text-red-700">{msg}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm disabled:opacity-70 transition-opacity"
                  style={{ backgroundColor: '#0C3460' }}
                >
                  {saving ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 mb-3">
                <p className="text-sm text-green-700 font-medium">✓ Senha redefinida com sucesso!</p>
                <p className="text-xs text-green-600 mt-1">Redirecionando...</p>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          Shiplog Pharma &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
