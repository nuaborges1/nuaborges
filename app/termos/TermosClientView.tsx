/* Vinho maduro / Nua Borges — Termos de Uso (Comércio Direto, NUA ID, Chamadas VIP e Personalizados) */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { DEFAULT_CONTACT_EMAIL, SITE_HOST } from '@/lib/site';

export function TermosClientView() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const officialEmail = content.contact?.officialEmail || DEFAULT_CONTACT_EMAIL;

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-[#661C30] selection:text-white flex flex-col font-sans relative">
      <PublicBackground />

      <Header
        onOpenContact={() => setContactModalOpen(true)}
        customHeaderData={content?.header}
      />

      <main className="flex-1 max-w-[48rem] mx-auto px-5 sm:px-8 pt-32 sm:pt-36 pb-20 sm:pb-24 relative z-10 w-full">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-light">
            <li>
              <Link href="/#inicio" className="hover:text-zinc-300 transition-colors">
                Nua Borges
              </Link>
            </li>
            <li className="text-zinc-700">/</li>
            <li className="text-zinc-400">Institucional</li>
            <li className="text-zinc-700">/</li>
            <li className="text-[#F5EEE9]/80 font-normal" aria-current="page">
              Termos de Uso
            </li>
          </ol>
        </nav>

        {/* Masthead */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-[#F5EEE9]/80">
            <span>Condições de Uso &amp; Propriedade Autoral</span>
            <span className="text-zinc-700">·</span>
            <span>Lei nº 9.610/98</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal tracking-tight leading-[1.12]">
            Termos de Uso
          </h1>

          <p className="font-serif italic text-base sm:text-lg text-zinc-300 font-normal mt-3 leading-relaxed">
            Regras claras para navegação, Minha Conta (Área Privativa), conteúdos exclusivos, Chamadas VIP, encomendas personalizadas e proteção autoral.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>NB Produções Digitais · CNPJ 44.521.360/0001-09</span>
            <span className="text-zinc-700">•</span>
            <span>Versão Vigente — Novembro/2026</span>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mt-8" aria-hidden="true" />
        </header>

        <blockquote className="my-10 pl-5 sm:pl-6 border-l-2 border-[#90364B]/70 font-serif italic text-base sm:text-lg text-zinc-200 leading-relaxed">
          &ldquo;O corpo e a obra de uma artista não constituem matéria pública para apropriação indevida ou clonagem algorítmica. O respeito à criação é a primeira condição de quem aprecia a liberdade.&rdquo;
          <footer className="text-[11px] font-sans not-italic text-zinc-500 uppercase tracking-[0.22em] mt-2.5 font-normal">
            — Nua Borges
          </footer>
        </blockquote>

        <div className="space-y-12 text-zinc-300 text-[13.5px] sm:text-[14.5px] leading-[1.8] font-light">
          {/* I. Objeto e Operação */}
          <section className="space-y-3.5 pt-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">I.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Identificação, Objeto e Aceite
              </h2>
            </div>
            <p>
              A plataforma oficial <span className="text-zinc-200 font-mono text-xs">{SITE_HOST}</span> é operada por <strong className="text-white font-medium">NB PRODUÇÕES DIGITAIS</strong> (CNPJ <span className="font-mono text-xs">44.521.360/0001-09</span>, Brasília/DF) e reúne o acervo editorial de <strong className="text-white font-medium">Nua Borges</strong> bem como a oferta direta de produtos e experiências digitais exclusivas: <strong className="text-white font-medium">Packs Avulsos</strong>, <strong className="text-white font-medium">Chamadas VIP por Vídeo</strong> e <strong className="text-white font-medium">Conteúdos Personalizados</strong>, integrados à sua <strong className="text-white font-medium">Minha Conta (Área Privativa)</strong>.
            </p>
            <p>
              Ao acessar o site, autenticar-se em sua conta ou contratar qualquer produto/serviço, você declara ser maior de 18 anos, possuir plena capacidade civil e concordar integralmente com estes Termos de Uso e com nossa{' '}
              <Link href="/privacidade" className="text-[#90364B] underline underline-offset-2 hover:text-white transition-colors">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          {/* II. Conta Privativa do Cliente */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">II.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Minha Conta (Área Privativa do Cliente)
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-[13.5px]">
              <li>
                A conta privativa (<span className="font-mono text-xs">/conta</span>) é pessoal, individual e intransferível, autenticada por código temporário enviado ao seu e-mail (OTP).
              </li>
              <li>
                Você é responsável por manter o acesso ao seu e-mail protegido e jamais compartilhar links privativos, códigos de verificação ou credenciais de sessão com terceiros.
              </li>
              <li>
                Compras realizadas como visitante podem ser vinculadas posteriormente à sua conta mediante validação do código do pedido e titularidade do e-mail.
              </li>
              <li>
                Podemos suspender temporariamente ou encerrar contas em caso de violação destes Termos, tentativa de pirataria, fraude financeira, chargeback indevido ou conduta abusiva.
              </li>
            </ul>
          </section>

          {/* III. Licença de Uso, Packs Avulsos e Propriedade Intelectual */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">III.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Propriedade Intelectual, Licença Pessoal e Vedações Expressas
              </h2>
            </div>
            <p>
              Todo conteúdo disponibilizado nesta plataforma — fotografias, vídeos, áudios, textos, identidade visual, marcas e materiais exclusivos — é protegido pela <strong className="text-white font-medium">Lei nº 9.610/1998 (Lei de Direitos Autorais)</strong> e pelo direito constitucional à imagem.
            </p>
            <p>
              Ao adquirir um Pack Avulso ou Conteúdo Personalizado, você recebe uma <strong className="text-white font-medium">licença limitada, pessoal, não exclusiva e intransferível</strong> para visualização privada — e download pessoal somente nos itens em que o botão de download estiver expressamente habilitado na sua Biblioteca ou Cofre Digital.
            </p>
            <div className="space-y-3 pl-4 border-l border-white/[0.08] my-4 text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  1. Proibição Absoluta de Vazamento, Revenda e Gravação de Chamadas:
                </strong>
                É estritamente proibido redistribuir, publicar, revender, compartilhar em grupos (Telegram, WhatsApp, Discord, fóruns ou redes sociais), gravar a tela ou capturar áudio/vídeo das Chamadas VIP ou de conteúdos fechados.
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  2. Proibição de Inteligência Artificial &amp; Deepfakes:
                </strong>
                É expressamente vedado utilizar qualquer foto, vídeo, voz ou traço fisionômico de Nua Borges para treinar, ajustar ou alimentar modelos de inteligência artificial, geradores de imagem/vídeo ou criação de conteúdos sintéticos (deepfakes).
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  3. Proibição de Scraping e Acesso Automatizado:
                </strong>
                É proibido utilizar robôs, scripts ou ferramentas de raspagem para coletar, indexar em lote ou copiar arquivos da plataforma.
              </p>
            </div>
            <p className="text-xs text-zinc-400">
              Violações sujeitam o infrator à revogação imediata dos acessos, responsabilização civil por danos materiais e morais e representação criminal (Art. 184 e Art. 218-C do Código Penal Brasileiro).
            </p>
          </section>

          {/* IV. Chamadas VIP por Vídeo */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">IV.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Regras das Chamadas VIP por Vídeo
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-[13.5px]">
              <li>
                <strong className="text-white font-medium">Confirmação e Reserva:</strong> o horário escolhido fica pré-reservado durante o prazo de pagamento Pix. A reserva só é confirmada após a compensação do pagamento.
              </li>
              <li>
                <strong className="text-white font-medium">Fuso Horário e Pontualidade:</strong> o horário oficial exibido no voucher e na sua conta indica tanto o fuso da agenda quanto o horário de Brasília. Recomenda-se ingressar na sala privativa com 5 minutos de antecedência; tolerância padrão de 10 minutos. Ausência injustificada após a tolerância caracteriza não comparecimento.
              </li>
              <li>
                <strong className="text-white font-medium">Sigilo e Conduta:</strong> é terminantemente proibido gravar, fotografar a tela ou transmitir a chamada. Comportamento desrespeitoso, assédio ou violação de limites resulta no encerramento imediato da chamada sem direito a reembolso.
              </li>
              <li>
                <strong className="text-white font-medium">Reagendamento e Cancelamento:</strong> solicitações de reagendamento ou cancelamento podem ser registradas pelo voucher ou pela Área Privativa. Caso a administração proponha um novo horário, o cliente pode aceitar ou recusar diretamente na plataforma; cancelamentos aprovados com estorno são devolvidos via Mercado Pago na mesma origem Pix.
              </li>
            </ul>
          </section>

          {/* V. Conteúdos Personalizados */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">V.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Regras das Encomendas Personalizadas
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-[13.5px]">
              <li>
                Cada encomenda é produzida sob medida conforme o briefing aprovado e os limites editoriais informados na página de pedido. Pedidos que violem a lei, envolvam terceiros sem consentimento ou ultrapassem os limites da criadora poderão ser recusados com estorno integral.
              </li>
              <li>
                O prazo estimado de entrega passa a contar após a confirmação do pagamento Pix. A entrega é disponibilizada no Cofre Digital vinculado à sua conta ou pelo canal de entrega escolhido.
              </li>
              <li>
                Por se tratar de produção digital personalizada sob encomenda, uma vez iniciada a produção ou entregue o material conforme o briefing, não cabem alterações fora do escopo contratado.
              </li>
            </ul>
          </section>

          {/* VI. Pagamentos, Estornos e Revogação */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">VI.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Pagamentos, Revogação Automática e Serviços Externos
              </h2>
            </div>
            <p>
              Os pagamentos diretos nesta plataforma são processados via Pix pelo <strong className="text-white font-medium">Mercado Pago</strong>. Em caso de estorno, cancelamento aprovado ou contestação financeira (chargeback), os direitos de acesso (entitlements) vinculados ao pedido são revogados automaticamente na Biblioteca do cliente.
            </p>
            <p>
              Links externos para plataformas parceiras (como Instagram ou OnlyFans) direcionam para ecossistemas independentes, regidos pelos seus próprios termos comerciais e políticas de privacidade.
            </p>
          </section>

          {/* VII. Maioridade e Foro */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#F5EEE9]/80 font-normal tracking-wider">VII.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Maioridade (+18), Alterações e Foro de Eleição
              </h2>
            </div>
            <p>
              Este ambiente é estritamente restrito a <strong className="text-white font-medium">maiores de 18 (dezoito) anos</strong>. Podemos atualizar estes Termos periodicamente para refletir evoluções legais ou novas funcionalidades, mantendo sempre a data da versão vigente no topo desta página.
            </p>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Ressalvadas as garantias legais de foro previstas no Código de Defesa do Consumidor, fica eleito o <strong className="text-white font-medium">Foro da Circunscrição Judiciária de Brasília, Distrito Federal</strong> para dirimir controvérsias relacionadas a esta plataforma.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="px-6 py-2.5 rounded-full border border-[#7A293D]/60 bg-[#431322]/45 hover:bg-[#661C30] text-[#F5EEE9] transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-[0_2px_12px_rgba(67,19,34,0.25)]"
              >
                Dúvidas ou Esclarecimentos
              </button>
              <span className="text-xs font-mono text-zinc-400">{officialEmail}</span>
            </div>
          </section>
        </div>

        {/* Rodapé Interno */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <Link href="/#inicio" className="hover:text-white transition-colors flex items-center gap-1.5">
            <span>←</span>
            <span>Retornar ao início da plataforma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/privacidade" className="hover:text-[#F5EEE9] transition-colors">
              Política de Privacidade
            </Link>
            <span className="text-zinc-700">•</span>
            <span>NB Produções Digitais © {new Date().getFullYear()}</span>
          </div>
        </div>
      </main>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content?.contact}
      />

      <Footer
        customFooterData={content?.footer}
        customInstitutionalData={content?.institutional}
        customChannelsData={content?.channels}
      />
    </div>
  );
}
