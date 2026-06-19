import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const products = await request.json()
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto enviado.' }, { status: 400 })
    }

    // Deduplicar por part_number (keep last) para evitar conflito no upsert
    const seen = new Map<string, Record<string, unknown>>()
    for (const p of products as Record<string, unknown>[]) {
      seen.set(p.part_number as string, p)
    }
    const unique = Array.from(seen.values())

    // Apaga todo o catálogo atual antes de inserir o novo lote.
    // Cada upload da planilha substitui o catálogo anterior por completo
    // (cotações já salvas não são afetadas — elas guardam os dados do
    // produto como retrato em JSON, sem referência viva à tabela products).
    const { error: deleteError } = await supabaseServer
      .from('products')
      .delete()
      .not('id', 'is', null)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    // Insere o novo lote já com a numeração de sequência da planilha
    const { data, error } = await supabaseServer
      .from('products')
      .insert(unique)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imported: data?.length ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
