import {
  calcItemPrice, calcQuotation, calcCustomsNoFreight,
  resolveMarkup, GlobalParams, Product, QuotationItem,
} from './pricingEngine'

const params: GlobalParams = {
  usdBrl: 5.25, eurBrl: 6.042, usdCny: 6.9133,
  freightUsd: 3000.00, freightBrl: 15711.30, containerM3: 70.0,
  insurance: 0.002,
  siscomex: 347.02, sda: 150.00, blRelease: 310.00,
  deconsolidation: 324.00, stevedoring: 1800.00,
  customsClearance: 1621.00, storage: 5000.00,
  roadFreight: 5000.00, others: 924.00,
}

// VT237C — linha 29 da planilha (sem markup aplicado no preço base)
const frasco7ml: Product = {
  id: 'VT237C', description: 'Frasco Type II/III 7ml Transp',
  partNumber: 'VT237C-22,1-40,8', productType: 'Frasco', ncmCode: '7010.90.90',
  taxRates: { ii: 0.09, ipi: 0.0975, pis: 0.021, cofins: 0.0965, icms: 0.18 },
  markupTable: { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 },
  pcsPerBox: 936, weightGrossKg: 17.7, volumeBoxM3: 0.02898, fobUsd: 0.01817,
}

// VSC3A — linha 2 da planilha
const frasco3ml: Product = {
  id: 'VSC3A', description: 'Frasco Schott 3ml Ambar',
  partNumber: 'VSC3A-14,5-35', productType: 'Frasco', ncmCode: '7010.90.90',
  taxRates: { ii: 0.09, ipi: 0.0975, pis: 0.021, cofins: 0.0965, icms: 0.18 },
  markupTable: { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 },
  pcsPerBox: 3696, weightGrossKg: 17.4, volumeBoxM3: 0.030444, fobUsd: 0.023575,
}

// 20W — linha 121 (Rolha, NCM diferente)
const rolha: Product = {
  id: '20W', description: 'Rolha 20 Branco',
  partNumber: '20W-18,8-8,8', productType: 'Rolha', ncmCode: '3923.50.00',
  taxRates: { ii: 0.18, ipi: 0.05, pis: 0.021, cofins: 0.0965, icms: 0.18 },
  markupTable: { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 },
  pcsPerBox: 5000, weightGrossKg: 10, volumeBoxM3: 0.024955, fobUsd: 0.010005,
}

function assert(ok: boolean, msg: string) {
  if (!ok) throw new Error(`FALHA: ${msg}`)
  console.log(`  ✓ ${msg}`)
}
function near(a: number, b: number, label: string, tol = 0.001) {
  const pct = b !== 0 ? Math.abs(a - b) / Math.abs(b) * 100 : Math.abs(a)
  if (pct > tol * 100) throw new Error(`FALHA: ${label}\n  esperado: ${b.toFixed(6)}\n  obtido:   ${a.toFixed(6)} (${pct.toFixed(3)}%)`)
  console.log(`  ✓ ${label}: ${a.toFixed(6)}  (ref: ${b.toFixed(6)}, err: ${pct.toFixed(4)}%)`)
}

console.log('\n=== 1. Custos aduaneiros (sem frete) ===')
near(calcCustomsNoFreight(params), 15476.02, 'Total desemb base')

console.log('\n=== 2. Markup por faixa ===')
const mk = frasco7ml.markupTable
assert(resolveMarkup(mk, 5)   === 0.70, 'qty  5 → 70%')
assert(resolveMarkup(mk, 10)  === 0.70, 'qty 10 → 70%')
assert(resolveMarkup(mk, 20)  === 0.65, 'qty 20 → 65%')
assert(resolveMarkup(mk, 50)  === 0.60, 'qty 50 → 60%')
assert(resolveMarkup(mk, 100) === 0.55, 'qty 100 → 55%')
assert(resolveMarkup(mk, 200) === 0.50, 'qty 200 → 50%')

console.log('\n=== 3. VT237C — preço base (sem markup) vs planilha ===')
const r7 = calcItemPrice({ product: frasco7ml, qtyBoxes: 10 }, params)
near(r7.navalUsdBox,   1.242,      'Naval USD/cx')
near(r7.cifUsdBox,    18.285618,   'CIF USD/cx')
near(r7.iiValue,       8.639955,   'II BRL/cx')
near(r7.ipiValue,     10.202346,   'IPI BRL/cx')
near(r7.pisValue,      2.015989,   'PIS BRL/cx')
near(r7.cofinsValue,   9.263951,   'COFINS BRL/cx')
near(r7.icmsValue,    27.685259,   'ICMS BRL/cx')
near(r7.totalTaxesBrl,57.807501,   'Total impostos/cx')
near(r7.customsPerBox, 6.407072,   'Desemb/cx')
near(r7.basePriceBox, 160.214069,  'Preço caixa BRL (base)')
near(r7.basePriceUnit,  0.171169,  'Preço unit BRL (base)')

console.log('\n=== 4. VT237C — com markup 70% na cotação ===')
near(r7.markupRate,    0.70,        'Markup rate')
near(r7.finalPriceBox, 160.214069 / 0.30, 'Final caixa c/ markup')
near(r7.finalPriceUnit, 0.171169   / 0.30, 'Final unit c/ markup')

console.log('\n=== 5. VSC3A — Schott 3ml Ambar ===')
const r3 = calcItemPrice({ product: frasco3ml, qtyBoxes: 10 }, params)
near(r3.navalUsdBox,  1.304743,  'Naval Schott/cx')
near(r3.basePriceBox, 752.102268,'Preço caixa base')
near(r3.basePriceUnit,  0.203491,'Preço unit base')

console.log('\n=== 6. Rolha 20W (NCM diferente, II=18%, IPI=5%) ===')
const rR = calcItemPrice({ product: rolha, qtyBoxes: 10 }, params)
near(rR.basePriceBox, 450.155762,'Preço caixa base Rolha')
near(rR.basePriceUnit,  0.090031,'Preço unit base Rolha')

console.log('\n=== 7. Cotação multi-item e totais ===')
const qt = calcQuotation([
  { product: frasco7ml, qtyBoxes: 10 },
  { product: frasco3ml, qtyBoxes: 5  },
  { product: rolha,     qtyBoxes: 2  },
], params)
assert(qt.totalBoxes === 17, 'Total 17 caixas')
assert(qt.totalUnits === (936*10 + 3696*5 + 5000*2), 'Total unidades')
assert(qt.grandTotalBrl > 0, 'Grand total > 0')
console.log(`  ✓ Grand total: R$ ${qt.grandTotalBrl.toFixed(2)}`)
console.log(`  ✓ Volume total: ${qt.totalVolumeM3.toFixed(4)} m³`)

console.log('\n=== 8. Escala de markup ===')
;[10, 20, 50, 100, 200].forEach(qty => {
  const r = calcItemPrice({ product: frasco7ml, qtyBoxes: qty }, params)
  console.log(`  ✓ ${qty} cx → markup ${(r.markupRate*100).toFixed(0)}% → R$ ${r.finalPriceUnit.toFixed(4)}/un`)
})

console.log('\n✅ Todos os testes passaram!\n')
