'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { usePublishedContent } from '@/lib/contentStore';
import { SITE_HOST } from '@/lib/site';

export function TermosClientView() {
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
              Termos de Uso
            </li>
          </ol>
        </nav>

        {/* Masthead do Documento */}
        <header className="mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.28em] text-[#f4a7b9]">
            <span>Manifesto Autoral & Condições de Uso</span>
            <span className="text-zinc-700">·</span>
            <span>Lei nº 9.610/98</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal tracking-tight leading-[1.12]">
            Termos de Uso
          </h1>

          <p className="font-serif italic text-base sm:text-lg text-zinc-300 font-normal mt-3 leading-relaxed">
            A preservação da arte, da dignidade corporal e da propriedade intelectual.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span>Brasília, DF</span>
            <span className="text-zinc-700">•</span>
            <span>Versão Vigente — 2026</span>
            <span className="text-zinc-700">•</span>
            <span>República Federativa do Brasil</span>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent mt-8" aria-hidden="true" />
        </header>

        {/* Citação Editorial / Pull Quote */}
        <blockquote className="my-10 pl-5 sm:pl-6 border-l-2 border-[#f4a7b9]/70 font-serif italic text-base sm:text-lg text-zinc-200 leading-relaxed">
          &ldquo;O corpo e a obra de uma artista não constituem matéria pública para apropriação indevida ou clonagem algorítmica. O respeito à criação é a primeira condição de quem aprecia a liberdade.&rdquo;
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
                Natureza e Finalidade Deste Espaço
              </h2>
            </div>
            <p>
              O presente website (<span className="text-zinc-200 font-mono text-xs">{SITE_HOST}</span>) constitui o ambiente editorial oficial de <strong className="text-white font-medium">Nua Borges</strong> — educadora sexual, sexóloga em formação e modelo autoral.
            </p>
            <p>
              Ao navegar por estas páginas, você concorda de maneira livre e informada com estes Termos de Uso e com nossa Política de Privacidade. A continuidade da navegação reflete o compromisso mútuo com o respeito à obra artística, à legislação brasileira e às regras de convivência ética aqui delineadas.
            </p>
          </section>

          {/* Seção II */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">II.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Propriedade Intelectual e Proteção Autoral Estrita
              </h2>
            </div>
            <p>
              Todo e qualquer conteúdo disponível nesta plataforma — incluindo ensaios fotográficos, retratos, vídeos, textos poéticos e ensaísticos, arranjos sonoros, design de interface, marcas e tipografia — constitui propriedade intelectual protegida nos termos da <strong className="text-white font-medium">Lei Federal nº 9.610/1998 (Lei de Direitos Autorais)</strong> e do Artigo 5º, incisos XXVII e XXVIII da <strong className="text-white font-medium">Constituição da República Federativa do Brasil</strong>.
            </p>
            <p>
              A exibição visual de tais obras neste portal possui finalidade estritamente contemplativa e promocional da carreira da titular. A concessão de acesso ao website não transfere nem licencia, sob qualquer pretexto, qualquer direito patrimonial ou moral sobre os materiais exibidos.
            </p>
          </section>

          {/* Seção III */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">III.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Vedações Expressas: Pirataria, Inteligência Artificial e Deepfakes
              </h2>
            </div>
            <p>
              Em razão da natureza autoral e íntima da imagem de Nua Borges, são terminantemente proibidas as seguintes condutas:
            </p>
            <div className="space-y-3 pl-4 border-l border-white/[0.08] my-4 text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  1. Download, Gravação de Tela e Redistribuição Não Autorizada:
                </strong>
                É vedado copiar, gravar telas, fazer downloads não licenciados, redistribuir em grupos de mensagens (como Telegram ou WhatsApp), fóruns da internet ou revender qualquer fragmento de imagem ou vídeo disponibilizado nesta plataforma.
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  2. Treinamento de Modelos de Inteligência Artificial & Clonagem Visual:
                </strong>
                É expressamente proibido utilizar qualquer fotografia, traço fisionômico, voz ou imagem de Nua Borges como dado de entrada para treinamento ou ajuste fino de modelos de aprendizado de máquina, redes neurais generativas, difusores visuais ou criação de representações sintéticas (deepfakes).
              </p>
              <p>
                <strong className="text-zinc-100 font-medium font-serif italic text-sm block mb-0.5">
                  3. Extração Automatizada (Scraping):
                </strong>
                É proibido o emprego de robôs, crawlers, spiders ou rotinas automatizadas para indexação em lote, captura massiva ou raspagem de conteúdo.
              </p>
            </div>
            <p className="text-xs text-zinc-400">
              A transgressão dessas normas sujeita os infratores à responsabilização civil por perdas e danos e danos morais, bem como às penalidades criminais previstas no Artigo 184 do Código Penal Brasileiro e legislações correlatas de proteção à dignidade da mulher.
            </p>
          </section>

          {/* Seção IV */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">IV.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Maioridade Legal e Conteúdo Exclusivo
              </h2>
            </div>
            <p>
              Esta plataforma institucional contempla seções informativas sobre educação sexual e ensaios artísticos com classificação indicativa restrita a <strong className="text-white font-medium">maiores de 18 (dezoito) anos</strong> ou idade legal estipulada pela legislação de seu país de residência.
            </p>
            <p>
              Ao acionar botões que direcionam para canais sensuais ou exclusivos (como o OnlyFans), o visitante declara, sob as penas da lei, possuir plena capacidade civil e maioridade penal para acessar materiais de teor adulto e erotismo consensual.
            </p>
          </section>

          {/* Seção V */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">V.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Conduta Ética, Integridade e Convivência
              </h2>
            </div>
            <p>
              Esperamos de todos os membros e visitantes uma postura ética, respeitosa e madura. São condutas inaceitáveis em quaisquer canais vinculados a esta plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs sm:text-[13px]">
              <li>Praticar qualquer modalidade de importunação sexual, assédio moral, misoginia, transfobia ou discriminação;</li>
              <li>Utilizar canais de contato comercial para fins de difamação, injúria ou solicitações ilícitas;</li>
              <li>Tentar explorar vulnerabilidades de código, violar credenciais de acesso ou comprometer a integridade dos servidores.</li>
            </ul>
          </section>

          {/* Seção VI */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">VI.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Serviços Parceiros e Limitações de Responsabilidade
              </h2>
            </div>
            <p>
              Este website atua como vitrine oficial e portal institucional. Serviços de assinatura mensal, compras de conteúdo fechado e transações financeiras realizadas via OnlyFans são processados integralmente por aquela entidade internacional, sob suas próprias regras comerciais de faturamento e suporte ao assinante.
            </p>
            <p>
              Nua Borges não se responsabiliza por eventuais interrupções temporárias de infraestrutura decorrentes de falhas em provedores de telecomunicações, serviços de roteamento global ou manutenções de rede alheias à nossa gestão direta.
            </p>
          </section>

          {/* Seção VII */}
          <section className="space-y-3.5 pt-6 border-t border-white/[0.07]">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-sm text-[#f4a7b9] font-normal tracking-wider">VII.</span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Foro de Eleição e Legislação Vigente
              </h2>
            </div>
            <p>
              Estes Termos de Uso são regidos e interpretados em conformidade com o ordenamento jurídico da República Federativa do Brasil.
            </p>
            <p>
              Para dirimir quaisquer controvérsias oriundas do uso desta plataforma ou de violações a direitos autorais aqui descritos, as partes elegem o <strong className="text-white font-medium">Foro da Circunscrição Judiciária de Brasília, Distrito Federal</strong>, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="px-6 py-2.5 rounded-full border border-[#f4a7b9]/40 bg-[#f4a7b9]/10 hover:bg-[#f4a7b9] text-[#f4a7b9] hover:text-zinc-950 transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Dúvidas ou Esclarecimentos
              </button>
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
            <Link href="/privacidade" className="hover:text-[#f4a7b9] transition-colors">
              Política de Privacidade
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
