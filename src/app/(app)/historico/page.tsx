'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'

type QuotationStatus = 'draft' | 'sent' | 'approved' | 'lost'
type StatusLabel = 'Salva' | 'Enviada' | 'Aprovada' | 'Perdida'

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
  internal_notes?: string
  attachments?: Array<{ name: string; url: string; size: number; type: string; at: string }>
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
  usd_brl?: number | null
  usd_brl_rate?: number | null
  totals: {
    grandTotalBrl: number
    grandTotalSIpiBrl?: number
    grandTotalSImpBrl?: number
    boxes?: number
    units?: number
    _log?: Array<{ from: string; to: string; at: string }>
  } | null
}

// Ordem: Salva → Enviada → Aprovada → Perdida
const STATUS_ORDER: QuotationStatus[] = ['draft', 'sent', 'approved', 'lost']

const STATUS_LABEL: Record<QuotationStatus, StatusLabel> = {
  draft:    'Salva',
  sent:     'Enviada',
  approved: 'Aprovada',
  lost:     'Perdida',
}

const LABEL_TO_STATUS: Record<StatusLabel, QuotationStatus> = {
  Salva: 'draft',
  Enviada:  'sent',
  Aprovada: 'approved',
  Perdida:  'lost',
}

const STATUS_STYLES: Record<StatusLabel, { bg: string; color: string }> = {
  Salva: { bg: '#E6F1FB', color: '#0C447C' },
  Enviada:  { bg: '#FAEEDA', color: '#633806' },
  Aprovada: { bg: '#EAF3DE', color: '#27500A' },
  Perdida:  { bg: '#F1EFE8', color: '#444441' },
}

const STATUS_OPTIONS: (StatusLabel | 'Todos')[] = ['Todos', 'Salva', 'Enviada', 'Aprovada', 'Perdida']

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

function getValidityAlert(q: { created_at: string; validity_days?: number; status: string }): { label: string; color: string } | null {
  if (q.status === 'approved' || q.status === 'lost') return null
  const days = q.validity_days ?? 30
  const expiresAt = new Date(q.created_at).getTime() + days * 86400000
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000)
  if (daysLeft < 0)  return { label: 'Vencida',         color: '#dc2626' }
  if (daysLeft === 0) return { label: 'Vence hoje',      color: '#ea580c' }
  if (daysLeft <= 3)  return { label: `Vence em ${daysLeft}d`, color: '#d97706' }
  return null
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

  // Log expandido
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Edição inline de Empresa
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editingCompanyValue, setEditingCompanyValue] = useState('')
  const editingCompanyRef = useRef<HTMLInputElement>(null)

  // Filtro por período
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Ordenação da tabela
  type SortKey = 'quote_number' | 'client_company' | 'responsible_name' | 'created_at' | 'status' | 'items' | 'total'
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

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
      const logEntry = { from: q.status, to: newStatus, at: new Date().toISOString() }
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, logEntry }),
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
    const list = quotations.filter(q => {
      const label = STATUS_LABEL[q.status] ?? 'Salva'
      const matchSearch =
        !search ||
        (q.quote_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.client_company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (q.responsible_name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || label === statusFilter
      const qDate = q.created_at ? q.created_at.slice(0, 10) : ''
      const matchFrom = !dateFrom || qDate >= dateFrom
      const matchTo   = !dateTo   || qDate <= dateTo
      return matchSearch && matchStatus && matchFrom && matchTo
    })

    return [...list].sort((a, b) => {
      let valA: string | number
      let valB: string | number
      switch (sortKey) {
        case 'quote_number':    valA = a.quote_number ?? '';      valB = b.quote_number ?? '';      break
        case 'client_company':  valA = a.client_company ?? '';    valB = b.client_company ?? '';    break
        case 'responsible_name':valA = a.responsible_name ?? '';  valB = b.responsible_name ?? '';  break
        case 'created_at':      valA = a.created_at ?? '';        valB = b.created_at ?? '';        break
        case 'status':          valA = STATUS_ORDER.indexOf(a.status); valB = STATUS_ORDER.indexOf(b.status); break
        case 'items':           valA = getItemCount(a);           valB = getItemCount(b);           break
        case 'total':           valA = getTotal(a);               valB = getTotal(b);               break
        default:                valA = ''; valB = ''
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [quotations, search, statusFilter, sortKey, sortDir])

  // ── Estatísticas por ano e por mês ──────────────────────────────────────────
  const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  interface StatusBucket { count: number; brl: number }
  interface PeriodStats {
    key: string
    label: string
    isYear: boolean
    year: number
    month?: number
    total:    StatusBucket
    saved:    StatusBucket
    sent:     StatusBucket
    approved: StatusBucket
    lost:     StatusBucket
  }

  function bucket(qs: Quotation[], status?: QuotationStatus): StatusBucket {
    const filtered = status ? qs.filter(q => q.status === status) : qs
    return { count: filtered.length, brl: filtered.reduce((a, q) => a + getTotal(q), 0) }
  }

  const periodStats = useMemo<PeriodStats[]>(() => {
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
      const yearQs = months.flatMap(m => map[year][m])
      rows.push({
        key: `y-${year}`, label: String(year), isYear: true, year,
        total:    bucket(yearQs),
        saved:    bucket(yearQs, 'draft'),
        sent:     bucket(yearQs, 'sent'),
        approved: bucket(yearQs, 'approved'),
        lost:     bucket(yearQs, 'lost'),
      })
      for (const month of months) {
        const mQs = map[year][month]
        rows.push({
          key: `m-${year}-${month}`, label: `${MONTHS_PT[month]}/${year}`, isYear: false, year, month,
          total:    bucket(mQs),
          saved:    bucket(mQs, 'draft'),
          sent:     bucket(mQs, 'sent'),
          approved: bucket(mQs, 'approved'),
          lost:     bucket(mQs, 'lost'),
        })
      }
    }
    return rows
  }, [quotations])

  // Funil geral (todos os períodos)
  const funnelData = useMemo(() => {
    const total    = bucket(quotations)
    const saved    = bucket(quotations, 'draft')
    const sent     = bucket(quotations, 'sent')
    const approved = bucket(quotations, 'approved')
    const lost     = bucket(quotations, 'lost')
    return [
      { label: 'Total',     color: '#0C3460', ...total    },
      { label: 'Salvas',    color: '#1D6FAE', ...saved    },
      { label: 'Enviadas',  color: '#B45309', ...sent     },
      { label: 'Aprovadas', color: '#166534', ...approved },
      { label: 'Perdidas',  color: '#6B7280', ...lost     },
    ]
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
      fornecedor:    q.supplier        ?? 'Four Star',
      usdBrl:        q.usd_brl_rate    ? String(q.usd_brl_rate).replace('.', ',') : '',
      pagamento:     q.payment_terms   ?? '',
      prazo:         String(q.delivery_days  ?? 90),
      prazoValidade: String(q.validity_days  ?? 30),
      savedItems: (q.items ?? []).map(item => ({
        partNumber: item.partNumber,
        qtyBoxes:   item.qtyBoxes,
      })),
    }))
    window.location.href = '/cotacao'
  }

  function handleDuplicarCotacao(q: Quotation) {
    // Sem cotacao_editing_id → cotação page gera número novo
    localStorage.removeItem('cotacao_editing_id')
    localStorage.setItem('cotacao_draft_v2', JSON.stringify({
      empresa:       q.client_company  ?? '',
      contato:       q.client_contact  ?? '',
      emailContato:  q.client_email    ?? '',
      telefone:      q.client_phone    ?? '',
      cnpj:          q.client_cnpj     ?? '',
      endereco:      q.client_address  ?? '',
      cidade:        q.client_city     ?? '',
      estado:        q.client_state    ?? '',
      cep:           q.client_cep      ?? '',
      fornecedor:    q.supplier        ?? 'Four Star',
      pagamento:     q.payment_terms   ?? '50% no ato do pedido + 50% na entrega',
      prazo:         String(q.delivery_days  ?? 90),
      prazoValidade: String(q.validity_days  ?? 30),
      notasInternas: q.internal_notes ?? '',
      savedItems: (q.items ?? []).map(item => ({
        partNumber: item.partNumber,
        qtyBoxes:   item.qtyBoxes,
      })),
    }))
    window.location.href = '/cotacao'
  }

  function handleStartEditCompany(e: React.MouseEvent, q: Quotation) {
    e.stopPropagation()
    setEditingCompanyId(q.id)
    setEditingCompanyValue(q.client_company ?? '')
    setTimeout(() => {
      editingCompanyRef.current?.select()
    }, 30)
  }

  async function handleSaveCompany(q: Quotation) {
    const trimmed = editingCompanyValue.trim()
    setEditingCompanyId(null)
    if (trimmed === (q.client_company ?? '').trim()) return // sem mudança
    try {
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_company: trimmed }),
      })
      if (res.ok) {
        setQuotations(prev => prev.map(x => x.id === q.id ? { ...x, client_company: trimmed } : x))
      } else {
        alert('Erro ao salvar nome da empresa.')
      }
    } catch {
      alert('Erro ao salvar nome da empresa.')
    }
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
      usdBrl:        q.usd_brl ?? 0,
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

  function handleRelatorio() {
    localStorage.setItem('historico_print_data', JSON.stringify({ quotations, periodStats, funnelData }))
    window.open('/historico/print', '_blank')
  }

  function handleExportCsv() {
    const rows = filtered

    // Cabeçalho
    const headers = [
      'Número', 'Data', 'Empresa', 'CNPJ', 'Contato', 'E-mail', 'Telefone',
      'Cidade', 'Estado', 'Fornecedor', 'Pagamento', 'Prazo Entrega (dias)',
      'Validade (dias)', 'Status', 'Responsável', 'Itens', 'Total BRL',
    ]

    // Linhas
    const dataRows = rows.map(q => [
      q.quote_number ?? '',
      formatDateBR(q.created_at),
      q.client_company ?? '',
      q.client_cnpj ?? '',
      q.client_contact ?? '',
      q.client_email ?? '',
      q.client_phone ?? '',
      q.client_city ?? '',
      q.client_state ?? '',
      q.supplier ?? '',
      q.payment_terms ?? '',
      q.delivery_days ?? '',
      q.validity_days ?? '',
      STATUS_LABEL[q.status] ?? '',
      q.responsible_name ?? '',
      getItemCount(q),
      getTotal(q).toFixed(2).replace('.', ','),
    ])

    // Monta CSV com separador ; (compatível com Excel brasileiro)
    const escape = (v: string | number) => {
      const s = String(v)
      return s.includes(';') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers, ...dataRows]
      .map(row => row.map(escape).join(';'))
      .join('\r\n')

    // Adiciona BOM para Excel reconhecer UTF-8
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-cotacoes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Histórico de Cotações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visualize e gerencie todas as cotações emitidas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-green-700 hover:text-white whitespace-nowrap"
            style={{ borderColor: '#15803d', color: '#15803d' }}
            title="Exporta as cotações filtradas para Excel/CSV"
          >
            ↓ Exportar CSV
          </button>
          <button
            onClick={handleRelatorio}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:opacity-90 whitespace-nowrap"
            style={{ borderColor: '#0C3460', color: '#0C3460' }}
          >
            Relatório PDF
          </button>
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
          {/* Filtro por período */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition"
            />
            <label className="text-xs text-gray-500 whitespace-nowrap">até</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1"
                title="Limpar período"
              >✕</button>
            )}
          </div>
        </div>

        {/* Tabela de dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                {(
                  [
                    ['Número',       'quote_number'],
                    ['Empresa',      'client_company'],
                    ['Responsável',  'responsible_name'],
                    ['Data',         'created_at'],
                    ['Status',       'status'],
                    ['Itens',        'items'],
                    ['Total BRL',    'total'],
                  ] as [string, SortKey][]
                ).map(([label, key]) => (
                  <th key={key} className="px-4 py-3 text-center text-xs font-semibold text-gray-600">
                    <button
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
                    >
                      {label}
                      <span className="text-gray-400" style={{ fontSize: '10px', lineHeight: 1 }}>
                        {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  </th>
                ))}
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
                  const label: StatusLabel = STATUS_LABEL[q.status] ?? 'Salva'
                  const style = STATUS_STYLES[label]
                  const isOpen = openStatusId === q.id
                  const isUpdating = updatingId === q.id

                  const log = q.totals?._log ?? []
                  const isLogOpen = expandedLogId === q.id

                  return (
                    <React.Fragment key={q.id}>
                    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isLogOpen ? 'bg-blue-50' : ''}`}
                      onClick={() => setExpandedLogId(isLogOpen ? null : q.id)}>
                      <td className="px-4 py-3 text-center font-mono text-xs font-semibold text-gray-700">{q.quote_number}</td>
                      <td
                        className="px-4 py-3 text-center text-gray-900 font-medium"
                        onDoubleClick={e => handleStartEditCompany(e, q)}
                        title="Clique duplo para editar"
                      >
                        {editingCompanyId === q.id ? (
                          <input
                            ref={editingCompanyRef}
                            type="text"
                            value={editingCompanyValue}
                            onChange={e => setEditingCompanyValue(e.target.value)}
                            onBlur={() => handleSaveCompany(q)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleSaveCompany(q) }
                              if (e.key === 'Escape') { e.stopPropagation(); setEditingCompanyId(null) }
                            }}
                            onClick={e => e.stopPropagation()}
                            className="w-full px-2 py-0.5 rounded border border-blue-400 text-sm text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ minWidth: '140px' }}
                          />
                        ) : (
                          <span>{q.client_company || <span className="text-gray-400 italic text-xs">—</span>}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">{firstWord(q.responsible_name)}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className="text-gray-500">{formatDateBR(q.created_at)}</span>
                        {(() => { const alert = getValidityAlert(q); return alert ? (
                          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-white font-semibold"
                            style={{ backgroundColor: alert.color, fontSize: '9px' }}>
                            {alert.label}
                          </span>
                        ) : null })()}
                      </td>

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
                          {q.internal_notes && (
                            <span
                              className="cursor-default"
                              title={q.internal_notes}
                              style={{ fontSize: '15px' }}
                            >
                              📝
                            </span>
                          )}
                          {q.attachments && q.attachments.length > 0 && (
                            <span className="relative group cursor-default" style={{ fontSize: '15px' }}>
                              📎
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[180px]">
                                <p className="text-xs font-semibold text-gray-600 mb-1">{q.attachments.length} anexo{q.attachments.length > 1 ? 's' : ''}</p>
                                {q.attachments.map((a, i) => (
                                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                    className="block text-xs text-blue-700 hover:underline truncate max-w-[180px]">
                                    {a.name}
                                  </a>
                                ))}
                              </span>
                            </span>
                          )}
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
                            onClick={() => handleDuplicarCotacao(q)}
                            className="text-purple-600 hover:text-purple-900 transition-colors text-xs font-semibold underline"
                            title="Duplicar com novo número"
                          >
                            Duplicar
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

                    {/* Log de alterações expandível */}
                    {isLogOpen && (
                      <tr className="border-b border-blue-100 bg-blue-50">
                        <td colSpan={8} className="px-6 py-3">
                          <p className="text-xs font-semibold text-blue-800 mb-2">Histórico de alterações de status</p>
                          {log.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Nenhuma alteração registrada.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {log.map((entry, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs shadow-sm">
                                  <span className="font-semibold" style={{ color: STATUS_STYLES[STATUS_LABEL[entry.from as QuotationStatus] ?? 'Salva'].color }}>
                                    {STATUS_LABEL[entry.from as QuotationStatus] ?? entry.from}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="font-semibold" style={{ color: STATUS_STYLES[STATUS_LABEL[entry.to as QuotationStatus] ?? 'Salva'].color }}>
                                    {STATUS_LABEL[entry.to as QuotationStatus] ?? entry.to}
                                  </span>
                                  <span className="text-gray-400 ml-1">
                                    {new Date(entry.at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
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

      {/* Estatísticas + Funil lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Tabela de estatísticas (2/3) */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Estatísticas por Período</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left   text-xs font-semibold text-gray-600 w-36">Período</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Salvas</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Enviadas</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Aprovadas</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Perdidas</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">Carregando...</td></tr>
                ) : periodStats.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">Nenhuma cotação ainda.</td></tr>
                ) : periodStats.map(row => {
                  const conv = row.total.count > 0
                    ? ((row.approved.count / row.total.count) * 100).toFixed(0) + '%'
                    : '—'

                  function Cell({ b, color }: { b: StatusBucket; color?: string }) {
                    if (b.count === 0) return <span className="text-gray-400 text-xs">—</span>
                    return (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-semibold ${color ?? 'text-gray-700'}`}>{b.count}</span>
                        <span className="text-[10px] font-mono text-gray-500">R$ {brl(b.brl)}</span>
                      </div>
                    )
                  }

                  return (
                    <tr key={row.key} className="border-b border-gray-100 last:border-0"
                      style={row.isYear ? { backgroundColor: '#F1F5F9' } : {}}>
                      <td className="px-3 py-2.5">
                        {row.isYear
                          ? <span className="font-bold text-gray-800 text-xs">{row.label}</span>
                          : <span className="text-gray-600 text-xs pl-3">{row.label}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center"><Cell b={row.total}    color="text-gray-800" /></td>
                      <td className="px-3 py-2.5 text-center"><Cell b={row.saved}    color="text-blue-700" /></td>
                      <td className="px-3 py-2.5 text-center"><Cell b={row.sent}     color="text-amber-700" /></td>
                      <td className="px-3 py-2.5 text-center"><Cell b={row.approved} color="text-green-700" /></td>
                      <td className="px-3 py-2.5 text-center"><Cell b={row.lost}     color="text-gray-500" /></td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        <span className={row.approved.count > 0 ? 'font-semibold text-green-700' : 'text-gray-400'}>
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

        {/* Funil de conversão (1/3) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Funil de Conversão</h2>
            <p className="text-xs text-gray-400 mt-0.5">Total geral acumulado</p>
          </div>
          <div className="px-5 py-5 flex flex-col gap-1">
            {funnelData.map((stage, i) => {
              const totalCount = funnelData[0].count
              const widthPct = totalCount > 0
                ? Math.max(30, Math.round((stage.count / totalCount) * 100))
                : 100
              const pctLabel = i === 0 ? '100%'
                : totalCount > 0 ? ((stage.count / totalCount) * 100).toFixed(0) + '%' : '—'

              return (
                <div key={stage.label} className="flex flex-col items-center">
                  <div
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stage.color,
                      clipPath: i < funnelData.length - 1
                        ? 'polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)'
                        : 'polygon(8% 0%, 92% 0%, 84% 100%, 16% 100%)',
                    }}
                    className="flex flex-col items-center justify-center py-3 text-white text-center"
                  >
                    <span className="text-xs font-semibold">{stage.label}</span>
                    <span className="text-[10px] opacity-80 font-mono mt-0.5">R$ {brl(stage.brl)}</span>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex items-center gap-1 py-0.5">
                      <div className="h-px w-6 bg-gray-200" />
                      <span className="text-[10px] text-gray-400">{pctLabel}</span>
                      <div className="h-px w-6 bg-gray-200" />
                    </div>
                  )}
                </div>
              )
            })}
            {funnelData[0].count > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Conversão geral</span>
                <span className="text-sm font-bold text-green-700">
                  {((funnelData[3].count / funnelData[0].count) * 100).toFixed(0)}% aprovadas
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
