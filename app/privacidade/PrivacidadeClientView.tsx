'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { usePublishedContent } from '@/lib/contentStore';

export function PrivacidadeClientView() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-[#f4a7b9] selection:text-black flex flex-col font-sans">
      {/* Glow sutil editorial de fundo */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[760px] h-[380px] bg-[#f4a7b9]/[0.025] rounded-full blur-[160px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Header oficial da plataforma */}
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        customHeaderData={content?.header}
      />

      {/* Conteúdo Editorial */}
      <main className="flex-1 max-w-[46rem] mx-auto px-5 sm:px-8 pt-32 sm:pt-36 pb-20 sm:pb-24 relative z-10 w-full">
        {/* Breadcrumb sutil */}
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
            <li className="text-[#f4a7b9] font-normal" aria-current="page">
              Privacidade
            </li>
          </ol>
        </nav>

        {/* Masthead do Documento */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-[#f4a7b9]">
            <span>Compromisso Editorial & Legal</span>
            <span className="text-zinc-700">·</span>
            <span>LGPD</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal tracking-tight leading-[1.12]">
            Política de Privacidade
          </h1>

          <p className="font-serif italic text-base sm:text-lg text-zinc-300 font-normal mt-3 leading-relaxed">
            A intimidade, a confiança e a proteção dos seus dados em cada detalhe.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Brasília, DF</span>
            <span className="text-zinc-700">•</span>
            <span>Versão Vigente — 2026</span>
            <span className="text-zinc-700">•</span>
            <span>Lei Federal nº 13.709/2018</span>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mt-8" aria-hidden="true" />
        </header>

        {/* Citação Editorial / Pull Quote */}
        <blockquote className="my-10 pl-5 sm:pl-6 border-l-2 border-[#f4a7b9]/70 font-serif italic text-base sm:text-lg text-zinc-200 leading-relaxed">
          &ldquo;A intimidade é um espaço sagrado. Proteger a privacidade e a discrição de quem acompanha meu trabalho é tão essencial quanto a autenticidade e a liberdade da minha arte.&rdquo;
          <footer className="text-[11px] font-sans not-italic text-zinc-500 uppercase tracking-[0.22em] mt-2.5 font-normal">
            — Nua Borges
          </footer>
        </blockquote>

        {/* Texto Editorial Contínuo */}
        <div className="space-y-12 text-zinc-300 text-[13.5px] sm:text-[14.5px] leading-[1.8] font-light">
          {/* Seção I */}
          <section className="space-y-3.5 pt-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">I.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Transparência e Princípios Fundamentais
              </h2>
            </div>
            <p>
              A presente Política de Privacidade estabelece as diretrizes de tratamento, proteção e confidencialidade das informações tratadas no âmbito do website oficial de <strong className="text-white font-medium">Nua Borges</strong> (<span className="text-zinc-200 font-mono text-xs">nuaborges.phstatic.com.br</span>).
            </p>
            <p>
              Nossa atuação é orientada pelo respeito integral à dignidade humana, à autodeterminação informativa e à inviolabilidade da intimidade, em rigorosa conformidade com a <strong className="text-white font-medium">Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018 — LGPD)</strong> e o Marco Civil da Internet (Lei nº 12.965/2014).
            </p>
            <p>
              Aqui vigora o princípio da discrição absoluta: não comercializamos, não alugamos e jamais compartilhamos qualquer informação pessoal com terceiros para fins publicitários ou mercadológicos.
            </p>
          </section>

          {/* Seção II */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">II.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Que Informações Coletamos (e o que jamais coletamos)
              </h2>
            </div>
            <p>
              Acreditamos na minimização de dados: coletamos apenas o estritamente necessário para viabilizar sua experiência e nosso contato.
            </p>
            <div className="space-y-3 pl-4 border-l border-white/[0.08] my-4 text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  1. Comunicação Direta Voluntária:
                </strong>
                Ao enviar uma proposta de parceria, convite para palestra ou mensagem via assessoria de contato, seu nome, endereço de e-mail e teor da mensagem são utilizados unicamente para formular uma resposta adequada ao seu interesse.
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  2. Registros Técnicos e Segurança da Conexão:
                </strong>
                Para defender a plataforma contra abusos cibernéticos, ataques de negação de serviço e sobrecarga de infraestrutura, nossa rede de entrega de conteúdo (Cloudflare) processa métricas técnicas essenciais (endereço IP anonimizado, versão do navegador e horário de acesso).
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-1">
                  3. O que JAMAIS Coletamos:
                </strong>
                Este website não armazena dados de cartões de crédito, dados bancários, nem executa perfilamento comportamental invasivo de sua vida pessoal.
              </p>
            </div>
          </section>

          {/* Seção III */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">III.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Preferências Locais e Ausência de Rastreamento Invasivo
              </h2>
            </div>
            <p>
              Valorizamos uma navegação sem vigilância. Nosso website <strong className="text-white font-medium">não utiliza cookies de terceiros para publicidade direcionada</strong> nem rastreadores invasivos que monitorem seus passos em outros sites.
            </p>
            <p>
              Utilizamos recursos estritamente técnicos de armazenamento no dispositivo do usuário (<span className="text-zinc-300 font-mono text-xs">localStorage</span> e <span className="text-zinc-300 font-mono text-xs">sessionStorage</span>) para finalidades exclusivamente utilitárias:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs sm:text-[13px]">
              <li>Lembrar o volume de som preferido do reprodutor musical editorial;</li>
              <li>Manter a reprodução contínua e serena da trilha sonora enquanto você navega entre as páginas do site;</li>
              <li>Garantir a integridade da sessão aos administradores devidamente credenciados.</li>
            </ul>
            <p className="text-xs text-zinc-500 pt-1">
              Esses dados residem exclusivamente no seu próprio navegador e podem ser apagados por você a qualquer momento na limpeza de dados de navegação do seu software.
            </p>
          </section>

          {/* Seção IV */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">IV.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Canais Externos e Transição para Ambientes de Terceiros
              </h2>
            </div>
            <p>
              A plataforma oficial de Nua Borges disponibiliza conexões oficiais para seus canais no <strong className="text-white font-medium">Instagram</strong> e <strong className="text-white font-medium">OnlyFans</strong>.
            </p>
            <p>
              Ao acionar links que redirecionam a esses serviços, você passa a interagir diretamente com as infraestruturas de tais corporações internacionais, as quais mantêm termos de serviço e políticas de privacidade próprios e independentes deste website.
            </p>
            <p>
              Recomendamos a consulta aos termos dessas respectivas plataformas para compreender como seus dados cadastrais e financeiros são tratados em seus ecossistemas.
            </p>
          </section>

          {/* Seção V */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">V.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Seus Direitos como Titular de Dados
              </h2>
            </div>
            <p>
              Nos termos do Artigo 18 da Lei Geral de Proteção de Dados (LGPD), você detém controle sobre suas informações pessoais e pode exercer, a qualquer tempo e sem custos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-[13px] pt-2">
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Confirmação & Acesso</span>
                <span className="text-zinc-400">Direito de saber se realizamos o tratamento de dados pessoais sobre você e solicitar cópia dos mesmos.</span>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Correção & Atualização</span>
                <span className="text-zinc-400">Direito de retificar informações incompletas, imprecisas ou desatualizadas.</span>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Exclusão & Anonimização</span>
                <span className="text-zinc-400">Direito de solicitar a exclusão de dados pessoais fornecidos mediante consentimento anterior.</span>
              </div>
              <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <span className="text-white font-medium block mb-0.5">Revogação do Consentimento</span>
                <span className="text-zinc-400">Direito de retirar autorizações de contato a qualquer instante de forma simples e direta.</span>
              </div>
            </div>
          </section>

          {/* Seção VI */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">VI.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Canal Oficial de Atendimento & Encarregado
              </h2>
            </div>
            <p>
              Para esclarecer dúvidas sobre esta Política, solicitar esclarecimentos técnicos ou exercer qualquer dos direitos previstos na legislação, você pode acionar diretamente nossa assessoria através do modal oficial de contato da plataforma ou pelo e-mail institucional:
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="px-6 py-2.5 rounded-full border border-[#f4a7b9]/40 bg-[#f4a7b9]/10 hover:bg-[#f4a7b9] text-[#f4a7b9] hover:text-zinc-950 transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Abrir Canal de Contato
              </button>
              <span className="text-xs font-mono text-zinc-400">
                contato@nuaborges.phstatic.com.br
              </span>
            </div>
          </section>
        </div>

        {/* Rodapé Interno do Documento */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <Link
            href="/#inicio"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Retornar ao início da plataforma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/termos" className="hover:text-[#f4a7b9] transition-colors">
              Termos de Uso
            </Link>
            <span className="text-zinc-700">•</span>
            <span>Nua Borges © {new Date().getFullYear()}</span>
          </div>
        </div>
      </main>

      {/* Modal de contato integrado */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content?.contact}
      />

      {/* Footer oficial da plataforma */}
      <Footer
        customFooterData={content?.footer}
        customInstitutionalData={content?.institutional}
      />
    </div>
  );
}
