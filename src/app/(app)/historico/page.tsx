'use client'

import { useState, useMemo, useEffect } from 'react'

type QuotationStatus = 'approved' | 'sent' | 'draft' | 'lost'
type StatusLabel = 'Aprovada' | 'Enviada' | 'Rascunho' | 'Perdida'

interface Quotation {
  id: string
  quote_number: string
  client_company: string
  client_contact: string
  created_at: string
  status: QuotationStatus
  items: { totalBrl: number }[] | null
  totals: { grandTotalBrl: number } | null
}

const STATUS_LABEL: Record<QuotationStatus, StatusLabel> = {
  approved: 'Aprovada',
  sent: 'Enviada',
  draft: 'Rascunho',
  lost: 'Perdida',
}

const STATUS_STYLES: Record<StatusLabel, { bg: string; color: string }> = {
  Aprovada: { bg: '#EAF3DE', color: '#27500A' },
  Enviada:  { bg: '#FAEEDA', color: '#633806' },
  Rascunho: { bg: '#E6F1FB', color: '#0C447C' },
  Perdida:  { bg: '#F1EFE8', color: '#444441' },
}

const STATUS_OPTIONS: (StatusLabel | 'Todos')[] = ['Todos', 'Aprovada', 'Enviada', 'Rascunho', 'Perdida']

function brl(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateBR(isoString: string): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR')
}

function getTotal(q: Quotation): number {
  if (q.totals?.grandTotalBrl) return Number(q.totals.grandTotalBrl)
  if (Array.isArray(q.items)) {
    return q.items.reduce((acc, item) => acc + Number(item.totalBrl ?? 0), 0)
  }
  return 0
}

function getItemCount(q: Quotation): number {
  if (Array.isArray(q.items)) return q.items.length
  return 0
}

export default function HistoricoPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusLabel | 'Todos'>('Todos')

  useEffect(() => {
    fetch('/api/quotations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuotations(data)
      })
      .catch(() => {
        // Falha silenciosa — tabela ficará vazia
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const label = STATUS_LABEL[q.status] ?? q.status
      const matchSearch =
        !search ||
        (q.quote_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.client_company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.client_contact ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || label === statusFilter
      return matchSearch && matchStatus
    })
  }, [quotations, search, statusFilter])

  // Métricas calculadas dinamicamente com base nos dados reais
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthQuotations = quotations.filter((q) => {
    const d = new Date(q.created_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const approvedThisMonth = thisMonthQuotations.filter((q) => q.status === 'approved')
  const uniqueClients = new Set(thisMonthQuotations.map((q) => q.client_company)).size
  const volumeTotal = thisMonthQuotations.reduce((a, q) => a + getTotal(q), 0)
  const conversionRate =
    thisMonthQuotations.length > 0
      ? ((approvedThisMonth.length / thisMonthQuotations.length) * 100).toFixed(1)
      : '0'

  const metricCards = [
    { label: 'Cotações no mês', value: String(thisMonthQuotations.length), delta: `${approvedThisMonth.length} aprovadas` },
    { label: 'Clientes atendidos', value: String(uniqueClients), delta: 'empresas distintas' },
    { label: 'Volume total', value: `R$ ${brl(volumeTotal)}`, delta: 'no mês atual' },
    { label: 'Conversão', value: `${conversionRate}%`, delta: `${approvedThisMonth.length} aprovadas de ${thisMonthQuotations.length}` },
  ]

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Histórico de Cotações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visualize e gerencie todas as cotações emitidas</p>
      </div>

      {/* ── Cards de métricas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.delta}</p>
          </div>
        ))}
      </div>

      {/* ── Tabela ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Barra de filtros */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Buscar por número, empresa ou contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'border-transparent text-white'
                    : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}
                style={
                  statusFilter === s
                    ? { backgroundColor: '#0C3460', borderColor: '#0C3460' }
                    : {}
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Itens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total BRL</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Carregando cotações...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    Nenhuma cotação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const label: StatusLabel = STATUS_LABEL[q.status] ?? ('Rascunho' as StatusLabel)
                  const style = STATUS_STYLES[label] ?? STATUS_STYLES['Rascunho']
                  return (
                    <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{q.quote_number}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{q.client_company}</td>
                      <td className="px-4 py-3 text-gray-600">{q.client_contact}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDateBR(q.created_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: style.bg, color: style.color }}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{getItemCount(q)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        R$ {brl(getTotal(q))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-gray-400 hover:text-gray-700 transition-colors text-xs underline">
                          Ver
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} {filtered.length === 1 ? 'cotação encontrada' : 'cotações encontradas'}
            </p>
            <p className="text-xs font-semibold text-gray-700 font-mono">
              Total filtrado: R${' '}
              {brl(filtered.reduce((a, q) => a + getTotal(q), 0))}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
