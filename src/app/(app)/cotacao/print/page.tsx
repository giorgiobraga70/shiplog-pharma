'use client'

import { useEffect, useState } from 'react'

interface PrintData {
  quoteNumber: string
  date: string
  clientCompany: string
  clientEmail: string
  clientContact: string
  incoterm: string
  usdBrl: number
  paymentTerms: string
  deliveryDays: number
  destinationPort: string
  validityDays: number
  items: Array<{
    description: string
    partNumber: string
    pcsPerBox: number
    qtyBoxes: number
    qtyUnits: number
    volumeM3: number
    weightKg: number
    finalPriceUnit: number
    finalPriceBox: number
    totalBrl: number
  }>
  totals: {
    boxes: number
    units: number
    volumeM3: number
    weightKg: number
    grandTotalBrl: number
  }
}

function brl(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function num(value: number, decimals = 2) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function CotacaoPrintPage() {
  const [data, setData] = useState<PrintData | null>(null)
  const [error, setError] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleSendEmail() {
    if (!data) return
    setIsSending(true)
    setEmailStatus('idle')
    try {
      const contentEl = document.getElementById('quote-content')
      const innerHtml = contentEl?.innerHTML ?? ''
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cotação Shiplog Pharma – ${data.quoteNumber}</title>
</head>
<body style="margin:0;padding:16px 20px;font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#ffffff;">
${innerHtml}
</body>
</html>`

      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.clientEmail,
          quoteNumber: data.quoteNumber,
          clientCompany: data.clientCompany,
          htmlContent,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Erro ao enviar e-mail')
      }
      setEmailStatus('success')
    } catch (err: any) {
      console.error(err)
      setEmailStatus('error')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('quotation_print_data')
      if (!raw) {
        setError(true)
        return
      }
      const parsed: PrintData = JSON.parse(raw)
      setData(parsed)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    const timer = setTimeout(() => {
      window.print()
    }, 800)
    return () => clearTimeout(timer)
  }, [data])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center p-8 max-w-md">
          <p className="text-gray-600 text-base">
            Nenhum dado de cotação encontrado. Volte para a cotação e clique em Gerar PDF.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: '#0C3460' }}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <>
      {/* CSS de impressão */}
      <style media="print">{`
        @page { size: A4 landscape; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      `}</style>

      <div
        className="bg-white min-h-screen"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#1a1a1a' }}
      >
        {/* Botões de ação — ocultos na impressão */}
        <div
          className="no-print flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50"
          style={{ position: 'sticky', top: 0, zIndex: 10 }}
        >
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0C3460' }}
          >
            Imprimir / Salvar PDF
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#0C3460', color: '#0C3460' }}
          >
            Voltar
          </button>
          <button
            onClick={handleSendEmail}
            disabled={isSending}
            className="no-print bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isSending ? 'Enviando...' : '📧 Enviar por E-mail'}
          </button>
          {emailStatus === 'success' && (
            <span className="text-sm font-medium text-green-700">E-mail enviado com sucesso!</span>
          )}
          {emailStatus === 'error' && (
            <span className="text-sm font-medium text-red-600">Erro ao enviar e-mail.</span>
          )}
        </div>

        {/* Conteúdo do documento */}
        <div id="quote-content" style={{ padding: '16px 20px', maxWidth: '100%' }}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            {/* Esquerda: logo + nome */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#0C3460',
                  borderRadius: '6px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '-0.5px' }}>SLP</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0C3460', lineHeight: 1.1 }}>
                SHIPLOG PHARMA
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                Frascos e Ampolas farmacêuticos
              </div>
            </div>

            {/* Direita: título + número */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0C3460', letterSpacing: '1px' }}>
                COTAÇÃO
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px', fontFamily: 'monospace' }}>
                N° {data.quoteNumber}
              </div>
            </div>
          </div>

          {/* Linha divisória azul */}
          <div style={{ height: '2px', backgroundColor: '#0C3460', marginBottom: '8px' }} />

          {/* ── Dados do cliente ─────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2px 24px',
              fontSize: '11px',
              marginBottom: '10px',
              padding: '6px 8px',
              backgroundColor: '#F9FAFB',
              borderRadius: '4px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div><span style={{ color: '#64748B' }}>Empresa: </span><strong>{data.clientCompany || '—'}</strong></div>
            <div><span style={{ color: '#64748B' }}>Cotação N°: </span><strong style={{ fontFamily: 'monospace' }}>{data.quoteNumber}</strong></div>
            <div><span style={{ color: '#64748B' }}>Email: </span>{data.clientEmail || '—'}</div>
            <div><span style={{ color: '#64748B' }}>Data: </span>{data.date}</div>
            <div><span style={{ color: '#64748B' }}>Contato: </span>{data.clientContact || '—'}</div>
            <div><span style={{ color: '#64748B' }}>Responsável: </span>Shiplog Pharma</div>
          </div>

          {/* ── Tabela de itens ──────────────────────────────────────── */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              marginBottom: '0',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0C3460', color: '#fff' }}>
                <th style={thStyle('left', '28px')}>N°</th>
                <th style={thStyle('left')}>Descritivo</th>
                <th style={thStyle('left', '70px')}>P/N</th>
                <th style={thStyle('center', '72px')}>Embalagem</th>
                <th style={thStyle('right', '68px')}>Qtd Caixas</th>
                <th style={thStyle('right', '72px')}>Qtd Unidades</th>
                <th style={thStyle('right', '68px')}>Volume m³</th>
                <th style={thStyle('right', '62px')}>Peso kg</th>
                <th style={thStyle('right', '72px')}>Unit BRL</th>
                <th style={thStyle('right', '72px')}>Cx BRL</th>
                <th style={thStyle('right', '82px')}>Total BRL</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : '#F8FAFC',
                    borderBottom: '1px solid #CBD5E1',
                  }}
                >
                  <td style={tdStyle('center')}>{idx + 1}</td>
                  <td style={tdStyle('left')}>{item.description}</td>
                  <td style={{ ...tdStyle('left'), fontFamily: 'monospace', fontSize: '10px' }}>{item.partNumber}</td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace' }}>{item.pcsPerBox.toLocaleString('pt-BR')}pcs/cx</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{item.qtyBoxes}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{item.qtyUnits.toLocaleString('pt-BR')}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{num(item.volumeM3, 3)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{num(item.weightKg, 1)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceUnit)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceBox)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 600 }}>{brl(item.totalBrl)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #93C5FD' }}>
                <td style={tdStyle('center')} />
                <td style={{ ...tdStyle('left'), fontWeight: 700, color: '#1E3A5F' }}>TOTAL</td>
                <td style={tdStyle('left')} />
                <td style={tdStyle('center')} />
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700 }}>{data.totals.boxes} cx</td>
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700 }}>{data.totals.units.toLocaleString('pt-BR')} un</td>
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700 }}>{num(data.totals.volumeM3, 3)} m³</td>
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700 }}>{num(data.totals.weightKg, 1)} kg</td>
                <td style={tdStyle('right')} />
                <td style={tdStyle('right')} />
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700, color: '#0C3460', fontSize: '12px' }}>
                  R$ {brl(data.totals.grandTotalBrl)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Linha divisória */}
          <div style={{ height: '1px', backgroundColor: '#CBD5E1', margin: '10px 0' }} />

          {/* ── Condições comerciais ─────────────────────────────────── */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E2E8F0',
              borderRadius: '4px',
              padding: '8px 10px',
              fontSize: '10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3px 24px',
            }}
          >
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Condições de Pagamento: </span>
              {data.paymentTerms}
            </div>
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Moeda/Incoterm: </span>
              USD {data.incoterm} Shanghai Port | BRL DAP {data.destinationPort}
            </div>
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Condições de Entrega: </span>
              {data.deliveryDays} dias após pagamento inicial
            </div>
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Validade da Cotação: </span>
              {data.validityDays} dias
            </div>
            <div>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Taxa Cambial USD: </span>
              {num(data.usdBrl, 2)} BRL
            </div>
          </div>

          {/* Rodapé */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '6px',
              borderTop: '1px solid #E2E8F0',
              fontSize: '9px',
              color: '#94A3B8',
              textAlign: 'center',
            }}
          >
            Este documento é uma proposta comercial e não possui valor fiscal. • Shiplog Pharma — shiplogpharma.com.br
          </div>
        </div>
      </div>
    </>
  )
}

// ── Helpers de estilo inline ──────────────────────────────────────────────────

function thStyle(align: 'left' | 'right' | 'center', width?: string): React.CSSProperties {
  return {
    padding: '6px 8px',
    textAlign: align,
    fontWeight: 600,
    fontSize: '10px',
    letterSpacing: '0.3px',
    width: width,
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.15)',
  }
}

function tdStyle(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    padding: '5px 8px',
    textAlign: align,
    borderRight: '1px solid #CBD5E1',
    verticalAlign: 'middle',
  }
}
