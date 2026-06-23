import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const rows = await request.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Nenhum tipo de produto enviado.' }, { status: 400 })
    }

    // Deduplicar por product_type (mantém a última ocorrência da planilha)
    const seen = new Map<string, Record<string, unknown>>()
    for (const r of rows as Record<string, unknown>[]) {
      const key = String(r.product_type ?? '').trim()
      if (key) seen.set(key, r)
    }

    // ncm_tax_rates exige NOT NULL em ii_rate/ipi_rate/pis_rate/cofins_rate/icms_rate.
    // Quando o produto não tem aquele imposto (ex: Ampola sem IPI), a planilha traz
    // a célula vazia → vira null no parser → precisa virar 0 aqui, não ficar null.
    // mkup_10..200 continuam podendo ser null (significa "sem markup específico").
    const RATE_FIELDS = ['ii_rate', 'ipi_rate', 'pis_rate', 'cofins_rate', 'icms_rate'] as const
    const unique = Array.from(seen.values()).map(r => {
      const row = { ...r }
      for (const f of RATE_FIELDS) {
        if (row[f] === null || row[f] === undefined) row[f] = 0
      }
      return row
    })

    if (unique.length === 0) {
      return NextResponse.json({ error: 'Nenhum tipo de produto válido encontrado.' }, { status: 400 })
    }

    // Upsert por product_type — NÃO apaga tipos existentes que não estejam
    // na planilha. Diferente do import de produtos (que substitui tudo),
    // aqui isso protegeria produtos já cadastrados de perderem sua FK caso
    // um tipo seja omitido por engano numa planilha futura.
    const { data, error } = await supabaseServer
      .from('ncm_tax_rates')
      .upsert(unique, { onConflict: 'product_type' })
      .select('product_type')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imported: data?.length ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
