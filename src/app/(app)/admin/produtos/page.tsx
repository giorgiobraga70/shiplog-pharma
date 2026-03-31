'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { calcItemPrice, type GlobalParams } from '@/lib/pricingEngine'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string
  seq_no: number
  description: string
  part_number: string
  product_type: string
  volume_ml: number | null
  pcs_per_box: number
  weight_gross_kg: number
  volume_box_m3: number
  fob_usd: number | null
  ncm_code: string
  is_active: boolean
}

// ─── Dados mock ─────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: DbProduct[] = [
  { id: '1', seq_no: 2,   description: 'Frasco Schott 3ml Ambar',        part_number: 'VSC3A-14,5-35',    product_type: 'Frasco',         volume_ml: 3,    pcs_per_box: 3696,  weight_gross_kg: 30.0, volume_box_m3: 0.035, fob_usd: 0.0235, ncm_code: '7010.90.90', is_active: true },
  { id: '2', seq_no: 7,   description: 'Frasco 2R 4ml Transparente',     part_number: 'V2R4C-16-35',      product_type: 'Frasco',         volume_ml: 4,    pcs_per_box: 4116,  weight_gross_kg: 28.0, volume_box_m3: 0.035, fob_usd: 0.0253, ncm_code: '7010.90.90', is_active: true },
  { id: '3', seq_no: 28,  description: 'Frasco Type II/III 7ml Ambar',   part_number: 'VT237A-22,1-45',   product_type: 'Frasco',         volume_ml: 7,    pcs_per_box: 936,   weight_gross_kg: 17.7, volume_box_m3: 0.029, fob_usd: 0.0181, ncm_code: '7010.90.90', is_active: true },
  { id: '4', seq_no: 45,  description: 'Frasco Type I 10ml Transparente', part_number: 'VT110C-22,1-45', product_type: 'Frasco',         volume_ml: 10,   pcs_per_box: 936,   weight_gross_kg: 20.0, volume_box_m3: 0.029, fob_usd: 0.0220, ncm_code: '7010.90.90', is_active: true },
  { id: '5', seq_no: 80,  description: 'Ampola 2ml Transparente',         part_number: 'A2C-11,8-58',     product_type: 'Ampola',         volume_ml: 2,    pcs_per_box: 3840,  weight_gross_kg: 25.0, volume_box_m3: 0.026, fob_usd: 0.0089, ncm_code: '7010.10.00', is_active: true },
  { id: '6', seq_no: 95,  description: 'Ampola 5ml Transparente',         part_number: 'A5C-14,5-75',     product_type: 'Ampola',         volume_ml: 5,    pcs_per_box: 2400,  weight_gross_kg: 28.0, volume_box_m3: 0.030, fob_usd: 0.0120, ncm_code: '7010.10.00', is_active: true },
  { id: '7', seq_no: 121, description: 'Rolha 20 Branco',                 part_number: '20W-18,8-8,8',    product_type: 'Rolha',          volume_ml: null, pcs_per_box: 5000,  weight_gross_kg: 22.0, volume_box_m3: 0.024, fob_usd: 0.0100, ncm_code: '3923.50.00', is_active: true },
  { id: '8', seq_no: 135, description: 'Selo Alum Flip Ø20',              part_number: 'AF-20',           product_type: 'Selo Alum Flip', volume_ml: null, pcs_per_box: 20000, weight_gross_kg: 12.0, volume_box_m3: 0.018, fob_usd: null,   ncm_code: '8309.90.00', is_active: true },
]

// ─── Taxas por NCM ──────────────────────────────────────────────────────────────

const NCM_TAXES: Record<string, { ii: number; ipi: number; pis: number; cofins: number; icms: number }> = {
  '7010.90.90': { ii: 0.09,  ipi: 0.0975, pis: 0.021, cofins: 0.0965, icms: 0.18 },
  '7010.10.00': { ii: 0.09,  ipi: 0,      pis: 0.021, cofins: 0.0965, icms: 0.18 },
  '3923.50.00': { ii: 0.18,  ipi: 0.05,   pis: 0.021, cofins: 0.0965, icms: 0.18 },
  '8309.90.00': { ii: 0.16,  ipi: 0,      pis: 0.021, cofins: 0.0965, icms: 0.18 },
}

const MARKUP_TABLE = { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 }

// ─── Parâmetros globais padrão ──────────────────────────────────────────────────

const DEFAULT_PARAMS: GlobalParams = {
  usdBrl: 5.25,
  eurBrl: 6.042,
  usdCny: 6.9133,
  freightUsd: 3000,
  freightBrl: 15750,
  containerM3: 70,
  insurance: 0.002,
  siscomex: 347.02,
  sda: 150,
  blRelease: 310,
  deconsolidation: 324,
  stevedoring: 1800,
  customsClearance: 1621,
  storage: 5000,
  roadFreight: 5000,
  others: 924,
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtFob(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return `$ ${v.toFixed(4)}`
}

function fmtBrl(v: number | null): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcPrices(product: DbProduct): { unitBrl: number | null; cxBrl: number | null } {
  if (!product.fob_usd || product.fob_usd <= 0) return { unitBrl: null, cxBrl: null }
  const taxes = NCM_TAXES[product.ncm_code]
  if (!taxes) return { unitBrl: null, cxBrl: null }
  try {
    const result = calcItemPrice(
      {
        product: {
          id: product.id,
          description: product.description,
          partNumber: product.part_number,
          productType: product.product_type,
          ncmCode: product.ncm_code,
          taxRates: taxes,
          markupTable: MARKUP_TABLE,
          pcsPerBox: product.pcs_per_box,
          weightGrossKg: product.weight_gross_kg,
          volumeBoxM3: product.volume_box_m3,
          fobUsd: product.fob_usd,
        },
        qtyBoxes: 10,
      },
      DEFAULT_PARAMS
    )
    return { unitBrl: result.finalPriceUnit, cxBrl: result.finalPriceBox }
  } catch {
    return { unitBrl: null, cxBrl: null }
  }
}

// ─── Componente principal ───────────────────────────────────────────────────────

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterVolume, setFilterVolume] = useState('')
  const [filterColor, setFilterColor] = useState('')

  // Paginação
  const PAGE_SIZE = 50
  const [currentPage, setCurrentPage] = useState(1)

  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFob, setEditFob] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Import Excel
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)

  // ── Carrega produtos do Supabase ─────────────────────────────────────────────
  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('seq_no', { ascending: true })

        if (error || !data || data.length === 0) {
          setProducts(MOCK_PRODUCTS)
        } else {
          setProducts(data as DbProduct[])
        }
      } catch {
        setProducts(MOCK_PRODUCTS)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase()
      if (q && !p.description.toLowerCase().includes(q) && !p.part_number.toLowerCase().includes(q) && !p.ncm_code.includes(q)) return false
      if (filterType && p.product_type !== filterType) return false
      if (filterVolume) {
        const vol = parseInt(filterVolume)
        if (p.volume_ml !== vol) return false
      }
      if (filterColor) {
        const desc = p.description.toLowerCase()
        const colorMap: Record<string, string[]> = {
          'Ambar': ['ambar', 'âmbar', 'amber'],
          'Transparente': ['transparente', 'clear'],
          'Branco': ['branco', 'white'],
          'Azul': ['azul', 'blue'],
        }
        const keywords = colorMap[filterColor] || [filterColor.toLowerCase()]
        if (!keywords.some((kw) => desc.includes(kw))) return false
      }
      return true
    })
  }, [products, search, filterType, filterVolume, filterColor])

  // Reset página ao mudar filtros
  useEffect(() => { setCurrentPage(1) }, [search, filterType, filterVolume, filterColor])

  // Produtos da página atual
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // ── Contadores por tipo ──────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const frascos = products.filter((p) => p.product_type === 'Frasco').length
    const ampolas = products.filter((p) => p.product_type === 'Ampola').length
    const rolhas  = products.filter((p) => p.product_type === 'Rolha').length
    const selos   = products.filter((p) => p.product_type.startsWith('Selo')).length
    const semPreco = products.filter((p) => !p.fob_usd || p.fob_usd <= 0).length
    return { frascos, ampolas, rolhas, selos, semPreco }
  }, [products])

  // ── Edição inline ────────────────────────────────────────────────────────────
  function startEdit(product: DbProduct) {
    setEditingId(product.id)
    setEditFob(product.fob_usd !== null && product.fob_usd !== undefined ? String(product.fob_usd) : '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditFob('')
  }

  async function saveEdit(product: DbProduct) {
    const newFob = parseFloat(editFob)
    if (isNaN(newFob) || newFob < 0) {
      alert('Valor FOB inválido.')
      return
    }
    setSavingId(product.id)
    try {
      const { error } = await supabase
        .from('products')
        .update({ fob_usd: newFob })
        .eq('id', product.id)

      if (error) {
        // Se Supabase falhar (ex: usando mock), apenas atualiza localmente
        console.warn('Supabase update failed, updating locally:', error.message)
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, fob_usd: newFob } : p))
      )
    } catch (err) {
      console.warn('Update error, updating locally:', err)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, fob_usd: newFob } : p))
      )
    } finally {
      setSavingId(null)
      setEditingId(null)
      setEditFob('')
    }
  }

  // ── Importação Excel ─────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      // Ler aba "Lista Produtos"
      const listSheet = workbook.Sheets['Lista Produtos']
      if (!listSheet) throw new Error('Aba "Lista Produtos" não encontrada no arquivo.')
      const listRows: unknown[][] = XLSX.utils.sheet_to_json(listSheet, { header: 1, defval: '' })
      const listData = listRows.slice(2) // pular 2 linhas de cabeçalho

      // Ler aba "Preço"
      const precoSheet = workbook.Sheets['Preço']
      if (!precoSheet) throw new Error('Aba "Preço" não encontrada no arquivo.')
      const precoRows: unknown[][] = XLSX.utils.sheet_to_json(precoSheet, { header: 1, defval: '' })
      const precoData = precoRows.slice(3) // pular 3 linhas de cabeçalho

      // Montar mapa de preços por seq_no
      const precoMap = new Map<number, { ncm: string; fob: number | null; fobAlt: number | null }>()
      const ncmDefault: Record<string, string> = {
        'Frasco': '7010.90.90',
        'Ampola': '7010.10.00',
        'Rolha': '3923.50.00',
        'Selo Alum Flip': '8309.90.00',
        'Selo Alu-plas': '8309.90.00',
      }
      for (const row of precoData) {
        const r = row as unknown[]
        const seqNo = Number(r[0])
        if (!seqNo || isNaN(seqNo)) continue
        const ncm = String(r[2] || '').trim()
        const munan = Number(r[3]) || null
        const star4 = Number(r[4]) || null
        const selected = Number(r[5]) > 0 ? Number(r[5]) : munan
        precoMap.set(seqNo, { ncm, fob: selected, fobAlt: star4 })
      }

      // Processar Lista Produtos com fill-forward na description
      let lastDescription = ''
      const products: Record<string, unknown>[] = []

      for (const row of listData) {
        const r = row as unknown[]
        const seqNo = Number(r[0])
        if (!seqNo || isNaN(seqNo)) continue

        const rawDesc = String(r[1] || '').trim()
        if (rawDesc) lastDescription = rawDesc
        const description = lastDescription

        const partNumber = String(r[2] || '').trim()
        if (!partNumber) continue // pular linhas sem part number

        const productType = String(r[3] || '').trim() // col 3 = Produto (Frasco, Ampola, etc)
        const volumeMl = Number(r[6]) > 0 ? Number(r[6]) : null
        const weightGrossKg = Number(r[18]) || 0
        const pcsTray = Number(r[19]) || null
        const traysBox = Number(r[20]) || null
        const pcsPerBox = Number(r[21]) || 1
        const volumeBoxM3 = Number(r[22]) || 0

        const preco = precoMap.get(seqNo)
        const ncmCode = (preco?.ncm && preco.ncm.length >= 8)
          ? preco.ncm
          : (ncmDefault[productType] ?? '7010.90.90')
        const fobUsd = preco?.fob ?? null
        const fobAltUsd = preco?.fobAlt ?? null

        products.push({
          seq_no: seqNo,
          description,
          part_number: partNumber,
          product_type: productType,
          volume_ml: volumeMl,
          weight_gross_kg: weightGrossKg,
          pcs_per_tray: pcsTray,
          trays_per_box: traysBox,
          pcs_per_box: pcsPerBox,
          volume_box_m3: volumeBoxM3,
          ncm_code: ncmCode,
          fob_usd: fobUsd,
          fob_alt_usd: fobAltUsd,
          is_active: true,
        })
      }

      if (products.length === 0) {
        alert('Nenhum produto válido encontrado na planilha.')
        return
      }

      // Enviar para API
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao importar.')

      alert(`✅ ${result.imported} produtos importados com sucesso!`)

      // Recarregar lista
      const { data, error } = await supabase.from('products').select('*').order('seq_no')
      if (!error && data && data.length > 0) setProducts(data as DbProduct[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('Erro ao importar Excel:', err)
      alert(`Erro ao importar: ${msg}`)
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Estilos comuns ───────────────────────────────────────────────────────────
  const inputClass =
    'px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition'

  const today = new Date().toLocaleDateString('pt-BR')

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Banco de Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os SKUs e preços FOB</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {products.length} produtos cadastrados
        </span>
      </div>

      {/* ── Barra de filtros e ações ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descrição..."
                className={`${inputClass} w-full pl-9`}
              />
            </div>
          </div>

          {/* Tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`${inputClass} min-w-[160px]`}
          >
            <option value="">Todos os tipos</option>
            <option value="Frasco">Frasco</option>
            <option value="Ampola">Ampola</option>
            <option value="Rolha">Rolha</option>
            <option value="Selo Alum Flip">Selo Alum Flip</option>
            <option value="Selo Alu-plas">Selo Alu-plas</option>
          </select>

          {/* Volume */}
          <select
            value={filterVolume}
            onChange={(e) => setFilterVolume(e.target.value)}
            className={`${inputClass} min-w-[140px]`}
          >
            <option value="">Todos os volumes</option>
            {['2', '3', '4', '5', '7', '10', '15', '20', '30', '50', '100'].map((v) => (
              <option key={v} value={v}>{v}ml</option>
            ))}
          </select>

          {/* Cor */}
          <select
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            className={`${inputClass} min-w-[150px]`}
          >
            <option value="">Todas as cores</option>
            <option value="Ambar">Ambar</option>
            <option value="Transparente">Transparente</option>
            <option value="Branco">Branco</option>
            <option value="Azul">Azul</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Importar Excel */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0F6E56' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {importLoading ? 'Lendo...' : 'Importar Excel'}
          </button>

          {/* Exportar */}
          <button
            onClick={() => alert('Em breve')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-blue-950 hover:text-white"
            style={{ borderColor: '#0C3460', color: '#0C3460' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {/* ── Tabela de produtos ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 60 }}>N°</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide" style={{ minWidth: 200 }}>Descrição</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide font-mono" style={{ width: 140 }}>Part Number</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 70 }}>Vol.</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 80 }}>Pcs/Cx</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide font-mono" style={{ width: 110 }}>NCM</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 100 }}>FOB USD</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 100 }}>Unit BRL</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 100 }}>Cx BRL</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 90 }}>Status</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide" style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Carregando produtos...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-gray-400">
                    Nenhum produto encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginated.map((product, idx) => {
                  const { unitBrl, cxBrl } = calcPrices(product)
                  const isEditing = editingId === product.id
                  const isSaving  = savingId === product.id
                  const hasPrice  = product.fob_usd !== null && product.fob_usd > 0
                  const rowBg     = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 transition-colors"
                      style={{ backgroundColor: rowBg }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#EFF6FF' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = rowBg }}
                    >
                      {/* N° */}
                      <td className="px-3 py-2.5 text-gray-500 font-mono">{product.seq_no}</td>

                      {/* Descrição */}
                      <td className="px-3 py-2.5 text-gray-900 font-medium">{product.description}</td>

                      {/* Part Number */}
                      <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{product.part_number}</td>

                      {/* Volume */}
                      <td className="px-3 py-2.5 text-center text-gray-600">
                        {product.volume_ml !== null ? `${product.volume_ml}ml` : '—'}
                      </td>

                      {/* Pcs/Cx */}
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">
                        {product.pcs_per_box.toLocaleString('pt-BR')}
                      </td>

                      {/* NCM */}
                      <td className="px-3 py-2.5 font-mono text-gray-500 text-xs">{product.ncm_code}</td>

                      {/* FOB USD — editável inline */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.000001"
                            min="0"
                            value={editFob}
                            onChange={(e) => setEditFob(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(product)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="w-24 px-2 py-1 text-xs rounded border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 font-mono text-right"
                          />
                        ) : (
                          <span className={hasPrice ? 'text-gray-800' : 'text-gray-400'}>
                            {fmtFob(product.fob_usd)}
                          </span>
                        )}
                      </td>

                      {/* Unit BRL */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className={unitBrl !== null ? 'text-green-700' : 'text-gray-400'}>
                          {fmtBrl(unitBrl)}
                        </span>
                      </td>

                      {/* Cx BRL */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className={cxBrl !== null ? 'text-gray-800' : 'text-gray-400'}>
                          {fmtBrl(cxBrl)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center">
                        {hasPrice ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Sem preço
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-3 py-2.5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(product)}
                              disabled={isSaving}
                              title="Salvar"
                              className="w-6 h-6 flex items-center justify-center rounded text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 text-base font-bold"
                            >
                              {isSaving ? (
                                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                              ) : (
                                '✓'
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              title="Cancelar"
                              className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-100 transition-colors text-base font-bold"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(product)}
                            title="Editar FOB"
                            className="w-6 h-6 flex items-center justify-center mx-auto rounded text-gray-400 hover:text-blue-900 hover:bg-blue-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginação ──────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <span className="text-xs text-gray-500">
              Mostrando {((currentPage-1)*PAGE_SIZE)+1}–{Math.min(currentPage*PAGE_SIZE, filtered.length)} de {filtered.length} produtos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-xs font-medium text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

        {/* ── Rodapé da tabela ───────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: '#F9FAFB' }}>
          <span className="text-xs text-gray-500">
            Exibindo <span className="font-semibold text-gray-700">{filtered.length}</span> de <span className="font-semibold text-gray-700">{products.length}</span> produtos
          </span>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">
              <span className="font-medium text-gray-700">Frascos:</span> {counts.frascos}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              <span className="font-medium text-gray-700">Ampolas:</span> {counts.ampolas}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              <span className="font-medium text-gray-700">Rolhas:</span> {counts.rolhas}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              <span className="font-medium text-gray-700">Selos:</span> {counts.selos}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">
              <span className="font-medium">Sem preço:</span> {counts.semPreco}
            </span>
          </div>

          <span className="text-xs text-gray-400">
            Última atualização: {today}
          </span>
        </div>
      </div>
    </div>
  )
}
