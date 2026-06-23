'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { type Product, type PricingBreakdown } from '@/lib/pricingEngine'
import { supabase } from '@/lib/supabase'

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

function applyDiscount(bd: PricingBreakdown, discount: number): PricingBreakdown {
  if (discount === 0) return bd
  const m = 1 + discount / 100
  return {
    ...bd,
    finalPriceUnit:     bd.finalPriceUnit     * m,
    finalPriceBox:      bd.finalPriceBox      * m,
    totalBrl:           bd.totalBrl           * m,
    finalPriceUnitSIpi: bd.finalPriceUnitSIpi * m,
    finalPriceBoxSIpi:  bd.finalPriceBoxSIpi  * m,
    totalSIpiBrl:       bd.totalSIpiBrl       * m,
    finalPriceUnitSImp: bd.finalPriceUnitSImp * m,
    finalPriceBoxSImp:  bd.finalPriceBoxSImp  * m,
    totalSImpBrl:       bd.totalSImpBrl       * m,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function breakdownFromSavedItem(si: any, product: ExtProduct | undefined, fornecedor: string, rate: number): PricingBreakdown | null {
  const hasPrices = (si.finalPriceUnit ?? 0) > 0
  if (hasPrices) {
    // Usa preços salvos diretamente (sem recalcular)
    // SIpi/SImp podem ser 0 para cotações antigas que não os salvavam
    return {
      productId: product?.id ?? si.partNumber,
      description: si.description ?? '',
      partNumber: si.partNumber,
      qtyBoxes: si.qtyBoxes,
      qtyUnits: si.qtyUnits ?? si.qtyBoxes * (si.pcsPerBox ?? product?.pcsPerBox ?? 1),
      volumeM3: si.volumeM3 ?? 0,
      weightKg: si.weightKg ?? 0,
      fobUsdBox: 0, navalUsdBox: 0, insuranceUsdBox: 0, cifUsdBox: 0, cifBrlBox: 0,
      iiValue: 0, ipiValue: 0, pisValue: 0, cofinsValue: 0, icmsValue: 0, totalTaxesBrl: 0,
      customsPerBox: 0, basePriceBox: si.finalPriceBox ?? 0, basePriceUnit: si.finalPriceUnit, markupRate: 0,
      finalPriceUnit:     si.finalPriceUnit,
      finalPriceBox:      si.finalPriceBox  ?? 0,
      totalBrl:           si.totalBrl       ?? 0,
      finalPriceUnitSIpi: si.finalPriceUnitSIpi ?? 0,
      finalPriceBoxSIpi:  si.finalPriceBoxSIpi  ?? 0,
      totalSIpiBrl:       si.totalSIpiBrl        ?? 0,
      finalPriceUnitSImp: si.finalPriceUnitSImp ?? 0,
      finalPriceBoxSImp:  si.finalPriceBoxSImp  ?? 0,
      totalSImpBrl:       si.totalSImpBrl        ?? 0,
    }
  }
  // Sem preços salvos: tenta recalcular do produto
  if (product) return buildBreakdown(product, si.qtyBoxes, fornecedor, rate)
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function productFromSavedItem(si: any): ExtProduct {
  return {
    id: si.partNumber,
    description: si.description ?? si.partNumber,
    partNumber: si.partNumber,
    productType: '',
    ncmCode: si.ncmCode ?? '',
    pcsPerBox: Number(si.pcsPerBox) || 1,
    weightGrossKg: 0,
    volumeBoxM3: 0,
    fobUsd: 0,
    volumeMl: si.volumeMl ?? null,
    tamanho: si.tamanho ?? null,
    taxRates: { ii: 0, ipi: 0, pis: 0, cofins: 0, icms: 0 },
    markupTable: { qty10: 0.70, qty20: 0.65, qty50: 0.60, qty100: 0.55, qty200: 0.50 },
    un_cimp_cipi_fourstar: null, cx_cimp_cipi_fourstar: null,
    un_cimp_sipi_fourstar: null, cx_cimp_sipi_fourstar: null,
    un_simp_fourstar: null, cx_simp_fourstar: null,
    un_cimp_cipi_munan: null, cx_cimp_cipi_munan: null,
    un_cimp_sipi_munan: null, cx_cimp_sipi_munan: null,
    un_simp_munan: null, cx_simp_munan: null,
  }
}

function buildBreakdown(product: ExtProduct, qtyBoxes: number, fornecedor: string, usdBrl = 1): PricingBreakdown {
  const m    = fornecedor === 'Munan'
  const rate = usdBrl > 0 ? usdBrl : 1
  const unCI  = (m ? (product.un_cimp_cipi_munan   ?? 0) : (product.un_cimp_cipi_fourstar   ?? 0)) * rate
  const cxCI  = (m ? (product.cx_cimp_cipi_munan   ?? 0) : (product.cx_cimp_cipi_fourstar   ?? 0)) * rate
  const unSI  = (m ? (product.un_cimp_sipi_munan   ?? 0) : (product.un_cimp_sipi_fourstar   ?? 0)) * rate
  const cxSI  = (m ? (product.cx_cimp_sipi_munan   ?? 0) : (product.cx_cimp_sipi_fourstar   ?? 0)) * rate
  const unSIm = (m ? (product.un_simp_munan        ?? 0) : (product.un_simp_fourstar        ?? 0)) * rate
  const cxSIm = (m ? (product.cx_simp_munan        ?? 0) : (product.cx_simp_fourstar        ?? 0)) * rate
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

function todayPrefix(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `C${yy}${mm}${dd}-`
}

// ─── Tipo mínimo para histórico ───────────────────────────────────────────────
interface HistoricoItem {
  id: string
  quote_number: string
  client_company?: string
  client_contact?: string
  client_email?: string
  client_phone?: string
  client_cnpj?: string
  client_address?: string
  client_city?: string
  client_state?: string
  client_cep?: string
  supplier?: string
  usd_brl?: number       // legado
  usd_brl_rate?: number  // coluna real no banco
  payment_terms?: string
  delivery_days?: number
  validity_days?: number
  created_at: string
  items?: Array<{
    description?: string; partNumber: string; ncmCode?: string
    volumeMl?: number | null; tamanho?: string | null; pcsPerBox?: number
    qtyBoxes: number; qtyUnits?: number; volumeM3?: number; weightKg?: number
    finalPriceUnit?: number; finalPriceBox?: number; totalBrl?: number
    finalPriceUnitSIpi?: number; finalPriceBoxSIpi?: number; totalSIpiBrl?: number
    finalPriceUnitSImp?: number; finalPriceBoxSImp?: number; totalSImpBrl?: number
  }> | null
  local_entrega?: string
  frete_entrega?: number
  global_discount?: number
  internal_notes?: string
  client_notes?: string
  responsible_name?: string
  totals?: Record<string, unknown>
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
  discount: number
  breakdown: PricingBreakdown
}

const DRAFT_KEY = 'cotacao_draft_v2'
const EDIT_KEY  = 'cotacao_editing_id'

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

  // Lê o ID de edição sincronamente no mount (antes de qualquer render)
  const [editingIdOnLoad] = useState<string>(() => {
    try {
      const id = localStorage.getItem(EDIT_KEY)
      if (id) localStorage.removeItem(EDIT_KEY)
      return id ?? ''
    } catch { return '' }
  })

  // ID da cotação já salva no banco (para PATCH de status)
  const [savedQuotationId, setSavedQuotationId] = useState<string>(() => {
    try { return localStorage.getItem(EDIT_KEY + '_saved') ?? '' } catch { return '' }
  })

  // ID e nome do usuário logado (para created_by e responsible_name)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [allUsers, setAllUsers] = useState<Array<{id: string; nome: string}>>([])
  const [responsavelNome, setResponsavelNome] = useState((draft?.responsavelNome as string) ?? '')
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user?.id) return
      setCurrentUserId(data.user.id)
      if (data.user.email) setCurrentUserEmail(data.user.email)
      // Busca nome e role no profiles
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome, role')
          .eq('id', data.user.id)
          .single()
        if (profile?.role === 'admin') setIsAdmin(true)
        if (profile?.nome) {
          const name = profile.nome
          setCurrentUserName(name)
          setResponsavelNome(prev => prev || name) // only set if not already set from draft
          return
        }
      } catch {}
      // Fallback: parte do e-mail antes do @
      if (data.user.email) {
        const name = data.user.email.split('@')[0]
        setCurrentUserName(name)
        setResponsavelNome(prev => prev || name)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    supabase.from('profiles').select('id, nome').then(({ data }) => {
      if (data) setAllUsers(data.filter((u: {id: string; nome: string}) => u.nome))
    })
  }, [])

  // Número de cotação — NUNCA restaurado do draft; sempre calculado do histórico
  const [quotationNumber, setQuotationNumber] = useState<string>(() => generateQuotationNumber(1))
  const [today] = useState(() => new Date())

  // Histórico para dropdown e numeração sequencial
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [selectedHistoricoId, setSelectedHistoricoId] = useState<string>('')
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

  // Clientes cadastrados
  interface ExtraContact { nome: string; email: string; telefone: string; cargo: string }
  function parseComentariosCotacao(raw?: string): ExtraContact[] {
    if (!raw) return []
    try {
      const p = JSON.parse(raw)
      if (p && Array.isArray(p.contacts)) return p.contacts
    } catch {}
    return []
  }

  const [clientes, setClientes] = useState<Array<{ id: string; empresa: string; contato?: string; email?: string; telefone?: string; cnpj?: string; endereco?: string; cidade?: string; estado?: string; cep?: string; comentarios?: string }>>([])
  const [savingCliente, setSavingCliente] = useState(false)
  const [clienteContatos, setClienteContatos] = useState<ExtraContact[]>([])

  // Filtros do combobox de produto
  const [filterTipo, setFilterTipo] = useState('')
  const [filterVolume, setFilterVolume] = useState('')
  const [filterCor, setFilterCor] = useState('')

  // Condições comerciais
  const [pagamento, setPagamento] = useState((draft?.pagamento as string) ?? '50% como garantia no ato do pedido + 50% antes da retirada/entrega')
  const [prazo, setPrazo] = useState((draft?.prazo as string) ?? '90')
  const [usdBrl, setUsdBrl] = useState((draft?.usdBrl as string) ?? '')
  const [usdBrlAuto, setUsdBrlAuto] = useState('')   // taxa buscada automaticamente
  const [fetchingRate, setFetchingRate] = useState(false)
  const [localEntrega, setLocalEntrega] = useState((draft?.localEntrega as string) ?? 'Armazém Shiplog Hortolândia')
  const [freteEntrega, setFreteEntrega] = useState((draft?.freteEntrega as string) ?? '')

  // Produtos do banco
  const [products, setProducts] = useState<ExtProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Desconto global sobre o total da cotação
  const [globalDiscount, setGlobalDiscount] = useState((draft?.globalDiscount as string) ?? '')

  // Notas internas (não vai para o PDF)
  const [notasInternas, setNotasInternas] = useState((draft?.notasInternas as string) ?? '')

  // Observações para o cliente (aparece no PDF)
  const [notasCliente, setNotasCliente] = useState((draft?.notasCliente as string) ?? '')

  // Anexos da cotação
  interface Attachment { name: string; path: string; url: string; size: number; type: string; at: string }
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Produtos selecionados
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qtyBoxesInput, setQtyBoxesInput] = useState('')
  const [qtyPiecesInput, setQtyPiecesInput] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  // ID do item sendo editado (pre-fill form sem remover da lista)
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null)

  // Combobox de busca de produto
  const [productSearch, setProductSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Tipos de produto disponíveis — derivado dos produtos carregados (sempre
  // reflete o que foi importado da planilha, em vez de uma lista fixa no código)
  const productTypes = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      if (p.productType) set.add(p.productType)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [products])

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
    return list
  }, [products, productSearch, filterTipo, filterVolume, filterCor])

  // Buscar clientes cadastrados para o dropdown de Empresa
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setClientes(data) })
      .catch(() => {})
  }, [])

  // Buscar histórico + calcular próximo número / restaurar edição
  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then((data: HistoricoItem[]) => {
        if (!Array.isArray(data)) return
        setHistorico(data)

        if (editingIdOnLoad) {
          // Veio do botão "Editar" do histórico — popula todos os campos
          const q = data.find(h => h.id === editingIdOnLoad)
          if (q) {
            setSavedQuotationId(q.id)
            setSelectedHistoricoId(q.id)
            setQuotationNumber(q.quote_number)
            setEmpresa(q.client_company ?? '')
            setContato(q.client_contact ?? '')
            setEmailContato(q.client_email ?? '')
            setTelefone(q.client_phone ?? '')
            setCnpj(q.client_cnpj ?? '')
            setEndereco(q.client_address ?? '')
            setEstado(q.client_state ?? '')
            setCep(q.client_cep ?? '')
            setPrazoValidade(String(q.validity_days ?? 30))
            setPagamento(q.payment_terms ?? '50% como garantia no ato do pedido + 50% antes da retirada/entrega')
            setPrazo(String(q.delivery_days ?? 90))
            setFornecedor(q.supplier ?? 'Four Star')
            const savedRate1 = q.usd_brl_rate ?? q.usd_brl
            if (savedRate1 && savedRate1 > 0) setUsdBrl(String(savedRate1).replace('.', ','))
            // Notas
            setNotasInternas(q.internal_notes ?? (q.totals?._notes as string) ?? '')
            setNotasCliente(q.client_notes ?? (q.totals?._cn as string) ?? '')
            // Campos de entrega/desconto
            if (q.local_entrega || q.totals?._local) setLocalEntrega((q.local_entrega ?? q.totals?._local as string) || 'Armazém Shiplog Hortolândia')
            if (q.frete_entrega != null || q.totals?._frete != null) {
              const fr = q.frete_entrega ?? (q.totals?._frete as number)
              if (fr) setFreteEntrega(String(fr).replace('.', ','))
            }
            if (q.global_discount != null || q.totals?._disc) {
              const disc = q.global_discount ?? (q.totals?._disc as string)
              if (disc) setGlobalDiscount(String(disc))
            }
            if (q.client_state) {
              loadCidades(q.client_state).then(() => setCidade(q.client_city ?? ''))
            } else {
              setCidade(q.client_city ?? '')
            }
            // Se campos de contato/endereço estão vazios (cotação antiga), preenche do cadastro de clientes
            if (!q.client_phone && !q.client_cnpj && !q.client_address && q.client_company) {
              fetch('/api/clients')
                .then(r => r.json())
                .then((cls: Array<{ empresa: string; telefone?: string; cnpj?: string; endereco?: string; cep?: string; cidade?: string; estado?: string }>) => {
                  const match = cls.find(c => c.empresa.toLowerCase() === (q.client_company ?? '').toLowerCase())
                  if (!match) return
                  if (match.telefone) setTelefone(match.telefone)
                  if (match.cnpj)     setCnpj(match.cnpj)
                  if (match.endereco) setEndereco(match.endereco)
                  if (match.cep)      setCep(match.cep)
                  if (match.estado) {
                    setEstado(match.estado)
                    loadCidades(match.estado).then(() => { if (match.cidade) setCidade(match.cidade) })
                  } else if (match.cidade) {
                    setCidade(match.cidade)
                  }
                })
                .catch(() => {})
            }
            // Carrega anexos se existirem
            const totalsRaw = (q as unknown as { totals?: { _attachments?: unknown[] } }).totals
            if (Array.isArray(totalsRaw?._attachments)) {
              setAttachments(totalsRaw._attachments as Attachment[])
            }
            return // não recalcula número sequencial
          }
        }

        // Nova cotação — calcula próximo número do dia
        const prefix = todayPrefix()
        const seqs = data
          .filter(q => q.quote_number?.startsWith(prefix))
          .map(q => parseInt(q.quote_number?.split('-')[1] ?? '0', 10))
          .filter(n => !isNaN(n))
        const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1
        setQuotationNumber(generateQuotationNumber(next))
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-salvar rascunho local (quotationNumber NÃO é salvo — sempre recalculado)
  useEffect(() => {
    saveDraft({
      empresa, contato, emailContato, telefone,
      cnpj, endereco, cidade, estado, cep, fornecedor,
      prazoValidade, pagamento, prazo, usdBrl, localEntrega, freteEntrega, globalDiscount, notasInternas, notasCliente,
      responsavelNome,
      savedItems: lineItems.map(li => ({
        partNumber: li.product.partNumber,
        qtyBoxes: li.qtyBoxes,
      })),
    })
  }, [empresa, contato, emailContato, telefone,
      cnpj, endereco, cidade, estado, cep, fornecedor,
      prazoValidade, pagamento, prazo, usdBrl, localEntrega, freteEntrega, globalDiscount, notasInternas, notasCliente,
      responsavelNome, lineItems]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUploadFile(file: File) {
    const qId = savedQuotationId
    if (!qId) { alert('Salve a cotação primeiro antes de adicionar anexos.'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Arquivo muito grande. Máximo: 10 MB.'); return }
    setUploadingFile(true)
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${qId}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage
        .from('quotation-attachments')
        .upload(path, file, { upsert: false })
      if (error) { alert('Erro ao enviar arquivo: ' + error.message); return }
      const { data: urlData } = supabase.storage.from('quotation-attachments').getPublicUrl(path)
      const newAtt: Attachment = {
        name: file.name,
        path,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type || (ext ? `application/${ext}` : 'application/octet-stream'),
        at: new Date().toISOString(),
      }
      const updated = [...attachments, newAtt]
      setAttachments(updated)
      await fetch(`/api/quotations/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updated }),
      })
    } catch (e) {
      alert('Erro inesperado ao enviar arquivo.')
      console.error(e)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveAttachment(att: Attachment) {
    if (!confirm(`Remover o anexo "${att.name}"?`)) return
    const qId = savedQuotationId
    try {
      await supabase.storage.from('quotation-attachments').remove([att.path])
    } catch {}
    const updated = attachments.filter(a => a.path !== att.path)
    setAttachments(updated)
    if (qId) {
      await fetch(`/api/quotations/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updated }),
      })
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function handleNovaCotacao() {
    if (lineItems.length > 0 || empresa) {
      if (!confirm('Iniciar nova cotação? Os dados atuais serão descartados.')) return
    }
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    window.location.reload()
  }

  function handleSelectCliente(id: string) {
    const c = clientes.find(x => x.id === id)
    if (!c) return
    setEmpresa(c.empresa ?? '')
    setContato(c.contato ?? '')
    setEmailContato(c.email ?? '')
    setTelefone(c.telefone ?? '')
    setCnpj(c.cnpj ?? '')
    setEndereco(c.endereco ?? '')
    setCep(c.cep ?? '')
    setEstado(c.estado ?? '')
    if (c.estado) {
      loadCidades(c.estado).then(() => setCidade(c.cidade ?? ''))
    } else {
      setCidade(c.cidade ?? '')
    }
    // Carrega contatos extras
    const extras = parseComentariosCotacao(c.comentarios)
    setClienteContatos(extras)
  }

  async function handleSalvarCliente() {
    if (!empresa.trim()) { alert('Preencha o campo Empresa antes de salvar o cliente.'); return }
    setSavingCliente(true)
    try {
      // Verifica se o cliente já existe
      const existing = clientes.find(c => c.empresa.toLowerCase() === empresa.trim().toLowerCase())
      const payload = { empresa: empresa.trim(), contato, email: emailContato, telefone, cnpj, endereco, cidade, estado, cep }
      const url = existing ? `/api/clients/${existing.id}` : '/api/clients'
      const method = existing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { alert(`Erro ao salvar cliente: ${data.error}`); return }
      if (existing) {
        setClientes(prev => prev.map(c => c.id === existing.id ? { ...c, ...payload } : c))
      } else {
        setClientes(prev => [...prev, data])
      }
      alert(`Cliente "${empresa}" ${existing ? 'atualizado' : 'salvo'} com sucesso!`)
    } catch { alert('Erro ao salvar cliente.') } finally { setSavingCliente(false) }
  }

  function handleSelectHistorico(id: string) {
    setSelectedHistoricoId(id)
    if (!id) { handleNovaCotacao(); return }
    const q = historico.find(h => h.id === id)
    if (!q) return
    setQuotationNumber(q.quote_number)
    setEmpresa(q.client_company ?? '')
    setContato(q.client_contact ?? '')
    setEmailContato(q.client_email ?? '')
    setTelefone(q.client_phone ?? '')
    setCnpj(q.client_cnpj ?? '')
    setEndereco(q.client_address ?? '')
    setEstado(q.client_state ?? '')
    setCep(q.client_cep ?? '')
    setPrazoValidade(String(q.validity_days ?? 30))
    setPagamento(q.payment_terms ?? '50% como garantia no ato do pedido + 50% antes da retirada/entrega')
    setPrazo(String(q.delivery_days ?? 90))
    setFornecedor(q.supplier ?? 'Four Star')
    const savedRate2 = q.usd_brl_rate ?? q.usd_brl
    if (savedRate2 && savedRate2 > 0) setUsdBrl(String(savedRate2).replace('.', ','))
    // Notas
    setNotasInternas(q.internal_notes ?? (q.totals?._notes as string) ?? '')
    setNotasCliente(q.client_notes ?? (q.totals?._cn as string) ?? '')
    // Campos de entrega/desconto
    if (q.local_entrega || q.totals?._local) setLocalEntrega((q.local_entrega ?? q.totals?._local as string) || 'Armazém Shiplog Hortolândia')
    if (q.frete_entrega != null || q.totals?._frete != null) {
      const fr = q.frete_entrega ?? (q.totals?._frete as number)
      if (fr) setFreteEntrega(String(fr).replace('.', ','))
    }
    if (q.global_discount != null || q.totals?._disc) {
      const disc = q.global_discount ?? (q.totals?._disc as string)
      if (disc) setGlobalDiscount(String(disc))
    }
    // Carregar cidades do estado restaurado
    if (q.client_state) loadCidades(q.client_state).then(() => {
      setCidade(q.client_city ?? '')
    })
    else setCidade(q.client_city ?? '')
    // Se campos de contato/endereço estão vazios (cotação antiga), preenche do cadastro de clientes
    if (!q.client_phone && !q.client_cnpj && !q.client_address && q.client_company) {
      fetch('/api/clients')
        .then(r => r.json())
        .then((cls: Array<{ empresa: string; telefone?: string; cnpj?: string; endereco?: string; cep?: string; cidade?: string; estado?: string }>) => {
          const match = cls.find(c => c.empresa.toLowerCase() === (q.client_company ?? '').toLowerCase())
          if (!match) return
          if (match.telefone) setTelefone(match.telefone)
          if (match.cnpj)     setCnpj(match.cnpj)
          if (match.endereco) setEndereco(match.endereco)
          if (match.cep)      setCep(match.cep)
          if (match.estado) {
            setEstado(match.estado)
            loadCidades(match.estado).then(() => { if (match.cidade) setCidade(match.cidade) })
          } else if (match.cidade) {
            setCidade(match.cidade)
          }
        })
        .catch(() => {})
    }
    // Restaurar itens da cotação
    const fornecedorAtual = q.supplier ?? 'Four Star'
    const savedBrl2 = q.usd_brl_rate ?? q.usd_brl
    const rateAtual = savedBrl2 && savedBrl2 > 0 ? savedBrl2 : (parseFloat(usdBrl.replace(',', '.')) || 1)
    const restored: LineItem[] = []
    for (const si of (q.items ?? [])) {
      const product = products.find(p => p.partNumber === si.partNumber)
      const breakdown = breakdownFromSavedItem(si, product, fornecedorAtual, rateAtual)
      if (!breakdown) continue
      const prod = product ?? productFromSavedItem(si)
      restored.push({ id: `r-${si.partNumber}-${Math.random()}`, product: prod, qtyBoxes: si.qtyBoxes, discount: 0, breakdown })
    }
    setLineItems(restored)
  }

  // Busca taxa USD automática ao carregar (AwesomeAPI — sem chave, grátis)
  useEffect(() => {
    setFetchingRate(true)
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      .then(r => r.json())
      .then(data => {
        const bid = data?.USDBRL?.bid
        if (bid) {
          const formatted = parseFloat(bid).toFixed(2).replace('.', ',')
          setUsdBrlAuto(formatted)
          // Só preenche automaticamente se o campo ainda estiver vazio
          setUsdBrl(prev => prev === '' ? formatted : prev)
        }
      })
      .catch(() => {}) // falha silenciosa — usuário pode digitar manualmente
      .finally(() => setFetchingRate(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    const subtotal = items.reduce((a, r) => a + r.totalBrl, 0)
    const discPct = parseFloat(globalDiscount.replace(',', '.')) || 0
    const discValue = subtotal * (discPct / 100)
    const totalFinal = subtotal + discValue // discPct negativo reduz, positivo aumenta
    return {
      boxes: items.reduce((a, r) => a + r.qtyBoxes, 0),
      units: items.reduce((a, r) => a + r.qtyUnits, 0),
      volume: items.reduce((a, r) => a + r.volumeM3, 0),
      weight: items.reduce((a, r) => a + r.weightKg, 0),
      total: subtotal,
      discPct,
      discValue,
      totalFinal,
    }
  }, [lineItems, globalDiscount])

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
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [])

  // Restaurar itens quando AMBOS products e historico estiverem carregados
  const itemsRestoredRef = useRef(false)
  useEffect(() => {
    if (products.length === 0 || itemsRestoredRef.current) return

    if (editingIdOnLoad) {
      // Editar vindo do histórico — espera o historico estar carregado
      if (historico.length === 0) return
      const q = historico.find(h => h.id === editingIdOnLoad)
      if (!q?.items?.length) { itemsRestoredRef.current = true; return }
      const fornecedorAtual = q.supplier ?? 'Four Star'
      const savedBrl = q.usd_brl_rate ?? q.usd_brl
      const rateAtual = savedBrl && savedBrl > 0 ? savedBrl : (parseFloat(usdBrl.replace(',', '.')) || 1)
      const restored: LineItem[] = []
      for (const si of q.items) {
        const product = products.find(p => p.partNumber === si.partNumber)
        const breakdown = breakdownFromSavedItem(si, product, fornecedorAtual, rateAtual)
        if (!breakdown) continue
        const prod = product ?? productFromSavedItem(si)
        restored.push({ id: `r-${si.partNumber}-${Math.random()}`, product: prod, qtyBoxes: si.qtyBoxes, discount: 0, breakdown })
      }
      if (restored.length > 0) setLineItems(restored)
      itemsRestoredRef.current = true
    } else {
      // Rascunho normal — restaura do localStorage
      const saved = loadDraft()
      const savedItems = saved?.savedItems as Array<{ partNumber: string; qtyBoxes: number }> | undefined
      if (savedItems && savedItems.length > 0) {
        const fornecedorAtual = (saved?.fornecedor as string) ?? 'Four Star'
        const rateRascunho = parseFloat(((saved?.usdBrl as string) ?? usdBrl).replace(',', '.')) || 1
        const restored: LineItem[] = []
        for (const si of savedItems) {
          const product = products.find(p => p.partNumber === si.partNumber)
          if (product) {
            const breakdown = buildBreakdown(product, si.qtyBoxes, fornecedorAtual, rateRascunho)
            restored.push({ id: `r-${si.partNumber}-${Math.random()}`, product, qtyBoxes: si.qtyBoxes, discount: 0, breakdown })
          }
        }
        if (restored.length > 0) setLineItems(restored)
      }
      itemsRestoredRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, historico])

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
          const endParts = [json.logradouro, json.bairro].filter(Boolean)
          if (endParts.length > 0) setEndereco(endParts.join(', '))
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

  function handleQtyPiecesChange(value: string) {
    setQtyPiecesInput(value)
    const pcs = parseInt(value, 10)
    if (!isNaN(pcs) && pcs > 0) {
      const product = products.find(p => p.id === selectedProductId)
      if (product) setQtyBoxesInput(String(Math.ceil(pcs / product.pcsPerBox)))
    } else {
      setQtyBoxesInput('')
    }
  }

  function handleQtyBoxesChange(value: string) {
    setQtyBoxesInput(value)
    const boxes = parseInt(value, 10)
    if (!isNaN(boxes) && boxes > 0) {
      const product = products.find(p => p.id === selectedProductId)
      if (product) setQtyPiecesInput(String(boxes * product.pcsPerBox))
    } else {
      setQtyPiecesInput('')
    }
  }

  function handleAddItem() {
    const qty = parseInt(qtyBoxesInput, 10)
    if (!qty || qty <= 0) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const discount = parseFloat(discountInput.replace(',', '.')) || 0
    const rate = parseFloat(usdBrl.replace(',', '.')) || 1
    const rawBreakdown = buildBreakdown(product, qty, fornecedor, rate)
    const breakdown = applyDiscount(rawBreakdown, discount)

    if (editingLineItemId) {
      // Substituir o item sendo editado, mantendo sua posição na lista
      setLineItems((prev) => prev.map((li) => {
        if (li.id !== editingLineItemId) return li
        // Se o novo breakdown tem preços zero mas o item original tinha preços salvos,
        // recalcula o breakdown usando os preços unitários do item original (ajusta qty)
        let finalBreakdown = breakdown
        if (breakdown.finalPriceUnit === 0 && li.breakdown.finalPriceUnit > 0) {
          const base = li.breakdown
          const pcsPerBox = product.pcsPerBox || li.product.pcsPerBox || 1
          finalBreakdown = applyDiscount({
            ...base,
            qtyBoxes: qty,
            qtyUnits: qty * pcsPerBox,
            volumeM3: qty * (product.volumeBoxM3 || 0),
            weightKg: qty * (product.weightGrossKg || 0),
            totalBrl:     base.finalPriceBox * qty,
            totalSIpiBrl: base.finalPriceBoxSIpi * qty,
            totalSImpBrl: base.finalPriceBoxSImp * qty,
          }, discount)
        }
        return { id: editingLineItemId, product, qtyBoxes: qty, discount, breakdown: finalBreakdown }
      }))
      setEditingLineItemId(null)
    } else {
      setLineItems((prev) => [
        ...prev,
        { id: `${Date.now()}`, product, qtyBoxes: qty, discount, breakdown },
      ])
    }
    setQtyBoxesInput('')
    setQtyPiecesInput('')
    setDiscountInput('')
  }

  function handleRemoveItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id))
  }

  function handleUpdateQty(id: string, newBoxes: number) {
    if (!newBoxes || newBoxes <= 0) return
    const rate = parseFloat(usdBrl.replace(',', '.')) || 1
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li
      const rawBreakdown = buildBreakdown(li.product, newBoxes, fornecedor, rate)
      const breakdown = applyDiscount(rawBreakdown, li.discount)
      return { ...li, qtyBoxes: newBoxes, breakdown }
    }))
  }

  function handleUpdateDiscount(id: string, newDiscount: number) {
    const rate = parseFloat(usdBrl.replace(',', '.')) || 1
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li
      const rawBreakdown = buildBreakdown(li.product, li.qtyBoxes, fornecedor, rate)
      const breakdown = applyDiscount(rawBreakdown, newDiscount)
      return { ...li, discount: newDiscount, breakdown }
    }))
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
          usd_brl: parseFloat(usdBrl.replace(',', '.')) || null,
          payment_terms: pagamento,
          delivery_days: parseInt(prazo) || 90,
          validity_days: parseInt(prazoValidade) || 30,
          created_by: currentUserId || null,
          responsible_name: responsavelNome || currentUserName || null,
          internal_notes: notasInternas || null,
          client_notes: notasCliente || null,
          items: lineItems.map((li) => ({
            description: li.product.description,
            partNumber: li.product.partNumber,
            ncmCode: li.product.ncmCode,
            volumeMl: li.product.volumeMl,
            tamanho: li.product.tamanho,
            pcsPerBox: li.product.pcsPerBox,
            qtyBoxes: li.qtyBoxes,
            qtyUnits: li.breakdown.qtyUnits,
            volumeM3: li.breakdown.volumeM3,
            weightKg: li.breakdown.weightKg,
            finalPriceUnit:     li.breakdown.finalPriceUnit,
            finalPriceBox:      li.breakdown.finalPriceBox,
            totalBrl:           li.breakdown.totalBrl,
            finalPriceUnitSIpi: li.breakdown.finalPriceUnitSIpi,
            finalPriceBoxSIpi:  li.breakdown.finalPriceBoxSIpi,
            totalSIpiBrl:       li.breakdown.totalSIpiBrl,
            finalPriceUnitSImp: li.breakdown.finalPriceUnitSImp,
            finalPriceBoxSImp:  li.breakdown.finalPriceBoxSImp,
            totalSImpBrl:       li.breakdown.totalSImpBrl,
          })),
          totals: {
            boxes: totals.boxes,
            units: totals.units,
            volumeM3: totals.volume,
            weightKg: totals.weight,
            grandTotalBrl: totals.totalFinal,
            subtotalBrl: totals.total,
            globalDiscountPct: totals.discPct,
            _local: localEntrega || undefined,
            _frete: freteEntrega ? parseFloat(freteEntrega.replace(',', '.')) || undefined : undefined,
            _disc: globalDiscount || undefined,
          },
          status: 'draft',
        }),
      })
      if (res.ok) {
        const saved = await res.json().catch(() => ({}))
        if (saved?.id) setSavedQuotationId(saved.id)
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
      usd_brl: parseFloat(usdBrl.replace(',', '.')) || null,
      payment_terms: pagamento,
      delivery_days: parseInt(prazo) || 30,
      destination_port: cidade ? `${cidade}${estado ? ' - ' + estado : ''}` : '',
      validity_days: 30,
      created_by: currentUserId || null,
      responsible_name: responsavelNome || currentUserName || null,
      internal_notes: notasInternas || null,
      client_notes: notasCliente || null,
      items: lineItems.map((li) => ({
        description: li.product.description,
        partNumber: li.product.partNumber,
        ncmCode: li.product.ncmCode,
        volumeMl: li.product.volumeMl,
        tamanho: li.product.tamanho,
        pcsPerBox: li.product.pcsPerBox,
        qtyBoxes: li.qtyBoxes,
        qtyUnits: li.breakdown.qtyUnits,
        volumeM3: li.breakdown.volumeM3,
        weightKg: li.breakdown.weightKg,
        finalPriceUnit:     li.breakdown.finalPriceUnit,
        finalPriceBox:      li.breakdown.finalPriceBox,
        totalBrl:           li.breakdown.totalBrl,
        finalPriceUnitSIpi: li.breakdown.finalPriceUnitSIpi,
        finalPriceBoxSIpi:  li.breakdown.finalPriceBoxSIpi,
        totalSIpiBrl:       li.breakdown.totalSIpiBrl,
        finalPriceUnitSImp: li.breakdown.finalPriceUnitSImp,
        finalPriceBoxSImp:  li.breakdown.finalPriceBoxSImp,
        totalSImpBrl:       li.breakdown.totalSImpBrl,
      })),
      totals: {
        boxes: totals.boxes,
        units: totals.units,
        volumeM3: totals.volume,
        weightKg: totals.weight,
        grandTotalBrl: totals.totalFinal,
        subtotalBrl: totals.total,
        globalDiscountPct: totals.discPct,
        _local: localEntrega || undefined,
        _frete: freteEntrega ? parseFloat(freteEntrega.replace(',', '.')) || undefined : undefined,
        _disc: globalDiscount || undefined,
      },
      status,
    }
  }

  function handleGerarPdf() {
    const printData = {
      quoteNumber: quotationNumber,
      date: new Date().toLocaleDateString('pt-BR'),
      clientNotes: notasCliente || null,
      responsibleName: responsavelNome || currentUserName || '',
      userEmail: currentUserEmail || '',
      clientCompany: empresa,
      clientCnpj: cnpj,
      clientEmail: emailContato,
      clientContact: contato,
      clientPhone: telefone,
      clientAddress: endereco,
      clientCity: cidade,
      clientState: estado,
      clientCep: cep,
      usdBrl: parseFloat(usdBrl.replace(',', '.')) || 0,
      localEntrega,
      freteEntrega: parseFloat(freteEntrega.replace(',', '.')) || 0,
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
        boxes: totals.boxes,
        units: totals.units,
        volumeM3: totals.volume,
        weightKg: totals.weight,
        subtotalBrl: totals.total,
        globalDiscountPct: totals.discPct,
        globalDiscountValue: totals.discValue,
        grandTotalBrl: totals.totalFinal,
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
      body: JSON.stringify(buildQuotationPayload('draft')),
    }).then(r => r.json()).then(saved => {
      if (saved?.id) setSavedQuotationId(saved.id)
    }).catch(() => {})
  }


  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'
  const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm p-6'

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
      {/* Título da página */}
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-gray-900">
            {selectedHistoricoId ? 'Editando Cotação' : 'Nova Cotação'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os dados abaixo para gerar uma proposta comercial</p>
        </div>
        {/* Dropdown — carregar cotação do histórico — canto direito */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Carregar do histórico:</label>
          <select
            value={selectedHistoricoId}
            onChange={(e) => handleSelectHistorico(e.target.value)}
            className="w-72 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition"
          >
            <option value="">— Nova cotação —</option>
            {historico.map(q => (
              <option key={q.id} value={q.id}>
                {q.quote_number} · {q.client_company || '(sem empresa)'}
              </option>
            ))}
          </select>
          <button
            onClick={handleNovaCotacao}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#0C3460' }}
          >
            + Nova Cotação
          </button>
        </div>
      </div>

      {/* ── Cliente ──────────────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>Cliente</span>
          {selectedHistoricoId && (
            <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Editando {quotationNumber}
            </span>
          )}
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
            <div className="flex gap-2">
              <select
                value={clientes.find(c => c.empresa === empresa)?.id ?? ''}
                onChange={e => {
                  if (!e.target.value) return
                  handleSelectCliente(e.target.value)
                }}
                className={inputClass}
                style={{ flex: 1 }}
              >
                <option value="">— Selecionar cliente —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
              </select>
              <input
                type="text"
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                placeholder="Ou digite nova empresa"
                className={inputClass}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
        {/* Seletor de contato adicional (aparece quando o cliente tem múltiplos contatos) */}
        {clienteContatos.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-2">Selecionar contato do cliente:</p>
            <div className="flex flex-wrap gap-2">
              {clienteContatos.map((ec, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setContato(ec.nome)
                    setEmailContato(ec.email)
                    setTelefone(ec.telefone)
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-blue-100"
                  style={{ borderColor: '#0C3460', color: '#0C3460' }}
                >
                  {ec.nome}{ec.cargo ? ` · ${ec.cargo}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

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
        {/* Linha 4: Responsável (25%) + Salvar Cliente (alinhado à direita) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '16px' }} className="mt-3 items-end">
          <div>
            <label className={labelClass}>Responsável</label>
            <select
              value={responsavelNome}
              onChange={e => setResponsavelNome(e.target.value)}
              className={inputClass}
            >
              <option value="">— Selecionar —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.nome}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSalvarCliente}
              disabled={savingCliente}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-green-700 hover:text-white disabled:opacity-60"
              style={{ borderColor: '#15803d', color: '#15803d' }}
              title="Salva ou atualiza este cliente no banco de dados"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {savingCliente ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Condições ────────────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          Condições
        </h2>
        {/* Linha 1: Pagamento, Prazo Entrega, Prazo Validade, Taxa USD, Fornecedor */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.9fr 1fr', gap: '16px' }} className="mb-4">
          <div>
            <label className={labelClass}>
              Condições de pagamento
              {!isAdmin && <span className="ml-1 text-gray-400 font-normal text-xs">(somente admin)</span>}
            </label>
            <input
              type="text"
              value={pagamento}
              onChange={(e) => isAdmin && setPagamento(e.target.value)}
              readOnly={!isAdmin}
              className={`${inputClass}${!isAdmin ? ' bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
            />
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
            <label className={labelClass}>
              Taxa USD (R$)
              {fetchingRate && <span className="text-blue-400 ml-1 font-normal text-xs">buscando…</span>}
              {!fetchingRate && !usdBrl && <span className="text-red-400 ml-1 font-normal">*</span>}
              {!fetchingRate && usdBrlAuto && usdBrl === usdBrlAuto && (
                <span className="text-green-600 ml-1 font-normal text-xs">automática</span>
              )}
              {!fetchingRate && usdBrlAuto && usdBrl !== usdBrlAuto && usdBrl !== '' && (
                <span className="text-amber-600 ml-1 font-normal text-xs">manual</span>
              )}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={usdBrl}
                onChange={e => {
                  setUsdBrl(e.target.value)
                  const rate = parseFloat(e.target.value.replace(',', '.')) || 1
                  setLineItems(prev => prev.map(li => ({
                    ...li,
                    breakdown: applyDiscount(buildBreakdown(li.product, li.qtyBoxes, fornecedor, rate), li.discount),
                  })))
                }}
                placeholder={fetchingRate ? 'Buscando…' : 'Ex: 5,85'}
                className={`${inputClass} font-mono`}
                style={{ flex: 1 }}
              />
              {usdBrlAuto && usdBrl !== usdBrlAuto && (
                <button
                  type="button"
                  onClick={() => {
                    setUsdBrl(usdBrlAuto)
                    const rate = parseFloat(usdBrlAuto.replace(',', '.')) || 1
                    setLineItems(prev => prev.map(li => ({
                      ...li,
                      breakdown: applyDiscount(buildBreakdown(li.product, li.qtyBoxes, fornecedor, rate), li.discount),
                    })))
                  }}
                  className="px-2 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-700 hover:border-blue-400 transition-colors text-sm"
                  title={`Voltar para taxa automática (R$ ${usdBrlAuto})`}
                >↺</button>
              )}
            </div>
            {usdBrlAuto && usdBrl !== usdBrlAuto && (
              <p className="text-xs text-gray-400 mt-0.5">Atual: R$ {usdBrlAuto}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Fornecedor</label>
            <select value={fornecedor} onChange={(e) => {
              const f = e.target.value
              setFornecedor(f)
              const rate = parseFloat(usdBrl.replace(',', '.')) || 1
              setLineItems(prev => prev.map(li => ({
                ...li,
                breakdown: applyDiscount(buildBreakdown(li.product, li.qtyBoxes, f, rate), li.discount),
              })))
            }} className={inputClass}>
              <option value="Four Star">Four Star</option>
              <option value="Munan">Munan</option>
            </select>
          </div>
        </div>
        {/* Linha 2: Local de Entrega, Frete de Entrega */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div>
            <label className={labelClass}>Local de Entrega</label>
            <select value={localEntrega} onChange={e => setLocalEntrega(e.target.value)} className={inputClass}>
              <option value="Armazém Shiplog Hortolândia">Armazém Shiplog Hortolândia</option>
              <option value="Endereço do Cliente">Endereço do Cliente</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Frete de Entrega (R$)</label>
            <input
              type="text"
              value={freteEntrega}
              onChange={e => setFreteEntrega(e.target.value)}
              placeholder="0,00"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      </section>

      {/* ── Produtos ─────────────────────────────────────────────────────── */}
      <section id="produto-section" className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
          Produtos
        </h2>

        {/* Filtros de produto */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[140px]">
            <label className={labelClass}>Tipo</label>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className={inputClass}>
              <option value="">Todos os tipos</option>
              {productTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
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
                        // Recalcula peças se já havia qtd de caixas
                        const boxes = parseInt(qtyBoxesInput, 10)
                        if (!isNaN(boxes) && boxes > 0) setQtyPiecesInput(String(boxes * p.pcsPerBox))
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
          <div className="w-28">
            <label className={labelClass}>Quant. peças</label>
            <input
              type="number"
              min="1"
              value={qtyPiecesInput}
              onChange={e => handleQtyPiecesChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="0"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="w-28">
            <label className={labelClass}>Quant. caixas</label>
            <input
              type="number"
              min="1"
              value={qtyBoxesInput}
              onChange={e => handleQtyBoxesChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="0"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="w-24">
            <label className={labelClass}>Desconto %</label>
            <input
              type="text"
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="0"
              className={`${inputClass} font-mono`}
              title="Ex: -10 reduz 10%, +5 aumenta 5%"
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={loadingProducts || products.length === 0}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: editingLineItemId ? '#1a7f4b' : '#0C3460' }}
          >
            {editingLineItemId ? '✓ Salvar alteração' : '+ Adicionar'}
          </button>
          {editingLineItemId && (
            <button
              onClick={() => {
                setEditingLineItemId(null)
                setQtyBoxesInput('')
                setQtyPiecesInput('')
                setDiscountInput('')
              }}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
            >
              Cancelar
            </button>
          )}
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
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Desc.%</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Unit BRL</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Cx BRL</th>
                <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Total BRL</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-gray-400 text-xs">
                    Nenhum produto adicionado. Selecione um produto e a quantidade acima.
                  </td>
                </tr>
              ) : (
                lineItems.map((li, idx) => (
                  <tr key={li.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${editingLineItemId === li.id ? 'bg-amber-50 outline outline-2 outline-amber-400' : ''}`}>
                    <td className="px-3 py-2.5 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-medium">{li.product.description}</td>
                    <td className="px-3 py-2.5 text-gray-500 font-mono">{li.product.partNumber}</td>
                    {/* Caixas — editável inline */}
                    <td className="px-1 py-1.5 text-center">
                      <input
                        type="number"
                        min="1"
                        defaultValue={li.qtyBoxes}
                        key={li.id + '-boxes'}
                        onBlur={e => {
                          const v = parseInt(e.target.value, 10)
                          if (v > 0 && v !== li.qtyBoxes) handleUpdateQty(li.id, v)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="w-16 text-center font-mono text-xs border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{li.breakdown.qtyUnits.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{num(li.breakdown.volumeM3, 3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{num(li.breakdown.weightKg, 1)}</td>
                    {/* Desconto % — editável inline */}
                    <td className="px-1 py-1.5 text-center">
                      <input
                        type="text"
                        defaultValue={li.discount !== 0 ? String(li.discount) : ''}
                        key={li.id + '-disc'}
                        placeholder="0"
                        onBlur={e => {
                          const v = parseFloat(e.target.value.replace(',', '.'))
                          const newDisc = isNaN(v) ? 0 : v
                          if (newDisc !== li.discount) handleUpdateDiscount(li.id, newDisc)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="w-14 text-center font-mono text-xs border border-transparent rounded px-1 py-0.5 bg-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
                        style={{ color: li.discount < 0 ? '#dc2626' : li.discount > 0 ? '#16a34a' : undefined }}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{brl(li.breakdown.finalPriceUnit)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-800">{brl(li.breakdown.finalPriceBox)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{brl(li.breakdown.totalBrl)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          // Cancelar edição anterior se houver
                          setEditingLineItemId(li.id)
                          // Busca produto real na lista pelo partNumber (fallback se id não bater)
                          const realProduct = products.find(p => p.id === li.product.id)
                            ?? products.find(p => p.partNumber === li.product.partNumber)
                          setSelectedProductId(realProduct?.id ?? li.product.id)
                          setProductSearch(`${li.product.description} — ${li.product.partNumber}`)
                          setQtyBoxesInput(String(li.qtyBoxes))
                          setQtyPiecesInput(String(li.qtyBoxes * li.product.pcsPerBox))
                          setDiscountInput(li.discount !== 0 ? String(li.discount) : '')
                          // NÃO remove o item — só substitui quando "Adicionar" for clicado
                          document.getElementById('produto-section')?.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors text-xs font-semibold underline mr-2"
                      >
                        Editar
                      </button>
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

      {/* ── Notas Internas ───────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Notas Internas
          <span className="text-xs font-normal text-gray-400 ml-1">— visível apenas no histórico, não aparece no PDF</span>
        </h2>
        <textarea
          value={notasInternas}
          onChange={e => setNotasInternas(e.target.value)}
          placeholder="Ex: Cliente pediu prazo maior. Aguardando aprovação do comprador. Negociação em andamento..."
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </section>

      {/* ── Observações para o Cliente ───────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Observações para o Cliente
          <span className="text-xs font-normal text-blue-400 ml-1">— aparece no rodapé do PDF</span>
        </h2>
        <textarea
          value={notasCliente}
          onChange={e => setNotasCliente(e.target.value)}
          placeholder="Ex: Preços sujeitos a alteração sem aviso prévio. Frete a combinar. Produto sujeito à disponibilidade de estoque..."
          rows={3}
          className={`${inputClass} resize-y`}
        />
      </section>

      {/* ── Anexos ───────────────────────────────────────────────────────── */}
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Anexos
          <span className="text-xs font-normal text-gray-400 ml-1">— fichas técnicas, imagens, documentos</span>
        </h2>

        {/* Upload */}
        {savedQuotationId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadFile(file)
                }}
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 cursor-pointer transition-colors ${
                  uploadingFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
                style={{ borderColor: '#0C3460', color: '#0C3460' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploadingFile ? 'Enviando...' : 'Selecionar arquivo'}
              </label>
              <span className="text-xs text-gray-400">PDF, imagens, Word, Excel, ZIP · máx. 10 MB</span>
            </div>

            {/* Lista de anexos */}
            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-700 hover:underline truncate"
                    >
                      {att.name}
                    </a>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(att.size)}</span>
                    <button
                      onClick={() => handleRemoveAttachment(att)}
                      className="text-red-400 hover:text-red-700 transition-colors flex-shrink-0"
                      title="Remover anexo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {attachments.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhum arquivo anexado.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            💡 Salve a cotação primeiro (botão &quot;Salvar&quot;) para habilitar o envio de anexos.
          </p>
        )}
      </section>

      {/* ── Resumo e Desconto Global ─────────────────────────────────────── */}
      {lineItems.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            Resumo da Cotação
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            {/* Subtotal */}
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-gray-500 mb-1">Subtotal (itens)</p>
              <p className="text-lg font-mono font-semibold text-gray-800">
                R$ {brl(totals.total)}
              </p>
            </div>

            {/* Campo desconto global */}
            <div className="w-44">
              <label className={labelClass}>Desconto global (%)</label>
              <input
                type="text"
                value={globalDiscount}
                onChange={e => setGlobalDiscount(e.target.value)}
                placeholder="Ex: -5 ou +3"
                className={`${inputClass} font-mono`}
                title="-5 reduz 5% do total, +3 aumenta 3%"
              />
            </div>

            {/* Valor do desconto */}
            {totals.discPct !== 0 && (
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-gray-500 mb-1">
                  {totals.discPct < 0 ? 'Desconto' : 'Acréscimo'}
                </p>
                <p className="text-base font-mono font-semibold"
                  style={{ color: totals.discPct < 0 ? '#dc2626' : '#16a34a' }}>
                  {totals.discPct < 0 ? '−' : '+'} R$ {brl(Math.abs(totals.discValue))}
                </p>
              </div>
            )}

            {/* Total Final */}
            <div className="flex-1 min-w-[180px] text-right">
              <p className="text-xs text-gray-500 mb-1">Total Final</p>
              <p className="text-2xl font-mono font-bold" style={{ color: '#0C3460' }}>
                R$ {brl(totals.totalFinal)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Barra de Ações ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-2 pb-6">
        <button
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0F6E56' }}
          onClick={handleSalvarRascunho}
        >
          Salvar
        </button>
        <button
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#0C3460' }}
          onClick={handleGerarPdf}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  )
}
