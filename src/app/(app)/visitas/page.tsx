'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attachment {
  name: string
  path: string
  url: string
  size: number
  type: string
  at: string
}

interface Visit {
  id: string
  client_id: string | null
  client_company: string
  client_email: string | null
  responsible_id: string | null
  responsible_name: string
  scheduled_at: string
  duration_min: number
  status: 'agendada' | 'realizada' | 'cancelada'
  report_description: string | null
  report_filled_at: string | null
  attachments: Attachment[]
  linked_quotation_ids: string[]
  last_email_sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Client {
  id: string
  empresa: string
  contato?: string
  email?: string
  telefone?: string
  comentarios?: string
}

interface QuotationOption {
  id: string
  quote_number: string
  client_company: string
  created_at: string
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  agendada:  { bg: '#E6F1FB', color: '#0C447C', label: 'Agendada' },
  realizada: { bg: '#EAF3DE', color: '#27500A', label: 'Realizada' },
  cancelada: { bg: '#F1EFE8', color: '#444441', label: 'Cancelada' },
}

const PT_DAYS   = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Main component ───────────────────────────────────────────────────────────

export default function VisitasPage() {
  // ── Data ──
  const [visits,     setVisits]     = useState<Visit[]>([])
  const [clients,    setClients]    = useState<Client[]>([])
  const [allUsers,   setAllUsers]   = useState<{ id: string; nome: string }[]>([])
  const [quotations, setQuotations] = useState<QuotationOption[]>([])
  const [loading,    setLoading]    = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; nome: string } | null>(null)

  // ── View ──
  const [view, setView]           = useState<'lista' | 'semana' | 'mes'>('lista')
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Filters ──
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // ── Form modal ──
  const [showFormModal,    setShowFormModal]    = useState(false)
  const [editingVisit,     setEditingVisit]     = useState<Visit | null>(null)
  const [formClientId,      setFormClientId]      = useState('')
  const [formClientCompany, setFormClientCompany] = useState('')
  const [formClientEmails,  setFormClientEmails]  = useState<string[]>([''])
  const [formClientContato, setFormClientContato] = useState('')
  const [formClientTelefone,setFormClientTelefone]= useState('')
  const [formClientSearch,  setFormClientSearch]  = useState('')
  const [formClientOpen,    setFormClientOpen]    = useState(false)
  const [formResponsavelId,setFormResponsavelId]= useState('')
  const [formResponsavelNome,setFormResponsavelNome] = useState('')
  const [formDate,         setFormDate]         = useState('')
  const [formTime,         setFormTime]         = useState('09:00')
  const [formDuration,     setFormDuration]     = useState('60')
  const [formSendEmail,    setFormSendEmail]    = useState(false)
  const [formSaving,       setFormSaving]       = useState(false)

  // ── Detail/report modal ──
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedVisit,   setSelectedVisit]   = useState<Visit | null>(null)
  const [reportDesc,      setReportDesc]      = useState('')
  const [detailStatus,    setDetailStatus]    = useState<'agendada' | 'realizada' | 'cancelada'>('agendada')
  const [linkedQuotations,setLinkedQuotations]= useState<string[]>([])
  const [reportSaving,    setReportSaving]    = useState(false)
  const [uploadingFile,   setUploadingFile]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id, nome').eq('id', user.id).single()
        setCurrentUser({ id: user.id, nome: (profile?.nome as string) || user.email?.split('@')[0] || '' })
      }

      const [visitsRes, clientsRes, usersRes, quotationsRes] = await Promise.all([
        fetch('/api/visits'),
        fetch('/api/clients'),
        supabase.from('profiles').select('id, nome'),
        fetch('/api/quotations'),
      ])

      const visitsData    = await visitsRes.json()
      const clientsData   = await clientsRes.json()
      const quotationsData= await quotationsRes.json()

      setVisits(Array.isArray(visitsData)     ? visitsData     : [])
      setClients(Array.isArray(clientsData)   ? clientsData    : [])
      setAllUsers(Array.isArray(usersRes.data) ? usersRes.data  : [])
      setQuotations(Array.isArray(quotationsData) ? quotationsData : [])
    } finally {
      setLoading(false)
    }
  }

  // ── Open form ──────────────────────────────────────────────────────────────

  function openNewVisit(date?: string) {
    setEditingVisit(null)
    setFormClientId('')
    setFormClientCompany('')
    setFormClientEmails([''])
    setFormClientContato('')
    setFormClientTelefone('')
    setFormClientSearch('')
    setFormClientOpen(false)
    setFormResponsavelId(currentUser?.id ?? '')
    setFormResponsavelNome(currentUser?.nome ?? '')
    setFormDate(date ?? new Date().toISOString().split('T')[0])
    setFormTime('09:00')
    setFormDuration('60')
    setFormSendEmail(false)
    setShowFormModal(true)
  }

  function openEditVisit(visit: Visit) {
    setEditingVisit(visit)
    setFormClientId(visit.client_id ?? '')
    setFormClientCompany(visit.client_company)
    setFormClientEmails(visit.client_email ? visit.client_email.split(',').map(e => e.trim()).filter(Boolean) : [''])
    setFormClientContato('')
    setFormClientTelefone('')
    setFormClientSearch(visit.client_company)
    setFormClientOpen(false)
    setFormResponsavelId(visit.responsible_id ?? '')
    setFormResponsavelNome(visit.responsible_name)
    const dt = new Date(visit.scheduled_at)
    setFormDate(dt.toISOString().split('T')[0])
    const h = String(dt.getHours()).padStart(2, '0')
    const min = String(dt.getMinutes()).padStart(2, '0')
    setFormTime(`${h}:${min}`)
    setFormDuration(String(visit.duration_min))
    setFormSendEmail(false)
    setShowFormModal(true)
  }

  function openDetail(visit: Visit) {
    setSelectedVisit(visit)
    setReportDesc(visit.report_description ?? '')
    setLinkedQuotations(visit.linked_quotation_ids ?? [])
    setDetailStatus(visit.status)
    setShowDetailModal(true)
  }

  // ── Save visit ─────────────────────────────────────────────────────────────

  async function handleSaveVisit() {
    if (!formClientCompany.trim() || !formDate || !formTime) {
      alert('Preencha cliente, data e hora.')
      return
    }
    setFormSaving(true)
    try {
      const scheduledAt = new Date(`${formDate}T${formTime}:00`).toISOString()
      const prevScheduledAt = editingVisit?.scheduled_at

      const emailList = formClientEmails.map(e => e.trim()).filter(Boolean)
      const payload = {
        client_id:        formClientId    || null,
        client_company:   formClientCompany.trim(),
        client_email:     emailList.join(', ') || null,
        responsible_id:   formResponsavelId || null,
        responsible_name: formResponsavelNome,
        scheduled_at:     scheduledAt,
        duration_min:     parseInt(formDuration) || 60,
        created_by:       currentUser?.id ?? null,
      }

      let savedVisit: Visit
      if (editingVisit) {
        const res = await fetch(`/api/visits/${editingVisit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        savedVisit = await res.json()
        setVisits(v => v.map(x => x.id === editingVisit.id ? savedVisit : x))
      } else {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        savedVisit = await res.json()
        setVisits(v => [...v, savedVisit])
      }

      // Send confirmation/reschedule email
      if (formSendEmail && emailList.length > 0) {
        const emailType = editingVisit && prevScheduledAt !== scheduledAt ? 'reagendamento' : 'confirmacao'
        await fetch('/api/send-visit-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to:              emailList.join(', '),
            clientCompany:   formClientCompany,
            scheduledAt,
            responsibleName: formResponsavelNome,
            type:            emailType,
          }),
        })
        await fetch(`/api/visits/${savedVisit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_email_sent_at: new Date().toISOString() }),
        })
      }

      setShowFormModal(false)
    } catch (e) {
      alert('Erro ao salvar visita.')
      console.error(e)
    } finally {
      setFormSaving(false)
    }
  }

  // ── Delete visit ───────────────────────────────────────────────────────────

  async function handleDeleteVisit(id: string) {
    if (!confirm('Excluir esta visita permanentemente?')) return
    await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    setVisits(v => v.filter(x => x.id !== id))
    setShowDetailModal(false)
  }

  // ── Save report ────────────────────────────────────────────────────────────

  async function handleSaveReport() {
    if (!selectedVisit) return
    setReportSaving(true)
    try {
      const payload: Record<string, unknown> = {
        report_description:  reportDesc,
        status:              detailStatus,
        linked_quotation_ids: linkedQuotations,
      }
      if (detailStatus === 'realizada' && !selectedVisit.report_filled_at) {
        payload.report_filled_at = new Date().toISOString()
      }
      const res = await fetch(`/api/visits/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const updated: Visit = await res.json()
      setVisits(v => v.map(x => x.id === selectedVisit.id ? updated : x))
      setSelectedVisit(updated)
      alert('Relatório salvo!')
    } finally {
      setReportSaving(false)
    }
  }

  // ── Upload attachment ──────────────────────────────────────────────────────

  async function handleUploadVisitFile(file: File) {
    if (!selectedVisit) return
    if (file.size > 10 * 1024 * 1024) { alert('Arquivo muito grande. Máximo: 10 MB.'); return }
    setUploadingFile(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${selectedVisit.id}/${Date.now()}-${safeName}`

      // Upload via server route to bypass RLS
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', path)
      const uploadRes = await fetch('/api/visits/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) { alert('Erro ao enviar arquivo: ' + (uploadData.error ?? uploadRes.statusText)); return }

      const newAtt: Attachment = {
        name: file.name, path,
        url:  uploadData.url,
        size: file.size,
        type: file.type || 'application/octet-stream',
        at:   new Date().toISOString(),
      }
      const updatedAtts = [...(selectedVisit.attachments ?? []), newAtt]
      await fetch(`/api/visits/${selectedVisit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: updatedAtts }),
      })
      const updatedVisit = { ...selectedVisit, attachments: updatedAtts }
      setSelectedVisit(updatedVisit)
      setVisits(v => v.map(x => x.id === selectedVisit.id ? updatedVisit : x))
    } catch (e) {
      alert('Erro inesperado ao enviar arquivo.')
      console.error(e)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveAttachment(att: Attachment) {
    if (!selectedVisit || !confirm(`Remover "${att.name}"?`)) return
    await supabase.storage.from('visit-attachments').remove([att.path])
    const updatedAtts = (selectedVisit.attachments ?? []).filter(a => a.path !== att.path)
    await fetch(`/api/visits/${selectedVisit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachments: updatedAtts }),
    })
    const updatedVisit = { ...selectedVisit, attachments: updatedAtts }
    setSelectedVisit(updatedVisit)
    setVisits(v => v.map(x => x.id === selectedVisit.id ? updatedVisit : x))
  }

  // ── Print / PDF report ────────────────────────────────────────────────────

  function printReport(visit: Visit) {
    const dtFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório de Visita – ${visit.client_company}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1E293B; padding: 32px 40px; }
  .logo { font-size: 20px; font-weight: 800; color: #0C447C; letter-spacing: 1px; margin-bottom: 4px; }
  .subtitle { font-size: 11px; color: #6B7280; margin-bottom: 24px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #6B7280; margin-bottom: 20px; }
  table.info { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.info td { padding: 6px 10px; border: 1px solid #E2E8F0; font-size: 13px; }
  table.info td:first-child { font-weight: 600; width: 160px; background: #F8FAFC; }
  .section-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .report-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; white-space: pre-wrap; line-height: 1.7; font-size: 13px; min-height: 60px; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  .status-agendada  { background: #E6F1FB; color: #0C447C; }
  .status-realizada { background: #EAF3DE; color: #27500A; }
  .status-cancelada { background: #F1EFE8; color: #444441; }
  .footer { margin-top: 40px; font-size: 11px; color: #9CA3AF; text-align: right; border-top: 1px solid #E2E8F0; padding-top: 8px; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
  <div class="logo">SHIPLOG PHARMA</div>
  <div class="subtitle">Relatório de Visita Comercial</div>
  <h1>${visit.client_company}</h1>
  <div class="meta">${dtFmt.format(new Date(visit.scheduled_at))} · ${visit.duration_min} min</div>
  <table class="info">
    <tr><td>Responsável</td><td>${visit.responsible_name}</td></tr>
    ${visit.client_email ? `<tr><td>E-mail</td><td>${visit.client_email}</td></tr>` : ''}
    <tr><td>Status</td><td><span class="status-badge status-${visit.status}">${visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}</span></td></tr>
    ${visit.report_filled_at ? `<tr><td>Relatório em</td><td>${dtFmt.format(new Date(visit.report_filled_at))}</td></tr>` : ''}
  </table>
  <div class="section-title">Relatório da visita</div>
  <div class="report-box">${visit.report_description ? visit.report_description.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Nenhum relatório preenchido.'}</div>
  ${(visit.attachments?.length ?? 0) > 0 ? `
  <div class="section-title">Anexos</div>
  <ul style="padding-left:18px;font-size:13px;line-height:2">
    ${visit.attachments.map(a => `<li><a href="${a.url}" style="color:#0C447C">${a.name}</a></li>`).join('')}
  </ul>` : ''}
  <div class="footer">Gerado em ${dtFmt.format(new Date())} · Shiplog Pharma</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`
    const win = window.open('', '_blank', 'width=800,height=700')
    if (win) { win.document.write(html); win.document.close() }
  }

  // ── Send cancel email ──────────────────────────────────────────────────────

  async function handleSendCancelEmail() {
    if (!selectedVisit?.client_email) return
    if (!confirm(`Marcar como cancelada e enviar e-mail para ${selectedVisit.client_email}?`)) return
    await fetch('/api/send-visit-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:              selectedVisit.client_email,
        clientCompany:   selectedVisit.client_company,
        scheduledAt:     selectedVisit.scheduled_at,
        responsibleName: selectedVisit.responsible_name,
        type:            'cancelamento',
      }),
    })
    const res = await fetch(`/api/visits/${selectedVisit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelada', last_email_sent_at: new Date().toISOString() }),
    })
    const updated: Visit = await res.json()
    setVisits(v => v.map(x => x.id === selectedVisit.id ? updated : x))
    setSelectedVisit(updated)
    setDetailStatus('cancelada')
    alert('E-mail de cancelamento enviado!')
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    const d = new Date(currentDate)
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date
    })
  }, [currentDate])

  const monthDays = useMemo(() => {
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()
    const first = new Date(y, m, 1)
    const last  = new Date(y, m + 1, 0)
    const firstDow = first.getDay() === 0 ? 6 : first.getDay() - 1
    const days: (Date | null)[] = Array(firstDow).fill(null)
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(y, m, i))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [currentDate])

  function visitsForDay(date: Date) {
    return visits.filter(v => {
      const vd = new Date(v.scheduled_at)
      return vd.getFullYear() === date.getFullYear() &&
             vd.getMonth()    === date.getMonth()    &&
             vd.getDate()     === date.getDate()
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }

  function navigatePrev() {
    const d = new Date(currentDate)
    if (view === 'semana') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }
  function navigateNext() {
    const d = new Date(currentDate)
    if (view === 'semana') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  // ── Client search (form) ───────────────────────────────────────────────────

  const filteredClients = useMemo(() => {
    if (!formClientSearch) return clients.slice(0, 8)
    const q = formClientSearch.toLowerCase()
    return clients.filter(c => c.empresa.toLowerCase().includes(q)).slice(0, 8)
  }, [clients, formClientSearch])

  const clientQuotations = useMemo(() => {
    if (!selectedVisit) return []
    const lc = selectedVisit.client_company.toLowerCase()
    return quotations.filter(q => q.client_company?.toLowerCase() === lc)
  }, [quotations, selectedVisit])

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filteredVisits = useMemo(() => {
    return visits
      .filter(v => {
        if (filterStatus && v.status !== filterStatus) return false
        if (filterSearch) {
          const q = filterSearch.toLowerCase()
          if (!v.client_company.toLowerCase().includes(q) &&
              !v.responsible_name.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }, [visits, filterStatus, filterSearch])

  // ── Calendar helpers ───────────────────────────────────────────────────────

  function calFmt(iso: string) {
    // Formato yyyyMMddTHHmmss para Google/Outlook
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  }

  function buildGoogleCalLink(visit: Visit) {
    const start = calFmt(visit.scheduled_at)
    const end   = calFmt(new Date(new Date(visit.scheduled_at).getTime() + visit.duration_min * 60000).toISOString())
    const title = encodeURIComponent(`Visita – ${visit.client_company}`)
    const details = encodeURIComponent(`Responsável: ${visit.responsible_name}${visit.client_email ? '\nE-mail: ' + visit.client_email : ''}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
  }

  function buildOutlookLink(visit: Visit) {
    const start = new Date(visit.scheduled_at).toISOString()
    const end   = new Date(new Date(visit.scheduled_at).getTime() + visit.duration_min * 60000).toISOString()
    const subject = encodeURIComponent(`Visita – ${visit.client_company}`)
    const body = encodeURIComponent(`Responsável: ${visit.responsible_name}`)
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`
  }

  function downloadIcs(visit: Visit) {
    const start = calFmt(visit.scheduled_at)
    const end   = calFmt(new Date(new Date(visit.scheduled_at).getTime() + visit.duration_min * 60000).toISOString())
    const now   = calFmt(new Date().toISOString())
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Shiplog Pharma//Visitas//PT',
      'BEGIN:VEVENT',
      `UID:${visit.id}@shiplog-pharma`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:Visita – ${visit.client_company}`,
      `DESCRIPTION:Responsável: ${visit.responsible_name}${visit.client_email ? '\\nE-mail: ' + visit.client_email : ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visita-${visit.client_company.replace(/\s+/g, '-')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Formatters ─────────────────────────────────────────────────────────────

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9CA3AF' }}>Carregando...</div>
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1E293B' }}>Agenda de Visitas</h1>
        <button
          onClick={() => openNewVisit()}
          style={{ backgroundColor: '#0C447C', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Visita
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {/* View tabs */}
        {(['lista', 'semana', 'mes'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '6px 16px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
              backgroundColor: view === v ? '#0C447C' : 'white',
              color: view === v ? 'white' : '#374151',
            }}
          >
            {v === 'lista' ? 'Lista' : v === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}

        {/* List filters */}
        {view === 'lista' && (
          <>
            <input
              type="text"
              placeholder="Buscar cliente ou responsável..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, width: 240 }}
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
            >
              <option value="">Todos os status</option>
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </>
        )}

        {/* Calendar navigation */}
        {view !== 'lista' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <button onClick={navigatePrev} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
              {view === 'semana'
                ? `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : `${PT_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </span>
            <button onClick={navigateNext} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>›</button>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: 12 }}>Hoje</button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LISTA VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'lista' && (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#CBD5E1' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Data / Hora</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Cliente</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>Responsável</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Relatório</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Calendário</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#9CA3AF' }}>
                    Nenhuma visita encontrada.
                  </td>
                </tr>
              ) : filteredVisits.map((visit, i) => {
                const s = STATUS_STYLES[visit.status]
                return (
                  <tr key={visit.id} style={{ borderTop: '1px solid #F1F5F9', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{fmtDate(visit.scheduled_at)}</div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>{fmtTime(visit.scheduled_at)} · {visit.duration_min}min</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{visit.client_company}</div>
                      {visit.client_email && <div style={{ color: '#6B7280', fontSize: 12 }}>{visit.client_email}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{visit.responsible_name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {visit.report_description
                        ? <span style={{ color: '#27500A', fontSize: 12, fontWeight: 600 }}>✓ Preenchido</span>
                        : <span style={{ color: '#9CA3AF', fontSize: 12 }}>–</span>
                      }
                      {(visit.attachments?.length ?? 0) > 0 && (
                        <span style={{ marginLeft: 6, color: '#0C447C', fontSize: 12 }}>📎 {visit.attachments.length}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                        <a
                          href={buildGoogleCalLink(visit)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Google Calendar"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', textDecoration: 'none' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" strokeWidth="2"/></svg>
                        </a>
                        <a
                          href={buildOutlookLink(visit)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Outlook"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', textDecoration: 'none' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0078D4" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#0078D4" strokeWidth="2"/></svg>
                        </a>
                        <button
                          onClick={() => downloadIcs(visit)}
                          title="Baixar .ics"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', padding: 0 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="17" width="18" height="4" rx="1" stroke="#374151" strokeWidth="2"/></svg>
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => openDetail(visit)}
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 4 }}
                      >Ver</button>
                      <button
                        onClick={() => openEditVisit(visit)}
                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >Editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEMANA VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'semana' && (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #E2E8F0' }}>
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div key={i} style={{
                  padding: '10px 6px', textAlign: 'center',
                  backgroundColor: isToday ? '#E6F1FB' : '#F8FAFC',
                  borderRight: i < 6 ? '1px solid #E2E8F0' : 'none',
                }}>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{PT_DAYS[i]}</div>
                  <div style={{ fontSize: 20, fontWeight: isToday ? 700 : 400, color: isToday ? '#0C447C' : '#1E293B' }}>
                    {date.getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {date.toLocaleDateString('pt-BR', { month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Day columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 420 }}>
            {weekDays.map((date, i) => {
              const dayVisits = visitsForDay(date)
              const isToday   = date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={i}
                  onClick={() => openNewVisit(date.toISOString().split('T')[0])}
                  style={{
                    padding: '6px 4px',
                    borderRight: i < 6 ? '1px solid #F1F5F9' : 'none',
                    backgroundColor: isToday ? '#FAFCFF' : 'white',
                    cursor: 'pointer',
                    minHeight: 100,
                  }}
                >
                  {dayVisits.map(v => {
                    const s = STATUS_STYLES[v.status]
                    return (
                      <div
                        key={v.id}
                        onClick={e => { e.stopPropagation(); openDetail(v) }}
                        style={{
                          backgroundColor: s.bg, color: s.color,
                          borderLeft: `3px solid ${s.color}`,
                          borderRadius: 4, padding: '3px 6px', marginBottom: 4,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <div>{fmtTime(v.scheduled_at)}</div>
                        <div style={{ fontSize: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {v.client_company}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div style={{ padding: '6px 10px', borderTop: '1px solid #F1F5F9', fontSize: 11, color: '#9CA3AF' }}>
            Clique em um dia para agendar nova visita
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MÊS VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {view === 'mes' && (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid #E2E8F0' }}>
            {PT_DAYS.map(d => (
              <div key={d} style={{ padding: '8px', textAlign: 'center', backgroundColor: '#F8FAFC', fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthDays.map((date, i) => {
              if (!date) {
                return <div key={i} style={{ minHeight: 90, borderRight: (i + 1) % 7 !== 0 ? '1px solid #F1F5F9' : 'none', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA' }} />
              }
              const dayVisits = visitsForDay(date)
              const isToday   = date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={i}
                  onClick={() => openNewVisit(date.toISOString().split('T')[0])}
                  style={{
                    padding: '4px 6px', minHeight: 90, cursor: 'pointer',
                    borderRight: (i + 1) % 7 !== 0 ? '1px solid #F1F5F9' : 'none',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: isToday ? '#FAFCFF' : 'white',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#0C447C' : '#374151', marginBottom: 3 }}>
                    {date.getDate()}
                  </div>
                  {dayVisits.slice(0, 3).map(v => {
                    const s = STATUS_STYLES[v.status]
                    return (
                      <div
                        key={v.id}
                        onClick={e => { e.stopPropagation(); openDetail(v) }}
                        style={{
                          backgroundColor: s.bg, color: s.color,
                          borderRadius: 3, padding: '1px 5px', marginBottom: 2,
                          fontSize: 10, fontWeight: 600,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                      >
                        {fmtTime(v.scheduled_at)} {v.client_company}
                      </div>
                    )
                  })}
                  {dayVisits.length > 3 && (
                    <div style={{ fontSize: 10, color: '#6B7280' }}>+{dayVisits.length - 3} mais</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FORM MODAL (create / edit)
      ══════════════════════════════════════════════════════════════════════ */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {editingVisit ? 'Editar Visita' : 'Nova Visita'}
              </h2>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6B7280', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Cliente */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Cliente *</label>
                <input
                  type="text"
                  value={formClientSearch}
                  onChange={e => {
                    setFormClientSearch(e.target.value)
                    setFormClientCompany(e.target.value)
                    setFormClientId('')
                    setFormClientEmails([''])
                    setFormClientOpen(true)
                  }}
                  onFocus={() => setFormClientOpen(true)}
                  placeholder="Buscar cliente cadastrado..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
                {formClientOpen && filteredClients.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', border: '1px solid #E2E8F0', borderRadius: 6, marginTop: 2, maxHeight: 180, overflowY: 'auto', backgroundColor: 'white', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {filteredClients.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => {
                          setFormClientId(c.id)
                          setFormClientCompany(c.empresa)
                          setFormClientSearch(c.empresa)
                          setFormClientOpen(false)
                          // Preenche email, contato e telefone do cadastro
                          setFormClientContato(c.contato || '')
                          setFormClientTelefone(c.telefone || '')
                          // Preenche email(s) do cadastro
                          let emails: string[] = []
                          if (c.email) {
                            emails = c.email.split(',').map((e: string) => e.trim()).filter(Boolean)
                          } else {
                            // Fallback: tenta pegar do JSON de comentarios (legado)
                            try {
                              const parsed = JSON.parse(c.comentarios || '{}')
                              const ct = parsed.contacts?.find((x: { email?: string }) => x.email)
                              if (ct?.email) emails = [ct.email]
                            } catch {}
                          }
                          setFormClientEmails(emails.length > 0 ? emails : [''])
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F1F5F9' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        {c.empresa}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contato + Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Contato</label>
                  <input
                    type="text"
                    value={formClientContato}
                    onChange={e => setFormClientContato(e.target.value)}
                    placeholder="Nome do contato"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Telefone</label>
                  <input
                    type="text"
                    value={formClientTelefone}
                    onChange={e => setFormClientTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* E-mails */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>E-mail(s) do cliente</label>
                  <button
                    type="button"
                    onClick={() => setFormClientEmails(prev => [...prev, ''])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0C447C', fontWeight: 700, padding: '0 4px' }}
                  >
                    + Adicionar e-mail
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {formClientEmails.map((email, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="email"
                        value={email}
                        onChange={e => {
                          const updated = [...formClientEmails]
                          updated[idx] = e.target.value
                          setFormClientEmails(updated)
                        }}
                        placeholder={idx === 0 ? 'E-mail principal (confirmação)' : 'E-mail adicional'}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                      {formClientEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormClientEmails(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                          title="Remover e-mail"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsável */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Responsável</label>
                <select
                  value={formResponsavelId}
                  onChange={e => {
                    setFormResponsavelId(e.target.value)
                    const user = allUsers.find(u => u.id === e.target.value)
                    setFormResponsavelNome(user?.nome || '')
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  <option value="">Selecionar</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              {/* Data + Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Data *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Hora *</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Duração */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Duração</label>
                <select
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                >
                  {[30, 45, 60, 90, 120, 180].map(d => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>

              {/* Send email checkbox */}
              {formClientEmails.some(e => e.trim()) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '8px 10px', background: '#F8FAFC', borderRadius: 6 }}>
                  <input
                    type="checkbox"
                    checked={formSendEmail}
                    onChange={e => setFormSendEmail(e.target.checked)}
                  />
                  Enviar e-mail de {editingVisit ? 'reagendamento' : 'confirmação'} para{' '}
                  {formClientEmails.filter(e => e.trim()).join(', ')}
                </label>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveVisit}
                disabled={formSaving}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#0C447C', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: formSaving ? 0.7 : 1 }}
              >
                {formSaving ? 'Salvando...' : editingVisit ? 'Salvar alterações' : 'Agendar visita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DETAIL / REPORT MODAL (slide-in panel)
      ══════════════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedVisit && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <div style={{ background: 'white', width: 520, maxWidth: '95vw', height: '100vh', overflowY: 'auto', padding: 28, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>{selectedVisit.client_company}</h2>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {fmtDateTime(selectedVisit.scheduled_at)} · {selectedVisit.duration_min} min
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#6B7280', lineHeight: 1, marginTop: -2 }}>×</button>
            </div>

            {/* Info card */}
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>Responsável:</strong> {selectedVisit.responsible_name}</div>
              {selectedVisit.client_email && <div><strong>E-mail:</strong> {selectedVisit.client_email}</div>}
              {selectedVisit.last_email_sent_at && (
                <div style={{ color: '#6B7280', fontSize: 12 }}>Último e-mail enviado: {fmtDateTime(selectedVisit.last_email_sent_at)}</div>
              )}
            </div>

            {/* Adicionar ao calendário */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Adicionar ao calendário</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={buildGoogleCalLink(selectedVisit)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#4285F4" strokeWidth="2"/></svg>
                  Google Calendar
                </a>
                <a
                  href={buildOutlookLink(selectedVisit)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0078D4" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="#0078D4" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#0078D4" strokeWidth="2"/></svg>
                  Outlook
                </a>
                <button
                  onClick={() => downloadIcs(selectedVisit)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #CBD5E1', background: 'white', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="17" width="18" height="4" rx="1" stroke="#374151" strokeWidth="2"/></svg>
                  Baixar .ics
                </button>
              </div>
            </div>

            {/* Status buttons */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Status</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['agendada', 'realizada', 'cancelada'] as const).map(s => {
                  const st = STATUS_STYLES[s]
                  const active = detailStatus === s
                  return (
                    <button
                      key={s}
                      onClick={() => setDetailStatus(s)}
                      style={{
                        padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        backgroundColor: active ? st.color : st.bg,
                        color: active ? 'white' : st.color,
                        border: `1px solid ${st.color}`,
                      }}
                    >
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Relatório */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Relatório da visita</label>
              <textarea
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                placeholder="Descreva como foi a visita, próximos passos, observações..."
                rows={5}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {selectedVisit.report_filled_at && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  Preenchido em: {fmtDateTime(selectedVisit.report_filled_at)}
                </div>
              )}
            </div>

            {/* Cotações vinculadas */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Cotações vinculadas</label>
              {clientQuotations.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Nenhuma cotação encontrada para este cliente.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 10px' }}>
                  {clientQuotations.map(q => (
                    <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={linkedQuotations.includes(q.id)}
                        onChange={e => {
                          if (e.target.checked) setLinkedQuotations(l => [...l, q.id])
                          else setLinkedQuotations(l => l.filter(x => x !== q.id))
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>{q.quote_number}</span>
                      <span style={{ color: '#6B7280', fontSize: 12 }}>– {fmtDate(q.created_at)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Anexos */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Anexos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {(selectedVisit.attachments ?? []).map(att => (
                  <div key={att.path} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, background: '#F8FAFC', borderRadius: 6, padding: '7px 10px' }}>
                    <span>📎</span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, color: '#0C447C', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                    >
                      {att.name}
                    </a>
                    <span style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{(att.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => handleRemoveAttachment(att)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadVisitFile(f) }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                style={{ padding: '6px 14px', borderRadius: 6, border: '2px dashed #CBD5E1', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6B7280' }}
              >
                {uploadingFile ? 'Enviando...' : '+ Adicionar anexo'}
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <button
                  onClick={handleSaveReport}
                  disabled={reportSaving}
                  style={{ padding: '10px 8px', borderRadius: 8, border: 'none', backgroundColor: '#0C447C', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'center', opacity: reportSaving ? 0.7 : 1 }}
                >
                  {reportSaving ? 'Salvando...' : 'Salvar relatório'}
                </button>
                <button
                  onClick={() => printReport(selectedVisit)}
                  style={{ padding: '10px 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'center', color: '#374151' }}
                >
                  Gerar PDF do relatório
                </button>
                <button
                  onClick={() => { setShowDetailModal(false); openEditVisit(selectedVisit) }}
                  style={{ padding: '10px 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'center', color: '#374151' }}
                >
                  Editar agendamento
                </button>
                {selectedVisit.client_email ? (
                  <button
                    onClick={handleSendCancelEmail}
                    style={{ padding: '10px 8px', borderRadius: 8, border: '1px solid #FBBF24', background: '#FFFBEB', color: '#92400E', cursor: 'pointer', fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'center' }}
                  >
                    Cancelar e notificar
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeleteVisit(selectedVisit.id)}
                    style={{ padding: '10px 8px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'white', color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: 12, lineHeight: 1.3, textAlign: 'center' }}
                  >
                    Excluir visita
                  </button>
                )}
              </div>
              {selectedVisit.client_email && (
                <button
                  onClick={() => handleDeleteVisit(selectedVisit.id)}
                  style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'white', color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                >
                  Excluir visita
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
