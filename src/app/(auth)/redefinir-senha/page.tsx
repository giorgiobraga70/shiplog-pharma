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
      setStatus(prev => prev === 'loading' ? 'error' : prev)
      setMsg('Link inválido ou expirado. Solicite um novo link de recuperação.')
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
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={inputClass}
                  />
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
