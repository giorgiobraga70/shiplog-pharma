import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// Extrai o nome do responsável de uma linha da tabela
function extractResponsible(q: Record<string, unknown>): string {
  if (q.responsible_name && typeof q.responsible_name === 'string') return q.responsible_name
  const t = q.totals as Record<string, unknown> | null
  if (t?._r && typeof t._r === 'string') return t._r
  return ''
}

// Extrai as notas internas embutidas no totals JSON
function extractNotes(q: Record<string, unknown>): string {
  const t = q.totals as Record<string, unknown> | null
  if (t?._notes && typeof t._notes === 'string') return t._notes
  return ''
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const enriched = rows.map((q: Record<string, unknown>) => ({
      ...q,
      responsible_name: extractResponsible(q),
      internal_notes:   extractNotes(q),
    }))

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao buscar cotações.' }, { status: 500 })
  }
}

// Busca o nome do responsável via profiles ou, como fallback, via auth.users
async function fetchResponsibleName(userId: string): Promise<string> {
  // Tenta profiles.nome primeiro
  try {
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('nome')
      .eq('id', userId)
      .single()
    if (profile?.nome) return profile.nome as string
  } catch {}

  // Fallback: email do auth.users (parte antes do @)
  try {
    const { data } = await supabaseServer.auth.admin.getUserById(userId)
    if (data?.user?.email) return data.user.email.split('@')[0]
  } catch {}

  return ''
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
      responsible_name: responsibleFromClient,
      internal_notes,
    } = body

    // Usa nome enviado pelo cliente; fallback via auth.admin se vier vazio
    let responsible_name: string = responsibleFromClient || ''
    if (!responsible_name && created_by) {
      responsible_name = await fetchResponsibleName(created_by)
    }

    // destination_port derivado de cidade + estado (coluna original mantida)
    const destination_port = client_city
      ? `${client_city}${client_state ? ' - ' + client_state : ''}`
      : null

    // Embute metadados no totals JSON — funciona SEM precisar de novas colunas
    const totalsWithMeta = {
      ...(totals ?? {}),
      _r:     responsible_name || undefined,
      _notes: internal_notes   || undefined,
    }

    // ── Tenta com colunas novas (created_by, responsible_name) ───────────────
    const fullPayload = {
      quote_number,
      client_company,
      client_email:     client_email   ?? null,
      client_contact:   client_contact ?? null,
      client_phone:     client_phone   ?? null,
      client_cnpj:      client_cnpj    ?? null,
      client_address:   client_address ?? null,
      client_city:      client_city    ?? null,
      client_state:     client_state   ?? null,
      client_cep:       client_cep     ?? null,
      supplier:         supplier       ?? null,
      usd_brl_rate:     usd_brl        ?? 5.25,
      payment_terms:    payment_terms  ?? null,
      delivery_days:    delivery_days  ?? null,
      destination_port,
      validity_days:    validity_days  ?? null,
      items:            items          ?? [],
      totals:           totalsWithMeta,
      status:           status         ?? 'draft',
      created_by:       created_by     ?? null,
      responsible_name: responsible_name || null,
    }

    const { data, error } = await supabaseServer
      .from('quotations')
      .upsert([fullPayload], { onConflict: 'quote_number' })
      .select()
      .single()

    if (!error) return NextResponse.json(data, { status: 201 })

    // ── Fallback: colunas novas não existem — usa apenas colunas originais ────
    // O nome fica embutido em totals._r para ser lido pelo GET
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
      totals:         totalsWithMeta,   // ← nome embutido aqui
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
