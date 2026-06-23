import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

// ii_rate/ipi_rate/pis_rate/cofins_rate/icms_rate são NOT NULL no banco —
// "sem esse imposto" é representado como 0, não como null.
function numOrZero(v: unknown): number {
  return numOrNull(v) ?? 0
}

// ── GET: lista todos os tipos de produto cadastrados ────────────────────────
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('ncm_tax_rates')
      .select('*')
      .order('product_type', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar tipos de produto.' }, { status: 500 })
  }
}

// ── POST: cria um novo tipo de produto manualmente ───────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const productType = String(body.product_type ?? '').trim()
    if (!productType) {
      return NextResponse.json({ error: 'Produto Grupo é obrigatório.' }, { status: 400 })
    }

    const row = {
      product_type: productType,
      ncm_code: body.ncm_code ? String(body.ncm_code).trim() : null,
      ii_rate: numOrZero(body.ii_rate),
      ipi_rate: numOrZero(body.ipi_rate),
      pis_rate: numOrZero(body.pis_rate),
      cofins_rate: numOrZero(body.cofins_rate),
      icms_rate: numOrZero(body.icms_rate),
      mkup_10: numOrNull(body.mkup_10),
      mkup_20: numOrNull(body.mkup_20),
      mkup_50: numOrNull(body.mkup_50),
      mkup_100: numOrNull(body.mkup_100),
      mkup_200: numOrNull(body.mkup_200),
    }

    const { data, error } = await supabaseServer
      .from('ncm_tax_rates')
      .insert(row)
      .select()
      .single()

    if (error) {
      // Violação de unicidade (product_type já existe)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `O tipo "${productType}" já está cadastrado.` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao criar tipo de produto.' }, { status: 500 })
  }
}

// ── PATCH: edita um tipo de produto existente (product_type não muda) ───────
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const productType = String(body.product_type ?? '').trim()
    if (!productType) {
      return NextResponse.json({ error: 'Produto Grupo é obrigatório.' }, { status: 400 })
    }

    const update = {
      ncm_code: body.ncm_code ? String(body.ncm_code).trim() : null,
      ii_rate: numOrZero(body.ii_rate),
      ipi_rate: numOrZero(body.ipi_rate),
      pis_rate: numOrZero(body.pis_rate),
      cofins_rate: numOrZero(body.cofins_rate),
      icms_rate: numOrZero(body.icms_rate),
      mkup_10: numOrNull(body.mkup_10),
      mkup_20: numOrNull(body.mkup_20),
      mkup_50: numOrNull(body.mkup_50),
      mkup_100: numOrNull(body.mkup_100),
      mkup_200: numOrNull(body.mkup_200),
    }

    const { data, error } = await supabaseServer
      .from('ncm_tax_rates')
      .update(update)
      .eq('product_type', productType)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar tipo de produto.' }, { status: 500 })
  }
}

// ── DELETE: remove um tipo, bloqueando se houver produtos vinculados ────────
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const productType = String(body.product_type ?? '').trim()
    if (!productType) {
      return NextResponse.json({ error: 'Produto Grupo é obrigatório.' }, { status: 400 })
    }

    // Protege a integridade da FK: não deixa excluir um tipo em uso
    const { count, error: countError } = await supabaseServer
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_type', productType)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir: ${count} produto(s) cadastrado(s) usam o tipo "${productType}". Remova ou reclassifique esses produtos primeiro.`,
        },
        { status: 409 }
      )
    }

    const { error } = await supabaseServer
      .from('ncm_tax_rates')
      .delete()
      .eq('product_type', productType)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao excluir tipo de produto.' }, { status: 500 })
  }
}
