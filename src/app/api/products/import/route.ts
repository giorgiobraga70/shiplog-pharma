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

    // Upsert por part_number (unique constraint)
    const { data, error } = await supabaseServer
      .from('products')
      .upsert(unique, { onConflict: 'part_number' })
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imported: data?.length ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
