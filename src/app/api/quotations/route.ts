import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Para linhas que não têm responsible_name salvo, tenta via profiles
    const rows = data ?? []
    const missingIds = [...new Set(
      rows
        .filter((q: Record<string, unknown>) => !q.responsible_name && q.created_by)
        .map((q: Record<string, unknown>) => q.created_by as string)
    )]

    let profileMap: Record<string, string> = {}
    if (missingIds.length > 0) {
      const { data: profiles } = await supabaseServer
        .from('profiles')
        .select('id, nome')
        .in('id', missingIds)
      if (profiles) {
        profileMap = Object.fromEntries(
          profiles.map((p: { id: string; nome: string }) => [p.id, p.nome ?? ''])
        )
      }
    }

    const enriched = rows.map((q: Record<string, unknown>) => ({
      ...q,
      responsible_name:
        (q.responsible_name as string) ||
        (q.created_by ? (profileMap[q.created_by as string] ?? '') : ''),
    }))

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar cotações.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      quote_number,
      client_company,
      client_email,
      client_contact,
      client_phone,
      client_cnpj,
      client_address,
      client_city,
      client_state,
      client_cep,
      supplier,
      usd_brl,
      payment_terms,
      delivery_days,
      validity_days,
      items,
      totals,
      status = 'draft',
      created_by,
    } = body

    // Busca nome do responsável server-side para gravar junto à cotação
    let responsible_name = ''
    if (created_by) {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('nome')
        .eq('id', created_by)
        .single()
      responsible_name = profile?.nome ?? ''
    }

    // destination_port derivado de cidade + estado (coluna original mantida)
    const destination_port = client_city
      ? `${client_city}${client_state ? ' - ' + client_state : ''}`
      : null

    // ── Tenta com todos os campos (incluindo colunas novas) ───────────────────
    const fullPayload = {
      quote_number,
      client_company,
      client_email:      client_email   ?? null,
      client_contact:    client_contact ?? null,
      client_phone:      client_phone   ?? null,
      client_cnpj:       client_cnpj    ?? null,
      client_address:    client_address ?? null,
      client_city:       client_city    ?? null,
      client_state:      client_state   ?? null,
      client_cep:        client_cep     ?? null,
      supplier:          supplier       ?? null,
      usd_brl_rate:      usd_brl        ?? 5.25,
      payment_terms:     payment_terms  ?? null,
      delivery_days:     delivery_days  ?? null,
      destination_port,
      validity_days:     validity_days  ?? null,
      items:             items          ?? [],
      totals:            totals         ?? {},
      status:            status         ?? 'draft',
      created_by:        created_by     ?? null,
      responsible_name:  responsible_name || null,
    }

    const { data, error } = await supabaseServer
      .from('quotations')
      .upsert([fullPayload], { onConflict: 'quote_number' })
      .select()
      .single()

    if (!error) return NextResponse.json(data, { status: 201 })

    // ── Fallback: erro → tenta sem colunas que podem não existir ─────────────
    const basePayload = {
      quote_number,
      client_company,
      client_email:   client_email   ?? null,
      client_contact: client_contact ?? null,
      usd_brl_rate:   usd_brl        ?? 5.25,
      payment_terms:  payment_terms  ?? null,
      delivery_days:  delivery_days  ?? null,
      destination_port,
      validity_days:  validity_days  ?? null,
      items:          items          ?? [],
      totals:         totals         ?? {},
      status:         status         ?? 'draft',
    }
    const { data: data2, error: error2 } = await supabaseServer
      .from('quotations')
      .upsert([basePayload], { onConflict: 'quote_number' })
      .select()
      .single()

    if (error2) {
      return NextResponse.json({
        error: `${error2.message} (fallback após: ${error.message})`
      }, { status: 500 })
    }
    return NextResponse.json(data2, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao salvar cotação.' }, { status: 500 })
  }
}
