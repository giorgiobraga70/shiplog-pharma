'use client'

import { useEffect, useState } from 'react'

type QuotationStatus = 'draft' | 'sent' | 'approved' | 'lost'

interface QuotationItem {
  description: string
  partNumber: string
  qtyBoxes: number
  qtyUnits: number
  totalBrl: number
}

interface Quotation {
  id: string
  quote_number: string
  client_company: string
  client_contact: string
  responsible_name?: string
  created_at: string
  status: QuotationStatus
  items: QuotationItem[] | null
  totals: { grandTotalBrl: number; boxes?: number; units?: number } | null
}

interface StatusBucket {
  count: number
  brl: number
}

interface PeriodStats {
  key: string
  label: string
  isYear: boolean
  year: number
  month?: number
  total: StatusBucket
  saved: StatusBucket
  sent: StatusBucket
  approved: StatusBucket
  lost: StatusBucket
}

interface FunnelStage {
  label: string
  color: string
  count: number
  brl: number
}

interface PrintData {
  quotations: Quotation[]
  periodStats: PeriodStats[]
  funnelData: FunnelStage[]
}

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: 'Salva',
  sent: 'Enviada',
  approved: 'Aprovada',
  lost: 'Perdida',
}

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

export default function HistoricoPrintPage() {
  const [data, setData] = useState<PrintData | null>(null)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('historico_print_data')
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (data && !printed) {
      setPrinted(true)
      setTimeout(() => window.print(), 500)
    }
  }, [data, printed])

  if (!data) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#333' }}>
        <p>Carregando dados para impressão...</p>
      </div>
    )
  }

  const { quotations, periodStats, funnelData } = data
  const now = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const grandTotal = quotations.reduce((a, q) => a + getTotal(q), 0)
  const totalSaved = quotations.filter(q => q.status === 'draft').length
  const totalSent = quotations.filter(q => q.status === 'sent').length
  const totalApproved = quotations.filter(q => q.status === 'approved').length
  const totalLost = quotations.filter(q => q.status === 'lost').length
  const convPct = quotations.length > 0
    ? ((totalApproved / quotations.length) * 100).toFixed(0) + '%'
    : '—'

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          * { box-shadow: none !important; }
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          color: #1a1a1a;
          background: #fff;
          margin: 0;
        }
        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 40px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th, td {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #374151;
        }
        .year-row {
          background-color: #e8edf5;
          font-weight: 700;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 3px solid #0C3460;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        .brand {
          font-size: 22px;
          font-weight: 800;
          color: #0C3460;
          letter-spacing: -0.5px;
        }
        .brand span {
          color: #1D6FAE;
        }
        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #0C3460;
          margin-top: 4px;
        }
        .meta {
          text-align: right;
          font-size: 11px;
          color: #6b7280;
        }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #0C3460;
          margin-bottom: 8px;
          margin-top: 20px;
          padding-bottom: 4px;
          border-bottom: 1px solid #cbd5e1;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .summary-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          background: #f9fafb;
        }
        .summary-card .label {
          font-size: 10px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-card .value {
          font-size: 20px;
          font-weight: 700;
          color: #0C3460;
          margin-top: 2px;
        }
        .summary-card .sub {
          font-size: 10px;
          color: #6b7280;
          margin-top: 1px;
        }
        .funnel-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        .funnel-bar-wrap {
          flex: 1;
          height: 28px;
          background: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
        }
        .funnel-bar {
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: 8px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9ca3af;
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 8px 18px;
          background: #0C3460;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .mono { font-family: 'Courier New', monospace; }
        .badge-salva    { background: #E6F1FB; color: #0C447C; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
        .badge-enviada  { background: #FAEEDA; color: #633806; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
        .badge-aprovada { background: #EAF3DE; color: #27500A; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
        .badge-perdida  { background: #F1EFE8; color: #444441; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Imprimir / Salvar PDF
      </button>

      <div className="page">
        {/* Header */}
        <div className="header-bar">
          <div>
            <div className="brand">Shiplog <span>Pharma</span></div>
            <div className="report-title">Relatório de Cotações</div>
          </div>
          <div className="meta">
            <div>Gerado em: {now}</div>
            <div>Total de registros: {quotations.length}</div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">Total de Cotações</div>
            <div className="value">{quotations.length}</div>
            <div className="sub">R$ {brl(grandTotal)}</div>
          </div>
          <div className="summary-card">
            <div className="label">Salvas</div>
            <div className="value" style={{ color: '#0C447C' }}>{totalSaved}</div>
            <div className="sub">em rascunho</div>
          </div>
          <div className="summary-card">
            <div className="label">Aprovadas</div>
            <div className="value" style={{ color: '#166534' }}>{totalApproved}</div>
            <div className="sub">conversão: {convPct}</div>
          </div>
          <div className="summary-card">
            <div className="label">Enviadas / Perdidas</div>
            <div className="value" style={{ color: '#B45309' }}>{totalSent} / <span style={{ color: '#6b7280' }}>{totalLost}</span></div>
            <div className="sub">em negociação</div>
          </div>
        </div>

        {/* Funnel */}
        <div className="section-title">Funil de Conversão</div>
        <div style={{ marginBottom: 24 }}>
          {funnelData.map(stage => {
            const totalCount = funnelData[0]?.count ?? 0
            const pct = totalCount > 0 ? Math.max(10, Math.round((stage.count / totalCount) * 100)) : 100
            return (
              <div key={stage.label} className="funnel-row">
                <div style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#374151' }}>{stage.label}</div>
                <div className="funnel-bar-wrap">
                  <div className="funnel-bar" style={{ width: `${pct}%`, backgroundColor: stage.color }}>
                    {stage.count} · R$ {brl(stage.brl)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Statistics table */}
        <div className="section-title">Estatísticas por Período</div>
        <table>
          <thead>
            <tr>
              <th>Período</th>
              <th className="text-center">Total</th>
              <th className="text-center">BRL Total</th>
              <th className="text-center">Salvas</th>
              <th className="text-center">Enviadas</th>
              <th className="text-center">Aprovadas</th>
              <th className="text-center">Perdidas</th>
              <th className="text-center">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {periodStats.map(row => {
              const conv = row.total.count > 0
                ? ((row.approved.count / row.total.count) * 100).toFixed(0) + '%'
                : '—'
              return (
                <tr key={row.key} className={row.isYear ? 'year-row' : ''}>
                  <td style={{ paddingLeft: row.isYear ? 10 : 24 }}>{row.label}</td>
                  <td className="text-center mono">{row.total.count || '—'}</td>
                  <td className="text-center mono">R$ {brl(row.total.brl)}</td>
                  <td className="text-center">{row.saved.count || '—'}</td>
                  <td className="text-center">{row.sent.count || '—'}</td>
                  <td className="text-center">{row.approved.count || '—'}</td>
                  <td className="text-center">{row.lost.count || '—'}</td>
                  <td className="text-center" style={{ color: row.approved.count > 0 ? '#166534' : '#9ca3af', fontWeight: row.approved.count > 0 ? 700 : 400 }}>{conv}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Quotations table */}
        <div className="section-title">Lista de Cotações</div>
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Empresa</th>
              <th>Responsável</th>
              <th>Data</th>
              <th className="text-center">Status</th>
              <th className="text-center">Itens</th>
              <th className="text-right">Total BRL</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map(q => {
              const label = STATUS_LABEL[q.status] ?? 'Salva'
              const badgeClass = {
                Salva: 'badge-salva',
                Enviada: 'badge-enviada',
                Aprovada: 'badge-aprovada',
                Perdida: 'badge-perdida',
              }[label] ?? 'badge-salva'
              return (
                <tr key={q.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{q.quote_number}</td>
                  <td>{q.client_company || '—'}</td>
                  <td>{q.responsible_name || q.client_contact || '—'}</td>
                  <td>{formatDateBR(q.created_at)}</td>
                  <td className="text-center">
                    <span className={badgeClass}>{label}</span>
                  </td>
                  <td className="text-center">{getItemCount(q)}</td>
                  <td className="text-right mono" style={{ fontWeight: 600 }}>R$ {brl(getTotal(q))}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}>
              <td colSpan={5}>Total Geral</td>
              <td className="text-center">{quotations.reduce((a, q) => a + getItemCount(q), 0)}</td>
              <td className="text-right mono">R$ {brl(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="footer">
          <span>Shiplog Pharma — Relatório de Cotações</span>
          <span>Gerado em {now}</span>
        </div>
      </div>
    </>
  )
}
