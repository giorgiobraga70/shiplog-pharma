'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  calcItemPrice,
  type GlobalParams,
  type Product,
  type QuotationItem,
  type PricingBreakdown,
} from '@/lib/pricingEngine'

// ─── Parâmetros globais padrão ─────────────────────────────────────────────────

const DEFAULT_PARAMS: GlobalParams = {
  usdBrl: 5.25,
  eurBrl: 6.042,
  usdCny: 6.913,
  freightUsd: 3000,
  freightBrl: 15711.30,
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
function mapDbProductToProduct(row: any): Product {
  return {
    id: row.id ?? row.part_number,
    description: row.description,
    partNumber: row.part_number,
    productType: row.product_type ?? '',
    ncmCode: row.ncm_code ?? '',
    pcsPerBox: Number(row.pcs_per_box),
    weightGrossKg: Number(row.weight_gross_kg),
    volumeBoxM3: Number(row.volume_box_m3),
    fobUsd: Number(row.fob_usd),
    taxRates: {
      ii: Number(row.tax_ii ?? 0),
      ipi: Number(row.tax_ipi ?? 0),
      pis: Number(row.tax_pis ?? 0),
      cofins: Number(row.tax_cofins ?? 0),
      icms: Number(row.tax_icms ?? 0),
    },
    markupTable: {
      qty10: Number(row.markup_qty10 ?? 0.70),
      qty20: Number(row.markup_qty20 ?? 0.65),
      qty50: Number(row.markup_qty50 ?? 0.60),
      qty100: Number(row.markup_qty100 ?? 0.55),
      qty200: Number(row.markup_qty200 ?? 0.50),
    },
  }
}

// ─── Componente principal ──────────────────────────────────────────────────────

interface LineItem {
  id: string
  product: Product
  qtyBoxes: number
  breakdown: PricingBreakdown
}

export default function CotacaoPage() {
  // Dados da cotação
  const [quotationNumber] = useState(() => generateQuotationNumber(1))
  const [today] = useState(() => new Date())
  const [empresa, setEmpresa] = useState('')
  const [contato, setContato] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')
  const [fornecedor, setFornecedor] = useState('Four Star')
  const [prazoValidade, setPrazoValidade] = useState('30')

  // Filtros do combobox de produto
  const [filterTipo, setFilterTipo] = useState('')
  const [filterVolume, setFilterVolume] = useState('')
  const [filterCor, setFilterCor] = useState('')

  // Condições comerciais
  const [pagamento, setPagamento] = useState('50% no ato do pedido + 50% na entrega')
  const [prazo, setPrazo] = useState('90')

  // Produtos do banco
  const [products, setProducts] = useState<Product[]>([])
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

  // Params globais (usdBrl vem do DEFAULT_PARAMS/setup)
  const params = DEFAULT_PARAMS

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

  function handleAddItem() {
    const qty = parseInt(qtyBoxesInput, 10)
    if (!qty || qty <= 0) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const item: QuotationItem = { product, qtyBoxes: qty }
    const breakdown = calcItemPrice(item, params)

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
          client_address: endereco,
          client_city: cidade,
          client_state: estado,
          client_cep: cep,
          supplier: fornecedor,
          usd_brl: DEFAULT_PARAMS.usdBrl,
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
      if (res.ok) alert('Cotação salva com sucesso!')
      else alert('Erro ao salvar cotação.')
    } catch {
      alert('Erro ao salvar cotação.')
    }
  }

  function buildQuotationPayload(status: string) {
    return {
      quote_number: quotationNumber,
      client_company: empresa,
      client_email: emailContato,
      client_contact: contato,
      supplier: fornecedor,
      usd_brl: DEFAULT_PARAMS.usdBrl,
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
      clientEmail: emailContato,
      clientContact: contato,
      clientPhone: telefone,
      clientAddress: endereco,
      clientCity: cidade,
      clientState: estado,
      clientCep: cep,
      fornecedor: fornecedor,
      usdBrl: DEFAULT_PARAMS.usdBrl,
      paymentTerms: pagamento,
      deliveryDays: parseInt(prazo) || 90,
      validityDays: parseInt(prazoValidade) || 30,
      items: lineItems.map((item) => ({
        description: item.product.description,
        partNumber: item.product.partNumber,
        pcsPerBox: item.product.pcsPerBox,
        qtyBoxes: item.qtyBoxes,
        qtyUnits: item.breakdown.qtyUnits,
        volumeM3: item.breakdown.volumeM3,
        weightKg: item.breakdown.weightKg,
        finalPriceUnit: item.breakdown.finalPriceUnit,
        finalPriceBox: item.breakdown.finalPriceBox,
        totalBrl: item.breakdown.totalBrl,
      })),
      totals: {
        boxes: lineItems.reduce((a, i) => a + i.qtyBoxes, 0),
        units: lineItems.reduce((a, i) => a + i.breakdown.qtyUnits, 0),
        volumeM3: lineItems.reduce((a, i) => a + i.breakdown.volumeM3, 0),
        weightKg: lineItems.reduce((a, i) => a + i.breakdown.weightKg, 0),
        grandTotalBrl: lineItems.reduce((a, i) => a + i.breakdown.totalBrl, 0),
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
        <div className="grid grid-cols-4 gap-4 mb-4">
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
          <div className="col-span-2">
            <label className={labelClass}>Empresa</label>
            <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nome da empresa" className={inputClass} />
          </div>
        </div>
        {/* Linha 2: Contato (40%), E-mail (40%), Telefone (20%) */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="col-span-2">
            <label className={labelClass}>Contato</label>
            <input type="text" value={contato} onChange={(e) => setContato(e.target.value)}
              placeholder="Nome do contato" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>E-mail</label>
            <input type="email" value={emailContato} onChange={(e) => setEmailContato(e.target.value)}
              placeholder="contato@empresa.com" className={inputClass} />
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Telefone</label>
            <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
              placeholder="+55 (11) 99999-9999" className={inputClass} />
          </div>
        </div>
        {/* Linha 3: Endereço (50%), Cidade (35%), Estado (5%), CEP (10%) */}
        <div style={{ display: 'grid', gridTemplateColumns: '50% 35% 5% 10%', gap: '16px' }} className="mb-4">
          <div>
            <label className={labelClass}>Endereço</label>
            <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)}
              placeholder="SP" maxLength={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CEP</label>
            <input type="text" value={cep} onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000" className={inputClass} />
          </div>
        </div>
        {/* Linha 4: Condições de Pagamento (40%), Prazo Entrega (20%), Prazo Validade (20%), Fornecedor (20%) */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Condições de pagamento</label>
            <input type="text" value={pagamento} onChange={(e) => setPagamento(e.target.value)}
              className={inputClass} />
          </div>
          <div className="col-span-1">
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
          <div className="col-span-1">
            <label className={labelClass}>Prazo de Validade</label>
            <select value={prazoValidade} onChange={(e) => setPrazoValidade(e.target.value)} className={inputClass}>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
            </select>
          </div>
          <div className="col-span-1">
            <label className={labelClass}>Fornecedor</label>
            <select value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={inputClass}>
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
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-8">N°</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Descrição</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Part Number</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Caixas</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Unidades</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">m³</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Kg</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Unit BRL</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Cx BRL</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Total BRL</th>
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
