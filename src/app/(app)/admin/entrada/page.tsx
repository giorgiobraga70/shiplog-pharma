'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Save, CheckCircle } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NcmRow {
  type: string
  ii: number
  ipi: number
  pis: number
  cofins: number
  icms: number
}

interface MarkupRow {
  type: string
  qty10: number
  qty20: number
  qty50: number
  qty100: number
  qty200: number
}

interface Params {
  usdBrl: number
  eurBrl: number
  usdCny: number
  eurCny: number
  freightUsd: number
  insurance: number
  containerM3: number
  siscomex: number
  sda: number
  blRelease: number
  deconsolidation: number
  stevedoring: number
  customsClearance: number
  taxAdm: number
  storage: number
  storageHorto: number
  destination: number
  roadFreight: number
  others: number
}

// ─── Valores padrão ───────────────────────────────────────────────────────────

const DEFAULT_PARAMS: Params = {
  usdBrl: 5.25,
  eurBrl: 6.042,
  usdCny: 6.913,
  eurCny: 7.975,
  freightUsd: 3000,
  insurance: 0.2,
  containerM3: 70,
  siscomex: 347.02,
  sda: 150,
  blRelease: 310,
  deconsolidation: 324,
  stevedoring: 1800,
  customsClearance: 1621,
  taxAdm: 0,
  storage: 5000,
  storageHorto: 0,
  destination: 0,
  roadFreight: 5000,
  others: 924,
}

const DEFAULT_NCM: NcmRow[] = [
  { type: 'Frasco', ii: 9.0,  ipi: 9.75, pis: 2.1, cofins: 9.65, icms: 18.0 },
  { type: 'Ampola', ii: 9.0,  ipi: 0.0,  pis: 2.1, cofins: 9.65, icms: 18.0 },
  { type: 'Rolha',  ii: 18.0, ipi: 5.0,  pis: 2.1, cofins: 9.65, icms: 18.0 },
  { type: 'Selo',   ii: 16.0, ipi: 0.0,  pis: 2.1, cofins: 9.65, icms: 18.0 },
]

const DEFAULT_MARKUP: MarkupRow[] = [
  { type: 'Frasco', qty10: 70, qty20: 65, qty50: 60, qty100: 55, qty200: 50 },
  { type: 'Ampola', qty10: 70, qty20: 65, qty50: 60, qty100: 55, qty200: 50 },
  { type: 'Rolha',  qty10: 70, qty20: 65, qty50: 60, qty100: 55, qty200: 50 },
  { type: 'Selo',   qty10: 70, qty20: 65, qty50: 60, qty100: 55, qty200: 50 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EntradaDeDadosPage() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [ncmRows, setNcmRows] = useState<NcmRow[]>(DEFAULT_NCM)
  const [markupRows, setMarkupRows] = useState<MarkupRow[]>(DEFAULT_MARKUP)

  const [loadingExchange, setLoadingExchange] = useState(false)
  const [exchangeUpdatedAt, setExchangeUpdatedAt] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // ── Carregar dados do Supabase ao montar ──────────────────────────────────

  useEffect(() => {
    async function loadParams() {
      try {
        const { data, error } = await supabase
          .from('global_params')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (error || !data) return

        setParams({
          usdBrl: data.usd_brl ?? DEFAULT_PARAMS.usdBrl,
          eurBrl: data.eur_brl ?? DEFAULT_PARAMS.eurBrl,
          usdCny: data.usd_cny ?? DEFAULT_PARAMS.usdCny,
          eurCny: data.eur_cny ?? DEFAULT_PARAMS.eurCny,
          freightUsd: data.freight_usd ?? DEFAULT_PARAMS.freightUsd,
          insurance: data.insurance ?? DEFAULT_PARAMS.insurance,
          containerM3: data.container_m3 ?? DEFAULT_PARAMS.containerM3,
          siscomex: data.siscomex ?? DEFAULT_PARAMS.siscomex,
          sda: data.sda ?? DEFAULT_PARAMS.sda,
          blRelease: data.bl_release ?? DEFAULT_PARAMS.blRelease,
          deconsolidation: data.deconsolidation ?? DEFAULT_PARAMS.deconsolidation,
          stevedoring: data.stevedoring ?? DEFAULT_PARAMS.stevedoring,
          customsClearance: data.customs_clearance ?? DEFAULT_PARAMS.customsClearance,
          taxAdm: data.tax_adm ?? DEFAULT_PARAMS.taxAdm,
          storage: data.storage ?? DEFAULT_PARAMS.storage,
          storageHorto: data.storage_horto ?? DEFAULT_PARAMS.storageHorto,
          destination: data.destination ?? DEFAULT_PARAMS.destination,
          roadFreight: data.road_freight ?? DEFAULT_PARAMS.roadFreight,
          others: data.others ?? DEFAULT_PARAMS.others,
        })

        if (data.ncm_rates) setNcmRows(data.ncm_rates)
        if (data.markup_table) setMarkupRows(data.markup_table)

        if (data.updated_at) {
          const d = new Date(data.updated_at)
          setLastSaved(
            `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
          )
        }
      } catch {
        // silently use defaults
      }
    }

    loadParams()
  }, [])

  // ── Câmbio derivado ───────────────────────────────────────────────────────

  const freightBrl = params.freightUsd * params.usdBrl

  const totalCustosLocais =
    params.siscomex +
    params.sda +
    params.blRelease +
    params.deconsolidation +
    params.stevedoring +
    params.customsClearance +
    params.taxAdm +
    params.storage +
    params.storageHorto +
    params.destination +
    params.roadFreight +
    params.others

  const totalAduaneiro = freightBrl + totalCustosLocais

  // ── Atualizar câmbio ──────────────────────────────────────────────────────

  const handleUpdateExchange = useCallback(async () => {
    setLoadingExchange(true)
    try {
      const res = await fetch(
        'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,USD-CNY,EUR-CNY'
      )
      const data = await res.json()

      setParams(prev => ({
        ...prev,
        usdBrl: parseFloat(data.USDBRL.bid),
        eurBrl: parseFloat(data.EURBRL.bid),
        usdCny: parseFloat(data.USDCNY.bid),
        eurCny: parseFloat(data.EURCNY.bid),
      }))

      const now = new Date()
      setExchangeUpdatedAt(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      )
    } catch {
      // keep current values
    } finally {
      setLoadingExchange(false)
    }
  }, [])

  // ── Salvar parâmetros ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const now = new Date().toISOString()

      const { error } = await supabase.from('global_params').insert({
        usd_brl: params.usdBrl,
        eur_brl: params.eurBrl,
        usd_cny: params.usdCny,
        eur_cny: params.eurCny,
        freight_usd: params.freightUsd,
        insurance: params.insurance,
        container_m3: params.containerM3,
        siscomex: params.siscomex,
        sda: params.sda,
        bl_release: params.blRelease,
        deconsolidation: params.deconsolidation,
        stevedoring: params.stevedoring,
        customs_clearance: params.customsClearance,
        tax_adm: params.taxAdm,
        storage: params.storage,
        storage_horto: params.storageHorto,
        destination: params.destination,
        road_freight: params.roadFreight,
        others: params.others,
        ncm_rates: ncmRows,
        markup_table: markupRows,
        updated_at: now,
      })

      if (!error) {
        const d = new Date(now)
        setLastSaved(
          `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        )
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      // handle silently
    } finally {
      setSaving(false)
    }
  }, [params, ncmRows, markupRows])

  // ── Helpers de atualização de estado ─────────────────────────────────────

  const setParam = (key: keyof Params, value: string) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const setNcmCell = (rowIdx: number, key: keyof Omit<NcmRow, 'type'>, value: string) => {
    setNcmRows(prev =>
      prev.map((r, i) => (i === rowIdx ? { ...r, [key]: parseFloat(value) || 0 } : r))
    )
  }

  const setMarkupCell = (rowIdx: number, key: keyof Omit<MarkupRow, 'type'>, value: string) => {
    setMarkupRows(prev =>
      prev.map((r, i) => (i === rowIdx ? { ...r, [key]: parseFloat(value) || 0 } : r))
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldInput = (key: keyof Params, step = '0.01', unit = 'BRL') => (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step={step}
        value={params[key]}
        onChange={e => setParam(key, e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right w-28 focus:outline-none focus:ring-2 focus:ring-[#0C3460]/20 focus:border-[#0C3460]"
      />
      <span className="text-xs text-[#6B7280] w-8 shrink-0">{unit}</span>
    </div>
  )

  const fieldRow = (label: string, key: keyof Params, step = '0.01', unit = 'BRL') => (
    <div key={key} className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-gray-700 shrink-0">{label}</span>
      {fieldInput(key, step, unit)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-32">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Setup</h1>
        </div>

        {/* ── Custos Aduaneiros em 3 colunas ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Custos Aduaneiros</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>

            {/* Coluna 1 */}
            <div>
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Parâmetros de Frete</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-gray-700 shrink-0">Taxa USD/BRL</span>
                  {fieldInput('usdBrl', '0.001', 'R$')}
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-gray-700 shrink-0">Seguro</span>
                  {fieldInput('insurance', '0.001', '%')}
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-gray-700 shrink-0">Vol. Container</span>
                  {fieldInput('containerM3', '1', 'm³')}
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-gray-700 shrink-0">Frete USD</span>
                  {fieldInput('freightUsd', '0.01', 'USD')}
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-gray-700 shrink-0">Frete BRL</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={fmt(freightBrl)}
                      className="border border-gray-100 rounded-lg px-2 py-1.5 text-sm text-right w-28 bg-gray-50 text-[#6B7280] cursor-not-allowed"
                    />
                    <span className="text-xs text-[#6B7280] w-8 shrink-0">BRL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2 */}
            <div>
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Custos Locais I</h3>
              <div className="space-y-1">
                {fieldRow('Siscomex', 'siscomex')}
                {fieldRow('SDA', 'sda')}
                {fieldRow('Liberação BL', 'blRelease')}
                {fieldRow('Desconsolidação', 'deconsolidation')}
                {fieldRow('Capatazia', 'stevedoring')}
                {fieldRow('Desembaraço', 'customsClearance')}
              </div>
            </div>

            {/* Coluna 3 */}
            <div>
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Custos Locais II</h3>
              <div className="space-y-1">
                {fieldRow('Taxa de Adm', 'taxAdm')}
                {fieldRow('Armaz. Porto', 'storage')}
                {fieldRow('Armaz. Horto', 'storageHorto')}
                {fieldRow('Destino', 'destination')}
                {fieldRow('Outros', 'others')}
                {fieldRow('Rodoviário', 'roadFreight')}
              </div>
            </div>
          </div>

          {/* Total Custos Locais — alinhado abaixo das colunas 2 e 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }} className="mt-4 pt-4 border-t border-gray-200">
            <div />
            <div style={{ gridColumn: 'span 2' }}>
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm font-semibold text-gray-900">Total Custos Locais</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fmt(totalCustosLocais)}
                    className="border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-semibold text-right w-28 bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                  <span className="text-xs text-[#6B7280] w-8 shrink-0">BRL</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm font-semibold text-gray-900">Total Aduaneiro</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fmt(totalAduaneiro)}
                    className="border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-semibold text-right w-28 bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                  <span className="text-xs text-[#6B7280] w-8 shrink-0">BRL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── NCM e Markup lado a lado ── */}
        <div className="grid grid-cols-2 gap-6">

          {/* Card Alíquotas por NCM */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alíquotas por NCM</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    {['Tipo', 'II%', 'IPI%', 'PIS%', 'COFINS%', 'ICMS%'].map(h => (
                      <th key={h} className="px-2 py-2 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ncmRows.map((row, i) => (
                    <tr key={row.type} className="border-t border-gray-100">
                      <td className="px-2 py-2 text-sm font-medium text-gray-700 text-center">{row.type}</td>
                      {(['ii', 'ipi', 'pis', 'cofins', 'icms'] as (keyof Omit<NcmRow, 'type'>)[]).map(field => (
                        <td key={field} className="px-1 py-1.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            value={row[field]}
                            onChange={e => setNcmCell(i, field, e.target.value)}
                            className="w-16 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0C3460]/30 focus:border-[#0C3460]"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setNcmRows(prev => [...prev, { type: `Tipo ${prev.length + 1}`, ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 }])}
              className="mt-3 text-xs text-[#0C3460] hover:underline font-medium"
            >
              + Adicionar Tipo
            </button>
          </div>

          {/* Card Markup por Quantidade */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Markup por Quantidade</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    {['Tipo', '10 cx', '20 cx', '50 cx', '100 cx', '200 cx'].map(h => (
                      <th key={h} className="px-2 py-2 text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {markupRows.map((row, i) => (
                    <tr key={row.type} className="border-t border-gray-100">
                      <td className="px-2 py-2 text-sm font-medium text-gray-700 text-center">{row.type}</td>
                      {(['qty10', 'qty20', 'qty50', 'qty100', 'qty200'] as (keyof Omit<MarkupRow, 'type'>)[]).map(field => (
                        <td key={field} className="px-1 py-1.5 text-center">
                          <div className="inline-flex items-center gap-0.5">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={row[field]}
                              onChange={e => setMarkupCell(i, field, e.target.value)}
                              className="w-14 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0C3460]/30 focus:border-[#0C3460]"
                            />
                            <span className="text-xs text-[#6B7280]">%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => setMarkupRows(prev => [...prev, { type: `Tipo ${prev.length + 1}`, qty10: 70, qty20: 65, qty50: 60, qty100: 55, qty200: 50 }])}
              className="mt-3 text-xs text-[#0C3460] hover:underline font-medium"
            >
              + Adicionar Tipo
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé de ações (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Última alteração */}
          <div className="text-sm text-[#6B7280]">
            {lastSaved ? (
              <span>Última alteração: <span className="font-medium text-gray-700">{lastSaved}</span></span>
            ) : (
              <span>Nenhuma alteração salva ainda</span>
            )}
          </div>

          {/* Toast de sucesso + botão */}
          <div className="flex items-center gap-4">
            {saveSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 rounded-lg">
                <CheckCircle size={16} />
                Parâmetros salvos com sucesso! ✓
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0C3460] hover:bg-[#0a2d54] disabled:opacity-60 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors"
            >
              <Save size={16} className={saving ? 'animate-pulse' : ''} />
              {saving ? 'Salvando...' : 'Salvar Parâmetros'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
