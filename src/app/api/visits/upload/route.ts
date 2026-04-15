import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const path     = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'file e path são obrigatórios.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10 MB.' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error } = await supabaseServer.storage
      .from('visit-attachments')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseServer.storage
      .from('visit-attachments')
      .getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 })
  } catch (e) {
    console.error('[visits/upload]', e)
    return NextResponse.json({ error: 'Erro interno ao enviar arquivo.' }, { status: 500 })
  }
}
