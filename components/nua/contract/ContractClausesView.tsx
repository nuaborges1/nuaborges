'use client';

import React from 'react';
import { Clausula, ContractList, Nota } from './ContractUiElements';

export function ContractClausesView() {
  return (
    <div className="space-y-8 print:space-y-5">
      <Clausula num="01" title="Das Partes" highlight>
        <p><strong className="text-white print:text-black">CONTRATADO:</strong> <strong>João Philippe de Oliveira Boechat</strong>, brasileiro, solteiro, desenvolvedor web, portador do RG nº 3.755.968 e CPF nº 053.795.071-07, residente e domiciliado em Ceilândia, Brasília/DF, e-mail: <span className="text-[#f4a7b9] print:text-black">philippeboechat1@gmail.com</span>, WhatsApp: <strong>(61) 99361-9554</strong>.</p>
        <p><strong className="text-white print:text-black">CONTRATANTE:</strong> <strong>Nayara Borges da Costa</strong>, conhecida profissionalmente como <strong>&quot;Nua Borges&quot;</strong>, brasileira, casada, portadora do CPF/Doc nº <strong>059.681.011-30</strong>, residente e domiciliada na República da Irlanda, e-mail oficial: <span className="text-[#f4a7b9] print:text-black">nua@nuaborges.com</span>, WhatsApp internacional: <strong>+353 83 205 1073</strong>.</p>
        <Nota><strong>PARÁGRAFO ÚNICO:</strong> Os e-mails e números de WhatsApp acima constituem os canais oficiais de comunicação e notificação das partes para todos os fins deste contrato (Cláusula 19).</Nota>
      </Clausula>

      <Clausula num="02" title="Do Objeto">
        <p><strong>2.1.</strong> O objeto deste contrato é o desenvolvimento, a publicação e a homologação do website do projeto <strong>&quot;Nua Borges&quot;</strong>, com o respectivo painel administrativo (CMS), exatamente conforme o <strong>Anexo I — Memorial Descritivo e Escopo Técnico-Funcional</strong>, bem como a prestação da garantia e do suporte nos estritos limites da Cláusula 6.</p>
        <p><strong>2.2.</strong> Quaisquer alterações de escopo dependem de solicitação escrita da <strong>CONTRATANTE</strong> e de aceite do <strong>CONTRATADO</strong>, com orçamento específico quando excederem o previsto na Cláusula 6.</p>
        <p><strong>2.3.</strong> O layout e a identidade visual são exclusivos do projeto. Componentes genéricos, ferramentas, técnicas e bibliotecas seguem a disciplina da Cláusula 13.</p>
      </Clausula>

      <Clausula num="03" title="Do Escopo do Projeto">
        <p>O projeto contratado compreende exatamente os seguintes módulos e recursos:</p>
        <div className="space-y-4 print:space-y-2">
          <div>
            <p className="text-[11px] print:text-[8.5pt] font-semibold uppercase tracking-widest text-[#f4a7b9] print:text-black mb-2">I — Site público:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 print:gap-0.5">
              {[
                'Adaptação a celulares, tablets e computadores nos navegadores suportados indicados no Anexo I',
                'Página inicial com seção capa (Hero) em carrossel fotográfico editorial',
                'Galeria de ensaios com esteira contínua infinita e visualizador lightbox em tela cheia',
                'Seção Sobre Mim / Manifesto com retrato autoral, pull quote e assinatura artística',
                'Seção de canais oficiais e redes sociais parametrizadas',
                'Modal de contato comercial com formulário e redirecionamento de e-mail',
                'Player musical editorial híbrido (YouTube + MP3)',
                'Cabeçalho fixo responsivo com menu drawer mobile',
                'Rodapé institucional com créditos da marca',
                'Animações e microinterações conforme layout aprovado',
                'Otimizações de desempenho e carregamento em rede global',
                'SEO técnico básico e marcação Open Graph',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/50 print:bg-zinc-600 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] print:text-[8.5pt] font-semibold uppercase tracking-widest text-[#f4a7b9] print:text-black mb-2">II — Painel administrativo (CMS):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 print:gap-0.5">
              {[
                'Edição de textos e fotos da capa',
                'Biblioteca de mídia com upload direto de arquivos e compressão automática',
                'Gerenciamento da galeria conforme Anexo I, Aba 3',
                'Alteração dinâmica de links e canais oficiais',
                'Gerenciamento da playlist musical',
                'Configuração de SEO e Open Graph',
                'Alteração de senha mestra do painel',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/50 print:bg-zinc-600 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Nota>
          <p className="mb-1.5"><strong>PARÁGRAFO PRIMEIRO:</strong> O detalhamento técnico exaustivo das funcionalidades consta no <strong>Anexo I</strong>, parte integrante e indissociável deste instrumento.</p>
          <p><strong>PARÁGRAFO SEGUNDO:</strong> Os recursos adicionais disponibilizados por mera liberalidade do <strong>CONTRATADO</strong> (módulo de perguntas &quot;Asks&quot;, gravador de vídeo vertical com teleprompter, páginas institucionais de Termos de Uso e Política de Privacidade e painel técnico de auditoria) integram o website e são entregues estritamente &quot;no estado em que se encontram&quot; (<em>as is</em>), sem cobertura pela garantia de 12 (doze) meses (Cláusula 6.2) e sem obrigação de suporte técnico incluído (Cláusula 6.3), ressalvada unicamente a correção de eventuais vulnerabilidades críticas de segurança originadas no código desenvolvido pelo <strong>CONTRATADO</strong>. A <strong>CONTRATANTE</strong> declara-se ciente de que é a única e exclusiva responsável pelo monitoramento, moderação, triagem e respostas às mensagens recebidas no módulo &quot;Asks&quot;, isentando integralmente o <strong>CONTRATADO</strong> de qualquer responsabilidade civil, administrativa ou criminal referente a tais conteúdos.</p>
        </Nota>
      </Clausula>

      <Clausula num="04" title="Do Valor e da Forma de Pagamento">
        <p><strong>4.1.</strong> Pelo desenvolvimento, publicação, homologação e garantia técnica (Cláusula 6.2), a <strong>CONTRATANTE</strong> pagará ao <strong>CONTRATADO</strong> o valor total de <strong className="text-white print:text-black">R$ 2.000,00 (dois mil reais)</strong>, dividido em <strong>10 (dez) parcelas mensais e sucessivas de R$ 200,00 (duzentos reais)</strong>, vencendo-se a primeira em <strong className="text-[#f4a7b9] print:text-black">04 de outubro de 2026 (04/10/2026)</strong> e as demais <strong>no dia 04 dos meses subsequentes</strong>, por transferência PIX para a chave do <strong>CONTRATADO</strong> (CPF: <strong className="text-[#f4a7b9] print:text-black">05379507107</strong> / <strong>053.795.071-07</strong>) ou outro meio acordado por escrito.</p>
        <div className="overflow-x-auto -mx-1 px-1 print:mx-0 print:px-0">
          <table className="w-full min-w-[280px] text-left text-xs print:text-[8pt] border border-zinc-800 print:border-zinc-300 overflow-hidden">
            <thead className="bg-zinc-900/80 print:bg-zinc-100 text-zinc-400 print:text-zinc-800 font-semibold uppercase">
              <tr><th className="py-2.5 px-4 print:py-1.5 print:px-2">Parcela</th><th className="py-2.5 px-4 print:py-1.5 print:px-2">Valor</th><th className="py-2.5 px-4 print:py-1.5 print:px-2">Vencimento (Todo dia 04)</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 print:divide-zinc-200 text-zinc-300 print:text-zinc-800">
              {[
                { p: '1ª Parcela', v: '04/10/2026' },
                { p: '2ª Parcela', v: '04/11/2026' },
                { p: '3ª Parcela', v: '04/12/2026' },
                { p: '4ª Parcela', v: '04/01/2027' },
                { p: '5ª Parcela', v: '04/02/2027' },
                { p: '6ª Parcela', v: '04/03/2027' },
                { p: '7ª Parcela', v: '04/04/2027' },
                { p: '8ª Parcela', v: '04/05/2027' },
                { p: '9ª Parcela', v: '04/06/2027' },
                { p: '10ª Parcela', v: '04/07/2027' },
              ].map(({ p, v }) => (
                <tr key={p} className="hover:bg-zinc-900/30">
                  <td className="py-2 px-4 print:py-1 print:px-2 font-medium text-white print:text-black">{p}</td>
                  <td className="py-2 px-4 print:py-1 print:px-2 font-mono font-medium text-[#f4a7b9] print:text-black">R$ 200,00</td>
                  <td className="py-2 px-4 print:py-1 print:px-2 text-zinc-400 print:text-zinc-700 font-mono">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p><strong>4.2.</strong> Em caso de atraso, incidirão sobre o valor da parcela em atraso: multa moratória de 2% (dois por cento); juros de mora de 1% (um por cento) ao mês (<em>pro rata die</em>), ou o máximo legal, se inferior; e atualização monetária pelo índice oficial IPCA/IBGE.</p>
        <Nota variant="warning">
          <p className="mb-1.5"><strong>4.3.</strong> O atraso no pagamento de qualquer parcela superior a 15 (quinze) dias corridos, contados da notificação escrita enviada pelos canais oficiais (Cláusula 1), autoriza o <strong>CONTRATADO</strong> a suspender as atividades de suporte técnico, novas demandas, manutenções evolutivas e o seu respectivo acesso técnico de gestão às contas e infraestruturas do projeto. A suspensão limita-se estritamente à prestação de serviços do <strong>CONTRATADO</strong>, permanecendo inalterada a titularidade originária das contas e domínios da <strong>CONTRATANTE</strong> (Cláusula 9.2), sendo vedada a adoção de medidas coercitivas de desativação arbitrária de infraestrutura externa ou retenção de arquivos e dados de propriedade da <strong>CONTRATANTE</strong> (Cláusula 17.4).</p>
          <p className="mb-1.5"><strong>4.4.</strong> Atraso superior a 30 (trinta) dias, não sanado em 10 (dez) dias após notificação escrita, autoriza o <strong>CONTRATADO</strong> a considerar vencidas antecipadamente todas as parcelas vincendas e/ou a resolver o contrato de pleno direito (Cláusula 17.2).</p>
          <p><strong>4.5. Pagamentos com origem no exterior:</strong> O valor deste contrato foi convencionado em moeda corrente nacional brasileira (Reais — BRL). Caso a <strong>CONTRATANTE</strong> opte por efetuar o pagamento de qualquer parcela por meio diverso do arranjo PIX (tais como remessa internacional de câmbio, plataformas como Wise, transferências bancárias internacionais ou cartão internacional), todas as taxas de envio e intermediação bancária, tarifas de liquidação, tributos incidentes (inclusive IOF) e diferenciais de spread e câmbio correrão por sua exclusiva conta. Caberá à <strong>CONTRATANTE</strong> emitir a remessa no montante bruto necessário para assegurar que o valor líquido creditado na conta bancária do <strong>CONTRATADO</strong> seja de exatamente <strong>R$ 200,00 (duzentos reais)</strong> por parcela.</p>
        </Nota>
      </Clausula>

      <Clausula num="05" title="Do Prazo de Entrega e da Homologação">
        <p><strong>5.1.</strong> O <strong>CONTRATADO</strong> desenvolverá e disponibilizará o website para homologação pela <strong>CONTRATANTE</strong> no prazo de até <strong>3 (três) meses contados da data de assinatura</strong> deste instrumento, mediante comunicação formal por escrito enviada pelos canais oficiais previstos na Cláusula 1. O prazo de homologação de 10 (dez) dias úteis (Cláusula 6.1) terá início na data do envio dessa comunicação. A contagem do prazo da garantia técnica de 12 (doze) meses (Cláusula 6.2), do suporte incluído (Cláusula 6.3) e a caracterização de eventual aceite tácito por uso público (Cláusula 6.1) operam-se estritamente após a referida comunicação de disponibilização. O prazo de 3 (três) meses prorroga-se automaticamente, sem caracterizar mora, penalidade ou inadimplemento do <strong>CONTRATADO</strong>: (a) pelo atraso da <strong>CONTRATANTE</strong> no fornecimento de insumos, materiais, respostas, aprovações ou pagamento das parcelas vencidas (Cláusula 5.2); (b) pela solicitação de alterações de escopo demandadas pela <strong>CONTRATANTE</strong> (Cláusulas 2.2 e 7.1); e (c) por motivo de caso fortuito ou força maior (Código Civil, art. 393). O descumprimento do prazo de entrega pelo <strong>CONTRATADO</strong> somente caracterizará mora após regular notificação escrita enviada pela <strong>CONTRATANTE</strong> e concessão de prazo de 15 (quinze) dias corridos para saneamento.</p>
        <p><strong>5.2.</strong> Atrasos no fornecimento de insumos ou nas respostas da <strong>CONTRATANTE</strong> prorrogam proporcionalmente o cronograma, sem caracterizar mora do <strong>CONTRATADO</strong>.</p>
        <p><strong>5.3.</strong> A homologação ocorre estritamente na forma da Cláusula 6.1, a partir da efetiva disponibilização do website comunicada nos termos da Cláusula 5.1, iniciando a contagem dos prazos das Cláusulas 6.2 e 6.3.</p>
      </Clausula>

      <Clausula num="06" title="Da Homologação, da Garantia e do Suporte" highlight>
        <div className="space-y-3">
          <p><strong>6.1. Período de ajustes e homologação:</strong> Disponibilizado o website para homologação nos termos da Cláusula 5.1, a <strong>CONTRATANTE</strong> terá 10 (dez) dias úteis para apresentar, em lista única e por escrito, os ajustes desejados dentro do escopo do Anexo I. Estão incluídas até 2 (duas) rodadas de ajustes, compreendendo refinamentos visuais, reorganização, inclusão ou remoção de seções existentes e até 2 (duas) páginas institucionais de estrutura semelhante às já existentes. Para os fins deste contrato, define-se <strong>&quot;página institucional de estrutura semelhante&quot;</strong> como página estática composta exclusivamente por textos e imagens, estruturada com o reaproveitamento de componentes e estilos já existentes no projeto, sem criação de nova funcionalidade, sem nova aba, seção ou fluxo de edição no painel administrativo (CMS), sem integração com serviços externos ou APIs de terceiros e sem novo formulário dinâmico. Quaisquer pedidos que extrapolem essa definição, bem como quaisquer demandas solicitadas antes ou durante a homologação que fujam das especificações expressas no Anexo I, constituem alteração de escopo (Cláusulas 2.2 e 7.1), exigindo prévio orçamento e aprovação escrita para execução. Concluída a última rodada de ajustes, ou decorrido o prazo sem apontamentos, ou iniciado o uso público do website pela <strong>CONTRATANTE</strong> após a comunicação da Cláusula 5.1, o projeto será considerado plenamente homologado e aceito tacitamente. O aceite tácito ou o início do uso público do website não prejudica nem restringe o direito da <strong>CONTRATANTE</strong> de comunicar e exigir a correção, durante o período de garantia de 12 (doze) meses (Cláusula 6.2), de eventuais vícios ocultos ou defeitos técnicos do código-fonte que não fossem razoavelmente identificáveis durante o período de homologação, observadas as regras e excludentes da Cláusula 8. Ajustes posteriores seguirão as Cláusulas 6.3 a 6.5.</p>
          <p><strong>6.2. Garantia de correção de defeitos — 12 (doze) meses:</strong> Pelo prazo de 12 (doze) meses contados da homologação formal ou tácita ocorrida após a disponibilização formal prevista na Cláusula 5.1, o <strong>CONTRATADO</strong> corrigirá, sem custo adicional, os defeitos do código-fonte desenvolvido por ele, assim entendidos as falhas reproduzíveis em que um recurso descrito no Anexo I deixa de funcionar como descrito, nos navegadores e sistemas suportados (Anexo I, item 09), sem que a causa seja uma das hipóteses da Cláusula 8. Inclui a correção de vulnerabilidade de segurança identificada no código original ou em suas dependências diretas, quando houver atualização compatível disponível. Esta garantia é complementar à garantia legal.</p>
          <p><strong>6.3. Suporte incluído — 12 (doze) meses:</strong> No mesmo período, o <strong>CONTRATADO</strong> prestará, sem custo adicional, até <strong>2 (duas) horas mensais, não cumulativas</strong>, de: (a) orientação sobre o uso do painel administrativo; (b) pequenos ajustes de texto, imagem, link, cor ou ordem de elementos já existentes; (c) adaptações pontuais de compatibilidade com versões atuais dos navegadores suportados, desde que não exijam atualização de versão maior de framework ou migração de plataforma. Demandas excedentes serão previamente orçadas (Cláusula 6.5).</p>
          <p><strong>6.4. Suporte continuado:</strong> Encerrado o período da Cláusula 6.3, o <strong>CONTRATADO</strong> continuará disponível para correções, manutenção e ajustes, mediante orçamento avulso por demanda ao valor por hora acordado entre as partes, reajustado anualmente pelo IPCA, ou mediante plano mensal que as partes venham a contratar por escrito. O <strong>CONTRATADO</strong> poderá deixar de oferecer o suporte continuado mediante aviso prévio de 60 (sessenta) dias, entregando à <strong>CONTRATANTE</strong> código-fonte atualizado, credenciais e documentação básica, de modo que outro profissional possa assumir a sustentação do website.</p>
          <p><strong>6.5. Demandas fora dos itens acima:</strong> Toda demanda não prevista expressamente nas Cláusulas 6.1 a 6.3 será orçada previamente por escrito e somente executada após formal aceite da <strong>CONTRATANTE</strong>. Sem aprovação do orçamento, o <strong>CONTRATADO</strong> não terá obrigação de executá-la.</p>
          <p><strong>6.6. Atendimento:</strong> Solicitações serão encaminhadas pelos canais oficiais da Cláusula 1, com descrição objetiva do problema e capturas de tela. Primeira resposta em até 2 (dois) dias úteis (segunda a sexta, das 9h às 18h, horário de Brasília, exceto feriados nacionais e do Distrito Federal). Pequenos ajustes da franquia mensal (Cláusula 6.3) serão executados com prazo estimado informado na primeira resposta, habitualmente em até 5 (cinco) dias úteis conforme complexidade. Defeito crítico que deixe o website público fora do ar, quando causado pelo código do <strong>CONTRATADO</strong>, terá início de atendimento prioritário em até 1 (um) dia útil e empenho contínuo e diligente até o pronto restabelecimento do serviço. O suporte não constitui regime de plantão 24 horas, sobreaviso ou prazo garantido pré-fixado de solução, empregando o CONTRATADO diligência compatível com a complexidade técnica.</p>
          <p><strong>6.7. Natureza e extinção:</strong> A garantia e o suporte constituem obrigações de meio quanto à disponibilidade de serviços e infraestruturas de terceiros, e de resultado apenas quanto à correção dos defeitos técnicos definidos na Cláusula 6.2. Extinguem-se pela morte ou incapacidade permanente do <strong>CONTRATADO</strong> (Código Civil, art. 607), conservando a <strong>CONTRATANTE</strong> todos os direitos de propriedade intelectual da Cláusula 13, ficando expressamente garantido que, nessa hipótese, a <strong>CONTRATANTE</strong> receberá de pronto o código-fonte atualizado, credenciais de acesso, arquivos e documentação técnica necessários para a continuidade do projeto por outro profissional.</p>
        </div>
      </Clausula>

      <Clausula num="07" title="Dos Serviços Não Incluídos" highlight>
        <p><strong>7.1.</strong> Estão incluídos na garantia e no suporte contratado <strong>exclusivamente</strong> os itens previstos na Cláusula 6. São considerados serviços novos, sujeitos a orçamento e aceite prévio, entre outros:</p>
        <ContractList items={[
          <>Novas funcionalidades, páginas, módulos ou integrações externas (sistema próprio de pagamentos online, checkout transparente, integração com gateways de cartão ou PIX automatizado, área de membros restrita com controle de assinantes, agendamentos, newsletters, CRM, ferramentas de analytics avançadas e pixels);</>,
          <>Redesign estrutural, total ou parcial, ou alteração da identidade visual após a homologação definitiva;</>,
          <>Atualização de versão maior de framework e bibliotecas (ex.: upgrades principais de Next.js ou React) e migrações de plataforma ou de provedor de hospedagem;</>,
          <>Adaptações exigidas por descontinuação ou mudanças de regras unilaterais de serviços de terceiros (Cloudflare, YouTube, Registro.br, redes sociais, navegadores ou sistemas operacionais) que excedam o suporte da Cláusula 6.3, &quot;c&quot;;</>,
          <>Desenvolvimento de aplicativos móveis nativos para publicação nas lojas Google Play Store ou Apple App Store;</>,
          <>Infraestrutura própria para transmissão e hospedagem massiva de vídeos pesados de streaming;</>,
          <>Produção, edição, gravação ou inserção massiva de conteúdos em lote;</>,
          <>Recuperação de dados ou mídias apagadas acidentalmente pela CONTRATANTE ou por terceiros;</>,
          <>Consultoria de marketing, gestão de tráfego, SEO avançado além do básico, ou suporte a equipamentos e contas pessoais da CONTRATANTE.</>,
        ]} />
        <Nota><strong>7.2.</strong> A não contratação de serviços adicionais não afeta a vigência da garantia e do suporte da Cláusula 6 em relação ao website original homologado.</Nota>
      </Clausula>

      <Clausula num="08" title="Das Excludentes de Garantia e Suporte" highlight>
        <p><strong>8.1.</strong> Não estão cobertos pela garantia nem pelo suporte incluído, podendo ser objeto de orçamento de reparo específico, as falhas e inconsistências causadas por:</p>
        <ContractList items={[
          <>Ação ou omissão da CONTRATANTE ou de pessoas a quem ela fornecer credenciais (exclusão ou substituição de arquivos, uploads fora dos limites do Anexo I, alteração de DNS, de configurações ou de planos, ou compartilhamento de senhas);</>,
          <>Alterações no código-fonte, nos dados ou na infraestrutura realizadas por terceiros, ainda que autorizados pela CONTRATANTE;</>,
          <>Falhas, indisponibilidades, alterações de regras, limites de cota, preços ou descontinuação de serviços de terceiros (Cloudflare, Registro.br, YouTube, provedores de e-mail, redes sociais), bem como atualizações de navegadores que exijam mais do que a Cláusula 6.3, &quot;c&quot;;</>,
          <>Caso fortuito ou força maior (Código Civil, art. 393), inclusive ataques cibernéticos em escala que superem as medidas de segurança razoáveis adotadas;</>,
          <>Utilização em desacordo com as instruções do Anexo I ou orientações técnicas do CONTRATADO.</>,
        ]} />
        <p className="text-xs text-zinc-400 print:text-zinc-600 pt-1">
          <strong>8.2.</strong> A contratação de outro profissional pela <strong>CONTRATANTE</strong> é plenamente livre. Todavia, a garantia cessa imediatamente sobre as partes do código modificadas por terceiros e sobre os efeitos dessas intervenções externas.
        </p>
      </Clausula>

      <Clausula num="09" title="Do Domínio, das Contas e dos Serviços de Terceiros">
        <p><strong>9.1.</strong> O valor pactuado na Cláusula 4 remunera exclusivamente os serviços de desenvolvimento e suporte do <strong>CONTRATADO</strong>. Não estão incluídas anuidades de domínio (ex: Registro.br), planos pagos de hospedagem, armazenamento adicional ou APIs pagas contratadas pela <strong>CONTRATANTE</strong>.</p>
        <p><strong>9.2.</strong> O domínio oficial deve ser registrado em nome e CPF da <strong>CONTRATANTE</strong>. As contas de infraestrutura, hospedagem e armazenamento em nuvem (Cloudflare Pages para deploy/proxy, Supabase e Backblaze B2) serão criadas preferencialmente diretamente em nome e titularidade da <strong>CONTRATANTE</strong> e permanecerão acessíveis por ela desde o início do projeto, figurando o <strong>CONTRATADO</strong> como membro técnico convidado com acesso operacional revogável a qualquer tempo. Caso alguma conta tenha sido criada provisoriamente sob titularidade do <strong>CONTRATADO</strong>, este a transferirá integralmente à <strong>CONTRATANTE</strong> mediante simples solicitação, no prazo de até 10 (dez) dias úteis, não ficando a criação, a transferência de titularidade ou a entrega do acesso e das credenciais de infraestrutura condicionadas à quitação integral das 10 (dez) parcelas do contrato.</p>
        <p><strong>9.3.</strong> A plataforma utiliza arquitetura em planos gratuitos sujeitos a limites operacionais de cota (Anexo I, item 09) e a eventuais alterações unilaterais dos provedores globais. Se o crescimento de tráfego exigir migração para plano pago, o <strong>CONTRATADO</strong> comunicará a <strong>CONTRATANTE</strong> para aprovação. Caso a <strong>CONTRATANTE</strong> opte por não arcar com custos adicionais de provedores, o <strong>CONTRATADO</strong> não responderá por eventuais bloqueios ou lentidões decorrentes.</p>
        <p><strong>9.4.</strong> Nenhuma despesa financeira será realizada em nome da <strong>CONTRATANTE</strong> sem sua expressa autorização prévia por escrito.</p>
        <p><strong>9.5. Backups e segurança dos dados:</strong> O website conta com rotinas de backup e salvaguarda automatizada dos dados editoriais do CMS, do banco de dados em nuvem (Supabase e Backblaze B2) e das configurações essenciais do website, bem como versionamento seguro do código-fonte em repositório. Sem prejuízo dessas salvaguardas técnicas automatizadas providas pela arquitetura, a guarda e preservação de cópias definitivas de segurança (backups) dos arquivos originais e brutos de fotos, vídeos, textos e faixas musicais são de responsabilidade da <strong>CONTRATANTE</strong>.</p>
      </Clausula>

      <Clausula num="10" title="Das Obrigações do Contratado">
        <ContractList items={[
          'Desenvolver e publicar o website conforme o memorial técnico do Anexo I;',
          'Realizar a homologação e prestar a garantia e o suporte técnico nos estritos termos e prazos da Cláusula 6;',
          'Manter rigoroso sigilo sobre dados, arquivos e credenciais acessadas (Cláusula 14);',
          'Tratar dados pessoais em estrita conformidade com a LGPD e o GDPR (Cláusula 15);',
          'Comunicar previamente à CONTRATANTE limitações técnicas relevantes que impeçam recursos planejados;',
          'Disponibilizar e manter as contas e credenciais de infraestrutura em nome da CONTRATANTE acessíveis por ela desde o início do projeto (Cláusula 9.2), e entregar formalmente à CONTRATANTE, após a homologação do website, o código-fonte atualizado, as instruções básicas de operação e as credenciais administrativas complementares, observada a disciplina de cessão proporcional da Cláusula 13.',
        ]} />
      </Clausula>

      <Clausula num="11" title="Das Obrigações da Contratante">
        <p><strong>11.1.</strong> Fornecer tempestivamente os materiais, fotos em alta resolução, textos e links necessários; honrar pontualmente os pagamentos nos prazos avençados; zelar pelo sigilo de suas senhas pessoais; manter obrigatoriamente ativa a autenticação em dois fatores (2FA) em suas contas externas de titularidade própria (e-mail, Cloudflare e provedor de registro de domínio), ciente de que a exigência de 2FA refere-se a essas plataformas e não constitui funcionalidade do painel administrativo (CMS) desenvolvido, salvo disposição em contrário no Anexo I; comunicar prontamente inconsistências observadas; e arcar com os custos de domínio e serviços de terceiros previamente aprovados.</p>
        <p><strong>11.2.</strong> A <strong>CONTRATANTE</strong> declara e garante expressamente que: (a) detém os direitos autorais, patrimoniais ou as autorizações legais necessárias sobre todas as fotos, vídeos, textos, faixas musicais, marcas e imagens que fornecer ou publicar no website, inclusive perante fotógrafos e titulares de direitos fonomecânicos; (b) todas as pessoas retratadas no acervo são comprovadamente maiores de 18 (dezoito) anos e consentiram expressamente com a divulgação de sua imagem; (c) o conteúdo publicado é lícito e atende aos termos de uso das plataformas de terceiros.</p>
        <Nota variant="warning"><strong>11.3.</strong> O <strong>CONTRATADO</strong> não revisa nem exerce moderação sobre os conteúdos artísticos e editoriais publicados. A responsabilidade da <strong>CONTRATANTE</strong> fica estritamente limitada aos conteúdos, fotos, vídeos, textos e mídias efetivamente fornecidos, aprovados ou publicados por ela, respondendo perante terceiros e ressarcindo o <strong>CONTRATADO</strong> por eventuais danos, condenações, custas e honorários decorrentes exclusivamente desses conteúdos. Essa responsabilidade da <strong>CONTRATANTE</strong> não abrange, em nenhuma hipótese, problemas, danos ou reclamações decorrentes de erro técnico, negligência, imperícia, alteração indevida ou atuação direta do próprio <strong>CONTRATADO</strong> no código ou na infraestrutura.</Nota>
      </Clausula>

      <Clausula num="12" title="Da Responsabilidade Civil e Limitações" highlight>
        <p><strong>12.1.</strong> O <strong>CONTRATADO</strong> responde pelos defeitos técnicos de desenvolvimento nos estritos termos da Cláusula 6. Não assume qualquer responsabilidade ou garantia quanto a resultados comerciais, alcance de público, número de seguidores, volume de vendas, conversão de novos assinantes no OnlyFans ou faturamento financeiro, os quais dependem exclusivamente de fatores mercadológicos e do engajamento próprio da <strong>CONTRATANTE</strong>.</p>
        <p><strong>12.2.</strong> A disponibilidade contínua e a segurança da plataforma constituem obrigações de meio: o <strong>CONTRATADO</strong> emprega padrões modernos de engenharia de software, sem garantir funcionamento ininterrupto ou invulnerabilidade absoluta.</p>
        <p><strong>12.3.</strong> O <strong>CONTRATADO</strong> não responde por falhas de infraestrutura de terceiros (Cloudflare, YouTube, provedores de DNS e internet), caso fortuito ou força maior (Código Civil, art. 393), nem por lucros cessantes, perdas indiretas ou danos reflexos, salvo comprovado dolo ou culpa grave.</p>
        <Nota><strong>12.4.</strong> Salvo dolo, culpa grave ou expressa vedação legal, a responsabilidade indenizatória total do <strong>CONTRATADO</strong> por quaisquer eventos relacionados a este contrato limita-se rigorosamente ao valor total efetivamente pago pela <strong>CONTRATANTE</strong>.</Nota>
      </Clausula>

      <Clausula num="13" title="Da Propriedade Intelectual e Cessão">
        <p><strong>13.1.</strong> Os conteúdos fornecidos pela <strong>CONTRATANTE</strong> (fotografias, vídeos, ensaios, textos, músicas, marca e nome artístico) permanecem sob sua exclusiva propriedade ou de seus respectivos licenciantes.</p>
        <p><strong>13.2.</strong> A cessão dos direitos patrimoniais sobre o código-fonte sob medida e o layout desenvolvidos especificamente para este projeto ocorrerá de forma progressiva e proporcional às parcelas e etapas efetivamente quitadas pela <strong>CONTRATANTE</strong> ao longo do parcelamento em 10 (dez) meses, assegurando-lhe desde a entrega a plena utilização, reprodução, modificação (por si ou por terceiros) e hospedagem da aplicação onde preferir. A cessão definitiva, plena, perpétua e irretratável sobre a totalidade do projeto consolidar-se-á mediante a quitação integral do valor acordado de R$ 2.000,00. Durante a vigência do parcelamento, estando em dia com os pagamentos vencidos, a CONTRATANTE goza de pleno direito de uso e exploração do website.</p>
        <p><strong>13.2.1.</strong> Na hipótese de encerramento antecipado ou rescisão deste contrato (Cláusula 17), a <strong>CONTRATANTE</strong> manterá a titularidade patrimonial e a licença definitiva irrevogável de uso e modificação sobre a fração do código-fonte e do layout proporcional às parcelas ou etapas que tenham sido efetivamente quitadas até então, vedada a perda dos direitos patrimoniais já remunerados.</p>
        <p><strong>13.3.</strong> Permanecem sob titularidade do <strong>CONTRATADO</strong> as bibliotecas genéricas, ferramentas reutilizáveis, rotinas de infraestrutura e conhecimentos técnicos desenvolvidos independentemente deste contrato. Sobre esses elementos, é concedida à <strong>CONTRATANTE</strong> licença perpétua, irrevogável e gratuita para uso e modificação no âmbito deste website. O CONTRATADO não reutilizará o layout específico e a identidade visual da CONTRATANTE em outros projetos.</p>
        <p><strong>13.4.</strong> Módulos open-source e bibliotecas de terceiros permanecem regidos por suas licenças originárias.</p>
        <p><strong>13.5.</strong> Fica resguardado ao <strong>CONTRATADO</strong> o direito moral de ser identificado como autor técnico do software (Lei nº 9.609/1998, art. 2º, §1º), cabendo à <strong>CONTRATANTE</strong> a faculdade de solicitar a remoção ou preservação do crédito de rodapé.</p>
      </Clausula>

      <Clausula num="14" title="Da Confidencialidade">
        <p><strong>14.1.</strong> As partes comprometem-se a resguardar sigilo sobre quaisquer informações confidenciais, dados de visitantes, credenciais de acesso, estratégias comerciais, código-fonte e métricas privadas recebidas em virtude deste contrato, durante a sua vigência e pelo prazo de 5 (cinco) anos subsequentes ao término. Para credenciais técnicas e senhas de acesso, o dever de sigilo perdura por prazo indeterminado.</p>
        <p><strong>14.2.</strong> Não são confidenciais as informações que já sejam públicas sem violação deste contrato, sendo autorizada a revelação estritamente exigida por lei ou autoridade judicial competente, mediante aviso prévio à outra parte quando juridicamente viável.</p>
      </Clausula>

      <Clausula num="15" title="Da Proteção de Dados Pessoais (LGPD e GDPR)" highlight>
        <p><strong>15.1.</strong> Em razão do domicílio da <strong>CONTRATANTE</strong> na República da Irlanda e da potencial navegação de visitantes do Brasil e da União Europeia, o tratamento de dados pessoais no website observará conjuntamente a legislação brasileira (Lei Geral de Proteção de Dados — LGPD, Lei nº 13.709/2018) e a legislação da União Europeia (Regulamento Geral sobre a Proteção de Dados — GDPR, Regulamento UE 2016/679), no que forem aplicáveis. Quanto aos dados pessoais de visitantes coletados através do portal (mensagens do formulário de contato, perguntas enviadas, registros de data/hora, endereço IP, país de origem, navegador e referrer), a <strong>CONTRATANTE</strong> atua na qualidade de <strong>Controladora (Data Controller)</strong> e o <strong>CONTRATADO</strong> atua como <strong>Operador (Data Processor)</strong>, realizando o tratamento exclusivamente para fins operacionais de hospedagem, segurança, diagnóstico de rede e estatísticas de uso, de acordo com as instruções da Controladora.</p>
        <p><strong>15.2.</strong> A <strong>CONTRATANTE</strong> autoriza expressamente o <strong>CONTRATADO</strong> a acessar os registros de telemetria técnica e logs de auditoria, inclusive por meio de painel administrativo técnico, com o propósito exclusivo de monitoramento de integridade, mitigação de falhas e segurança. Esse acesso constará da Política de Privacidade do portal e poderá ser revogado a qualquer tempo pela CONTRATANTE.</p>
        <p><strong>15.3.</strong> A Cloudflare atua como suboperadora de infraestrutura com rede global. A Política de Privacidade refletirá com exatidão os tratamentos realizados, incluindo a retenção técnica de logs de auditoria e IP por prazo de até 6 (seis) meses para garantia da segurança da aplicação, salvo necessidade legal de conservação.</p>
        <p><strong>15.4.</strong> O <strong>CONTRATADO</strong> adotará medidas técnicas e administrativas razoáveis de proteção e comunicará à <strong>CONTRATANTE</strong>, no prazo de até 2 (dois) dias úteis da ciência inequívoca, qualquer incidente relevante de segurança que possa comprometer dados pessoais, em conformidade com as diretrizes da LGPD e do GDPR.</p>
        <p><strong>15.5.</strong> Findo o contrato, o <strong>CONTRATADO</strong> eliminará ou devolverá os dados pessoais eventualmente mantidos fora da infraestrutura da CONTRATANTE, respeitadas as hipóteses legais de guarda (art. 16 da LGPD e arts. 17 e 28 do GDPR).</p>
      </Clausula>

      <Clausula num="16" title="Do Portfólio Profissional">
        <p><strong>16.1.</strong> A <strong>CONTRATANTE</strong> autoriza o <strong>CONTRATADO</strong> a mencionar a autoria técnica do projeto e a exibir capturas de tela do website em seu portfólio profissional e redes de tecnologia, desde que não contenham imagens íntimas ou sensuais, credenciais, dados de visitantes ou métricas financeiras privadas.</p>
        <p><strong>16.2.</strong> A <strong>CONTRATANTE</strong> poderá, a qualquer tempo, solicitar motivadamente a substituição ou retirada de capturas que contenham sua imagem, permanecendo inalterada a prerrogativa de menção à autoria técnica do desenvolvimento.</p>
      </Clausula>

      <Clausula num="17" title="Da Extinção do Contrato">
        <p><strong>17.1. Resilição durante o desenvolvimento:</strong> Antes da homologação final e definitiva do projeto, qualquer das partes poderá resilar imotivadamente o contrato mediante notificação prévia por escrito com antecedência mínima de 15 (quinze) dias corridos. Em caso de encerramento antecipado, os valores devidos pela <strong>CONTRATANTE</strong> serão estritamente proporcionais ao trabalho efetivamente realizado e às etapas comprovadamente entregues até a data da resilição, evitando-se a cobrança automática de 100% do valor quando o projeto ainda não estiver integralmente concluído e aprovado. Para fins de liquidação proporcional justa, adotam-se os seguintes parâmetros balizadores: (a) até a aprovação do design visual e arquitetura de telas: até 30% (trinta por cento) do valor total; (b) durante o desenvolvimento e integração funcional antes da disponibilização para homologação: até 60% (sessenta por cento) do valor total; (c) durante o período de testes e homologação (Cláusula 6.1), antes da aprovação final: valor proporcional ao percentual de recursos comprovadamente entregues e operacionais, limitado a 80% (oitenta por cento) do total enquanto remanescerem ajustes pendentes de conclusão pelo CONTRATADO; e (d) a exigibilidade de 100% (cem por cento) do preço somente ocorrerá após a conclusão integral e homologação definitiva do website (Cláusula 6.1), mantido o cronograma mensal de parcelamento acordado na Cláusula 4. Caso o prazo de entrega da Cláusula 5.1 seja descumprido por culpa exclusiva do <strong>CONTRATADO</strong> e não seja sanado no prazo legal ali previsto, a <strong>CONTRATANTE</strong> poderá resilar o contrato pagando exclusivamente as etapas comprovadamente concluídas e aproveitáveis, sem qualquer multa rescisória ou indenização, com restituição de eventuais quantias pagas a maior em até 10 (dez) dias úteis.</p>
        <p><strong>17.2. Resolução por inadimplemento:</strong> O descumprimento injustificado de qualquer obrigação contratual não sanado no prazo de 10 (dez) dias após notificação escrita autoriza a parte inocente a resolver o contrato de pleno direito (Código Civil, art. 474), sem prejuízo da apuração de perdas e danos comprovados (art. 475).</p>
        <p><strong>17.3. Garantia e suporte:</strong> Homologado o projeto, o <strong>CONTRATADO</strong> não poderá rescindir imotivadamente a garantia de defeitos (Cláusula 6.2) nem o suporte incluído (Cláusula 6.3) antes do término do prazo de 12 meses. O suporte continuado posterior (Cláusula 6.4) seguirá o aviso prévio de 60 dias ali pactuado.</p>
        <p><strong>17.4. Efeitos da extinção:</strong> Em qualquer hipótese de rescisão, o <strong>CONTRATADO</strong>, no prazo de até 10 (dez) dias úteis e mediante a quitação das parcelas vencidas e proporcionais devidas até então (observada a Cláusula 13.2.1), entregará à <strong>CONTRATANTE</strong> o código-fonte atualizado no estado em que se encontrar, credenciais e exportação de mídias, prestando até 2 (duas) horas de transição técnica a outro profissional por ela designado. Nenhuma das partes reterá bens, códigos ou arquivos da outra como mecanismo coercitivo de cobrança.</p>
        <p><strong>17.5.</strong> A morte ou incapacidade permanente de qualquer das partes extingue as obrigações personalíssimas de prestação de serviços continuados (Código Civil, art. 607), resguardados os direitos de propriedade intelectual da Cláusula 13. Na hipótese de morte ou incapacidade permanente do CONTRATADO, fica expressamente garantido à <strong>CONTRATANTE</strong> o fornecimento ou a liberação do código-fonte atualizado, credenciais de acesso, arquivos e documentação técnica necessários para que outro profissional possa assumir e dar plena continuidade ao projeto sem interrupções.</p>
      </Clausula>

      <Clausula num="18" title="Da Segurança da Informação e Gestão de Acessos" highlight>
        <p><strong>18.1.</strong> O <strong>CONTRATADO</strong> adotou as medidas técnicas de segurança descritas no Anexo I, item 05, e prestará correções de vulnerabilidade no código original durante a garantia de 12 meses (Cláusula 6.2). As medidas implementadas reduzem riscos operacionais, mas não consubstanciam garantia de invulnerabilidade absoluta (Cláusula 12.2).</p>
        <p><strong>18.2.</strong> A <strong>CONTRATANTE</strong> é a única responsável pela guarda confidencial de suas senhas, pela ativação obrigatória de autenticação em dois fatores (2FA) em suas contas externas (e-mail, Cloudflare e registro de domínio) e pela segurança lógica e física de seus dispositivos, não correspondendo o 2FA a um recurso do painel administrativo (CMS), salvo inclusão expressa no Anexo I. O <strong>CONTRATADO</strong> não responderá por incidentes decorrentes de senhas fracas, repasse voluntário de credenciais a terceiros, golpes de engenharia social (<em>phishing</em>) ou malwares presentes nos aparelhos da <strong>CONTRATANTE</strong>.</p>
      </Clausula>

      <Clausula num="19" title="Das Disposições Gerais">
        <ContractList items={[
          <>Toda e qualquer alteração a este instrumento será formalizada por aditivo escrito e assinado pelas partes, inclusive pelo meio de aceite eletrônico da Cláusula 19.4;</>,
          <>Notificações, solicitações de suporte, orçamentos e comunicações oficiais são plenamente válidas quando encaminhadas aos e-mails ou números de WhatsApp cadastrados na Cláusula 1;</>,
          <><strong>Cláusula de Substituição Integral:</strong> O presente contrato (Versão Definitiva 1.2) substitui, revoga e cancela integralmente todas as versões, minutas, arquivos PDF anteriores, termos de entrega e entendimentos verbais ou escritos pretéritos sobre o mesmo objeto. Em caso de conflito entre o contrato e o Anexo I, prevalecem as disposições do contrato;</>,
          <><strong>Validade do Aceite Eletrônico:</strong> As partes reconhecem expressamente como plenamente válido, eficaz e dotado de força probatória, nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, o aceite eletrônico colhido na página digital do contrato, acompanhado do registro de carimbo de data/hora, endereço IP, user-agent e hash criptográfico SHA-256 do documento;</>,
          <>A tolerância perante eventual descumprimento temporário constituirá mera liberalidade, não implicando novação ou renúncia de direitos. A nulidade de qualquer disposição não afetará as demais (Código Civil, art. 184). Este contrato não estabelece vínculo trabalhista nem exclusividade comercial entre as partes.</>,
        ]} />
      </Clausula>

      <Clausula num="20" title="Do Foro de Eleição" highlight>
        <p>Para dirimir quaisquer controvérsias decorrentes deste contrato, as partes elegem expressamente o <strong>foro da Circunscrição Judiciária de Brasília/Distrito Federal</strong>, com expressa renúncia a qualquer outro, por mais privilegiado que seja, reconhecendo a natureza civil e empresarial da relação jurídica entre profissionais independentes.</p>
      </Clausula>
    </div>
  );
}
