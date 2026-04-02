'use client'

import { useState, useEffect } from 'react'

interface AppUser {
  id: string
  email: string
  nome: string
  telefone: string
  role: 'admin' | 'user'
  created_at: string
  last_sign_in?: string
}

const EMPTY_FORM = { email: '', password: '', nome: '', telefone: '', role: 'user' as 'admin' | 'user' }

export default function UsuariosPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(u: AppUser) {
    setForm({ email: u.email, password: '', nome: u.nome, telefone: u.telefone, role: u.role })
    setEditingId(u.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.email.trim()) { alert('E-mail é obrigatório.'); return }
    if (!editingId && !form.password.trim()) { alert('Senha é obrigatória para novos usuários.'); return }
    setSaving(true)
    try {
      if (editingId) {
        const body: Record<string, string> = { nome: form.nome, telefone: form.telefone, role: form.role }
        if (form.password) body.password = form.password
        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        })
        const data = await res.json()
        if (!res.ok) { alert(`Erro: ${data.error}`); return }
        setUsers(prev => prev.map(u => u.id === editingId ? { ...u, nome: form.nome, telefone: form.telefone, role: form.role } : u))
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password, nome: form.nome, telefone: form.telefone, role: form.role })
        })
        const data = await res.json()
        if (!res.ok) { alert(`Erro: ${data.error}`); return }
        setUsers(prev => [...prev, { id: data.id, email: form.email, nome: form.nome, telefone: form.telefone, role: form.role, created_at: new Date().toISOString() }])
      }
      setShowForm(false)
    } catch { alert('Erro ao salvar.') } finally { setSaving(false) }
  }

  async function handleDelete(u: AppUser) {
    if (!confirm(`Excluir usuário "${u.email}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) setUsers(prev => prev.filter(x => x.id !== u.id))
    else alert('Erro ao excluir usuário.')
  }

  const roleBadge = (role: string) => role === 'admin'
    ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Administrador</span>
    : <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Usuário</span>

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerenciamento de acesso ao sistema</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: '#0C3460' }}>
          + Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">E-mail</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Telefone</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Perfil</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Último acesso</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Carregando...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Nenhum usuário encontrado.</td></tr>
                ) : users.map((u, idx) => (
                  <tr key={u.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nome || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.telefone || '—'}</td>
                    <td className="px-4 py-3 text-center">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs text-center">
                      {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-900 text-xs font-semibold underline">Editar</button>
                        <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700 text-xs font-semibold">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && (
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {showForm ? (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Nome</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inputClass} placeholder="Nome completo" />
                </div>
                <div>
                  <label className={labelClass}>E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputClass} placeholder="email@empresa.com" disabled={!!editingId} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inputClass} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className={labelClass}>{editingId ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha *'}</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={inputClass} placeholder="••••••••" autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelClass}>Perfil</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'user' }))} className={inputClass}>
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-70"
                    style={{ backgroundColor: '#0C3460' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">Clique em + Novo Usuário</p>
              <p className="text-xs mt-1">ou em Editar para modificar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
