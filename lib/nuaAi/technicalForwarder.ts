/**
 * NUA IA — Encaminhador Obrigatório de Solicitações Técnicas ao Desenvolvedor
 * 
 * Regra Suprema:
 * A Nua IA conhece o ecossistema Nua Borges para explicar e orientar,
 * mas NUNCA atua como suporte técnico, desenvolvedor ou ensina a Nua
 * a modificar arquivos, APIs, banco de dados ou infraestrutura.
 * 
 * Protocolo de 7 passos:
 * 1. Reconhece brevemente o que a Nua está tentando fazer.
 * 2. Explica em poucas frases o conceito geral.
 * 3. Zero tutorial técnico, código, comandos ou instruções para ela mesma implementar.
 * 4. Não sugere procurar plugins ou mexer em código/servidores.
 * 5. Informa com carinho que deve ser tratado com o desenvolvedor Philippe.
 * 6. Oferece ajuda para formular e organizar o pedido para o desenvolvedor.
 * 7. Encaminha claramente para a aba de Solicitações ou contato direto com o dev.
 */

export function tryLocalTechnicalForwardingResponse(query: string): string | null {
  const lower = query.toLowerCase();

  // 1. Pergunta sobre como colocar/pegar API geral
  if (
    lower.includes('api') &&
    (lower.includes('como') || lower.includes('pegar') || lower.includes('pego') || lower.includes('colocar') || lower.includes('coloco')) &&
    !lower.includes('whatsapp') && !lower.includes('key')
  ) {
    return [
      '🛠️ **Integração de APIs na Plataforma**\n',
      'Uma **API** é, basicamente, uma forma de conectar o site da Nua a outro serviço, sistema ou ferramenta externa.\n',
      'Como essa integração depende da estrutura de código do seu site e pode envolver configurações sensíveis de segurança que não devem ser alteradas diretamente pelo painel administrativo, essa parte precisa ser tratada diretamente com o **desenvolvedor responsável pela Nua (Philippe)**.\n',
      'Se você me disser qual serviço ou ferramenta você pretende integrar, eu posso entender o que você quer que aconteça e te ajudar a formular esse pedido aqui mesmo para encaminhar ao Philippe, e você acompanha tudo na aba **Meus Pedidos**! 🤝'
    ].join('\n');
  }

  // 2. Pergunta sobre API do WhatsApp
  if (
    lower.includes('whatsapp') &&
    (lower.includes('api') || lower.includes('integra') || lower.includes('coloco') || lower.includes('colocar') || lower.includes('como'))
  ) {
    return [
      '📱 **Integração com WhatsApp**\n',
      'Entendi o que você quer fazer! A integração com uma API do WhatsApp envolve configurações técnicas no código do sistema e regras de envio de mensagens da Nua.\n',
      'Para garantir que tudo funcione com total estabilidade e sem risco para o site, o ideal é encaminhar essa implementação diretamente para o **desenvolvedor responsável (Philippe)**.\n',
      'Posso te ajudar agora mesmo a organizar o que você gostaria que essa integração fizesse (por exemplo: abrir conversa direta, receber notificações de contato ou enviar mensagens automáticas) para enviar direto a ele, e você acompanha o andamento na aba **Meus Pedidos**! 📝'
    ].join('\n');
  }

  // 3. Pergunta sobre onde colocar API Key ou Chave de API
  if (
    (lower.includes('api key') || lower.includes('chave de api') || lower.includes('chave da api')) ||
    (lower.includes('chave') && lower.includes('onde') && (lower.includes('coloco') || lower.includes('insiro')))
  ) {
    return [
      '🔐 **Credenciais Técnicas e API Keys**\n',
      'Essa chave é uma credencial técnica confidencial usada para autenticar e autorizar uma integração externa.\n',
      'Por motivos de segurança e integridade da sua plataforma, **não é recomendável que você tente configurá-la por conta própria no sistema**.\n',
      'Esse tipo de configuração de chaves e variáveis de ambiente deve ser feito com segurança pelo **desenvolvedor da Nua (Philippe)**. Se você quiser, posso te ajudar a descrever para ele qual serviço você quer conectar e como você espera que funcione!'
    ].join('\n');
  }

  // 4. Pergunta sobre banco de dados, SQL ou mudar banco
  if (
    lower.includes('banco') &&
    (lower.includes('mudo') || lower.includes('mudar') || lower.includes('altero') || lower.includes('alterar') || lower.includes('sql') || lower.includes('database'))
  ) {
    return [
      '🗄️ **Banco de Dados e Armazenamento**\n',
      'O banco de dados é onde ficam guardados com segurança todos os dados da plataforma em nuvem.\n',
      'Qualquer alteração na estrutura do banco ou migração de dados pertence estritamente à infraestrutura técnica e deve ser conduzida exclusivamente pelo **desenvolvedor Philippe**.\n',
      'Se você estiver precisando de um novo campo para guardar alguma informação no painel ou percebeu alguma necessidade especial de dados, me conte o que você gostaria de salvar que eu te ajudo a estruturar esse pedido para o dev! 💡'
    ].join('\n');
  }

  // 5. Pergunta sobre código, qual arquivo editar ou passar código
  if (
    lower.includes('código') || lower.includes('codigo') ||
    lower.includes('qual arquivo') || lower.includes('editar arquivo') || lower.includes('abrir arquivo') ||
    lower.includes('me passa o código') || lower.includes('passa o codigo')
  ) {
    return [
      '💻 **Alterações de Código e Arquivos**\n',
      'Entendi o que você está buscando. No ecossistema Nua Borges, você não precisa se preocupar com código, arquivos, programação ou comandos técnicos.\n',
      'Todas as alterações no código-fonte são de responsabilidade do **desenvolvedor Philippe**, para proteger a segurança, a velocidade e o design do seu site.\n',
      'Você pode me dizer qual ajuste ou novidade gostaria de ver no site que eu te ajudo a rascunhar uma solicitação clara e objetiva para enviar direto ao Philippe, e você acompanha tudo na aba **Meus Pedidos**! ✨'
    ].join('\n');
  }

  // 6. Pergunta sobre Deploy, Cloudflare, Servidores ou Hospedagem
  if (
    lower.includes('deploy') || lower.includes('cloudflare') || lower.includes('servidor') || lower.includes('hospedagem') || lower.includes('dns')
  ) {
    return [
      '☁️ **Hospedagem, Cloudflare e Deploy**\n',
      'O deploy e a infraestrutura na Cloudflare são os processos que mantêm o seu site no ar globalmente com alta velocidade e proteção contra ataques.\n',
      'Essas configurações operacionais são de responsabilidade direta do **desenvolvedor Philippe**.\n',
      'No seu dia a dia, você só precisa usar o botão **Publicar no Site** no topo do seu painel quando quiser atualizar o conteúdo. Para qualquer ajuste mais profundo na hospedagem ou no domínio, você pode me pedir aqui mesmo ou conversar com ele na aba **Meus Pedidos**! 🤝'
    ].join('\n');
  }

  // 7. Pergunta sobre autenticação, login técnico ou token
  if (
    lower.includes('autenticação') || lower.includes('autenticacao') || lower.includes('token') || lower.includes('sessão técnica')
  ) {
    return [
      '🛡️ **Autenticação e Segurança**\n',
      'Os mecanismos de autenticação e proteção de tokens garantem que apenas você tenha acesso ao seu painel administrativo.\n',
      'Alterações nas regras de login, tokens ou segurança do sistema são tratadas exclusivamente pelo **desenvolvedor Philippe**.\n',
      'Se você tiver alguma dúvida sobre como acessar o painel ou quiser trocar a sua senha mestra, basta me avisar ou enviar um chamado para ele!'
    ].join('\n');
  }

  return null;
}
