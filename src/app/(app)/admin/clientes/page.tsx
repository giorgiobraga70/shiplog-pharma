'use client'

import { useState, useEffect, useRef } from 'react'

interface Client {
  id: string
  empresa: string
  contato?: string
  email?: string
  telefone?: string
  cnpj?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  comentarios?: string
  created_at: string
}

const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const EMPTY: Omit<Client, 'id' | 'created_at'> = {
  empresa: '', contato: '', email: '', telefone: '', cnpj: '',
  endereco: '', cidade: '', estado: '', cep: '', comentarios: '',
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5)}`
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [cidades, setCidades] = useState<string[]>([])
  const [loadingCep, setLoadingCep] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientQuotations, setClientQuotations] = useState<{ quote_number: string; created_at: string; status: string; total: number }[]>([])

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setClients(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || (c.empresa ?? '').toLowerCase().includes(q) || (c.contato ?? '').toLowerCase().includes(q) || (c.cnpj ?? '').includes(q)
  })

  async function loadCidades(uf: string) {
    if (!uf) { setCidades([]); return }
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      const data = await res.json()
      setCidades(data.map((c: { nome: string }) => c.nome))
    } catch { setCidades([]) }
  }

  async function handleCepChange(value: string) {
    const fmt = formatCep(value)
    setForm(f => ({ ...f, cep: fmt }))
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 8) {
      setLoadingCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        const json = await res.json()
        if (!json.erro) {
          setForm(f => ({
            ...f,
            endereco: json.logradouro || f.endereco,
            cidade: json.localidade || f.cidade,
            estado: json.uf || f.estado,
          }))
          if (json.uf) loadCidades(json.uf)
        }
      } catch {} finally { setLoadingCep(false) }
    }
  }

  function openNew() {
    setForm({ ...EMPTY })
    setEditingId(null)
    setShowForm(true)
    setSelectedClient(null)
  }

  function openEdit(c: Client) {
    setForm({
      empresa: c.empresa ?? '', contato: c.contato ?? '', email: c.email ?? '',
      telefone: c.telefone ?? '', cnpj: c.cnpj ?? '', endereco: c.endereco ?? '',
      cidade: c.cidade ?? '', estado: c.estado ?? '', cep: c.cep ?? '',
      comentarios: c.comentarios ?? '',
    })
    setEditingId(c.id)
    setShowForm(true)
    setSelectedClient(null)
    if (c.estado) loadCidades(c.estado)
  }

  async function handleSave() {
    if (!form.empresa.trim()) { alert('Empresa é obrigatório.'); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/clients/${editingId}` : '/api/clients'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { alert(`Erro: ${data.error}`); return }
      if (editingId) {
        setClients(prev => prev.map(c => c.id === editingId ? { ...c, ...form } : c))
      } else {
        setClients(prev => [...prev, data])
      }
      setShowForm(false)
    } catch { alert('Erro ao salvar.') } finally { setSaving(false) }
  }

  async function handleDelete(id: string, empresa: string) {
    if (!confirm(`Excluir cliente "${empresa}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    if (res.ok) setClients(prev => prev.filter(c => c.id !== id))
    else alert('Erro ao excluir.')
  }

  async function handleSelectClient(c: Client) {
    setSelectedClient(c)
    setShowForm(false)
    // Busca cotações do cliente pelo e-mail ou empresa
    try {
      const res = await fetch('/api/quotations')
      const data = await res.json()
      if (Array.isArray(data)) {
        const qs = data.filter((q: { client_company?: string; client_email?: string; totals?: { grandTotalBrl?: number }; status: string; quote_number: string; created_at: string }) =>
          (c.empresa && q.client_company === c.empresa) ||
          (c.email && q.client_email === c.email)
        ).map((q: { quote_number: string; created_at: string; status: string; totals?: { grandTotalBrl?: number } }) => ({
          quote_number: q.quote_number,
          created_at: q.created_at,
          status: q.status,
          total: q.totals?.grandTotalBrl ?? 0,
        }))
        setClientQuotations(qs)
      }
    } catch { setClientQuotations([]) }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cadastro e histórico de clientes</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#0C3460' }}>
          + Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <input type="search" placeholder="Buscar por empresa, contato ou CNPJ..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Empresa</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Contato</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Cidade/UF</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">Nenhum cliente encontrado.</td></tr>
                ) : filtered.map((c, idx) => (
                  <tr key={c.id}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${selectedClient?.id === c.id ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                    onClick={() => handleSelectClient(c)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.empresa}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contato || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.cidade && c.estado ? `${c.cidade}/${c.estado}` : (c.cidade || c.estado || '—')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-900 text-xs font-semibold underline">Editar</button>
                        <button onClick={() => handleDelete(c.id, c.empresa)} className="text-red-500 hover:text-red-700 text-xs font-semibold underline">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && (
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Painel lateral: formulário ou detalhe do cliente */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {showForm ? (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Empresa *</label>
                  <input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} className={inputClass} placeholder="Nome da empresa" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className={labelClass}>Contato</label>
                    <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} className={inputClass} placeholder="Nome do contato" />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inputClass} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="email@empresa.com" />
                  </div>
                  <div>
                    <label className={labelClass}>CNPJ</label>
                    <input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: formatCnpj(e.target.value) }))} className={inputClass} placeholder="00.000.000/0001-00" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>CEP {loadingCep && <span className="text-blue-500 ml-1">…</span>}</label>
                  <input value={form.cep} onChange={e => handleCepChange(e.target.value)} className={inputClass} placeholder="00000-000" />
                </div>
                <div>
                  <label className={labelClass}>Endereço</label>
                  <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} className={inputClass} placeholder="Rua, número" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '10px' }}>
                  <div>
                    <label className={labelClass}>Cidade</label>
                    {cidades.length > 0 ? (
                      <select value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className={inputClass}>
                        <option value="">Selecione</option>
                        {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className={inputClass} placeholder="Cidade" />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>UF</label>
                    <select value={form.estado} onChange={e => { setForm(f => ({ ...f, estado: e.target.value, cidade: '' })); loadCidades(e.target.value) }} className={inputClass}>
                      <option value="">UF</option>
                      {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Comentários</label>
                  <textarea value={form.comentarios} onChange={e => setForm(f => ({ ...f, comentarios: e.target.value }))}
                    rows={3} className={inputClass} placeholder="Observações sobre o cliente..." />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-70"
                    style={{ backgroundColor: '#0C3460' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          ) : selectedClient ? (
            <>
              <div className="flex items-start justify-between mb-4 pb-2 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">{selectedClient.empresa}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedClient.contato}</p>
                </div>
                <button onClick={() => openEdit(selectedClient)} className="text-xs text-blue-600 font-semibold underline">Editar</button>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                {selectedClient.email && <p><span className="font-medium">E-mail:</span> {selectedClient.email}</p>}
                {selectedClient.telefone && <p><span className="font-medium">Tel:</span> {selectedClient.telefone}</p>}
                {selectedClient.cnpj && <p><span className="font-medium">CNPJ:</span> {selectedClient.cnpj}</p>}
                {selectedClient.endereco && <p><span className="font-medium">End.:</span> {selectedClient.endereco}, {selectedClient.cidade}/{selectedClient.estado} {selectedClient.cep}</p>}
                {selectedClient.comentarios && <p className="mt-2 p-2 bg-gray-50 rounded text-gray-600 italic">{selectedClient.comentarios}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Cotações ({clientQuotations.length})</p>
                {clientQuotations.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhuma cotação encontrada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {clientQuotations.map(q => (
                      <div key={q.quote_number} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                        <span className="font-mono font-semibold text-gray-700">{q.quote_number}</span>
                        <span className="text-gray-500">{new Date(q.created_at).toLocaleDateString('pt-BR')}</span>
                        <span className="font-semibold text-gray-800">R$ {q.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">Selecione um cliente para ver detalhes</p>
              <p className="text-xs mt-1">ou clique em + Novo Cliente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
