'use client'

import { useUserRole } from '@/hooks/useUserRole'

export default function SobrePage() {
  const { isAdmin, loading } = useUserRole()
  const brandBlue = '#0C3460'

  const CardSection = ({
    icon,
    title,
    children,
  }: {
    icon: string
    title: string
    children: React.ReactNode
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-lg font-semibold" style={{ color: brandBlue }}>
          {title}
        </h2>
      </div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  )

  const envVars = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      desc: 'URL do projeto Supabase',
      where: 'Vercel → Settings → Environment Variables',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      desc: 'Chave pública Supabase',
      where: 'Vercel → Settings → Environment Variables',
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      desc: 'Chave de serviço Supabase (server-side)',
      where: 'Vercel → Settings → Environment Variables',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: brandBlue }}>
          Sobre o Shiplog Pharma
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Informações sobre o sistema, tecnologias e configurações.
        </p>
      </div>

      {/* Descrição */}
      <CardSection icon="ℹ️" title="Sobre o Sistema">
        <p className="leading-relaxed">
          Sistema web de gerenciamento de cotações comerciais para produtos farmacêuticos,
          desenvolvido para a <strong>CBB International</strong>. Permite criar, enviar e
          acompanhar cotações com clientes, gerenciar o catálogo de produtos e monitorar o
          pipeline de vendas.
        </p>
      </CardSection>

      {/* Autoria e Versão */}
      <CardSection icon="🏢" title="Autoria e Versão">
        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="font-medium w-28 shrink-0 text-gray-600">Empresa:</dt>
            <dd>CBB International</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-28 shrink-0 text-gray-600">Desenvolvimento:</dt>
            <dd>CBB International, com auxílio de Claude (Anthropic)</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-28 shrink-0 text-gray-600">Versão:</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                0.0 (Beta) — a ser definida no lançamento oficial
              </span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-28 shrink-0 text-gray-600">Repositório:</dt>
            <dd>
              <a
                href="https://github.com/giorgiobraga70/shiplog-pharma"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline break-all"
              >
                github.com/giorgiobraga70/shiplog-pharma
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-28 shrink-0 text-gray-600">Contato:</dt>
            <dd>CBB International</dd>
          </div>
        </dl>
      </CardSection>

      {/* Tecnologias */}
      <CardSection icon="⚙️" title="Tecnologias e APIs de Suporte">
        <div className="space-y-2">
          {[
            { name: 'Next.js 14', role: 'Framework principal (App Router)', url: 'https://nextjs.org' },
            { name: 'Supabase', role: 'Banco de dados e autenticação', url: 'https://supabase.com' },
            { name: 'Vercel', role: 'Hospedagem e deploy', url: 'https://vercel.com' },
            { name: 'ViaCEP', role: 'Consulta de CEPs brasileiros', url: 'https://viacep.com.br' },
            { name: 'IBGE API', role: 'Listagem de cidades por estado', url: 'https://servicodados.ibge.gov.br' },
            { name: 'Tailwind CSS', role: 'Estilização e design', url: 'https://tailwindcss.com' },
          ].map((tech) => (
            <div key={tech.name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="w-36 shrink-0 font-medium text-gray-800">{tech.name}</span>
              <span className="flex-1 text-gray-600">{tech.role}</span>
              <a
                href={tech.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline text-xs shrink-0"
              >
                {tech.url.replace('https://', '')}
              </a>
            </div>
          ))}
        </div>
      </CardSection>

      {/* Configurações — admin only */}
      {!loading && isAdmin && (
        <CardSection icon="🔑" title="Chaves e Configurações (Admin)">
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            As chaves de API são configuradas como variáveis de ambiente no Vercel e não são
            expostas aqui por segurança.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-600 whitespace-nowrap">Variável</th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-600">Descrição</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Onde configurar</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v) => (
                  <tr key={v.name} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 font-mono text-blue-900 whitespace-nowrap">{v.name}</td>
                    <td className="py-2 pr-4 text-gray-700">{v.desc}</td>
                    <td className="py-2 text-gray-700">{v.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>
      )}
    </div>
  )
}
