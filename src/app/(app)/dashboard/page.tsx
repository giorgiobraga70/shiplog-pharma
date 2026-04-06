'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Quotation {
  id: string
  quote_number: string
  client_company: string
  client_email?: string
  created_at: string
  status: 'draft' | 'sent' | 'approved' | 'lost'
  responsible_name?: string
  totals: { grandTotalBrl?: number } | null
  items: Array<{ totalBrl: number }> | null
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Salva', sent: 'Enviada', approved: 'Aprovada', lost: 'Perdida',
}
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#E6F1FB', text: '#0C447C' },
  sent:     { bg: '#FAEEDA', text: '#633806' },
  approved: { bg: '#EAF3DE', text: '#27500A' },
  lost:     { bg: '#F1EFE8', text: '#444441' },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function getTotal(q: Quotation): number {
  if (q.totals?.grandTotalBrl) return Number(q.totals.grandTotalBrl)
  if (Array.isArray(q.items)) return q.items.reduce((a, i) => a + Number(i.totalBrl ?? 0), 0)
  return 0
}
function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}
function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Ontem'
  return `${d} dias atrás`
}

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setQuotations(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return
        try {
          const { data: p } = await supabase.from('profiles').select('nome').eq('id', data.user.id).single()
          if (p?.nome) { setUserName(p.nome.split(' ')[0]); return }
        } catch {}
        if (data.user.email) setUserName(data.user.email.split('@')[0])
      })
    })
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisWeek   = quotations.filter(q => new Date(q.created_at) >= startOfWeek)
    const thisMonth  = quotations.filter(q => new Date(q.created_at) >= startOfMonth)
    const pipeline   = quotations.filter(q => q.status === 'sent')
    const approved   = quotations.filter(q => q.status === 'approved')
    const total30    = quotations.filter(q => {
      const d = new Date(q.created_at)
      return (now.getTime() - d.getTime()) <= 30 * 86400000
    })

    const convRate = total30.length > 0
      ? Math.round((total30.filter(q => q.status === 'approved').length / total30.length) * 100)
      : 0

    return {
      weekCount:    thisWeek.length,
      weekValue:    thisWeek.reduce((a, q) => a + getTotal(q), 0),
      monthCount:   thisMonth.length,
      monthValue:   thisMonth.reduce((a, q) => a + getTotal(q), 0),
      pipelineCount: pipeline.length,
      pipelineValue: pipeline.reduce((a, q) => a + getTotal(q), 0),
      approvedCount: approved.length,
      approvedValue: approved.reduce((a, q) => a + getTotal(q), 0),
      convRate,
      total: quotations.length,
    }
  }, [quotations])

  const recent = quotations.slice(0, 8)

  const card = 'bg-white rounded-xl border border-gray-200 shadow-sm p-5'

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {userName ? `Olá, ${userName}! 👋` : 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Esta semana */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Esta semana</p>
            <span className="text-xl">📅</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.weekCount}</p>
          <p className="text-xs text-gray-400 mt-1">cotações</p>
          <p className="text-sm font-semibold mt-2" style={{ color: '#0C3460' }}>
            R$ {loading ? '—' : brl(stats.weekValue)}
          </p>
        </div>

        {/* Este mês */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Este mês</p>
            <span className="text-xl">📆</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.monthCount}</p>
          <p className="text-xs text-gray-400 mt-1">cotações</p>
          <p className="text-sm font-semibold mt-2" style={{ color: '#0C3460' }}>
            R$ {loading ? '—' : brl(stats.monthValue)}
          </p>
        </div>

        {/* Em pipeline (Enviadas) */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pipeline</p>
            <span className="text-xl">🚀</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#B45309' }}>{loading ? '—' : stats.pipelineCount}</p>
          <p className="text-xs text-gray-400 mt-1">enviadas aguardando</p>
          <p className="text-sm font-semibold mt-2" style={{ color: '#B45309' }}>
            R$ {loading ? '—' : brl(stats.pipelineValue)}
          </p>
        </div>

        {/* Aprovadas + conversão */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aprovadas</p>
            <span className="text-xl">✅</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#166534' }}>{loading ? '—' : stats.approvedCount}</p>
          <p className="text-xs text-gray-400 mt-1">
            conversão 30d: <strong>{loading ? '—' : stats.convRate + '%'}</strong>
          </p>
          <p className="text-sm font-semibold mt-2" style={{ color: '#166534' }}>
            R$ {loading ? '—' : brl(stats.approvedValue)}
          </p>
        </div>
      </div>

      {/* Atividades recentes + ações rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Atividades recentes (2/3) */}
        <div className={`${card} lg:col-span-2 p-0 overflow-hidden`}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Atividades Recentes</h2>
            <Link href="/historico" className="text-xs font-medium hover:underline" style={{ color: '#0C3460' }}>
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Nenhuma cotação ainda.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map(q => {
                const sc = STATUS_COLOR[q.status] ?? STATUS_COLOR.draft
                return (
                  <li key={q.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                        style={{ backgroundColor: sc.bg, color: sc.text }}
                      >
                        {STATUS_LABEL[q.status]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {q.client_company || '(sem empresa)'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{q.quote_number}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-semibold font-mono text-gray-900">
                        R$ {brl(getTotal(q))}
                      </p>
                      <p className="text-xs text-gray-400">{daysAgo(q.created_at)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Ações rápidas (1/3) */}
        <div className="space-y-4">

          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Ações Rápidas</h2>
            <div className="space-y-2">
              <Link href="/cotacao"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0C3460' }}>
                <span className="text-lg">➕</span> Nova Cotação
              </Link>
              <Link href="/historico"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-gray-50"
                style={{ borderColor: '#0C3460', color: '#0C3460' }}>
                <span className="text-lg">🗂️</span> Ver Histórico
              </Link>
              <Link href="/admin/clientes"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-gray-50"
                style={{ borderColor: '#64748b', color: '#64748b' }}>
                <span className="text-lg">👥</span> Clientes
              </Link>
            </div>
          </div>

          {/* Mini resumo geral */}
          <div className={card}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumo Geral</h2>
            <ul className="space-y-2 text-sm">
              {[
                { label: 'Total de cotações', value: loading ? '—' : String(stats.total) },
                { label: 'Pipeline (enviadas)', value: loading ? '—' : String(stats.pipelineCount), color: '#B45309' },
                { label: 'Aprovadas',           value: loading ? '—' : String(stats.approvedCount), color: '#166534' },
                { label: 'Conversão (30d)',     value: loading ? '—' : stats.convRate + '%', color: '#0C3460' },
              ].map(item => (
                <li key={item.label} className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">{item.label}</span>
                  <span className="font-bold text-sm" style={{ color: item.color ?? '#111827' }}>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  )
}
