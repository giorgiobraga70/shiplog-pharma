'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { type Product, type PricingBreakdown } from '@/lib/pricingEngine'

// ─── Preços armazenados por fornecedor ────────────────────────────────────────

interface StoredPrices {
  un_cimp_cipi_munan?:    number | null
  cx_cimp_cipi_munan?:    number | null
  un_cimp_sipi_munan?:    number | null
  cx_cimp_sipi_munan?:    number | null
  un_simp_munan?:         number | null
  cx_simp_munan?:         number | null
  un_cimp_cipi_fourstar?: number | null
  cx_cimp_cipi_fourstar?: number | null
  un_cimp_sipi_fourstar?: number | null
  cx_cimp_sipi_fourstar?: number | null
  un_simp_fourstar?:      number | null
  cx_simp_fourstar?:      number | null
}

type ExtProduct = Product & StoredPrices

function buildBreakdown(product: ExtProduct, qtyBoxes: number, fornecedor: string): PricingBreakdown {
  const m = fornecedor === 'Munan'
  const unCI  = m ? (product.un_cimp_cipi_munan   ?? 0) : (product.un_cimp_cipi_fourstar   ?? 0)
  const cxCI  = m ? (product.cx_cimp_cipi_munan   ?? 0) : (product.cx_cimp_cipi_fourstar   ?? 0)
  const unSI  = m ? (product.un_cimp_sipi_munan   ?? 0) : (product.un_cimp_sipi_fourstar   ?? 0)
  const cxSI  = m ? (product.cx_cimp_sipi_munan   ?? 0) : (product.cx_cimp_sipi_fourstar   ?? 0)
  const unSIm = m ? (product.un_simp_munan        ?? 0) : (product.un_simp_fourstar        ?? 0)
  const cxSIm = m ? (product.cx_simp_munan        ?? 0) : (product.cx_simp_fourstar        ?? 0)
  return {
    productId: product.id,
    description: product.description,
    partNumber: product.partNumber,
    qtyBoxes,
    qtyUnits: qtyBoxes * product.pcsPerBox,
    volumeM3: qtyBoxes * product.volumeBoxM3,
    weightKg: qtyBoxes * product.weightGrossKg,
    fobUsdBox: 0, navalUsdBox: 0, insuranceUsdBox: 0, cifUsdBox: 0, cifBrlBox: 0,
    iiValue: 0, ipiValue: 0, pisValue: 0, cofinsValue: 0, icmsValue: 0, totalTaxesBrl: 0,
    customsPerBox: 0, basePriceBox: cxCI, basePriceUnit: unCI, markupRate: 0,
    finalPriceUnit: unCI,
    finalPriceBox:  cxCI,
    totalBrl:       cxCI * qtyBoxes,
    finalPriceUnitSIpi: unSI,
    finalPriceBoxSIpi:  cxSI,
    totalSIpiBrl:       cxSI * qtyBoxes,
    finalPriceUnitSImp: unSIm,
    finalPriceBoxSImp:  cxSIm,
    totalSImpBrl:       cxSIm * qtyBoxes,
  }
}

// ─── Helpers de formatação ─────────────────────────────────────────────────────

function brl(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function num(value: number, decimals = 2) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// ─── Geração de número de cotação ─────────────────────────────────────────────

function generateQuotationNumber(seq: number): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `C${yy}${mm}${dd}-${String(seq).padStart(2, '0')}`
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

// ─── Mapeamento de produto do banco para tipo Product ─────────────────────────
// A tabela "products" no Supabase usa snake_case; o pricingEngine usa camelCase.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProductToProduct(row: any): ExtProduct {
  return {
    id: row.id ?? row.part_number,
    description: row.description,
    partNumber: row.part_number,
    productType: row.product_type ?? '',
    ncmCode: row.ncm_code ?? '',
    pcsPerBox: Number(row.pcs_per_box) || 1,
    weightGrossKg: Number(row.weight_gross_kg) || 0,
    volumeBoxM3: Number(row.volume_box_m3) || 0,
    fobUsd: 0,
    volumeMl: row.volume_ml != null ? Number(row.volume_ml) : null,
    tamanho: row.pkg_desc_pt ?? null,
    taxRates: { ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 },
    markupTable: { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 },
    // Preços pré-calculados
    un_cimp_cipi_munan:    row.un_cimp_cipi_munan    ?? null,
    cx_cimp_cipi_munan:    row.cx_cimp_cipi_munan    ?? null,
    un_cimp_sipi_munan:    row.un_cimp_sipi_munan    ?? null,
    cx_cimp_sipi_munan:    row.cx_cimp_sipi_munan    ?? null,
    un_simp_munan:         row.un_simp_munan         ?? null,
    cx_simp_munan:         row.cx_simp_munan         ?? null,
    un_cimp_cipi_fourstar: row.un_cimp_cipi_fourstar ?? null,
    cx_cimp_cipi_fourstar: row.cx_cimp_cipi_fourstar ?? null,
    un_cimp_sipi_fourstar: row.un_cimp_sipi_fourstar ?? null,
    cx_cimp_sipi_fourstar: row.cx_cimp_sipi_fourstar ?? null,
    un_simp_fourstar:      row.un_simp_fourstar      ?? null,
    cx_simp_fourstar:      row.cx_simp_fourstar      ?? null,
  }
}

// ─── Helpers de formatação de campos ──────────────────────────────────────────

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function formatCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}

const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// ─── Componente principal ──────────────────────────────────────────────────────

interface LineItem {
  id: string
  product: ExtProduct
  qtyBoxes: number
  breakdown: PricingBreakdown
}

const DRAFT_KEY = 'cotacao_draft_v2'

function saveDraft(draft: Record<string, unknown>) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch {}
}

function loadDraft(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function CotacaoPage() {
  const draft = loadDraft()

  // Dados da cotação — restaura do rascunho se existir
  const [quotationNumber] = useState(() => (draft?.quotationNumber as string) ?? generateQuotationNumber(1))
  const [today] = useState(() => new Date())
  const [empresa, setEmpresa] = useState((draft?.empresa as string) ?? '')
  const [contato, setContato] = useState((draft?.contato as string) ?? '')
  const [emailContato, setEmailContato] = useState((draft?.emailContato as string) ?? '')
  const [telefone, setTelefone] = useState((draft?.telefone as string) ?? '')
  const [cnpj, setCnpj] = useState((draft?.cnpj as string) ?? '')
  const [endereco, setEndereco] = useState((draft?.endereco as string) ?? '')
  const [cidade, setCidade] = useState((draft?.cidade as string) ?? '')
  const [estado, setEstado] = useState((draft?.estado as string) ?? '')
  const [cep, setCep] = useState((draft?.cep as string) ?? '')
  const [cidades, setCidades] = useState<string[]>([])
  const [loadingCep, setLoadingCep] = useState(false)
  const [fornecedor, setFornecedor] = useState((draft?.fornecedor as string) ?? 'Four Star')
  const [prazoValidade, setPrazoValidade] = useState((draft?.prazoValidade as string) ?? '30')

  // Filtros do combobox de produto
  const [filterTipo, setFilterTipo] = useState('')
  const [filterVolume, setFilterVolume] = useState('')
  const [filterCor, setFilterCor] = useState('')

  // Condições comerciais
  const [pagamento, setPagamento] = useState((draft?.pagamento as string) ?? '50% no ato do pedido + 50% na entrega')
  const [prazo, setPrazo] = useState((draft?.prazo as string) ?? '90')

  // Produtos do banco
  const [products, setProducts] = useState<ExtProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Produtos selecionados
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qtyBoxesInput, setQtyBoxesInput] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Combobox de busca de produto
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Produtos filtrados (máx 20) — busca + filtros de tipo/volume/cor
  const filteredProducts = useMemo(() => {
    const colorMap: Record<string, string[]> = {
      'Ambar': ['ambar', 'âmbar', 'amber'],
      'Transparente': ['transparente', 'clear'],
      'Branco': ['branco', 'white'],
      'Azul': ['azul', 'blue'],
    }
    let list = products
    if (filterTipo) list = list.filter(p => p.productType === filterTipo)
    if (filterVolume) list = list.filter(p => p.description.toLowerCase().includes(filterVolume))
    if (filterCor) {
      const kws = colorMap[filterCor] || [filterCor.toLowerCase()]
      list = list.filter(p => kws.some(kw => p.description.toLowerCase().includes(kw)))
    }
    if (productSearch) {
      const q = productSearch.toLowerCase()
      list = list.filter(p => p.description.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q))
    }
    return list.slice(0, 20)
  }, [products, productSearch, filterTipo, filterVolume, filterCor])

  // Auto-salvar rascunho local sempre que dados mudarem
  useEffect(() => {
    saveDraft({
      quotationNumber, empresa, contato, emailContato, telefone,
      cnpj, endereco, cidade, estado, cep, fornecedor,
      prazoValidade, pagamento, prazo,
    })
  }, [quotationNumber, empresa, contato, emailContato, telefone,
      cnpj, endereco, cidade, estado, cep, fornecedor,
      prazoValidade, pagamento, prazo])

  function handleNovaCotacao() {
    if (lineItems.length > 0 || empresa) {
      if (!confirm('Iniciar nova cotação? Os dados atuais serão descartados.')) return
    }
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    window.location.reload()
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Totais
  const totals = useMemo(() => {
    const items = lineItems.map((li) => li.breakdown)
    return {
      boxes: items.reduce((a, r) => a + r.qtyBoxes, 0),
      units: items.reduce((a, r) => a + r.qtyUnits, 0),
      volume: items.reduce((a, r) => a + r.volumeM3, 0),
      weight: items.reduce((a, r) => a + r.weightKg, 0),
      total: items.reduce((a, r) => a + r.totalBrl, 0),
    }
  }, [lineItems])

  // Carregar produtos do banco
  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map(mapDbProductToProduct)
          setProducts(mapped)
          if (mapped.length > 0) {
            setSelectedProductId(mapped[0].id)
            setProductSearch(`${mapped[0].description} — ${mapped[0].partNumber}`)
          }
        }
      })
      .catch(() => {
        // Silencia erros de rede — o select mostrará "Carregando produtos..."
      })
      .finally(() => setLoadingProducts(false))
  }, [])

  async function loadCidades(uf: string) {
    if (!uf) { setCidades([]); return }
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      const data = await res.json()
      setCidades(data.map((c: { nome: string }) => c.nome))
    } catch { setCidades([]) }
  }

  async function handleCepChange(value: string) {
    const formatted = formatCep(value)
    setCep(formatted)
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 8) {
      setLoadingCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        const json = await res.json()
        if (!json.erro) {
          if (json.logradouro) setEndereco(json.logradouro)
          if (json.localidade) setCidade(json.localidade)
          if (json.uf) {
            setEstado(json.uf)
            loadCidades(json.uf)
          }
        }
      } catch { /* silencia */ } finally { setLoadingCep(false) }
    }
  }

  async function handleEstadoChange(uf: string) {
    setEstado(uf)
    setCidade('')
    loadCidades(uf)
  }

  function handleAddItem() {
    const qty = parseInt(qtyBoxesInput, 10)
    if (!qty || qty <= 0) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const breakdown = buildBreakdown(product, qty, fornecedor)

    setLineItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, product, qtyBoxes: qty, breakdown },
    ])
    setQtyBoxesInput('')
  }

  function handleRemoveItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id))
  }

  async function handleSalvarRascunho() {
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_number: quotationNumber,
          client_company: empresa,
          client_email: emailContato,
          client_contact: contato,
          client_phone: telefone,
          client_cnpj: cnpj,
          client_address: endereco,
          client_city: cidade,
          client_state: estado,
          client_cep: cep,
          supplier: fornecedor,
          usd_brl: 5.25,
          payment_terms: pagamento,
          delivery_days: parseInt(prazo) || 90,
          validity_days: parseInt(prazoValidade) || 30,
          items: lineItems.map((li) => ({
            description: li.product.description,
            partNumber: li.product.partNumber,
            pcsPerBox: li.product.pcsPerBox,
            qtyBoxes: li.qtyBoxes,
            qtyUnits: li.breakdown.qtyUnits,
            volumeM3: li.breakdown.volumeM3,
            weightKg: li.breakdown.weightKg,
            finalPriceUnit: li.breakdown.finalPriceUnit,
            finalPriceBox: li.breakdown.finalPriceBox,
            totalBrl: li.breakdown.totalBrl,
          })),
          totals: {
            boxes: totals.boxes,
            units: totals.units,
            volumeM3: totals.volume,
            weightKg: totals.weight,
            grandTotalBrl: totals.total,
          },
          status: 'draft',
        }),
      })
      if (res.ok) {
        alert('Cotação salva com sucesso!')
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Erro ao salvar cotação:\n${errData.error || res.statusText}`)
      }
    } catch (err) {
      alert(`Erro ao salvar cotação:\n${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  function buildQuotationPayload(status: string) {
    return {
      quote_number: quotationNumber,
      client_company: empresa,
      client_email: emailContato,
      client_contact: contato,
      supplier: fornecedor,
      usd_brl: 5.25,
      payment_terms: pagamento,
      delivery_days: parseInt(prazo) || 30,
      destination_port: cidade ? `${cidade}${estado ? ' - ' + estado : ''}` : '',
      validity_days: 30,
      items: lineItems.map((li) => ({
        description: li.product.description,
        partNumber: li.product.partNumber,
        pcsPerBox: li.product.pcsPerBox,
        qtyBoxes: li.qtyBoxes,
        qtyUnits: li.breakdown.qtyUnits,
        volumeM3: li.breakdown.volumeM3,
        weightKg: li.breakdown.weightKg,
        finalPriceUnit: li.breakdown.finalPriceUnit,
        finalPriceBox: li.breakdown.finalPriceBox,
        totalBrl: li.breakdown.totalBrl,
      })),
      totals: {
        boxes: totals.boxes,
        units: totals.units,
        volumeM3: totals.volume,
        weightKg: totals.weight,
        grandTotalBrl: totals.total,
      },
      status,
    }
  }

  function handleGerarPdf() {
    const printData = {
      quoteNumber: quotationNumber,
      date: new Date().toLocaleDateString('pt-BR'),
      clientCompany: empresa,
      clientCnpj: cnpj,
      clientEmail: emailContato,
      clientContact: contato,
      clientPhone: telefone,
      clientAddress: endereco,
      clientCity: cidade,
      clientState: estado,
      clientCep: cep,
      usdBrl: 5.25,
      paymentTerms: pagamento,
      deliveryDays: parseInt(prazo) || 90,
      validityDays: parseInt(prazoValidade) || 30,
      items: lineItems.map((item) => ({
        description: item.product.description,
        partNumber: item.product.partNumber,
        ncmCode: item.product.ncmCode,
        volumeMl: item.product.volumeMl ?? null,
        tamanho: item.product.tamanho ?? null,
        pcsPerBox: item.product.pcsPerBox,
        qtyBoxes: item.qtyBoxes,
        qtyUnits: item.breakdown.qtyUnits,
        volumeM3: item.breakdown.volumeM3,
        weightKg: item.breakdown.weightKg,
        finalPriceUnit: item.breakdown.finalPriceUnit,
        finalPriceBox: item.breakdown.finalPriceBox,
        finalPriceUnitSIpi: item.breakdown.finalPriceUnitSIpi,
        finalPriceBoxSIpi: item.breakdown.finalPriceBoxSIpi,
        finalPriceUnitSImp: item.breakdown.finalPriceUnitSImp,
        finalPriceBoxSImp: item.breakdown.finalPriceBoxSImp,
        totalBrl: item.breakdown.totalBrl,
        totalSIpiBrl: item.breakdown.totalSIpiBrl,
        totalSImpBrl: item.breakdown.totalSImpBrl,
      })),
      totals: {
        boxes: lineItems.reduce((a, i) => a + i.qtyBoxes, 0),
        units: lineItems.reduce((a, i) => a + i.breakdown.qtyUnits, 0),
        volumeM3: lineItems.reduce((a, i) => a + i.breakdown.volumeM3, 0),
        weightKg: lineItems.reduce((a, i) => a + i.breakdown.weightKg, 0),
        grandTotalBrl: lineItems.reduce((a, i) => a + i.breakdown.totalBrl, 0),
        grandTotalSIpiBrl: lineItems.reduce((a, i) => a + i.breakdown.totalSIpiBrl, 0),
        grandTotalSImpBrl: lineItems.reduce((a, i) => a + i.breakdown.totalSImpBrl, 0),
      },
    }
    localStorage.setItem('quotation_print_data', JSON.stringify(printData))
    window.open('/cotacao/print', '_blank')

    // Salvar no banco automaticamente ao gerar PDF
    fetch('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildQuotationPayload('sent')),
    }).catch(() => {
      // Salvar em background — falhas silenciosas para não interromper o PDF
    })
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
  const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm p-6'

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Título da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nova Cotação</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os dados abaixo para gerar uma proposta comercial</p>
        </div>
        <span
          className="text-xs font-mono font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: '#E6F1FB', color: '#0C447C' }}
        >
          {quotationNumber}
        </span>
      </div>

      {/* ── Dados da Cotação ─────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          Dados da Cotação
        </h2>
        {/* Linha 1: Número (25%), Data (25%), Empresa (50%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px' }} className="mb-4">
          <div>
            <label className={labelClass}>Número</label>
            <input type="text" readOnly value={quotationNumber}
              className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Data</label>
            <input type="text" readOnly value={formatDateBR(today)}
              className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
          </div>
          <div>
            <label className={labelClass}>Empresa</label>
            <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nome da empresa" className={inputClass} />
          </div>
        </div>
        {/* Linha 2: Contato (30%), E-mail (30%), Telefone (20%), CNPJ (20%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 3fr 2fr 2fr', gap: '16px' }} className="mb-4">
          <div>
            <label className={labelClass}>Contato</label>
            <input type="text" value={contato} onChange={(e) => setContato(e.target.value)}
              placeholder="Nome do contato" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" value={emailContato} onChange={(e) => setEmailContato(e.target.value)}
              placeholder="contato@empresa.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input type="text" value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0001-00" className={inputClass} />
          </div>
        </div>
        {/* Linha 3: Endereço (50%), Cidade (30%), Estado (5%), CEP (10%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '10fr 6fr 1fr 2fr', gap: '16px' }} className="mb-4">
          <div>
            <label className={labelClass}>Endereço</label>
            <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            {cidades.length > 0 ? (
              <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {cidades.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade" className={inputClass} />
            )}
          </div>
          <div>
            <label className={labelClass}>UF</label>
            <select value={estado} onChange={(e) => handleEstadoChange(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              CEP{loadingCep && <span className="text-blue-500 ml-1">…</span>}
            </label>
            <input type="text" value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000" className={inputClass} />
          </div>
        </div>
        {/* Linha 4: Condições de Pagamento (40%), Prazo Entrega (20%), Prazo Validade (20%), Fornecedor (20%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label className={labelClass}>Condições de pagamento</label>
            <input type="text" value={pagamento} onChange={(e) => setPagamento(e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prazo de entrega</label>
            <select value={prazo} onChange={(e) => setPrazo(e.target.value)} className={inputClass}>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="45">45 dias</option>
              <option value="60">60 dias</option>
              <option value="75">75 dias</option>
              <option value="90">90 dias</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Prazo de Validade</label>
            <select value={prazoValidade} onChange={(e) => setPrazoValidade(e.target.value)} className={inputClass}>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select value={fornecedor} onChange={(e) => {
              const f = e.target.value
              setFornecedor(f)
              // Recalcula preços dos itens já adicionados com o novo fornecedor
              setLineItems(prev => prev.map(li => ({
                ...li,
                breakdown: buildBreakdown(li.product, li.qtyBoxes, f),
              })))
            }} className={inputClass}>
              <option value="Four Star">Four Star</option>
              <option value="Munan">Munan</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Produtos ─────────────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          Produtos
        </h2>

        {/* Filtros de produto */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[140px]">
            <label className={labelClass}>Tipo</label>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className={inputClass}>
              <option value="">Todos os tipos</option>
              <option value="Frasco">Frasco</option>
              <option value="Ampola">Ampola</option>
              <option value="Rolha">Rolha</option>
              <option value="Selo Alum Flip">Selo Alum Flip</option>
              <option value="Selo Alu-plas">Selo Alu-plas</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Volume</label>
            <select value={filterVolume} onChange={e => setFilterVolume(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              <option value="2ml">2ml</option>
              <option value="3ml">3ml</option>
              <option value="4ml">4ml</option>
              <option value="5ml">5ml</option>
              <option value="6ml">6ml</option>
              <option value="8ml">8ml</option>
              <option value="10ml">10ml</option>
              <option value="15ml">15ml</option>
              <option value="20ml">20ml</option>
              <option value="30ml">30ml</option>
              <option value="50ml">50ml</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Cor</label>
            <select value={filterCor} onChange={e => setFilterCor(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              <option value="Ambar">Âmbar</option>
              <option value="Transparente">Transparente</option>
              <option value="Branco">Branco</option>
              <option value="Azul">Azul</option>
            </select>
          </div>
        </div>

        {/* Linha de adição */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div className="flex-1 min-w-[240px]">
            <label className={labelClass}>Produto</label>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => { setProductSearch(''); setShowDropdown(true) }}
                onKeyDown={e => e.key === 'Escape' && setShowDropdown(false)}
                placeholder={loadingProducts ? 'Carregando produtos...' : 'Digite para buscar produto...'}
                disabled={loadingProducts}
                className={inputClass}
              />
              {showDropdown && filteredProducts.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto'
                }}>
                  {filteredProducts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id)
                        setProductSearch(`${p.description} — ${p.partNumber}`)
                        setShowDropdown(false)
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                        borderBottom: '1px solid #f1f5f9',
                        background: p.id === selectedProductId ? '#EBF0FF' : undefined
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = p.id === selectedProductId ? '#EBF0FF' : '')}
                    >
                      <span style={{ fontWeight: 500 }}>{p.description}</span>
                      <span style={{ color: '#94a3b8', marginLeft: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                        {p.partNumber}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-32">
            <label className={labelClass}>Qtd. (caixas)</label>
            <input
              type="number"
              min="1"
              value={qtyBoxesInput}
              onChange={(e) => setQtyBoxesInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="0"
              className={`${inputClass} font-mono`}
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={loadingProducts || products.length === 0}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0C3460' }}
          >
            + Adicionar
          </button>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }} className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-8">N°</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Descrição</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Part Number</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Caixas</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Unidades</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">m³</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Kg</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Unit BRL</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Cx BRL</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Total BRL</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-400 text-xs">
                    Nenhum produto adicionado. Selecione um produto e a quantidade acima.
                  </td>
                </tr>
              ) : (
                lineItems.map((li, idx) => (
                  <tr key={li.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-medium">{li.product.description}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono">{li.product.partNumber}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{li.breakdown.qtyBoxes}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{li.breakdown.qtyUnits.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{num(li.breakdown.volumeM3, 3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{num(li.breakdown.weightKg, 1)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{brl(li.breakdown.finalPriceUnit)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{brl(li.breakdown.finalPriceBox)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{brl(li.breakdown.totalBrl)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleRemoveItem(li.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors font-medium text-base leading-none"
                        title="Remover item"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Rodapé de totais */}
            {lineItems.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#EBF0FF' }} className="border-t-2 border-blue-200">
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 font-semibold text-gray-700">Totais</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{totals.boxes}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{totals.units.toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{num(totals.volume, 3)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800">{num(totals.weight, 1)}</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900" style={{ color: '#0C3460' }}>
                    R$ {brl(totals.total)}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ── Barra de Ações ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-2 pb-6">
        <button
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-gray-100"
          style={{ borderColor: '#64748B', color: '#64748B' }}
          onClick={handleNovaCotacao}
        >
          + Nova Cotação
        </button>
        <button
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0F6E56' }}
          onClick={handleSalvarRascunho}
        >
          Salvar Rascunho
        </button>
        <button
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0C3460' }}
          onClick={handleGerarPdf}
        >
          Gerar PDF
        </button>
        <button
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-blue-950 hover:text-white"
          style={{ borderColor: '#0C3460', color: '#0C3460' }}
          onClick={() => alert('Envio por e-mail em breve')}
        >
          Enviar por E-mail
        </button>
      </div>
    </div>
  )
}
