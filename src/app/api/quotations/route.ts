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
  } catch (err) {
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
      incoterm,
      usd_brl,
      payment_terms,
      delivery_days,
      destination_port,
      validity_days,
      items,
      totals,
      status = 'sent',
    } = body

    const { data, error } = await supabaseServer
      .from('quotations')
      .insert([
        {
          quote_number,
          client_company,
          client_email,
          client_contact,
          incoterm,
          usd_brl,
          payment_terms,
          delivery_days,
          destination_port,
          validity_days,
          items,
          totals,
          status,
        },
      ])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao salvar cotação.' }, { status: 500 })
  }
}
