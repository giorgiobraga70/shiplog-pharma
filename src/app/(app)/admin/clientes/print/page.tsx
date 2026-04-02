'use client'

import { useEffect, useState } from 'react'

interface ClientQuotation {
  quote_number: string
  created_at: string
  status: string
  items: number
  total: number
}

interface ClientData {
  id: string
  empresa: string
  cnpj: string
  contato: string
  email: string
  telefone: string
  endereco: string
  quotations: ClientQuotation[]
}

interface PrintData {
  clients: ClientData[]
  totalClients: number
  totalQuotations: number
}

const STATUS_LABEL: Record<string, string> = {
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

export default function ClientesPrintPage() {
  const [data, setData] = useState<PrintData | null>(null)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('clientes_print_data')
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

  const { clients, totalClients, totalQuotations } = data
  const now = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const totalBrl = clients.reduce(
    (acc, c) => acc + c.quotations.reduce((a, q) => a + q.total, 0),
    0
  )

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          * { box-shadow: none !important; }
          .page-break { page-break-after: always; }
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
          margin-bottom: 8px;
        }
        th, td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #374151;
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
          grid-template-columns: repeat(3, 1fr);
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
        .client-block {
          margin-bottom: 28px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .client-header {
          background: #EFF6FF;
          padding: 10px 14px;
          border-bottom: 1px solid #dbeafe;
        }
        .client-name {
          font-size: 14px;
          font-weight: 700;
          color: #0C3460;
        }
        .client-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 24px;
          padding: 10px 14px;
          font-size: 11px;
          color: #374151;
          border-bottom: 1px solid #e2e8f0;
        }
        .client-details .field-label {
          font-weight: 600;
          color: #6b7280;
        }
        .client-quotations {
          padding: 0;
        }
        .no-quotations {
          padding: 10px 14px;
          font-size: 11px;
          color: #9ca3af;
          font-style: italic;
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
            <div className="report-title">Relatório de Clientes</div>
          </div>
          <div className="meta">
            <div>Gerado em: {now}</div>
            <div>{totalClients} clientes · {totalQuotations} cotações</div>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">Total de Clientes</div>
            <div className="value">{totalClients}</div>
          </div>
          <div className="summary-card">
            <div className="label">Total de Cotações</div>
            <div className="value">{totalQuotations}</div>
          </div>
          <div className="summary-card">
            <div className="label">Volume Total</div>
            <div className="value" style={{ fontSize: 14 }}>R$ {brl(totalBrl)}</div>
          </div>
        </div>

        {/* Client list */}
        <div className="section-title">Clientes e Histórico de Cotações</div>

        {clients.map(c => {
          const clientTotal = c.quotations.reduce((a, q) => a + q.total, 0)
          return (
            <div key={c.id} className="client-block">
              <div className="client-header">
                <div className="client-name">{c.empresa}</div>
              </div>
              <div className="client-details">
                {c.cnpj && (
                  <>
                    <span><span className="field-label">CNPJ:</span> {c.cnpj}</span>
                    <span></span>
                  </>
                )}
                {c.contato && (
                  <span><span className="field-label">Contato:</span> {c.contato}</span>
                )}
                {c.email && (
                  <span><span className="field-label">E-mail:</span> {c.email}</span>
                )}
                {c.telefone && (
                  <span><span className="field-label">Telefone:</span> {c.telefone}</span>
                )}
                {c.endereco && (
                  <span style={{ gridColumn: '1 / -1' }}><span className="field-label">Endereço:</span> {c.endereco}</span>
                )}
              </div>
              <div className="client-quotations">
                {c.quotations.length === 0 ? (
                  <div className="no-quotations">Nenhuma cotação registrada para este cliente.</div>
                ) : (
                  <table style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Data</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Itens</th>
                        <th className="text-right">Total BRL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.quotations.map(q => {
                        const label = STATUS_LABEL[q.status] ?? q.status
                        const badgeClass = {
                          Salva: 'badge-salva',
                          Enviada: 'badge-enviada',
                          Aprovada: 'badge-aprovada',
                          Perdida: 'badge-perdida',
                        }[label] ?? 'badge-salva'
                        return (
                          <tr key={q.quote_number}>
                            <td className="mono" style={{ fontWeight: 600 }}>{q.quote_number}</td>
                            <td>{formatDateBR(q.created_at)}</td>
                            <td className="text-center">
                              <span className={badgeClass}>{label}</span>
                            </td>
                            <td className="text-center">{q.items}</td>
                            <td className="text-right mono" style={{ fontWeight: 600 }}>R$ {brl(q.total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                        <td colSpan={3}>Subtotal {c.empresa}</td>
                        <td className="text-center">{c.quotations.reduce((a, q) => a + q.items, 0)}</td>
                        <td className="text-right mono">R$ {brl(clientTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )
        })}

        {/* Overall summary */}
        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#EFF6FF', borderRadius: 6, border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0C3460' }}>
              Resumo Geral: {totalClients} clientes · {totalQuotations} cotações
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0C3460', fontFamily: 'Courier New, monospace' }}>
              R$ {brl(totalBrl)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>Shiplog Pharma — Relatório de Clientes</span>
          <span>Gerado em {now}</span>
        </div>
      </div>
    </>
  )
}
