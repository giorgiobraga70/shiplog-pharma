import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, logEntry } = body

    if (!status) {
      return NextResponse.json({ error: 'Campo "status" é obrigatório.' }, { status: 400 })
    }

    // Busca totals atuais para preservar _log e outros metadados
    const { data: current } = await supabaseServer
      .from('quotations')
      .select('totals')
      .eq('id', id)
      .single()

    const existingTotals = (current?.totals as Record<string, unknown>) ?? {}
    const existingLog = Array.isArray(existingTotals._log) ? existingTotals._log : []
    const newTotals = {
      ...existingTotals,
      _log: logEntry ? [...existingLog, logEntry] : existingLog,
    }

    const { data, error } = await supabaseServer
      .from('quotations')
      .update({ status, totals: newTotals })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro interno ao atualizar cotação.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabaseServer
      .from('quotations')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao deletar cotação.' }, { status: 500 })
  }
}
