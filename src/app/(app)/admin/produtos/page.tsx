'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useUserRole } from '@/hooks/useUserRole'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string
  seq_no: number
  description: string
  part_number: string
  product_type: string
  product_subtype?: string | null
  volume_ml: number | null
  diameter_mm?: number | null
  height_mm?: number | null
  pkg_desc_pt?: string | null      // Tamanho Produto ex: "Ø14,5 x 35 mm"
  standard_type?: string | null    // Padrão ex: "Schott"
  color?: string | null
  box_size?: string | null         // Tamanho Caixa ex: "43 x 29,5 x 24"
  weight_net_kg?: number | null
  weight_gross_kg: number
  pcs_per_box: number
  volume_box_m3: number
  ncm_code: string
  is_active: boolean
  // Preços pré-calculados — MUNAN
  un_cimp_cipi_munan?: number | null
  cx_cimp_cipi_munan?: number | null
  un_cimp_sipi_munan?: number | null
  cx_cimp_sipi_munan?: number | null
  un_simp_munan?: number | null
  cx_simp_munan?: number | null
  // Preços pré-calculados — FOUR STAR
  un_cimp_cipi_fourstar?: number | null
  cx_cimp_cipi_fourstar?: number | null
  un_cimp_sipi_fourstar?: number | null
  cx_cimp_sipi_fourstar?: number | null
  un_simp_fourstar?: number | null
  cx_simp_fourstar?: number | null
}

interface DisplayPrices {
  unCImpCIpi: number | null
  cxCImpCIpi: number | null
  unCImpSIpi: number | null
  cxCImpSIpi: number | null
  unSImp: number | null
  cxSImp: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtBrl(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `USD ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`
}

function getDisplayPrices(p: DbProduct, fornecedor: string): DisplayPrices {
  const m = fornecedor === 'Munan'
  return {
    unCImpCIpi: m ? (p.un_cimp_cipi_munan   ?? null) : (p.un_cimp_cipi_fourstar   ?? null),
    cxCImpCIpi: m ? (p.cx_cimp_cipi_munan   ?? null) : (p.cx_cimp_cipi_fourstar   ?? null),
    unCImpSIpi: m ? (p.un_cimp_sipi_munan   ?? null) : (p.un_cimp_sipi_fourstar   ?? null),
    cxCImpSIpi: m ? (p.cx_cimp_sipi_munan   ?? null) : (p.cx_cimp_sipi_fourstar   ?? null),
    unSImp:     m ? (p.un_simp_munan        ?? null) : (p.un_simp_fourstar        ?? null),
    cxSImp:     m ? (p.cx_simp_munan        ?? null) : (p.cx_simp_fourstar        ?? null),
  }
}

// ─── Componente principal ───────────────────────────────────────────────────────

export default function AdminProdutosPage() {
  const { isAdmin } = useUserRole()
  const [products, setProducts] = useState<DbProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterVolume, setFilterVolume] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [filterFornecedor, setFilterFornecedor] = useState('Four Star')

  // Paginação
  const PAGE_SIZE = 50
  const [currentPage, setCurrentPage] = useState(1)

  // Import Excel
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)

  // ── Carrega produtos via API (usa service key, evita RLS) ────────────────────
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data as DbProduct[])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
        const colorField = (p.color ?? '').toLowerCase()
        const descField  = p.description.toLowerCase()
        const kw = filterColor.toLowerCase()
        if (!colorField.includes(kw) && !descField.includes(kw)) return false
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
    const frascos  = products.filter((p) => p.product_type === 'Frasco').length
    const ampolas  = products.filter((p) => p.product_type === 'Ampola').length
    const rolhas   = products.filter((p) => p.product_type === 'Rolha').length
    const selos    = products.filter((p) => p.product_type.startsWith('Selo')).length
    const semPreco = products.filter((p) => !p.un_cimp_cipi_munan && !p.un_cimp_cipi_fourstar).length
    return { frascos, ampolas, rolhas, selos, semPreco }
  }, [products])

  // ── Exportar CSV ─────────────────────────────────────────────────────────────
  function handleExportar() {
    const brlFmt = (v: number | null | undefined) =>
      v != null && !isNaN(v) ? v.toFixed(2).replace('.', ',') : ''

    const header = [
      'N°', 'Descrição', 'Part Number', 'Grupo', 'Subgrupo', 'NCM',
      'Vol.(ml)', 'Diâm.(mm)', 'Alt.(mm)', 'Tamanho', 'Padrão', 'Cor',
      'Tam.Caixa', 'Peso Liq.(kg)', 'Peso Bruto.(kg)', 'UN/CX', 'Vol.Caixa(m³)',
      `UN C/Imp C/IPI (${filterFornecedor})`,
      `CX C/Imp C/IPI (${filterFornecedor})`,
      `UN C/Imp S/IPI (${filterFornecedor})`,
      `CX C/Imp S/IPI (${filterFornecedor})`,
      `UN S/Imp (${filterFornecedor})`,
      `CX S/Imp (${filterFornecedor})`,
      'Status',
    ]

    const rows = filtered.map((p) => {
      const pr = getDisplayPrices(p, filterFornecedor)
      const status = (pr.unCImpCIpi ?? 0) > 0 ? 'Ativo' : 'Sem preço'
      return [
        p.seq_no,
        `"${p.description}"`,
        p.part_number,
        p.product_type,
        p.product_subtype ?? '',
        p.ncm_code,
        p.volume_ml ?? '',
        p.diameter_mm ?? '',
        p.height_mm ?? '',
        `"${p.pkg_desc_pt ?? ''}"`,
        p.standard_type ?? '',
        p.color ?? '',
        `"${p.box_size ?? ''}"`,
        brlFmt(p.weight_net_kg),
        brlFmt(p.weight_gross_kg),
        p.pcs_per_box,
        p.volume_box_m3,
        brlFmt(pr.unCImpCIpi),
        brlFmt(pr.cxCImpCIpi),
        brlFmt(pr.unCImpSIpi),
        brlFmt(pr.cxCImpSIpi),
        brlFmt(pr.unSImp),
        brlFmt(pr.cxSImp),
        status,
      ].join(';')
    })

    const csv = [header.join(';'), ...rows].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shiplog-produtos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Importação Excel — lê aba "Export cvs" ───────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      // Localizar aba "Export cvs" (aceita variações de nome)
      const sheetName = workbook.SheetNames.find(
        n => n.toLowerCase().replace(/\s/g, '') === 'exportcvs' || n.toLowerCase() === 'export cvs'
      )
      if (!sheetName) throw new Error('Aba "Export cvs" não encontrada no arquivo.')

      const sheet = workbook.Sheets[sheetName]
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

      // Linha 0 = cabeçalho, dados a partir da linha 1
      const dataRows = rows.slice(1)

      /*
       * Mapeamento de colunas (0-indexed) — aba "Export cvs":
       * A(0)  Descritivo completo        → description
       * B(1)  Part Number                → part_number
       * C(2)  Produto Grupo              → product_type
       * D(3)  Produto Subgrupo           → product_subtype
       * E(4)  Volume Produto             → volume_ml
       * F(5)  Diâmetro                   → diameter_mm
       * G(6)  Altura                     → height_mm
       * H(7)  Tamanho Produto            → pkg_desc_pt
       * I(8)  Padrão                     → standard_type
       * J(9)  Cor                        → color
       * K(10) Tamanho Caixa              → box_size
       * L(11) Peso Líquido               → weight_net_kg
       * M(12) Peso Bruto                 → weight_gross_kg
       * N(13) Peças / Caixa             → pcs_per_box
       * O(14) Volume Caixa               → volume_box_m3
       * P(15) NCM                        → ncm_code
       * Q(16) UN c/Imp c/IPI MUNAN      → un_cimp_cipi_munan
       * R(17) CX c/Imp c/IPI MUNAN      → cx_cimp_cipi_munan
       * S(18) UN c/imp s/IPI MUNAN      → un_cimp_sipi_munan
       * T(19) CX c/imp s/IPI MUNAN      → cx_cimp_sipi_munan
       * U(20) UN s/imp MUNAN            → un_simp_munan
       * V(21) CX s/imp MUNAN            → cx_simp_munan
       * W(22) UN c/Imp c/IPI FOUR STAR  → un_cimp_cipi_fourstar
       * X(23) CX c/Imp c/IPI FOUR STAR  → cx_cimp_cipi_fourstar
       * Y(24) UN c/imp s/IPI FOUR STAR  → un_cimp_sipi_fourstar
       * Z(25) CX c/imp s/IPI FOUR STAR  → cx_cimp_sipi_fourstar
       *AA(26) UN s/imp FOUR STAR        → un_simp_fourstar
       *AB(27) CX s/imp FOUR STAR        → cx_simp_fourstar
       */

      const num = (v: unknown): number | null => {
        const n = Number(v)
        return !isNaN(n) && v !== null && v !== '' ? n : null
      }
      const str = (v: unknown): string | null => {
        const s = String(v ?? '').trim()
        return s.length > 0 ? s : null
      }

      const products: Record<string, unknown>[] = []
      let seqNo = 0

      for (const row of dataRows) {
        const r = row as unknown[]
        const partNumber = str(r[1])
        if (!partNumber) continue  // pular linhas sem part number

        seqNo++

        products.push({
          seq_no:              seqNo,
          description:         str(r[0])  ?? '',
          part_number:         partNumber,
          product_type:        str(r[2])  ?? '',
          product_subtype:     str(r[3]),
          volume_ml:           num(r[4]),
          diameter_mm:         num(r[5]),
          height_mm:           num(r[6]),
          pkg_desc_pt:         str(r[7]),
          standard_type:       str(r[8]),
          color:               str(r[9]),
          box_size:            str(r[10]),
          weight_net_kg:       num(r[11]),
          weight_gross_kg:     num(r[12]) ?? 0,
          pcs_per_box:         num(r[13]) ?? 1,
          volume_box_m3:       num(r[14]) ?? 0,
          ncm_code:            str(r[15]) ?? '7010.90.90',
          un_cimp_cipi_munan:  num(r[16]),
          cx_cimp_cipi_munan:  num(r[17]),
          un_cimp_sipi_munan:  num(r[18]),
          cx_cimp_sipi_munan:  num(r[19]),
          un_simp_munan:       num(r[20]),
          cx_simp_munan:       num(r[21]),
          un_cimp_cipi_fourstar: num(r[22]),
          cx_cimp_cipi_fourstar: num(r[23]),
          un_cimp_sipi_fourstar: num(r[24]),
          cx_cimp_sipi_fourstar: num(r[25]),
          un_simp_fourstar:    num(r[26]),
          cx_simp_fourstar:    num(r[27]),
          is_active:           true,
        })
      }

      if (products.length === 0) {
        alert('Nenhum produto válido encontrado na aba "Export cvs".')
        return
      }

      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao importar.')

      alert(`✅ ${result.imported} produtos importados com sucesso!`)

      // Recarregar
      const reload = await fetch('/api/products')
      const reloadData = await reload.json()
      if (Array.isArray(reloadData) && reloadData.length > 0) {
        setProducts(reloadData as DbProduct[])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
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
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os SKUs — preços importados da planilha Excel</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {products.length} produtos cadastrados
        </span>
      </div>

      {/* ── Barra de filtros e ações ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
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
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={`${inputClass} min-w-[160px]`}>
            <option value="">Todos os tipos</option>
            <option value="Frasco">Frasco</option>
            <option value="Ampola">Ampola</option>
            <option value="Rolha">Rolha</option>
            <option value="Selo Alum Flip">Selo Alum Flip</option>
            <option value="Selo Alu-plas">Selo Alu-plas</option>
          </select>

          {/* Volume */}
          <select value={filterVolume} onChange={(e) => setFilterVolume(e.target.value)} className={`${inputClass} min-w-[140px]`}>
            <option value="">Todos os volumes</option>
            {['2', '3', '4', '5', '7', '10', '15', '20', '30', '50', '100'].map((v) => (
              <option key={v} value={v}>{v}ml</option>
            ))}
          </select>

          {/* Cor */}
          <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className={`${inputClass} min-w-[150px]`}>
            <option value="">Todas as cores</option>
            <option value="Ambar">Ambar</option>
            <option value="Transparente">Transparente</option>
            <option value="Branco">Branco</option>
            <option value="Azul">Azul</option>
          </select>

          {/* Fornecedor */}
          <select value={filterFornecedor} onChange={(e) => setFilterFornecedor(e.target.value)} className={`${inputClass} min-w-[140px]`}>
            <option value="Four Star">Four Star</option>
            <option value="Munan">Munan</option>
          </select>

          <div className="flex-1" />

          {/* Tipos, Exportar e Importar — apenas admin */}
          {isAdmin && (
            <>
              <Link
                href="/admin/tipos-produto"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-blue-950 hover:text-white"
                style={{ borderColor: '#0C3460', color: '#0C3460' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.023.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 7V3a4 4 0 014-4z" />
                </svg>
                Tipos
              </Link>
              <button
                onClick={handleExportar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-blue-950 hover:text-white"
                style={{ borderColor: '#0C3460', color: '#0C3460' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0C3460' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {importLoading ? 'Lendo...' : 'Importar Excel'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tabela de produtos ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: '#0C3460' }}>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 50 }}>N°</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ minWidth: 200 }}>Descrição</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide font-mono" style={{ width: 140 }}>Part Number</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide font-mono" style={{ width: 100 }}>NCM</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 55 }}>Vol.</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 110 }}>Tamanho</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 65 }}>UN/CX</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>UN C/Imp.</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>CX C/Imp.</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>UN S/IPI</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>CX S/IPI</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>UN S/Imp.</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 90 }}>CX S/Imp.</th>
                <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide" style={{ width: 85 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-gray-400">
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
                  <td colSpan={14} className="px-3 py-10 text-center text-gray-400">
                    {products.length === 0
                      ? 'Nenhum produto cadastrado. Importe o arquivo Excel (aba "Export cvs").'
                      : 'Nenhum produto encontrado para os filtros aplicados.'}
                  </td>
                </tr>
              ) : (
                paginated.map((product, idx) => {
                  const pr = getDisplayPrices(product, filterFornecedor)
                  const hasPrice = (pr.unCImpCIpi ?? 0) > 0
                  const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 transition-colors"
                      style={{ backgroundColor: rowBg }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#EFF6FF' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = rowBg }}
                    >
                      <td className="px-3 py-2.5 text-center text-gray-500 font-mono">{product.seq_no}</td>
                      <td className="px-3 py-2.5 text-gray-900 font-medium">{product.description}</td>
                      <td className="px-3 py-2.5 text-gray-500 font-mono">{product.part_number}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-500 text-center">{product.ncm_code}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">
                        {product.volume_ml !== null ? `${product.volume_ml}ml` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{product.pkg_desc_pt ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-700">
                        {product.pcs_per_box.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className={hasPrice ? 'text-green-700' : 'text-gray-400'}>{fmtBrl(pr.unCImpCIpi)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className={hasPrice ? 'text-gray-800' : 'text-gray-400'}>{fmtBrl(pr.cxCImpCIpi)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtBrl(pr.unCImpSIpi)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtBrl(pr.cxCImpSIpi)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtBrl(pr.unSImp)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtBrl(pr.cxSImp)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {hasPrice ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Sem preço</span>
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
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40">
                ← Anterior
              </button>
              <span className="text-xs font-medium text-gray-700">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40">
                Próxima →
              </button>
            </div>
          </div>
        )}

        {/* ── Rodapé ─────────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: '#F9FAFB' }}>
          <span className="text-xs text-gray-500">
            Exibindo <span className="font-semibold text-gray-700">{filtered.length}</span> de <span className="font-semibold text-gray-700">{products.length}</span> produtos
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500"><span className="font-medium text-gray-700">Frascos:</span> {counts.frascos}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500"><span className="font-medium text-gray-700">Ampolas:</span> {counts.ampolas}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500"><span className="font-medium text-gray-700">Rolhas:</span> {counts.rolhas}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500"><span className="font-medium text-gray-700">Selos:</span> {counts.selos}</span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600"><span className="font-medium">Sem preço:</span> {counts.semPreco}</span>
          </div>
          <span className="text-xs text-gray-400">Última atualização: {today}</span>
        </div>
      </div>
    </div>
  )
}
