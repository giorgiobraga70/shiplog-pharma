/**
 * Serviço de atualização de câmbio via API externa
 * Suporta: Open Exchange Rates, AwesomeAPI (BR, gratuita), Fixer.io
 */

export interface ExchangeRates {
  usdBrl: number
  eurBrl: number
  usdCny: number
  eurCny: number
  fetchedAt: Date
  source: string
}

// ─── AwesomeAPI (gratuita, sem API key, foco BR) ──────────────────────────────
export async function fetchFromAwesomeAPI(): Promise<ExchangeRates> {
  const pairs = ['USD-BRL', 'EUR-BRL', 'USD-CNY', 'EUR-CNY']
  const url = `https://economia.awesomeapi.com.br/json/last/${pairs.join(',')}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`AwesomeAPI erro: ${res.status}`)
  const data = await res.json()

  return {
    usdBrl:    parseFloat(data['USDBRL']?.bid ?? '0'),
    eurBrl:    parseFloat(data['EURBRL']?.bid ?? '0'),
    usdCny:    parseFloat(data['USDCNY']?.bid ?? '0'),
    eurCny:    parseFloat(data['EURCNY']?.bid ?? '0'),
    fetchedAt: new Date(),
    source:    'awesomeapi',
  }
}

// ─── Open Exchange Rates (plano gratuito, apenas USD base) ────────────────────
export async function fetchFromOpenExchangeRates(appId: string): Promise<ExchangeRates> {
  const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}&symbols=BRL,CNY,EUR`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenExchangeRates erro: ${res.status}`)
  const data = await res.json()
  const r = data.rates

  return {
    usdBrl:    r.BRL,
    eurBrl:    r.BRL / r.EUR,
    usdCny:    r.CNY,
    eurCny:    r.CNY / r.EUR,
    fetchedAt: new Date(),
    source:    'openexchangerates',
  }
}

// ─── Orquestrador com fallback ────────────────────────────────────────────────
export async function fetchExchangeRates(openExchangeAppId?: string): Promise<ExchangeRates> {
  try {
    // Tenta AwesomeAPI primeiro (gratuita, foco BRL)
    return await fetchFromAwesomeAPI()
  } catch (e) {
    console.warn('AwesomeAPI falhou, tentando Open Exchange Rates...', e)
    if (!openExchangeAppId) throw new Error('Nenhuma fonte de câmbio disponível')
    return await fetchFromOpenExchangeRates(openExchangeAppId)
  }
}

// ─── Verificador de variação (alerta de câmbio) ───────────────────────────────
export interface ExchangeAlert {
  pair: string
  currentRate: number
  defaultRate: number
  variationPct: number
  exceeded: boolean
}

export function checkExchangeVariation(
  current: ExchangeRates,
  defaults: { usdBrl: number; eurBrl: number },
  thresholdPct: number = 3.0   // alerta se variar mais de 3%
): ExchangeAlert[] {
  const check = (pair: string, curr: number, def: number): ExchangeAlert => {
    const variationPct = ((curr - def) / def) * 100
    return { pair, currentRate: curr, defaultRate: def, variationPct, exceeded: Math.abs(variationPct) > thresholdPct }
  }

  return [
    check('USD/BRL', current.usdBrl, defaults.usdBrl),
    check('EUR/BRL', current.eurBrl, defaults.eurBrl),
  ]
}
