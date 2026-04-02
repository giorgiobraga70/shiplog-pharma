'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

type QuotationStatus = 'draft' | 'sent' | 'approved' | 'lost'
type StatusLabel = 'Rascunho' | 'Enviada' | 'Aprovada' | 'Perdida'

interface Quotation {
  id: string
  quote_number: string
  client_company: string
  client_contact: string
  client_email?: string
  client_phone?: string
  client_cnpj?: string
  client_address?: string
  client_city?: string
  client_state?: string
  client_cep?: string
  supplier?: string
  payment_terms?: string
  delivery_days?: number
  validity_days?: number
  created_at: string
  status: QuotationStatus
  created_by?: string
  responsible_name?: string
  items: Array<{
    description: string
    partNumber: string
    ncmCode?: string
    volumeMl?: number | null
    tamanho?: string | null
    pcsPerBox: number
    qtyBoxes: number
    qtyUnits: number
    volumeM3?: number
    weightKg?: number
    finalPriceUnit: number
    finalPriceBox: number
    finalPriceUnitSIpi?: number
    finalPriceBoxSIpi?: number
    finalPriceUnitSImp?: number
    finalPriceBoxSImp?: number
    totalBrl: number
    totalSIpiBrl?: number
    totalSImpBrl?: number
  }> | null
  totals: {
    grandTotalBrl: number
    grandTotalSIpiBrl?: number
    grandTotalSImpBrl?: number
    boxes?: number
    units?: number
  } | null
}

// Ordem: Rascunho → Enviada → Aprovada → Perdida
const STATUS_ORDER: QuotationStatus[] = ['draft', 'sent', 'approved', 'lost']

const STATUS_LABEL: Record<QuotationStatus, StatusLabel> = {
  draft:    'Rascunho',
  sent:     'Enviada',
  approved: 'Aprovada',
  lost:     'Perdida',
}

const LABEL_TO_STATUS: Record<StatusLabel, QuotationStatus> = {
  Rascunho: 'draft',
  Enviada:  'sent',
  Aprovada: 'approved',
  Perdida:  'lost',
}

const STATUS_STYLES: Record<StatusLabel, { bg: string; color: string }> = {
  Rascunho: { bg: '#E6F1FB', color: '#0C447C' },
  Enviada:  { bg: '#FAEEDA', color: '#633806' },
  Aprovada: { bg: '#EAF3DE', color: '#27500A' },
  Perdida:  { bg: '#F1EFE8', color: '#444441' },
}

const STATUS_OPTIONS: (StatusLabel | 'Todos')[] = ['Todos', 'Rascunho', 'Enviada', 'Aprovada', 'Perdida']

function brl(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateBR(isoString: string): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('pt-BR')
}

function getTotal(q: Quotation): number {
  if (q.totals?.grandTotalBrl) return Number(q.totals.grandTotalBrl)
  if (Array.isArray(q.items)) return q.items.reduce((acc, item) => acc + Number(item.totalBrl ?? 0), 0)
  return 0
}

function getItemCount(q: Quotation): number {
  return Array.isArray(q.items) ? q.items.length : 0
}

function firstWord(name?: string): string {
  if (!name) return '—'
  return name.trim().split(/\s+/)[0]
}

export default function HistoricoPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusLabel | 'Todos'>('Todos')

  // Estado do dropdown de status inline
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setQuotations(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleChangeStatus(q: Quotation, newStatus: QuotationStatus) {
    if (newStatus === q.status) { setOpenStatusId(null); return }
    setUpdatingId(q.id)
    setOpenStatusId(null)
    try {
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, status: newStatus } : x))
      } else {
        const body = await res.json().catch(() => ({}))
        alert(`Erro ao atualizar status: ${body.error ?? 'Erro desconhecido'}`)
      }
    } catch {
      alert('Erro ao atualizar status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const label = STATUS_LABEL[q.status] ?? 'Rascunho'
      const matchSearch =
        !search ||
        (q.quote_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.client_company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.responsible_name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || label === statusFilter
      return matchSearch && matchStatus
    })
  }, [quotations, search, statusFilter])

  // ── Estatísticas por ano e por mês ──────────────────────────────────────────
  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  interface PeriodStats {
    key: string
    label: string
    isYear: boolean
    year: number
    month?: number
    total: number
    clients: number
    funnel: number
    sent: number
    approved: number
  }

  const periodStats = useMemo<PeriodStats[]>(() => {
    // Agrupa por ano → mês
    const map: Record<number, Record<number, Quotation[]>> = {}
    for (const q of quotations) {
      const d = new Date(q.created_at)
      const y = d.getFullYear()
      const m = d.getMonth()
      if (!map[y]) map[y] = {}
      if (!map[y][m]) map[y][m] = []
      map[y][m].push(q)
    }

    const rows: PeriodStats[] = []
    const years = Object.keys(map).map(Number).sort((a, b) => b - a)

    for (const year of years) {
      const months = Object.keys(map[year]).map(Number).sort((a, b) => b - a)
      // Linha do ano (soma de todos os meses)
      const yearQs = months.flatMap(m => map[year][m])
      rows.push({
        key: `y-${year}`,
        label: String(year),
        isYear: true,
        year,
        total:    yearQs.length,
        clients:  new Set(yearQs.map(q => q.client_company).filter(Boolean)).size,
        funnel:   yearQs.reduce((a, q) => a + getTotal(q), 0),
        sent:     yearQs.filter(q => q.status === 'sent' || q.status === 'approved').length,
        approved: yearQs.filter(q => q.status === 'approved').length,
      })
      // Linhas dos meses
      for (const month of months) {
        const mQs = map[year][month]
        rows.push({
          key: `m-${year}-${month}`,
          label: `${MONTHS_PT[month]}/${year}`,
          isYear: false,
          year,
          month,
          total:    mQs.length,
          clients:  new Set(mQs.map(q => q.client_company).filter(Boolean)).size,
          funnel:   mQs.reduce((a, q) => a + getTotal(q), 0),
          sent:     mQs.filter(q => q.status === 'sent' || q.status === 'approved').length,
          approved: mQs.filter(q => q.status === 'approved').length,
        })
      }
    }
    return rows
  }, [quotations])

  async function handleDeletarCotacao(q: Quotation) {
    if (!confirm(`Deletar cotação ${q.quote_number} — ${q.client_company || '(sem empresa)'}?\n\nEsta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/quotations/${q.id}`, { method: 'DELETE' })
    if (res.ok) {
      setQuotations(prev => prev.filter(x => x.id !== q.id))
    } else {
      const body = await res.json().catch(() => ({}))
      alert(`Erro ao deletar: ${body.error ?? 'Erro desconhecido'}`)
    }
  }

  function handleEditarCotacao(q: Quotation) {
    localStorage.setItem('cotacao_editing_id', q.id)
    localStorage.setItem('cotacao_draft_v2', JSON.stringify({
      savedItems: (q.items ?? []).map(item => ({
        partNumber: item.partNumber,
        qtyBoxes:   item.qtyBoxes,
      })),
    }))
    window.location.href = '/cotacao'
  }

  function handleVerCotacao(q: Quotation) {
    const enderecoCompleto = [q.client_address, q.client_city, q.client_state, q.client_cep ? `CEP ${q.client_cep}` : null]
      .filter(Boolean).join(', ')

    const printData = {
      quoteNumber:   q.quote_number,
      date:          formatDateBR(q.created_at),
      clientCompany: q.client_company  ?? '',
      clientCnpj:    q.client_cnpj     ?? '',
      clientEmail:   q.client_email    ?? '',
      clientContact: q.client_contact  ?? '',
      clientPhone:   q.client_phone    ?? '',
      clientAddress: enderecoCompleto,
      usdBrl:        5.25,
      paymentTerms:  q.payment_terms   ?? '',
      deliveryDays:  q.delivery_days   ?? 90,
      validityDays:  q.validity_days   ?? 30,
      items: (q.items ?? []).map(item => ({
        description:        item.description,
        partNumber:         item.partNumber,
        ncmCode:            item.ncmCode        ?? '',
        volumeMl:           item.volumeMl       ?? null,
        tamanho:            item.tamanho        ?? null,
        pcsPerBox:          item.pcsPerBox,
        qtyBoxes:           item.qtyBoxes,
        qtyUnits:           item.qtyUnits,
        volumeM3:           item.volumeM3       ?? 0,
        weightKg:           item.weightKg       ?? 0,
        finalPriceUnit:     item.finalPriceUnit,
        finalPriceBox:      item.finalPriceBox,
        finalPriceUnitSIpi: item.finalPriceUnitSIpi ?? 0,
        finalPriceBoxSIpi:  item.finalPriceBoxSIpi  ?? 0,
        finalPriceUnitSImp: item.finalPriceUnitSImp ?? 0,
        finalPriceBoxSImp:  item.finalPriceBoxSImp  ?? 0,
        totalBrl:           item.totalBrl,
        totalSIpiBrl:       item.totalSIpiBrl   ?? 0,
        totalSImpBrl:       item.totalSImpBrl   ?? 0,
      })),
      totals: {
        boxes:             q.totals?.boxes            ?? 0,
        units:             q.totals?.units            ?? 0,
        volumeM3:          0,
        weightKg:          0,
        grandTotalBrl:     q.totals?.grandTotalBrl    ?? 0,
        grandTotalSIpiBrl: q.totals?.grandTotalSIpiBrl ?? 0,
        grandTotalSImpBrl: q.totals?.grandTotalSImpBrl ?? 0,
      },
    }
    localStorage.setItem('quotation_print_data', JSON.stringify(printData))
    window.open('/cotacao/print', '_blank')
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Histórico de Cotações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visualize e gerencie todas as cotações emitidas</p>
      </div>

      {/* Estatísticas por período */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Estatísticas por Período</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-40">Período</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Cotações</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Clientes atendidos</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Funil de vendas</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Enviadas</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Aprovadas</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">Carregando...</td></tr>
              ) : periodStats.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">Nenhuma cotação ainda.</td></tr>
              ) : periodStats.map(row => {
                const conv = row.total > 0
                  ? ((row.approved / row.total) * 100).toFixed(0) + '%'
                  : '—'
                return (
                  <tr
                    key={row.key}
                    className="border-b border-gray-100 last:border-0"
                    style={row.isYear ? { backgroundColor: '#F1F5F9' } : {}}
                  >
                    <td className="px-4 py-2.5">
                      {row.isYear ? (
                        <span className="font-bold text-gray-800 text-xs">{row.label}</span>
                      ) : (
                        <span className="text-gray-600 text-xs pl-3">{row.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-medium text-gray-700">{row.total}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">{row.clients}</td>
                    <td className="px-4 py-2.5 text-center text-xs font-mono text-gray-700">
                      R$ {brl(row.funnel)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">{row.sent}</td>
                    <td className="px-4 py-2.5 text-center text-xs">
                      <span className={row.approved > 0 ? 'text-green-700 font-semibold' : 'text-gray-500'}>
                        {row.approved}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs">
                      <span className={row.approved > 0 ? 'font-semibold text-green-700' : 'text-gray-500'}>
                        {conv}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Barra de filtros */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Buscar por número, empresa ou responsável..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'border-transparent text-white'
                    : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                }`}
                style={statusFilter === s ? { backgroundColor: '#0C3460', borderColor: '#0C3460' } : {}}
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
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Número</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Empresa</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Responsável</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Data</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Itens</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Total BRL</th>
                <th className="px-4 py-3 w-20" />
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
                filtered.map(q => {
                  const label: StatusLabel = STATUS_LABEL[q.status] ?? 'Rascunho'
                  const style = STATUS_STYLES[label]
                  const isOpen = openStatusId === q.id
                  const isUpdating = updatingId === q.id

                  return (
                    <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-gray-700">{q.quote_number}</td>
                      <td className="px-4 py-3 text-center text-gray-900 font-medium">{q.client_company}</td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">{firstWord(q.responsible_name)}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{formatDateBR(q.created_at)}</td>

                      {/* Status com dropdown inline */}
                      <td className="px-4 py-3 text-center">
                        <div className="relative inline-block" ref={isOpen ? dropdownRef : undefined}>
                          <button
                            onClick={() => setOpenStatusId(isOpen ? null : q.id)}
                            disabled={isUpdating}
                            title="Clique para alterar o status"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
                            style={{ backgroundColor: style.bg, color: style.color }}
                          >
                            {isUpdating ? '...' : label}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[120px]">
                              {STATUS_ORDER.map(s => {
                                const lbl = STATUS_LABEL[s]
                                const st = STATUS_STYLES[lbl]
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleChangeStatus(q, s)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                                  >
                                    <span
                                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: st.color }}
                                    />
                                    <span style={{ color: st.color }} className="font-medium">{lbl}</span>
                                    {s === q.status && (
                                      <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-gray-600">{getItemCount(q)}</td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-gray-900">
                        R$ {brl(getTotal(q))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleVerCotacao(q)}
                            className="text-blue-600 hover:text-blue-900 transition-colors text-xs font-semibold underline"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleEditarCotacao(q)}
                            className="text-green-700 hover:text-green-900 transition-colors text-xs font-semibold underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeletarCotacao(q)}
                            className="text-red-500 hover:text-red-700 transition-colors text-xs font-semibold"
                            title="Deletar cotação"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} {filtered.length === 1 ? 'cotação encontrada' : 'cotações encontradas'}
            </p>
            <p className="text-xs font-semibold text-gray-700 font-mono">
              Total filtrado: R$ {brl(filtered.reduce((a, q) => a + getTotal(q), 0))}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
