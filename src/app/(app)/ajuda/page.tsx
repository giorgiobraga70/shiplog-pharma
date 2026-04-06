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
            <strong>Login:</strong> Acesse o sistema com seu e-mail e senha cadastrados pelo administrador. Use o ícone de olho no campo senha para mostrar ou ocultar o que está digitando.
          </Step>
          <Step>
            <strong>Recuperação de senha:</strong> Na tela de login, clique em &quot;Esqueceu a senha?&quot;. Um e-mail com link de redefinição será enviado. Na página de redefinição, o ícone de olho também está disponível nos campos de nova senha.
          </Step>
          <Step>
            Após o login, você será redirecionado automaticamente para o <strong>Dashboard</strong>, com uma visão geral das cotações do período.
          </Step>
        </ul>
      </Section>

      {/* 2. Dashboard */}
      <Section icon="📊" title="2. Dashboard">
        <ul className="space-y-2">
          <Step>
            A tela inicial exibe <strong>4 cards de métricas</strong>: cotações desta semana, deste mês, em pipeline (enviadas aguardando resposta) e aprovadas com taxa de conversão dos últimos 30 dias.
          </Step>
          <Step>
            <strong>Atividades recentes:</strong> Lista as 8 últimas cotações com status, empresa, valor e há quantos dias foram criadas.
          </Step>
          <Step>
            <strong>Ações rápidas:</strong> Botões de acesso direto para Nova Cotação, Histórico e Clientes sem precisar usar o menu.
          </Step>
        </ul>
      </Section>

      {/* 3. Cotação */}
      <Section icon="📋" title="3. Cotação">
        <ul className="space-y-2">
          <Step>
            <strong>Nova cotação:</strong> Clique em &quot;+ Nova Cotação&quot; no topo da tela ou no Dashboard. O número sequencial do dia é gerado automaticamente.
          </Step>
          <Step>
            <strong>Carregar do histórico:</strong> Use o dropdown &quot;Carregar do histórico&quot; para abrir uma cotação existente para edição, ou clique em <strong>Duplicar</strong> no Histórico para criar uma cópia com número novo.
          </Step>
          <Step>
            <strong>Dados gerais:</strong> Selecione o cliente cadastrado para preenchimento automático. Se o cliente tiver múltiplos contatos registrados, aparecerão botões para selecionar qual contato usar na cotação.
          </Step>
          <Step>
            <strong>Adicionar produtos:</strong> Use os filtros de Tipo, Volume e Cor para localizar produtos. Informe a quantidade por <strong>peças</strong> ou por <strong>caixas</strong> — o sistema converte automaticamente entre os dois (caixas arredondadas para cima).
          </Step>
          <Step>
            <strong>Desconto por item:</strong> O campo <strong>Desconto %</strong> aplica desconto ou acréscimo sobre os preços daquele item. Use <em>-10</em> para reduzir 10% ou <em>+5</em> para aumentar 5%. Após adicionar o item, clique diretamente nas células de <strong>Caixas</strong> ou <strong>Desc.%</strong> na tabela para editar inline sem precisar remover e readicionar.
          </Step>
          <Step>
            <strong>Fornecedor:</strong> Selecione <strong>Munan</strong> ou <strong>Four Star</strong> antes de adicionar os itens — isso define os preços. Trocar o fornecedor recalcula todos os itens já adicionados.
          </Step>
          <Step>
            <strong>Notas internas:</strong> Campo de texto livre visível apenas no sistema (não aparece no PDF). Use para registrar contexto da negociação, pendências ou observações internas.
          </Step>
          <Step>
            <strong>Observações para o cliente:</strong> Texto que aparece em destaque no rodapé do PDF enviado ao cliente. Ideal para condições especiais, avisos de estoque ou termos da proposta.
          </Step>
          <Step>
            <strong>Desconto global:</strong> Aplicado sobre o subtotal de todos os itens. O painel de <em>Resumo da Cotação</em> exibe subtotal, valor do desconto/acréscimo e o <strong>Total Final</strong> em destaque.
          </Step>
          <Step>
            <strong>Salvar / Gerar PDF / Enviar por E-mail:</strong> &quot;Salvar&quot; registra com status <em>Salva</em>. &quot;Gerar PDF&quot; abre a prévia para impressão. &quot;Enviar por E-mail&quot; marca automaticamente como <em>Enviada</em>.
          </Step>
        </ul>
      </Section>

      {/* 4. Histórico */}
      <Section icon="🗂️" title="4. Histórico">
        <ul className="space-y-2">
          <Step>
            <strong>Busca e filtros:</strong> Filtre por texto (número, empresa, responsável) e por status com os botões coloridos. A tabela respeita os filtros ativos no momento.
          </Step>
          <Step>
            <strong>Ordenação:</strong> Clique em qualquer cabeçalho de coluna para ordenar. O primeiro clique ordena crescente (▲), o segundo decrescente (▼). O ícone ⇅ indica colunas não ordenadas.
          </Step>
          <Step>
            <strong>Alterar status:</strong> Clique no badge de status de qualquer cotação para alterá-lo inline. Cada alteração fica registrada no log.
          </Step>
          <Step>
            <strong>Log de alterações:</strong> Clique em qualquer linha da tabela para expandir e ver o histórico completo de mudanças de status, com data e hora de cada transição.
          </Step>
          <Step>
            <strong>Alertas de validade:</strong> Cotações com prazo próximo ao vencimento exibem um badge colorido na coluna Data — <em>laranja</em> para &quot;Vence em Xd&quot;, <em>vermelho</em> para &quot;Vencida&quot;. Cotações aprovadas ou perdidas não exibem alertas.
          </Step>
          <Step>
            <strong>Notas internas:</strong> Cotações com nota interna exibem o ícone 📝 na coluna de ações. Passe o mouse sobre ele para ler o conteúdo da nota.
          </Step>
          <Step>
            <strong>Duplicar:</strong> O botão &quot;Duplicar&quot; cria uma nova cotação com todos os dados copiados (cliente, itens, condições) e um número novo — o original permanece intacto.
          </Step>
          <Step>
            <strong>Exportar CSV:</strong> O botão &quot;↓ Exportar CSV&quot; baixa as cotações visíveis (respeitando filtros ativos) em formato compatível com Excel, com separador ; e codificação UTF-8.
          </Step>
          <Step>
            <strong>Relatório PDF:</strong> Gera um relatório completo com estatísticas, funil de vendas e tabela detalhada de todas as cotações.
          </Step>
        </ul>
      </Section>

      {/* 5. Clientes */}
      <Section icon="👥" title="5. Clientes">
        <ul className="space-y-2">
          <Step>
            <strong>Cadastrar cliente:</strong> Clique em &quot;+ Novo Cliente&quot; e preencha os dados da empresa — razão social, CNPJ, contato principal, e-mail, telefone e endereço.
          </Step>
          <Step>
            <strong>CEP auto-preenchimento:</strong> Ao digitar o CEP, o sistema consulta a API ViaCEP e preenche automaticamente o endereço, cidade e estado.
          </Step>
          <Step>
            <strong>Múltiplos contatos:</strong> Clique em &quot;+ Adicionar contato&quot; no formulário para cadastrar contatos adicionais com nome, cargo, e-mail e telefone. Na tela de cotação, ao selecionar o cliente, aparecerão botões para escolher qual contato usar.
          </Step>
          <Step>
            <strong>Comentários:</strong> Campo de texto livre para observações sobre o cliente — visível apenas internamente.
          </Step>
          <Step>
            <strong>Histórico de cotações:</strong> Clique em um cliente na lista para ver, no painel lateral, todas as cotações vinculadas a ele com status e valores.
          </Step>
          <Step>
            <strong>Relatório PDF:</strong> Gera um relatório consolidado com todos os clientes e suas cotações históricas.
          </Step>
        </ul>
      </Section>

      {/* 6. Produtos */}
      <Section icon="💊" title="6. Produtos">
        <ul className="space-y-2">
          <Step>
            <strong>Importar planilha Excel:</strong> Na aba <strong>Produtos</strong>, use o botão de importação para carregar uma planilha .xlsx. O sistema processa e cadastra os itens automaticamente.
          </Step>
          <Step>
            <strong>Exportar CSV (admin):</strong> Administradores podem exportar toda a base de produtos em CSV para uso externo ou backup.
          </Step>
          <Step>
            Certifique-se que a planilha segue o modelo esperado (código, descrição, unidade, fabricante). Consulte o administrador para obter o modelo.
          </Step>
        </ul>
      </Section>

      {/* 7. Usuários (admin) */}
      <Section icon="🔐" title="7. Usuários (somente admin)">
        <ul className="space-y-2">
          <Step>
            A aba <strong>Usuários</strong> é visível somente para administradores do sistema.
          </Step>
          <Step>
            <strong>Gerenciar usuários:</strong> Crie, edite ou remova contas de acesso. Cada usuário tem e-mail e senha únicos.
          </Step>
          <Step>
            <strong>Perfis:</strong> <em>Admin</em> — acesso total, incluindo gestão de usuários e exportação de produtos. <em>Usuário</em> — acesso padrão às funcionalidades de cotação, histórico, clientes e produtos.
          </Step>
        </ul>
      </Section>

      {/* 8. Dicas */}
      <Section icon="💡" title="8. Dicas e Boas Práticas">
        <ul className="space-y-2">
          <Step>
            Mantenha o cadastro de clientes atualizado — os dados são preenchidos automaticamente ao selecionar o cliente na cotação.
          </Step>
          <Step>
            Use <strong>Duplicar</strong> no histórico para cotações recorrentes ao mesmo cliente: edite apenas o que mudou e salve como nova, sem recriar tudo do zero.
          </Step>
          <Step>
            Acompanhe os <strong>alertas de validade</strong> no histórico para não deixar propostas vencerem sem follow-up.
          </Step>
          <Step>
            Use o campo <strong>Notas Internas</strong> para registrar o contexto de cada negociação — visível apenas pela equipe, nunca pelo cliente.
          </Step>
          <Step>
            Use o campo <strong>Observações para o Cliente</strong> para incluir condições especiais ou avisos diretamente no PDF da proposta.
          </Step>
          <Step>
            Use <strong>Exportar CSV</strong> com filtros ativos para extrair relatórios segmentados, como todas as cotações aprovadas de um período.
          </Step>
          <Step>
            Acompanhe o <strong>Dashboard</strong> diariamente para ter visão do pipeline e da taxa de conversão em tempo real.
          </Step>
          <Step>
            Em caso de dúvidas ou problemas técnicos, entre em contato com o administrador do sistema.
          </Step>
        </ul>
      </Section>
    </div>
  )
}
