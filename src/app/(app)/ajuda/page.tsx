'use client'

export default function AjudaPage() {
  const brandBlue = '#0C3460'

  const Section = ({
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
      <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
  )

  const Step = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-blue-900">▸</span>
      <span>{children}</span>
    </li>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: brandBlue }}>
          Central de Ajuda
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Guia de uso do Shiplog Pharma — Gerenciamento de Cotações
        </p>
      </div>

      {/* 1. Primeiros Passos */}
      <Section icon="🚀" title="1. Primeiros Passos">
        <ul className="space-y-2">
          <Step>
            <strong>Login:</strong> Acesse o sistema com seu e-mail e senha cadastrados pelo administrador.
          </Step>
          <Step>
            <strong>Recuperação de senha:</strong> Na tela de login, clique em &quot;Esqueci minha senha&quot;. Um e-mail com link de redefinição será enviado para o endereço cadastrado.
          </Step>
          <Step>
            Após o login, você será redirecionado automaticamente para a tela de <strong>Cotação</strong>.
          </Step>
        </ul>
      </Section>

      {/* 2. Cotação */}
      <Section icon="📋" title="2. Cotação">
        <ul className="space-y-2">
          <Step>
            <strong>Nova cotação:</strong> A tela de cotação já abre pronta para preenchimento. Selecione o cliente no topo para associar a cotação.
          </Step>
          <Step>
            <strong>Dados gerais:</strong> Preencha número da cotação, data, tipo de frete e demais campos do cabeçalho.
          </Step>
          <Step>
            <strong>Adicionar produtos:</strong> Use o campo de busca para encontrar produtos cadastrados. Você pode informar a quantidade por <strong>peças</strong> ou por <strong>caixas</strong> — o sistema converte automaticamente entre os dois (arredondando caixas sempre para cima).
          </Step>
          <Step>
            <strong>Desconto por item:</strong> O campo <strong>Desconto %</strong> aplica um desconto ou acréscimo diretamente sobre os preços daquele item. Use <em>-10</em> para reduzir 10% ou <em>+5</em> para aumentar 5%. O desconto é exibido na coluna &quot;Desc.%&quot; da tabela (vermelho = redução, verde = acréscimo).
          </Step>
          <Step>
            <strong>Fornecedores:</strong> Cada produto pode ter preço associado ao fornecedor <strong>Munan</strong> ou <strong>Four Star</strong>. Selecione o fornecedor antes de adicionar os itens — isso recalcula todos os preços.
          </Step>
          <Step>
            <strong>Salvar:</strong> Clique em &quot;Salvar Cotação&quot; para registrar no histórico com status inicial <em>Aberta</em>.
          </Step>
          <Step>
            <strong>Gerar PDF:</strong> Após salvar, use o botão &quot;PDF&quot; para baixar a cotação formatada para envio ao cliente.
          </Step>
          <Step>
            <strong>Enviar por e-mail:</strong> Ao enviar a cotação por e-mail diretamente pelo sistema, o status muda automaticamente para <em>Enviada</em>.
          </Step>
          <Step>
            <strong>Carregar do histórico:</strong> Na aba <strong>Histórico</strong>, clique em &quot;Editar&quot; em qualquer cotação para carregá-la novamente na tela de cotação e fazer alterações.
          </Step>
        </ul>
      </Section>

      {/* 3. Histórico */}
      <Section icon="🗂️" title="3. Histórico">
        <ul className="space-y-2">
          <Step>
            <strong>Filtrar por status:</strong> Use os botões de filtro no topo do histórico para visualizar somente cotações em determinado status (Aberta, Enviada, Aprovada, Recusada).
          </Step>
          <Step>
            <strong>Alterar status:</strong> Clique diretamente no <em>badge</em> de status de qualquer cotação para alterá-lo rapidamente sem precisar entrar na edição.
          </Step>
          <Step>
            <strong>Editar:</strong> O botão &quot;Editar&quot; carrega todos os dados da cotação na tela principal para revisão e salvamento.
          </Step>
          <Step>
            <strong>Deletar:</strong> O botão &quot;Excluir&quot; remove permanentemente a cotação após confirmação.
          </Step>
          <Step>
            <strong>Ver PDF:</strong> O botão &quot;PDF&quot; na lista do histórico gera e baixa o documento da cotação selecionada.
          </Step>
          <Step>
            <strong>Estatísticas e funil:</strong> O painel de estatísticas no topo do histórico exibe totais por status e o valor consolidado de cotações, funcionando como um funil de vendas.
          </Step>
        </ul>
      </Section>

      {/* 4. Clientes */}
      <Section icon="👥" title="4. Clientes">
        <ul className="space-y-2">
          <Step>
            <strong>Cadastrar cliente:</strong> Na aba <strong>Clientes</strong>, clique em &quot;Novo Cliente&quot; e preencha os dados da empresa — razão social, CNPJ, contato, e-mail, telefone e endereço.
          </Step>
          <Step>
            <strong>Buscar:</strong> Use o campo de pesquisa para filtrar clientes por nome ou CNPJ em tempo real.
          </Step>
          <Step>
            <strong>CEP auto-preenchimento:</strong> Ao digitar o CEP, o sistema consulta a API ViaCEP e preenche automaticamente o endereço, bairro, cidade e estado.
          </Step>
          <Step>
            <strong>Histórico de cotações por cliente:</strong> Clique em um cliente na lista para expandir e ver todas as cotações vinculadas a ele, com status e valores.
          </Step>
        </ul>
      </Section>

      {/* 5. Produtos */}
      <Section icon="💊" title="5. Produtos">
        <ul className="space-y-2">
          <Step>
            <strong>Importar planilha Excel:</strong> Na aba <strong>Produtos</strong>, use o botão de importação para carregar uma planilha .xlsx com a lista de produtos. O sistema processa e cadastra os itens automaticamente.
          </Step>
          <Step>
            <strong>Exportar CSV (admin):</strong> Administradores podem exportar toda a base de produtos em formato CSV para uso externo ou backup.
          </Step>
          <Step>
            Certifique-se que a planilha de importação segue o modelo esperado (código, descrição, unidade, fabricante). Consulte o administrador para obter o modelo.
          </Step>
        </ul>
      </Section>

      {/* 6. Usuários (admin) */}
      <Section icon="🔐" title="6. Usuários (somente admin)">
        <ul className="space-y-2">
          <Step>
            A aba <strong>Usuários</strong> é visível somente para administradores do sistema.
          </Step>
          <Step>
            <strong>Gerenciar usuários:</strong> Crie, edite ou remova contas de acesso. Cada usuário tem um e-mail e senha únicos.
          </Step>
          <Step>
            <strong>Perfis:</strong> Dois perfis disponíveis — <em>Admin</em> (acesso total, incluindo gestão de usuários e exportação de produtos) e <em>Usuário</em> (acesso padrão às funcionalidades de cotação, histórico, clientes e produtos).
          </Step>
        </ul>
      </Section>

      {/* 7. Dicas */}
      <Section icon="💡" title="7. Dicas e Boas Práticas">
        <ul className="space-y-2">
          <Step>
            Mantenha o cadastro de clientes atualizado para agilizar a criação de cotações — os dados são preenchidos automaticamente ao selecionar o cliente.
          </Step>
          <Step>
            Use o funil de vendas no <strong>Histórico</strong> para acompanhar o pipeline comercial e identificar cotações pendentes de retorno.
          </Step>
          <Step>
            Ao gerar o PDF, revise os totais e o número da cotação antes de enviar ao cliente.
          </Step>
          <Step>
            Para cotações recorrentes, abra uma cotação existente no histórico, edite o necessário e salve como nova — isso economiza tempo de preenchimento.
          </Step>
          <Step>
            Em caso de dúvidas ou problemas técnicos, entre em contato com o administrador do sistema.
          </Step>
        </ul>
      </Section>
    </div>
  )
}
