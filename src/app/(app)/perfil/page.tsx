'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PerfilPage() {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [nomeOriginal, setNomeOriginal] = useState('')
  const [telefone, setTelefone] = useState('')
  const [telefoneOriginal, setTelefoneOriginal] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [savingNome, setSavingNome] = useState(false)
  const [savingSenha, setSavingSenha] = useState(false)
  const [msgNome, setMsgNome] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [msgSenha, setMsgSenha] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, telefone')
          .eq('id', user.id)
          .single()
        const n = profile?.nome ?? ''
        const t = (profile as { telefone?: string } | null)?.telefone ?? ''
        setNome(n)
        setNomeOriginal(n)
        setTelefone(t)
        setTelefoneOriginal(t)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveNome() {
    if (!userId) return
    if (!nome.trim()) { setMsgNome({ type: 'err', text: 'Nome não pode ser vazio.' }); return }
    setSavingNome(true)
    setMsgNome(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: nome.trim(), telefone: telefone.trim() })
        .eq('id', userId)
      if (error) {
        setMsgNome({ type: 'err', text: 'Erro ao salvar: ' + error.message })
      } else {
        setNomeOriginal(nome.trim())
        setTelefoneOriginal(telefone.trim())
        setMsgNome({ type: 'ok', text: 'Dados atualizados com sucesso!' })
      }
    } catch {
      setMsgNome({ type: 'err', text: 'Erro inesperado.' })
    } finally {
      setSavingNome(false)
    }
  }

  async function handleSaveSenha() {
    if (!novaSenha) { setMsgSenha({ type: 'err', text: 'Digite a nova senha.' }); return }
    if (novaSenha.length < 6) { setMsgSenha({ type: 'err', text: 'A senha deve ter pelo menos 6 caracteres.' }); return }
    if (novaSenha !== confirmSenha) { setMsgSenha({ type: 'err', text: 'As senhas não coincidem.' }); return }
    setSavingSenha(true)
    setMsgSenha(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) {
        setMsgSenha({ type: 'err', text: 'Erro ao atualizar senha: ' + error.message })
      } else {
        setMsgSenha({ type: 'ok', text: 'Senha alterada com sucesso!' })
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmSenha('')
      }
    } catch {
      setMsgSenha({ type: 'err', text: 'Erro inesperado.' })
    } finally {
      setSavingSenha(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  function EyeButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-10 text-center text-gray-400 text-sm">
        Carregando perfil...
      </div>
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu nome de exibição e senha de acesso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">

        {/* Card: Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">Dados pessoais</h2>

          <div>
            <label className={labelClass}>E-mail (não editável)</label>
            <input
              type="email"
              value={email}
              disabled
              className={inputClass + ' bg-gray-50 text-gray-400 cursor-not-allowed'}
            />
          </div>

          <div>
            <label className={labelClass}>Nome de exibição</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Este nome aparece como Responsável nas cotações.
            </p>
          </div>

          <div>
            <label className={labelClass}>Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className={inputClass}
              onKeyDown={e => e.key === 'Enter' && handleSaveNome()}
            />
          </div>

          {msgNome && (
            <div className={`text-xs px-3 py-2 rounded-lg ${
              msgNome.type === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {msgNome.text}
            </div>
          )}

          <button
            onClick={handleSaveNome}
            disabled={savingNome || (nome.trim() === nomeOriginal && telefone.trim() === telefoneOriginal)}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#0C3460' }}
          >
            {savingNome ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        {/* Card: Alterar senha */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">Alterar senha</h2>

          <div>
            <label className={labelClass}>Senha atual</label>
            <div className="relative">
              <input
                type={showSenhaAtual ? 'text' : 'password'}
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                className={inputClass + ' pr-10'}
              />
              <EyeButton show={showSenhaAtual} onToggle={() => setShowSenhaAtual(p => !p)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Nova senha</label>
            <div className="relative">
              <input
                type={showNova ? 'text' : 'password'}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputClass + ' pr-10'}
              />
              <EyeButton show={showNova} onToggle={() => setShowNova(p => !p)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmSenha}
                onChange={e => setConfirmSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className={inputClass + ' pr-10'}
                onKeyDown={e => e.key === 'Enter' && handleSaveSenha()}
              />
              <EyeButton show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />
            </div>
          </div>

          {msgSenha && (
            <div className={`text-xs px-3 py-2 rounded-lg ${
              msgSenha.type === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {msgSenha.text}
            </div>
          )}

          <button
            onClick={handleSaveSenha}
            disabled={savingSenha || !novaSenha}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#0C3460' }}
          >
            {savingSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>

      </div>
    </div>
  )
}
