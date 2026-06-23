'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ProductTypeRow {
  product_type: string
  ncm_code: string | null
  ii_rate: number | null
  ipi_rate: number | null
  pis_rate: number | null
  cofins_rate: number | null
  icms_rate: number | null
  mkup_10: number | null
  mkup_20: number | null
  mkup_50: number | null
  mkup_100: number | null
  mkup_200: number | null
}

// Campos percentuais — exibidos/editados como "9" (= 9%), guardados como 0.09
const PCT_FIELDS = ['ii_rate', 'ipi_rate', 'pis_rate', 'cofins_rate', 'icms_rate',
  'mkup_10', 'mkup_20', 'mkup_50', 'mkup_100', 'mkup_200'] as const
type PctField = typeof PCT_FIELDS[number]

const EMPTY_FORM = {
  product_type: '',
  ncm_code: '',
  ii_rate: '',
  ipi_rate: '',
  pis_rate: '',
  cofins_rate: '',
  icms_rate: '',
  mkup_10: '',
  mkup_20: '',
  mkup_50: '',
  mkup_100: '',
  mkup_200: '',
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function pctDisplay(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

// decimal (0.09) → string de formulário em "%" ("9")
function decimalToPctStr(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return ''
  return (v * 100).toString().replace('.', ',')
}

// string de formulário em "%" ("9") → decimal (0.09) ou null
function pctStrToDecimal(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return isNaN(n) ? null : n / 100
}

// ─── Componente principal ───────────────────────────────────────────────────────

export default function AdminTiposProdutoPage() {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useUserRole()
  const [types, setTypes] = useState<ProductTypeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.replace('/cotacao')
  }, [isAdmin, roleLoading, router])

  const [showForm, setShowForm] = useState(false)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // Import Excel
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importLoading, setImportLoading] = useState(false)

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  // ── Carrega tipos via API ─────────────────────────────────────────────────────
  function reload() {
    return fetch('/api/product-types')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTypes(data) })
      .catch(() => {})
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  // ── Form: abrir novo / editar ─────────────────────────────────────────────────
  function openNew() {
    setForm({ ...EMPTY_FORM })
    setEditingType(null)
    setShowForm(true)
  }

  function openEdit(t: ProductTypeRow) {
    setForm({
      product_type: t.product_type,
      ncm_code: t.ncm_code ?? '',
      ii_rate: decimalToPctStr(t.ii_rate),
      ipi_rate: decimalToPctStr(t.ipi_rate),
      pis_rate: decimalToPctStr(t.pis_rate),
      cofins_rate: decimalToPctStr(t.cofins_rate),
      icms_rate: decimalToPctStr(t.icms_rate),
      mkup_10: decimalToPctStr(t.mkup_10),
      mkup_20: decimalToPctStr(t.mkup_20),
      mkup_50: decimalToPctStr(t.mkup_50),
      mkup_100: decimalToPctStr(t.mkup_100),
      mkup_200: decimalToPctStr(t.mkup_200),
    })
    setEditingType(t.product_type)
    setShowForm(true)
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── Salvar (criar ou editar) ──────────────────────────────────────────────────
  async function handleSave() {
    if (!form.product_type.trim()) { alert('"Produto Grupo" é obrigatório.'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        product_type: form.product_type.trim(),
        ncm_code: form.ncm_code.trim() || null,
      }
      for (const f of PCT_FIELDS as readonly PctField[]) {
        payload[f] = pctStrToDecimal(form[f])
      }

      const res = await fetch('/api/product-types', {
        method: editingType ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { alert(`Erro: ${data.error}`); return }

      setShowForm(false)
      await reload()
    } catch {
      alert('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Excluir ────────────────────────────────────────────────────────────────────
  async function handleDelete(t: ProductTypeRow) {
    if (!confirm(`Excluir o tipo de produto "${t.product_type}"? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch('/api/product-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: t.product_type }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Erro ao excluir.'); return }
      setTypes(prev => prev.filter(x => x.product_type !== t.product_type))
    } catch {
      alert('Erro ao excluir.')
    }
  }

  // ── Importação Excel — lê aba "Produto cvs" ───────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      // Localizar aba "Produto cvs" (aceita variações de nome)
      const sheetName = workbook.SheetNames.find(
        n => n.toLowerCase().replace(/\s/g, '') === 'produtocvs' || n.toLowerCase() === 'produto cvs'
      )
      if (!sheetName) throw new Error('Aba "Produto cvs" não encontrada no arquivo.')

      const sheet = workbook.Sheets[sheetName]
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
      const dataRows = rows.slice(1) // linha 0 = cabeçalho

      /*
       * Mapeamento de colunas (0-indexed) — aba "Produto cvs":
       * A(0)  Produto Grupo  → product_type
       * B(1)  NCM            → ncm_code
       * C(2)  II             → ii_rate     (já em decimal, ex: 0.09)
       * D(3)  IPI            → ipi_rate
       * E(4)  PIS            → pis_rate
       * F(5)  COFINS         → cofins_rate
       * G(6)  ICMS           → icms_rate
       * H(7)  Mkup10         → mkup_10
       * I(8)  Mkup20         → mkup_20
       * J(9)  Mkup50         → mkup_50
       * K(10) Mkup100        → mkup_100
       * L(11) Mkup200        → mkup_200
       */
      const num = (v: unknown): number | null => {
        const n = Number(v)
        return !isNaN(n) && v !== null && v !== '' ? n : null
      }
      const str = (v: unknown): string | null => {
        const s = String(v ?? '').trim()
        return s.length > 0 ? s : null
      }

      const parsed: Record<string, unknown>[] = []
      for (const row of dataRows) {
        const r = row as unknown[]
        const productType = str(r[0])
        if (!productType) continue // pula linhas vazias

        parsed.push({
          product_type: productType,
          ncm_code: str(r[1]),
          ii_rate: num(r[2]),
          ipi_rate: num(r[3]),
          pis_rate: num(r[4]),
          cofins_rate: num(r[5]),
          icms_rate: num(r[6]),
          mkup_10: num(r[7]),
          mkup_20: num(r[8]),
          mkup_50: num(r[9]),
          mkup_100: num(r[10]),
          mkup_200: num(r[11]),
        })
      }

      if (parsed.length === 0) {
        alert('Nenhum tipo de produto válido encontrado na aba "Produto cvs".')
        return
      }

      const res = await fetch('/api/product-types/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao importar.')

      alert(`✅ ${result.imported} tipo(s) de produto importado(s)/atualizado(s) com sucesso!\n\nAgora você já pode importar a aba "Export cvs" na tela de Produtos.`)
      await reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      alert(`Erro ao importar: ${msg}`)
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tipos de Produto</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lista mestre de &quot;Produto Grupo&quot; — base da regra que valida o cadastro de produtos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {types.length} tipo{types.length !== 1 ? 's' : ''} cadastrado{types.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: '#0C3460' }}
          >
            + Novo Tipo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0F6E56' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {importLoading ? 'Lendo...' : 'Importar Excel'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        💡 Importe sempre a aba <strong>&quot;Produto cvs&quot;</strong> desta tela <strong>antes</strong> de importar a aba
        &quot;Export cvs&quot; na tela de Produtos. Isso garante que todo &quot;Produto Grupo&quot; já exista aqui antes do
        cadastro dos produtos — evitando o erro de violação de chave estrangeira (FK).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Tabela ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: '#0C3460' }}>
                  <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide">Produto Grupo</th>
                  <th className="px-3 py-3 text-center font-semibold text-white uppercase tracking-wide font-mono">NCM</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">II</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">IPI</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">PIS</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">COFINS</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">ICMS</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">Mk 10cx</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">Mk 20cx</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">Mk 50cx</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">Mk 100cx</th>
                  <th className="px-2 py-3 text-center font-semibold text-white uppercase tracking-wide">Mk 200cx</th>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="px-3 py-10 text-center text-gray-400">Carregando...</td></tr>
                ) : types.length === 0 ? (
                  <tr><td colSpan={13} className="px-3 py-10 text-center text-gray-400">
                    Nenhum tipo cadastrado. Importe a aba &quot;Produto cvs&quot; ou clique em &quot;+ Novo Tipo&quot;.
                  </td></tr>
                ) : types.map((t, idx) => (
                  <tr key={t.product_type}
                    className="border-b border-gray-100 transition-colors"
                    style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB' }}>
                    <td className="px-3 py-2.5 text-gray-900 font-medium">{t.product_type}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-500 text-center">{t.ncm_code ?? '—'}</td>
                    <td className="px-2 py-2.5 text-center text-gray-700">{pctDisplay(t.ii_rate)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-700">{pctDisplay(t.ipi_rate)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-700">{pctDisplay(t.pis_rate)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-700">{pctDisplay(t.cofins_rate)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-700">{pctDisplay(t.icms_rate)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{pctDisplay(t.mkup_10)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{pctDisplay(t.mkup_20)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{pctDisplay(t.mkup_50)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{pctDisplay(t.mkup_100)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-500">{pctDisplay(t.mkup_200)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-900 text-xs font-semibold underline">Editar</button>
                        <button onClick={() => handleDelete(t)} className="text-red-500 hover:text-red-700 text-xs font-semibold">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Formulário ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {showForm ? (
            <>
              <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                {editingType ? `Editar "${editingType}"` : 'Novo Tipo de Produto'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Produto Grupo *</label>
                  <input
                    value={form.product_type}
                    onChange={e => setField('product_type', e.target.value)}
                    className={inputClass}
                    placeholder="Ex: Frasco"
                    disabled={!!editingType}
                  />
                </div>
                <div>
                  <label className={labelClass}>NCM</label>
                  <input
                    value={form.ncm_code}
                    onChange={e => setField('ncm_code', e.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder="Ex: 7010.90.90"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(['ii_rate', 'ipi_rate', 'pis_rate', 'cofins_rate', 'icms_rate'] as const).map(f => (
                    <div key={f}>
                      <label className={labelClass}>
                        {{ ii_rate: 'II %', ipi_rate: 'IPI %', pis_rate: 'PIS %', cofins_rate: 'COFINS %', icms_rate: 'ICMS %' }[f]}
                      </label>
                      <input
                        type="text"
                        value={form[f]}
                        onChange={e => setField(f, e.target.value)}
                        className={inputClass}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Markup por faixa de quantidade (%)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['mkup_10', 'mkup_20', 'mkup_50', 'mkup_100', 'mkup_200'] as const).map((f, i) => (
                      <div key={f}>
                        <label className={labelClass}>{[10, 20, 50, 100, 200][i]} cx</label>
                        <input
                          type="text"
                          value={form[f]}
                          onChange={e => setField(f, e.target.value)}
                          className={inputClass}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-70"
                    style={{ backgroundColor: '#0C3460' }}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">Clique em + Novo Tipo</p>
              <p className="text-xs mt-1">ou em Editar para modificar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
