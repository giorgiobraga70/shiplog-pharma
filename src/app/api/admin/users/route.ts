import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const { data, error } = await supabaseServer.auth.admin.listUsers()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Busca perfis adicionais
    const { data: profiles } = await supabaseServer.from('profiles').select('*')
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      nome: profileMap[u.id]?.nome ?? '',
      telefone: profileMap[u.id]?.telefone ?? '',
      role: profileMap[u.id]?.role ?? 'user',
    }))
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, nome, telefone, role } = await request.json()
    const { data, error } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Salva perfil adicional
    await supabaseServer.from('profiles').upsert([{
      id: data.user.id,
      nome: nome ?? '',
      telefone: telefone ?? '',
      role: role ?? 'user',
    }])
    return NextResponse.json({ ok: true, id: data.user.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
