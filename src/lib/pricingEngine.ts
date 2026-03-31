/**
 * Shiplog Pharma — Motor de Precificação
 * Lógica validada contra a planilha Excel original célula a célula.
 *
 * Premissas confirmadas:
 *  - Frete rateado por m³ de container fixo (70 m³ = 20 pés)
 *  - Seguro calculado sobre (FOB + Naval), i.e., sobre CIF circular
 *  - Impostos em BRL/caixa, sobre CIF_BRL
 *  - ICMS "por dentro" com base = CIF + II + IPI + PIS + COFINS
 *  - Desemb rateado por m³ (exclui frete marítimo)
 *  - Markup aplicado na cotação: preço_final = custo_base / (1 - markup_rate)
 */

export interface GlobalParams {
  usdBrl: number          // taxa USD→BRL  ex: 5.25
  eurBrl: number          // taxa EUR→BRL  ex: 6.042
  usdCny: number          // taxa USD→CNY  ex: 6.9133

  freightUsd: number      // frete marítimo total USD  ex: 3000.00
  freightBrl: number      // frete marítimo total BRL  ex: 15711.30
  containerM3: number     // volume do container m³    ex: 70.0  (20 pés padrão)

  insurance: number       // seguro %  ex: 0.002 (0,2%)

  // Custos aduaneiros BRL (excluem frete, incluídos em "Desemb")
  siscomex: number        // ex: 347.02
  sda: number             // ex: 150.00
  blRelease: number       // ex: 310.00
  deconsolidation: number // ex: 324.00
  stevedoring: number     // ex: 1800.00
  customsClearance: number // ex: 1621.00
  storage: number         // ex: 5000.00
  roadFreight: number     // ex: 5000.00
  others: number          // ex: 924.00
}

export interface NcmTaxRates {
  ii: number      // ex: 0.09
  ipi: number     // ex: 0.0975  (0 para ampolas)
  pis: number     // ex: 0.021
  cofins: number  // ex: 0.0965
  icms: number    // ex: 0.18
}

export interface MarkupTable {
  qty10: number   // ex: 0.70
  qty20: number   // ex: 0.65
  qty50: number   // ex: 0.60
  qty100: number  // ex: 0.55
  qty200: number  // ex: 0.50
}

export interface Product {
  id: string
  description: string
  partNumber: string
  productType: string
  ncmCode: string
  taxRates: NcmTaxRates
  markupTable: MarkupTable
  pcsPerBox: number
  weightGrossKg: number
  volumeBoxM3: number
  fobUsd: number   // preço FOB por unidade em USD
}

export interface QuotationItem {
  product: Product
  qtyBoxes: number
}

export interface PricingBreakdown {
  // Identificação
  productId: string
  description: string
  partNumber: string
  qtyBoxes: number

  // Quantidades
  qtyUnits: number
  volumeM3: number
  weightKg: number

  // Cálculo USD por caixa
  fobUsdBox: number
  navalUsdBox: number
  insuranceUsdBox: number
  cifUsdBox: number

  // CIF em BRL por caixa
  cifBrlBox: number

  // Impostos BRL por caixa
  iiValue: number
  ipiValue: number
  pisValue: number
  cofinsValue: number
  icmsValue: number
  totalTaxesBrl: number

  // Custo aduaneiro rateado BRL por caixa (sem frete marítimo)
  customsPerBox: number

  // Preço base BRL por caixa (sem markup)
  basePriceBox: number
  basePriceUnit: number

  // Markup e preço final
  markupRate: number
  finalPriceBox: number
  finalPriceUnit: number
  totalBrl: number
}

export interface QuotationResult {
  items: PricingBreakdown[]
  totalBoxes: number
  totalUnits: number
  totalVolumeM3: number
  totalWeightKg: number
  grandTotalBrl: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Soma custos aduaneiros sem o frete marítimo (rateados por m³ no "Desemb"). */
export function calcCustomsNoFreight(p: GlobalParams): number {
  return (
    p.siscomex + p.sda + p.blRelease + p.deconsolidation +
    p.stevedoring + p.customsClearance + p.storage +
    p.roadFreight + p.others
  )
}

/** Resolve markup pela faixa de quantidade de caixas. */
export function resolveMarkup(table: MarkupTable, qtyBoxes: number): number {
  if (qtyBoxes >= 200) return table.qty200
  if (qtyBoxes >= 100) return table.qty100
  if (qtyBoxes >= 50)  return table.qty50
  if (qtyBoxes >= 20)  return table.qty20
  return table.qty10
}

// ─── Motor principal ───────────────────────────────────────────────────────────

export function calcItemPrice(
  item: QuotationItem,
  params: GlobalParams
): PricingBreakdown {
  const { product, qtyBoxes } = item
  const { taxRates, markupTable, pcsPerBox, weightGrossKg, volumeBoxM3, fobUsd } = product
  const { usdBrl, freightUsd, containerM3, insurance } = params

  // ── Quantidades ──────────────────────────────────────────────────────────
  const qtyUnits  = qtyBoxes * pcsPerBox
  const volumeM3  = qtyBoxes * volumeBoxM3
  const weightKg  = qtyBoxes * weightGrossKg

  // ── USD por caixa ─────────────────────────────────────────────────────────
  const fobUsdBox     = fobUsd * pcsPerBox
  const navalUsdBox   = freightUsd / containerM3 * volumeBoxM3   // frete por m³
  const insuranceUsdBox = (fobUsdBox + navalUsdBox) * insurance / (1 - insurance)
  const cifUsdBox     = fobUsdBox + navalUsdBox + insuranceUsdBox

  // ── CIF em BRL por caixa ──────────────────────────────────────────────────
  const cifBrlBox = cifUsdBox * usdBrl

  // ── Impostos BRL por caixa ────────────────────────────────────────────────
  const iiValue     = cifBrlBox * taxRates.ii
  const ipiValue    = (cifBrlBox + iiValue) * (taxRates.ipi ?? 0)
  const pisValue    = cifBrlBox * taxRates.pis
  const cofinsValue = cifBrlBox * taxRates.cofins

  // ICMS "por dentro": base = CIF + II + IPI + PIS + COFINS
  const icmsBase  = cifBrlBox + iiValue + ipiValue + pisValue + cofinsValue
  const icmsValue = icmsBase * taxRates.icms / (1 - taxRates.icms)

  const totalTaxesBrl = iiValue + ipiValue + pisValue + cofinsValue + icmsValue

  // ── Desemb rateado por m³ (sem frete marítimo) ───────────────────────────
  const customsNoFreight = calcCustomsNoFreight(params)
  const customsPerBox    = customsNoFreight / containerM3 * volumeBoxM3

  // ── Preço base (custo landed, sem markup) ────────────────────────────────
  const basePriceBox  = cifBrlBox + totalTaxesBrl + customsPerBox
  const basePriceUnit = basePriceBox / pcsPerBox

  // ── Markup e preço final de cotação ──────────────────────────────────────
  const markupRate    = resolveMarkup(markupTable, qtyBoxes)
  const finalPriceBox = basePriceBox / (1 - markupRate)
  const finalPriceUnit = finalPriceBox / pcsPerBox
  const totalBrl      = finalPriceBox * qtyBoxes

  return {
    productId: product.id, description: product.description,
    partNumber: product.partNumber, qtyBoxes, qtyUnits, volumeM3, weightKg,
    fobUsdBox, navalUsdBox, insuranceUsdBox, cifUsdBox, cifBrlBox,
    iiValue, ipiValue, pisValue, cofinsValue, icmsValue, totalTaxesBrl,
    customsPerBox, basePriceBox, basePriceUnit, markupRate,
    finalPriceBox, finalPriceUnit, totalBrl,
  }
}

export function calcQuotation(
  items: QuotationItem[],
  params: GlobalParams
): QuotationResult {
  const results = items.map(item => calcItemPrice(item, params))
  return {
    items: results,
    totalBoxes:    results.reduce((a, r) => a + r.qtyBoxes, 0),
    totalUnits:    results.reduce((a, r) => a + r.qtyUnits, 0),
    totalVolumeM3: results.reduce((a, r) => a + r.volumeM3, 0),
    totalWeightKg: results.reduce((a, r) => a + r.weightKg, 0),
    grandTotalBrl: results.reduce((a, r) => a + r.totalBrl, 0),
  }
}
