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
    'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition'

  const today = new Date().toLocaleDateString('pt-BR')

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex items-center
