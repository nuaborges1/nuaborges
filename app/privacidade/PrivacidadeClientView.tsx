/* Vinho maduro / Nua Borges — Política de Privacidade (LGPD + NUA ID + Comércio Direto) */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { DEFAULT_CONTACT_EMAIL, SITE_HOST } from '@/lib/site';

export function PrivacidadeClientView() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const dpoEmail = content.contact?.officialEmail || DEFAULT_CONTACT_EMAIL;

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
            <li className="text-[#C97A8D] font-normal" aria-current="page">
              Privacidade
            </li>
          </ol>
        </nav>

        {/* Masthead */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-[#C97A8D]">
            <span>Compromisso Editorial &amp; Legal</span>
            <span className="text-zinc-700">·</span>
            <span>LGPD</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal tracking-tight leading-[1.12]">
            Política de Privacidade
          </h1>

          <p className="font-serif italic text-base sm:text-lg text-zinc-300 font-normal mt-3 leading-relaxed">
            Transparência integral sobre a sua Minha Conta (Área Privativa), compras diretas, agendamentos e proteção dos seus dados pessoais.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Brasília, DF</span>
            <span className="text-zinc-700">•</span>
            <span>Versão Vigente — Novembro/2026</span>
            <span className="text-zinc-700">•</span>
            <span>Lei Federal nº 13.709/2018 (LGPD)</span>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mt-8" aria-hidden="true" />
        </header>

        <blockquote className="my-10 pl-5 sm:pl-6 border-l-2 border-[#90364B]/70 font-serif italic text-base sm:text-lg text-zinc-200 leading-relaxed">
          &ldquo;A intimidade é um espaço sagrado. Proteger a privacidade e a discrição de quem acompanha meu trabalho é tão essencial quanto a autenticidade e a liberdade da minha arte.&rdquo;
          <footer className="text-[11px] font-sans not-italic text-zinc-500 uppercase tracking-[0.22em] mt-2.5 font-normal">
            — Nua Borges
          </footer>
        </blockquote>

        <div className="space-y-12 text-zinc-300 text-[13.5px] sm:text-[14.5px] leading-[1.8] font-light">
          {/* I. Controlador e Encarregado */}
          <section className="space-y-3.5 pt-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">I.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Identificação do Controlador e do Encarregado (DPO)
              </h2>
            </div>
            <p>
              Esta Política de Privacidade descreve como os dados pessoais são coletados, utilizados, armazenados e protegidos na plataforma oficial de <strong className="text-white font-medium">Nua Borges</strong> (<span className="text-zinc-200 font-mono text-xs">{SITE_HOST}</span>), incluindo sua Área Privativa de Clientes (<span className="text-zinc-200 font-mono text-xs">/conta</span> — Minha Conta), catálogo de packs avulsos, agendamentos de Chamadas VIP e encomendas personalizadas.
            </p>
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#08080c] text-xs space-y-1.5">
              <p><strong className="text-white font-medium">Controlador:</strong> NB PRODUÇÕES DIGITAIS</p>
              <p><strong className="text-white font-medium">CNPJ:</strong> 44.521.360/0001-09 — Brasília, Distrito Federal, Brasil</p>
              <p>
                <strong className="text-white font-medium">Encarregado pelo Tratamento de Dados (DPO):</strong>{' '}
                <span className="font-mono text-zinc-200">{dpoEmail}</span>
              </p>
            </div>
            <p>
              Todo o tratamento de dados observa a <strong className="text-white font-medium">Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)</strong>, o Marco Civil da Internet (Lei nº 12.965/2014) e o princípio da discrição absoluta: jamais vendemos, alugamos ou cedemos dados pessoais para redes de anúncios ou terceiros sem base legal.
            </p>
          </section>

          {/* II. Dados Coletados por Funcionalidade */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">II.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Quais Dados Pessoais Coletamos e Para Quê
              </h2>
            </div>
            <p>
              Aplicamos o princípio da minimização: coletamos apenas os dados necessários para autenticar sua conta, entregar os conteúdos e serviços contratados e cumprir obrigações fiscais e de segurança.
            </p>
            <div className="space-y-4 pl-4 border-l border-white/[0.08] my-4 text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  1. Minha Conta — Área Privativa do Cliente (/conta):
                </strong>
                Endereço de e-mail, nome ou apelido de exibição, preferência de comunicações opcionais (marketing opt-in), data e versão de aceite dos termos, histórico de acessos/dispositivos autenticados (rótulo do navegador e hash irreversível do IP para proteção de sessão) e códigos temporários de autenticação por e-mail (OTP de 6 dígitos, sem senha fixa).
              </div>
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  2. Compra de Packs Avulsos e Cofre Digital:
                </strong>
                E-mail para envio do acesso e vínculo à sua Biblioteca, nome/apelido opcional, identificador do pedido, status de pagamento e registros de direitos de acesso (entitlements) e links temporários assinados para exibição ou download autorizado.
              </div>
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  3. Agendamento de Chamadas VIP por Vídeo:
                </strong>
                Nome ou apelido, e-mail, contato de suporte (WhatsApp ou @Telegram), fuso horário detectado, data/horário reservados, preferências ou observações informadas voluntariamente, status operacional/financeiro, histórico de reagendamentos ou cancelamentos e link privativo da sala de vídeo.
              </div>
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  4. Encomendas de Conteúdos Personalizados:
                </strong>
                Nome ou apelido, contato escolhido para entrega/suporte (e-mail, WhatsApp ou @Telegram), instruções criativas (briefing) enviadas voluntariamente e status de produção/entrega no Cofre Digital ou canal escolhido.
              </div>
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  5. Pagamentos via Pix (Mercado Pago):
                </strong>
                Os pagamentos são processados exclusivamente pela instituição intermediadora <strong className="text-white">Mercado Pago</strong>. Armazenamos apenas referências de conciliação (ID da transação, valor, método Pix, data de aprovação e eventuais estornos). <strong className="text-white">Não coletamos nem armazenamos números de cartão de crédito, senhas bancárias ou chaves privadas.</strong> A identificação exibida no extrato bancário depende da instituição financeira do pagador e da conta recebedora registrada no Mercado Pago — confira sempre os dados no aplicativo antes de confirmar o Pix.
              </div>
              <div>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  6. Contato Institucional, Segurança e Proteção Anti-Abuso:
                </strong>
                Nome, e-mail e mensagem enviados no formulário de contato; verificação anti-bot (Cloudflare Turnstile) em autenticações e formulários; e telemetria técnica agregada com IP mascarado (sem reter endereços IP completos em relatórios).
              </div>
            </div>
          </section>

          {/* III. Bases Legais (Art. 7º LGPD) */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">III.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Bases Legais do Tratamento (Art. 7º da LGPD)
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-[13.5px]">
              <li>
                <strong className="text-white font-medium">Execução de contrato (Art. 7º, V):</strong> criação e manutenção da sua conta privativa, liberação de packs na Biblioteca, agendamento e lembretes de Chamadas VIP, produção e entrega de Personalizados, suporte e processamento de estornos.
              </li>
              <li>
                <strong className="text-white font-medium">Cumprimento de obrigação legal ou regulatória (Art. 7º, II):</strong> guarda de registros fiscais, contábeis e comprovantes de transações financeiras, bem como registros mínimos exigidos pelo Marco Civil da Internet.
              </li>
              <li>
                <strong className="text-white font-medium">Legítimo interesse e proteção ao crédito/segurança (Art. 7º, IX e X):</strong> prevenção a fraudes, chargebacks, acessos indevidos, defesa de direitos autorais e auditoria de segurança das sessões.
              </li>
              <li>
                <strong className="text-white font-medium">Consentimento (Art. 7º, I):</strong> envio de novidades opcionais de marketing (desativado por padrão e revogável com 1 clique em <span className="font-mono text-xs">/conta?tab=perfil</span>) e confirmação voluntária de maioridade (+18).
              </li>
            </ul>
          </section>

          {/* IV. Cookies e Armazenamento Local */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">IV.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Cookies Estritamente Necessários e Armazenamento Local
              </h2>
            </div>
            <p>
              <strong className="text-white font-medium">Não utilizamos cookies de publicidade comportamental de terceiros nem pixels invasivos de rastreamento entre sites.</strong> Os cookies e recursos de navegador empregados são estritamente técnicos e necessários ao funcionamento seguro da plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs sm:text-[13px]">
              <li>
                <span className="font-mono text-zinc-200">__Host-nua_id_session</span> (Cookie <span className="font-mono">HttpOnly, Secure, SameSite=Lax</span>): mantém sua sessão autenticada na Área Privativa (Minha Conta) com isolamento contra leitura por scripts.
              </li>
              <li>
                <span className="font-mono text-zinc-200">nua_id_hint</span> (Cookie técnico leve): indica visualmente ao navegador que existe sessão ativa para evitar verificações redundantes na navegação pública.
              </li>
              <li>
                <span className="font-mono text-zinc-200">localStorage / sessionStorage</span>: guarda a confirmação de maioridade (+18), preferências de volume do reprodutor editorial, identificador local de dispositivo para conciliação de compras avulsas e cache de rascunho administrativo.
              </li>
              <li>
                <strong className="text-zinc-200 font-medium">Cloudflare Turnstile:</strong> desafio invisível anti-bot usado pontualmente no login da conta e formulários para impedir envios automatizados abusivos.
              </li>
            </ul>
          </section>

          {/* V. E-mails Transacionais e Lembretes */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">V.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                E-mails Transacionais, Notificações e Lembretes
              </h2>
            </div>
            <p>
              Utilizamos seu endereço de e-mail exclusivamente para comunicações essenciais ligadas à sua conta ou pedido, todas com assunto discreto:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs sm:text-[13px]">
              <li>Códigos de acesso único (OTP) para entrada ou alteração de e-mail na sua conta;</li>
              <li>Confirmação de pagamento, recibo discreto e liberação de acesso a Packs, Chamadas VIP e Personalizados;</li>
              <li>Lembretes automáticos no dia e próximo ao horário de Chamadas VIP confirmadas, além de avisos sobre link da sala, propostas de reagendamento ou cancelamentos;</li>
              <li>Alertas de segurança sobre novos acessos à sua conta.</li>
            </ul>
            <p className="text-xs text-zinc-400">
              Mensagens promocionais opcionais somente são enviadas se você ativar expressamente a opção de comunicações em seu perfil.
            </p>
          </section>

          {/* VI. Operadores e Transferência Internacional */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">VI.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Compartilhamento com Operadores e Transferência Internacional (Art. 33 LGPD)
              </h2>
            </div>
            <p>
              Para operar a plataforma com segurança, alta disponibilidade e criptografia em trânsito (TLS), contamos com provedores de infraestrutura que atuam como operadores sob nossas instruções:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs sm:text-[13px]">
              <li><strong className="text-zinc-200 font-medium">Cloudflare:</strong> hospedagem de borda, proteção DDoS, Workers/Pages Functions e desafio anti-bot Turnstile;</li>
              <li><strong className="text-zinc-200 font-medium">Supabase:</strong> banco de dados PostgreSQL gerenciado e serviço de identidade/autenticação;</li>
              <li><strong className="text-zinc-200 font-medium">Backblaze B2:</strong> armazenamento privado de mídias entregues exclusivamente via links assinados temporários;</li>
              <li><strong className="text-zinc-200 font-medium">Mercado Pago:</strong> processamento financeiro de pagamentos Pix e estornos;</li>
              <li><strong className="text-zinc-200 font-medium">Hostinger SMTP:</strong> envio autenticado dos e-mails transacionais do domínio oficial;</li>
              <li><strong className="text-zinc-200 font-medium">Google Meet / Jitsi / Telegram:</strong> sala de vídeo escolhida para realização das Chamadas VIP ou entrega opcional de Personalizados quando selecionada pelo cliente.</li>
            </ul>
            <p className="text-xs text-zinc-400">
              Alguns desses operadores mantêm servidores fora do território brasileiro (como Estados Unidos e União Europeia). A transferência internacional ocorre com fundamento no Art. 33 da LGPD, adotando salvaguardas técnicas (criptografia, controle estrito de acesso e minimização de dados) e cláusulas contratuais adequadas.
            </p>
          </section>

          {/* VII. Prazos de Retenção e Segurança */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">VII.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Retenção de Dados e Medidas de Segurança
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-zinc-300 text-xs sm:text-[13.5px]">
              <li>
                <strong className="text-white font-medium">Dados da sua conta:</strong> mantidos enquanto a conta permanecer ativa. Caso você solicite o encerramento e anonimização em <span className="font-mono text-xs">/conta?tab=perfil</span>, seus dados identificáveis (e-mail, nome, telefone e briefing) são anonimizados e todas as sessões são encerradas imediatamente.
              </li>
              <li>
                <strong className="text-white font-medium">Registros fiscais e financeiros:</strong> identificadores de transação, valores e datas de pagamento/estorno são retidos pelo prazo legal de <strong className="text-white font-medium">5 (cinco) anos</strong> (legislação tributária e Código de Defesa do Consumidor), sem vínculo identificável após eventual anonimização da conta.
              </li>
              <li>
                <strong className="text-white font-medium">Códigos OTP e sessões:</strong> códigos de acesso expiram automaticamente em poucos minutos e são armazenados apenas em formato criptografado (hash); sessões inativas expiram automaticamente e podem ser revogadas pelo titular a qualquer instante.
              </li>
            </ul>
          </section>

          {/* VIII. Direitos do Titular */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">VIII.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Seus Direitos como Titular (Art. 18 da LGPD)
              </h2>
            </div>
            <p>
              Você pode exercer seus direitos de forma gratuita e direta — muitos deles de maneira imediata na aba <Link href="/conta?tab=perfil" className="text-[#C97A8D] underline underline-offset-2 hover:text-white transition-colors">Perfil &amp; Segurança da Minha Conta</Link>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px] pt-2">
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Confirmação, Acesso &amp; Portabilidade</span>
                <span className="text-zinc-400">Exporte em 1 clique um arquivo JSON completo com seu perfil, pedidos, biblioteca, agendamentos e eventos de segurança.</span>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Correção &amp; Atualização</span>
                <span className="text-zinc-400">Atualize seu nome de exibição, preferências de comunicação ou solicite a troca verificada do e-mail da conta.</span>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Anonimização &amp; Encerramento</span>
                <span className="text-zinc-400">Encerre sua conta diretamente no painel (quando não houver serviços pagos em andamento), anonimizando seus dados pessoais.</span>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Revogação &amp; Oposição</span>
                <span className="text-zinc-400">Desative comunicações opcionais, encerre sessões de outros dispositivos ou solicite informações ao DPO a qualquer momento.</span>
              </div>
            </div>
          </section>

          {/* IX. Canal do DPO e Atualizações */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#C97A8D] font-normal tracking-wider">IX.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Canal Oficial de Atendimento &amp; Encarregado (DPO)
              </h2>
            </div>
            <p>
              Para dúvidas sobre privacidade, requisições de direitos LGPD ou solicitações relacionadas a compras como visitante sem conta cadastrada, fale diretamente com nosso Encarregado pelo Tratamento de Dados:
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="px-6 py-2.5 rounded-full border border-[#7A293D]/60 bg-[#431322]/45 hover:bg-[#661C30] text-[#F5EEE9] transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-[0_2px_12px_rgba(67,19,34,0.25)]"
              >
                Abrir Canal de Contato
              </button>
              <span className="text-xs font-mono text-zinc-400">{dpoEmail}</span>
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
            <Link href="/termos" className="hover:text-[#C97A8D] transition-colors">
              Termos de Uso
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
