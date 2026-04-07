import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, logEntry, client_company } = body

    if (!status && client_company === undefined) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
    }

    // Monta objeto de atualização dinamicamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateObj: Record<string, any> = {}

    if (client_company !== undefined) {
      updateObj.client_company = client_company
    }

    if (status) {
      // Busca totals atuais para preservar _log e outros metadados
      const { data: current } = await supabaseServer
        .from('quotations')
        .select('totals')
        .eq('id', id)
        .single()

      const existingTotals = (current?.totals as Record<string, unknown>) ?? {}
      const existingLog = Array.isArray(existingTotals._log) ? existingTotals._log : []
      updateObj.status = status
      updateObj.totals = {
        ...existingTotals,
        _log: logEntry ? [...existingLog, logEntry] : existingLog,
      }
    }

    const { data, error } = await supabaseServer
      .from('quotations')
      .update(updateObj)
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
