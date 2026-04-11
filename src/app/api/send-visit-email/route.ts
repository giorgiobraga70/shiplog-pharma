import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { to, clientCompany, scheduledAt, responsibleName, type, notes } = await req.json()

    if (!to || !clientCompany || !scheduledAt) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    const typeMap: Record<string, string> = {
      confirmacao:   'Confirmação de visita',
      reagendamento: 'Visita reagendada',
      cancelamento:  'Visita cancelada',
    }

    const colorMap: Record<string, string> = {
      confirmacao:   '#27500A',
      reagendamento: '#0C447C',
      cancelamento:  '#7C1C1C',
    }

    const subject = `${typeMap[type] ?? 'Visita'} – ${clientCompany}`
    const color   = colorMap[type] ?? '#374151'

    const dateStr = new Date(scheduledAt).toLocaleString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:${color};color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">${typeMap[type] ?? 'Visita'}</h2>
        </div>
        <div style="border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 10px;font-size:15px;"><strong>Cliente:</strong> ${clientCompany}</p>
          <p style="margin:0 0 10px;font-size:15px;"><strong>Data e hora:</strong> ${dateStr}</p>
          ${responsibleName ? `<p style="margin:0 0 10px;font-size:15px;"><strong>Responsável:</strong> ${responsibleName}</p>` : ''}
          ${notes ? `<p style="margin:0 0 10px;font-size:15px;"><strong>Observações:</strong> ${notes}</p>` : ''}
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Shiplog Pharma – Sistema de Gerenciamento de Vendas</p>
        </div>
      </div>
    `

    await sgMail.send({
      to,
      from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'Shiplog Pharma' },
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown }; message?: string }
    console.error('SendGrid error:', err?.response?.body || error)
    return NextResponse.json({ error: err?.message || 'Erro ao enviar e-mail.' }, { status: 500 })
  }
}
