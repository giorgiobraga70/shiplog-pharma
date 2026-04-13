import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const FROM_EMAIL = 'giorgio@shiplog.com.br'
const FROM_NAME  = 'Shiplog Pharma'

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      replyTo,
      quoteNumber,
      clientCompany,
      clientContact,
      pdfBase64,
    } = await req.json()

    if (!to || !pdfBase64 || !quoteNumber) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    const subject = `Cotação Shiplog Pharma – ${quoteNumber} – ${clientCompany}`

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:#0C3460;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:18px;">Cotação Shiplog Pharma</h2>
        </div>
        <div style="border:1px solid #E2E8F0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 12px;font-size:15px;">Prezado(a) <strong>${clientContact || clientCompany}</strong>,</p>
          <p style="margin:0 0 12px;font-size:15px;">
            Segue em anexo a cotação número <strong>${quoteNumber}</strong> conforme solicitado.
          </p>
          <p style="margin:0 0 12px;font-size:15px;">
            Em caso de dúvidas, por favor responda este e-mail.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">Shiplog Pharma – Sistema de Gerenciamento de Vendas</p>
        </div>
      </div>
    `

    const msg: Parameters<typeof sgMail.send>[0] = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
      attachments: [
        {
          content:     pdfBase64,
          filename:    `Shiplog Pharma - Cotação ${quoteNumber}.pdf`,
          type:        'application/pdf',
          disposition: 'attachment',
        },
      ],
    }

    // reply-to: email do vendedor responsável
    if (replyTo) {
      msg.replyTo = replyTo
    }

    await sgMail.send(msg)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as { response?: { body?: unknown }; message?: string }
    console.error('SendGrid error:', err?.response?.body || error)
    return NextResponse.json({ error: err?.message || 'Erro ao enviar e-mail.' }, { status: 500 })
  }
}
