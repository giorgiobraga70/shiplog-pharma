/**
 * Serviço de cotação — orquestra precificação, persistência e geração de PDF
 */

import { calcQuotation, GlobalParams, QuotationItem, QuotationTotal } from './pricingEngine'

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'lost'

export interface QuotationMeta {
  id: string
  quoteNumber: string      // ex: C26MMDD-02
  createdBy: string
  clientCompany: string
  clientContact: string
  clientEmail: string
  incoterm: string
  currency: 'USD' | 'BRL' | 'EUR'
  paymentTerms: string
  deliveryDays: number
  originPort: string
  destinationPort: string
  validityDays: number
  status: QuotationStatus
  notes?: string
}

export interface FullQuotation extends QuotationMeta {
  pricing: QuotationTotal
  paramsSnapshot: GlobalParams   // snapshot dos parâmetros usados
  createdAt: Date
}

// ─── Gerador de número de cotação ────────────────────────────────────────────
// Formato: C[YY][MM][DD]-[seq]   ex: C26MMDD-01
export function generateQuoteNumber(date: Date, sequence: number): string {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const seq = String(sequence).padStart(2, '0')
  return `C${yy}${mm}${dd}-${seq}`
}

// ─── Criação de cotação completa ──────────────────────────────────────────────
export function createQuotation(
  meta: QuotationMeta,
  items: QuotationItem[],
  params: GlobalParams
): FullQuotation {
  const pricing = calcQuotation(items, params)

  return {
    ...meta,
    pricing,
    paramsSnapshot: { ...params },   // snapshot imutável
    createdAt: new Date(),
  }
}

// ─── Resumo formatado para exibição ──────────────────────────────────────────
export function formatQuotationSummary(q: FullQuotation): string {
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const lines = [
    `Cotação: ${q.quoteNumber}`,
    `Cliente: ${q.clientCompany}`,
    `Status:  ${q.status}`,
    ``,
    `Itens:`,
    ...q.pricing.items.map(i =>
      `  ${i.description.substring(0, 40).padEnd(40)} | ${i.qtyBoxes} cx | R$ ${fmt(i.finalPriceBox)}/cx | Total: R$ ${fmt(i.totalBrl)}`
    ),
    ``,
    `Total caixas:   ${q.pricing.totalBoxes}`,
    `Total unidades: ${q.pricing.totalUnits.toLocaleString('pt-BR')}`,
    `Volume total:   ${q.pricing.totalVolumeM3.toFixed(4)} m³`,
    `Peso total:     ${q.pricing.totalWeightKg.toFixed(1)} Kg`,
    `TOTAL GERAL:    R$ ${fmt(q.pricing.grandTotalBrl)}`,
  ]
  return lines.join('\n')
}
