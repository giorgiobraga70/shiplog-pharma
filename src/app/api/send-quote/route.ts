import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, quoteNumber, clientCompany, htmlContent } = body

    if (!to || !quoteNumber || !htmlContent) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    await sgMail.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'Shiplog Pharma'
      },
      subject: `Cotação Shiplog Pharma – ${quoteNumber} – ${clientCompany}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SendGrid error:', error?.response?.body || error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao enviar e-mail' },
      { status: 500 }
    )
  }
}
