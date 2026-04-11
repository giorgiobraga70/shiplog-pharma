import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateObj: Record<string, any> = {}

    const allowed = [
      'client_id', 'client_company', 'client_email',
      'responsible_id', 'responsible_name',
      'scheduled_at', 'duration_min', 'status',
      'report_description', 'report_filled_at',
      'attachments', 'linked_quotation_ids',
      'last_email_sent_at',
    ]

    for (const key of allowed) {
      if (body[key] !== undefined) updateObj[key] = body[key]
    }

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('visits')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabaseServer.from('visits').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
