import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const month = url.searchParams.get('month') // YYYY-MM
    const responsibleId = url.searchParams.get('responsible_id')

    let query = supabaseServer
      .from('visits')
      .select('*')
      .order('scheduled_at', { ascending: true })

    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = `${month}-01T00:00:00.000Z`
      const lastDay = new Date(y, m, 0).getDate()
      const end = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
      query = query.gte('scheduled_at', start).lte('scheduled_at', end)
    }

    if (responsibleId) {
      query = query.eq('responsible_id', responsibleId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      client_id, client_company, client_email,
      responsible_id, responsible_name,
      scheduled_at, duration_min,
      created_by,
    } = body

    if (!client_company || !scheduled_at) {
      return NextResponse.json({ error: 'cliente e data obrigatórios.' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('visits')
      .insert([{
        client_id:        client_id        ?? null,
        client_company,
        client_email:     client_email     ?? null,
        responsible_id:   responsible_id   ?? null,
        responsible_name: responsible_name ?? '',
        scheduled_at,
        duration_min:     duration_min     ?? 60,
        status:           'agendada',
        created_by:       created_by       ?? null,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
