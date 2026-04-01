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
    return NextResponse.json(data)
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
    } = body

    // destination_port derivado de cidade + estado (mantém compatibilidade com coluna existente)
    const destination_port = client_city
      ? `${client_city}${client_state ? ' - ' + client_state : ''}`
      : null

    const insertPayload: Record<string, unknown> = {
      quote_number,
      client_company,
      client_email,
      client_contact,
      usd_brl,
      payment_terms,
      delivery_days,
      destination_port,
      validity_days,
      items,
      totals,
      status,
    }

    // Campos novos — inseridos apenas se as colunas existirem no banco.
    // Se a coluna não existir, o Supabase ignora o campo extra.
    if (client_phone   !== undefined) insertPayload.client_phone   = client_phone
    if (client_cnpj    !== undefined) insertPayload.client_cnpj    = client_cnpj
    if (client_address !== undefined) insertPayload.client_address = client_address
    if (client_city    !== undefined) insertPayload.client_city    = client_city
    if (client_state   !== undefined) insertPayload.client_state   = client_state
    if (client_cep     !== undefined) insertPayload.client_cep     = client_cep
    if (supplier       !== undefined) insertPayload.supplier       = supplier

    const { data, error } = await supabaseServer
      .from('quotations')
      .insert([insertPayload])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao salvar cotação.' }, { status: 500 })
  }
}
