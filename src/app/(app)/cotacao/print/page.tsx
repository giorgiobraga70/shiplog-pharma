'use client'

import { useEffect, useState } from 'react'

interface PrintData {
  quoteNumber: string
  date: string
  responsibleName?: string
  clientCompany: string
  clientCnpj?: string
  clientEmail: string
  clientContact: string
  clientPhone?: string
  clientAddress?: string
  clientCity?: string
  clientState?: string
  clientCep?: string
  usdBrl: number
  localEntrega?: string
  freteEntrega?: number
  paymentTerms: string
  deliveryDays: number
  validityDays: number
  fornecedor?: string
  clientNotes?: string | null
  items: Array<{
    description: string
    partNumber: string
    ncmCode: string
    volumeMl: number | null
    tamanho: string | null
    pcsPerBox: number
    qtyBoxes: number
    qtyUnits: number
    volumeM3: number
    weightKg: number
    finalPriceUnit: number
    finalPriceBox: number
    finalPriceUnitSIpi: number
    finalPriceBoxSIpi: number
    finalPriceUnitSImp: number
    finalPriceBoxSImp: number
    totalBrl: number
    totalSIpiBrl: number
    totalSImpBrl: number
  }>
  totals: {
    boxes: number
    units: number
    volumeM3: number
    weightKg: number
    grandTotalBrl: number
    grandTotalSIpiBrl: number
    grandTotalSImpBrl: number
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
    } catch (err: unknown) {
      console.error(err)
      setEmailStatus('error')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('quotation_print_data')
      if (!raw) { setError(true); return }
      const parsed: PrintData = JSON.parse(raw)
      setData(parsed)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    if (!data) return
    const timer = setTimeout(() => { window.print() }, 800)
    return () => clearTimeout(timer)
  }, [data])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center p-8 max-w-md">
          <p className="text-gray-600 text-base">
            Nenhum dado de cotação encontrado. Volte para a cotação e clique em Gerar PDF.
          </p>
          <button onClick={() => window.close()}
            className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: '#0C3460' }}>
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

  // Endereço completo numa linha
  const enderecoCompleto = [
    data.clientAddress,
    data.clientCity,
    data.clientState,
    data.clientCep ? `CEP ${data.clientCep}` : null,
  ].filter(Boolean).join(', ')

  return (
    <>
      {/* CSS de impressão */}
      <style media="print">{`
        @page { size: A4 landscape; margin: 8mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      `}</style>

      <div className="bg-white min-h-screen"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1a1a1a' }}>

        {/* Botões — ocultos na impressão */}
        <div className="no-print flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-gray-50"
          style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#0C3460' }}>
            Imprimir / Salvar PDF
          </button>
          <button onClick={() => window.close()}
            className="px-4 py-2 rounded-lg text-sm font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#0C3460', color: '#0C3460' }}>
            Voltar
          </button>
          <button onClick={handleSendEmail} disabled={isSending}
            className="no-print bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50">
            {isSending ? 'Enviando...' : '📧 Enviar por E-mail'}
          </button>
          {emailStatus === 'success' && <span className="text-sm font-medium text-green-700">E-mail enviado com sucesso!</span>}
          {emailStatus === 'error' && <span className="text-sm font-medium text-red-600">Erro ao enviar e-mail.</span>}
        </div>

        {/* Conteúdo */}
        <div id="quote-content" style={{ padding: '14px 18px', maxWidth: '100%' }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Shiplog Pharma"
                style={{ height: '55px', objectFit: 'contain', display: 'block' }} />
              <div style={{ fontSize: '9px', color: '#64748B', marginTop: '3px' }}>
                Frascos e Ampolas farmacêuticos
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0C3460', letterSpacing: '1px' }}>COTAÇÃO</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '2px', fontFamily: 'monospace' }}>
                N° {data.quoteNumber}
              </div>
            </div>
          </div>

          {/* Linha azul */}
          <div style={{ height: '2px', backgroundColor: '#0C3460', marginBottom: '7px' }} />

          {/* ── Dados do cliente ────────────────────────────────────────── */}
          <div style={{
            fontSize: '10px', marginBottom: '8px',
            padding: '5px 8px', backgroundColor: '#F9FAFB',
            borderRadius: '4px', border: '1px solid #E2E8F0',
          }}>
            {/* Linha 1: Empresa (75%) | Data (25%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2px 16px', marginBottom: '3px' }}>
              <div><span style={{ color: '#64748B' }}>Empresa: </span><strong>{data.clientCompany || '—'}</strong></div>
              <div style={{ textAlign: 'right' }}><span style={{ color: '#64748B' }}>Data: </span><strong>{data.date}</strong></div>
            </div>
            {/* Linha 2: Endereço (75%) | CNPJ (25%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2px 16px', marginBottom: '3px' }}>
              <div><span style={{ color: '#64748B' }}>Endereço: </span>{enderecoCompleto || '—'}</div>
              <div style={{ textAlign: 'right' }}><span style={{ color: '#64748B' }}>CNPJ: </span>{data.clientCnpj || '—'}</div>
            </div>
            {/* Linha 3: Contato (25%) | Telefone (25%) | E-mail (25%) | Responsável (25%) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px 16px' }}>
              <div><span style={{ color: '#64748B' }}>Contato: </span>{data.clientContact || '—'}</div>
              <div><span style={{ color: '#64748B' }}>Telefone: </span>{data.clientPhone || '—'}</div>
              <div><span style={{ color: '#64748B' }}>E-mail: </span>{data.clientEmail || '—'}</div>
              <div><span style={{ color: '#64748B' }}>Responsável: </span>{data.responsibleName || '—'}</div>
            </div>
          </div>

          {/* ── Tabela de itens ─────────────────────────────────────────── */}
          {/* table-layout: fixed para distribuição igual das 6 colunas de preço */}
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: '10px',
            marginBottom: '0', tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '2%' }} />     {/* N° */}
              <col style={{ width: '37.3%' }} />  {/* Descrição */}
              <col style={{ width: '7%' }} />     {/* Part Number */}
              <col style={{ width: '6%' }} />     {/* NCM */}
              <col style={{ width: '4%' }} />     {/* Volume */}
              <col style={{ width: '6%' }} />     {/* Tamanho */}
              <col style={{ width: '4%' }} />     {/* Peça/Caixa */}
              <col style={{ width: '4%' }} />     {/* Qtd Caixas */}
              <col style={{ width: '4%' }} />     {/* Qtd Peças */}
              <col style={{ width: '4.25%' }} />  {/* Peças c/Imp */}
              <col style={{ width: '4.25%' }} />  {/* Caixas c/Imp */}
              <col style={{ width: '4.25%' }} />  {/* Peças s/IPI */}
              <col style={{ width: '4.25%' }} />  {/* Caixas s/IPI */}
              <col style={{ width: '4.25%' }} />  {/* Peças s/Imp */}
              <col style={{ width: '4.25%' }} />  {/* Caixas s/Imp */}
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#0C3460', color: '#fff' }}>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>N°</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>Descrição</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>Part Number</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>NCM</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>Volume</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal' }}>Tamanho</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Peça/<br/>Caixa</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Qtd.<br/>Caixas</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Qtd.<br/>Peças</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Peças<br/>c/Imp.</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Caixas<br/>c/Imp.</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Peças<br/>s/IPI</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Caixas<br/>s/IPI</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Peças<br/>s/Imp.</th>
                <th style={{ ...thStyle('center'), whiteSpace: 'normal', lineHeight: 1.2 }}>Caixas<br/>s/Imp.</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx} style={{
                  backgroundColor: idx % 2 === 0 ? '#fff' : '#F8FAFC',
                  borderBottom: '1px solid #CBD5E1',
                }}>
                  <td style={tdStyle('center')}>{idx + 1}</td>
                  <td style={tdStyle('left')}>{item.description}</td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace', fontSize: '9px', wordBreak: 'break-all' }}>
                    {item.partNumber}
                  </td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace', fontSize: '9px' }}>{item.ncmCode || '—'}</td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace' }}>
                    {item.volumeMl != null ? `${item.volumeMl}ml` : '—'}
                  </td>
                  <td style={{ ...tdStyle('center'), fontSize: '9px' }}>{item.tamanho || '—'}</td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace' }}>
                    {item.pcsPerBox.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace' }}>
                    {item.qtyBoxes.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ ...tdStyle('center'), fontFamily: 'monospace' }}>
                    {item.qtyUnits.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 600 }}>{brl(item.finalPriceUnit)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceBox)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceUnitSIpi)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceBoxSIpi)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceUnitSImp)}</td>
                  <td style={{ ...tdStyle('right'), fontFamily: 'monospace' }}>{brl(item.finalPriceBoxSImp)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #93C5FD' }}>
                <td style={tdStyle('center')} />
                <td style={{ ...tdStyle('left'), fontWeight: 700, color: '#1E3A5F', fontSize: '10px' }}>
                  TOTAL
                </td>
                <td style={tdStyle('center')} />
                <td style={tdStyle('center')} />
                <td style={tdStyle('center')} />
                <td style={tdStyle('center')} />
                <td style={tdStyle('center')} />
                {/* QTD CX total */}
                <td style={{ ...tdStyle('center'), fontFamily: 'monospace', fontWeight: 700 }}>
                  {data.totals.boxes.toLocaleString('pt-BR')}
                </td>
                {/* QTD UN total */}
                <td style={{ ...tdStyle('center'), fontFamily: 'monospace', fontWeight: 700 }}>
                  {data.totals.units.toLocaleString('pt-BR')}
                </td>
                {/* UN C/Imp — vazio */}
                <td style={tdStyle('right')} />
                {/* CX C/Imp: grand total BRL */}
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700, color: '#0C3460' }}>
                  R$ {brl(data.totals.grandTotalBrl)}
                </td>
                {/* UN S/IPI — vazio */}
                <td style={tdStyle('right')} />
                {/* CX S/IPI total */}
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF' }}>
                  R$ {brl(data.totals.grandTotalSIpiBrl ?? 0)}
                </td>
                {/* UN S/Imp — vazio */}
                <td style={tdStyle('right')} />
                {/* CX S/Imp total */}
                <td style={{ ...tdStyle('right'), fontFamily: 'monospace', fontWeight: 700, color: '#065F46' }}>
                  R$ {brl(data.totals.grandTotalSImpBrl ?? 0)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Legenda dos preços — alinhada à direita, logo abaixo da tabela */}
          <div style={{ marginTop: '4px', fontSize: '8px', color: '#64748B', display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
            <span><strong>C/Imp.</strong> = com todos os impostos (II + IPI + PIS + COFINS + ICMS)</span>
            <span><strong>S/IPI</strong> = sem IPI (com demais impostos)</span>
            <span><strong>S/Imp.</strong> = sem impostos</span>
          </div>

          {/* Linha divisória */}
          <div style={{ height: '1px', backgroundColor: '#CBD5E1', margin: '6px 0' }} />

          {/* ── Condições comerciais ─────────────────────────────────────── */}
          <div style={{
            backgroundColor: '#F9FAFB', border: '1px solid #E2E8F0', borderRadius: '4px',
            padding: '6px 10px', fontSize: '10px',
          }}>
            {/* Linha 1: Pagamento | Prazo de Entrega | Validade */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '4px' }}>
              <div><span style={{ color: '#64748B', fontWeight: 600 }}>Condições de Pagamento: </span>{data.paymentTerms}</div>
              <div><span style={{ color: '#64748B', fontWeight: 600 }}>Prazo de Entrega: </span>{data.deliveryDays} dias</div>
              <div><span style={{ color: '#64748B', fontWeight: 600 }}>Validade da Cotação: </span>{data.validityDays} dias</div>
            </div>
            {/* Linha 2: Local de Entrega/Retirada | Frete (só se > 0) */}
            <div style={{ display: 'flex', gap: '32px', marginBottom: '4px' }}>
              {data.localEntrega && (
                <div><span style={{ color: '#64748B', fontWeight: 600 }}>Local de Entrega/Retirada: </span>{data.localEntrega}</div>
              )}
              {(data.freteEntrega ?? 0) > 0 && (
                <div><span style={{ color: '#64748B', fontWeight: 600 }}>Valor do Frete: </span>R$ {brl(data.freteEntrega!)}</div>
              )}
            </div>
            {/* Linha 3: Referência cambial + texto legal */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {data.usdBrl > 0 && (
                <div style={{ flexShrink: 0 }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Referência Cambial USD: </span>
                  <span style={{ fontFamily: 'monospace' }}>R$ {brl(data.usdBrl)}</span>
                </div>
              )}
              <div style={{ color: '#64748B', fontStyle: 'italic', flexShrink: 1 }}>
                Valor válido para taxa de câmbio indicada e carga tributária em vigor na data desta cotação; em caso de alterações desses parâmetros, o preço será ajustado proporcionalmente.
              </div>
            </div>
          </div>

          {/* ── Observações para o cliente ──────────────────────────────── */}
          {data.clientNotes && (
            <div style={{
              marginTop: '6px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '9.5px',
              color: '#78350F',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '3px', color: '#92400E' }}>Observações:</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{data.clientNotes}</div>
            </div>
          )}

          {/* Rodapé */}
          <div style={{
            marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #E2E8F0',
            fontSize: '8px', color: '#94A3B8', textAlign: 'center',
          }}>
            Este documento é uma proposta comercial e não possui valor fiscal. • Shiplog Pharma — shiplogpharma.com.br
          </div>
        </div>
      </div>
    </>
  )
}

// ── Helpers de estilo inline ──────────────────────────────────────────────────

function thStyle(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    padding: '5px 4px',
    textAlign: align,
    verticalAlign: 'middle',
    fontWeight: 600,
    fontSize: '9px',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderRight: '1px solid rgba(255,255,255,0.15)',
  }
}

function tdStyle(align: 'left' | 'right' | 'center'): React.CSSProperties {
  return {
    padding: '4px 4px',
    textAlign: align,
    borderRight: '1px solid #CBD5E1',
    verticalAlign: 'middle',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}
