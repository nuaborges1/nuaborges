/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Clock,
  ShieldCheck,
  Lock,
  Heart,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronDown,
  Crown,
  Camera,
  Sliders,
  Instagram,
  Mail,
  EyeOff,
  Calendar,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { usePublishedContent } from '@/lib/contentStore';

interface ChamadaFaqItem {
  question: string;
  answer: string;
}

const CHAMADAS_INFO_FAQS: ChamadaFaqItem[] = [
  {
    question: 'As chamadas são de conteúdo sexual explícito?',
    answer:
      'Não. As chamadas privativas têm foco em companhia, conversa autoral, troca intimista e sensualidade elegante e sugerida — não se trata de chamadas sexuais explícitas ou nudez explícita ao vivo. Quem busca o conteúdo mais ousado e sem censura encontra essa proposta no Acervo VIP e nas Obras Avulsas.',
  },
  {
    question: 'Quando a agenda de chamadas será aberta?',
    answer:
      'Estamos realizando ajustes técnicos e de agenda para garantir uma experiência estável, pontual e impecável do início ao fim. Assim que a abertura oficial estiver pronta, o aviso será publicado aqui no site e no Instagram @nuaborges.',
  },
  {
    question: 'A chamada fica gravada ou aparece algo no meu extrato?',
    answer:
      'Jamais. As sessões acontecem em sala privativa sem gravação, com sigilo bilateral obrigatório. Quando as reservas forem liberadas, o pagamento via Pix também manterá extrato 100% neutro e discreto, sem menção a Nua Borges ou conteúdo adulto.',
  },
  {
    question: 'Enquanto as chamadas não abrem, como posso viver a Nua?',
    answer:
      'Todos os outros caminhos estão abertos normalmente: você pode assinar o Acervo VIP completo, adquirir Obras Avulsas com acesso vitalício ou encomendar um Pedido Personalizado feito sob medida para você.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    icon: Clock,
    title: 'Escolha a duração',
    description:
      'Quando a agenda abrir, você escolherá entre encontros privativos dedicados (como sessões de 30 ou 60 minutos) conforme sua preferência.',
  },
  {
    step: '02',
    icon: Calendar,
    title: 'Reserve na agenda',
    description:
      'Selecione o dia e o horário disponíveis diretamente pelo calendário inteligente, com visualização clara de fuso horário.',
  },
  {
    step: '03',
    icon: ShieldCheck,
    title: 'Confirmação discreta',
    description:
      'O pagamento será feito via Pix com confirmação automática e identificação bancária totalmente neutra e sigilosa.',
  },
  {
    step: '04',
    icon: Lock,
    title: 'Sala privativa exclusiva',
    description:
      'Após a confirmação, um voucher individual libera o link direto da sala segura para o horário combinado, sem exposição em redes abertas.',
  },
];

const WHAT_TO_EXPECT = [
  'Conversa privativa 1-on-1 ao vivo, sem intermediários',
  'Clima acolhedor, próximo, leve e sem tabus',
  'Sensualidade sutil, elegante e autoral — fiel ao estilo da Nua',
  'Troca real sobre corpo, curiosidades, desejo e histórias',
  'Sala privativa criptografada, individual e 100% sigilosa',
];

const CLEAR_BOUNDARIES = [
  'Não envolve conteúdo sexual explícito ou nudez explícita ao vivo',
  'Proibição total de gravações, prints ou captura de tela/áudio',
  'Sem desrespeito, assédio ou insistência fora dos limites combinados',
  'Sem participação de terceiros — o acesso é estritamente individual',
  'Qualquer quebra de conduta encerra a chamada imediatamente',
];

const PRIVACY_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Sigilo Absoluto',
    description: 'Seus dados e sua privacidade permanecem protegidos em todas as etapas, inclusive no extrato bancário.',
  },
  {
    icon: EyeOff,
    title: 'Zero Gravações',
    description: 'O encontro vive apenas no momento presente. Gravar ou registrar a chamada é estritamente proibido.',
  },
  {
    icon: Heart,
    title: 'Limites Claros',
    description: 'Intimidade de verdade nasce do consentimento, do respeito mútuo e da transparência antes mesmo de começar.',
  },
  {
    icon: Clock,
    title: 'Tempo Dedicado',
    description: 'Horários planejados com folga entre sessões para garantir presença real, calma e pontualidade.',
  },
];

export function ChamadasComingSoonView() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white font-sans flex flex-col">
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="chamadas"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 select-none relative">
        <PublicBackground />

        {/* Cabeçalho Editorial Unificado */}
        <PublicPageHero
          icon={Video}
          eyebrow="EM BREVE • EXPERIÊNCIA PRIVATIVA"
          title="Encontros em Vídeo Privativo"
          subtitle="Estamos preparando a abertura oficial das chamadas ao vivo com a Nua Borges. Antes de liberar a agenda, deixamos tudo explicado com clareza para você saber exatamente o que esperar."
        />

        <div className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto relative z-10 space-y-10 sm:space-y-14">
          {/* Banner de Status — Agenda Temporariamente Fechada */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[28px] p-1.5 bg-gradient-to-b from-[#661C30]/35 via-white/[0.06] to-white/[0.02] border border-[#7A293D]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
          >
            <div className="rounded-[22px] bg-[#08080c] px-5 py-5 sm:px-8 sm:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#661C30]/25 border border-[#7A293D]/45 text-[#F5EEE9] text-[10px] font-mono uppercase tracking-[0.2em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#90364B]" />
                      Agenda pausada para ajustes
                    </span>
                  </div>
                  <p className="text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
                    Os agendamentos de chamadas estão temporariamente desabilitados enquanto aprimoramos o sistema de reservas e horários.
                  </p>
                  <p className="text-zinc-400 text-xs sm:text-[13px] font-light mt-1">
                    Nenhuma cobrança ou reserva está sendo gerada por aqui neste momento. Assim que a agenda abrir, avisaremos nos canais oficiais.
                  </p>
                </div>
              </div>

              <a
                href="https://www.instagram.com/nuaborges"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white/[0.05] hover:bg-[#661C30]/25 border border-white/10 hover:border-[#7A293D]/60 text-[#F5EEE9] text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-200"
              >
                <Instagram className="w-3.5 h-3.5 text-[#90364B]" />
                <span>Acompanhar aviso</span>
              </a>
            </div>
          </motion.div>

          {/* Bloco Principal: Transparência — Como são as Chamadas (e o que NÃO são) */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[32px] bg-[#08080c] border border-white/[0.08] p-6 sm:p-8 lg:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.9)] relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#661C30]/[0.08] blur-[120px]" />

            <div className="relative z-10 max-w-3xl">
              <span className="text-[#90364B] text-[10px] sm:text-[11px] font-mono font-semibold tracking-[0.26em] uppercase inline-flex items-center gap-2 mb-3">
                <Heart className="w-3.5 h-3.5 text-[#90364B]" />
                <span>TRANSPARÊNCIA &amp; PROPOSTA DA EXPERIÊNCIA</span>
              </span>

              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white font-normal tracking-tight leading-[1.12]">
                Intimidade, conversa e sensualidade sutil — sem conteúdo explícito ao vivo.
              </h2>

              <div className="mt-4 space-y-3 text-zinc-300 text-sm sm:text-[15px] font-light leading-relaxed">
                <p>
                  Antes de qualquer reserva futura, faço questão de deixar algo muito claro: as chamadas privativas com a Nua Borges{' '}
                  <strong className="text-white font-medium">não são chamadas sexuais explícitas</strong>. A proposta aqui é muito mais próxima, autoral e humana — um tempo reservado para conversar de verdade, criar conexão, tirar curiosidades e viver uma sensualidade elegante e sugerida, sempre com conforto e limites bem definidos.
                </p>
                <p className="text-zinc-400">
                  Se o que você procura é o lado mais intenso e sem censura do trabalho da Nua, esse conteúdo existe e está disponível hoje no{' '}
                  <Link href="/acervo" className="text-[#F5EEE9] underline decoration-[#90364B]/70 underline-offset-4 hover:text-white transition-colors">
                    Acervo VIP
                  </Link>{' '}
                  e nas{' '}
                  <Link href="/avulsos" className="text-[#F5EEE9] underline decoration-[#90364B]/70 underline-offset-4 hover:text-white transition-colors">
                    Obras Avulsas
                  </Link>
                  . As chamadas nascem para oferecer outro tipo de experiência: presença, olhar, voz e conversa exclusiva.
                </p>
              </div>
            </div>

            {/* Comparativo 2 colunas: O que esperar vs Limites claros */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mt-8">
              {/* O que faz parte */}
              <div className="rounded-[24px] bg-[#050508] border border-[#661C30]/35 p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#90364B] block">
                      O que você encontra
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl text-white font-normal">
                      A essência do encontro
                    </h3>
                  </div>
                </div>

                <ul className="space-y-3">
                  {WHAT_TO_EXPECT.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#90364B] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limites e o que não faz parte */}
              <div className="rounded-[24px] bg-[#050508] border border-white/[0.08] p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 block">
                      Limites &amp; respeito
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl text-white font-normal">
                      O que não faz parte
                    </h3>
                  </div>
                </div>

                <ul className="space-y-3">
                  {CLEAR_BOUNDARIES.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                      <XCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Passo a Passo: Como vai funcionar quando abrir */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-[#90364B] text-[10px] sm:text-[11px] font-mono font-semibold tracking-[0.26em] uppercase block mb-2.5">
                COMO VAI FUNCIONAR
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white font-normal tracking-tight">
                Simples, reservado e sem exposição
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2.5 leading-relaxed">
                Assim que as reservas forem liberadas, todo o agendamento acontecerá diretamente por aqui em quatro passos objetivos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {HOW_IT_WORKS_STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="rounded-[24px] bg-[#08080c] border border-white/[0.08] hover:border-[#661C30]/45 p-5 sm:p-6 transition-colors duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-xs text-zinc-600 tracking-widest">
                          {item.step}
                        </span>
                      </div>
                      <h3 className="font-serif text-lg text-white font-normal mb-2">
                        {item.title}
                      </h3>
                      <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Pilares de Privacidade, Sigilo & Conduta */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {PRIVACY_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-[22px] bg-[#07070a] border border-white/[0.06] p-5 flex flex-col gap-2.5"
                >
                  <Icon className="w-4 h-4 text-[#90364B]" />
                  <h3 className="font-serif text-base text-white font-normal">{pillar.title}</h3>
                  <p className="text-zinc-400 text-xs font-light leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </motion.section>

          {/* Mini-FAQ sobre as Chamadas */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[52rem] mx-auto pt-2"
          >
            <div className="text-center mb-7">
              <span className="text-[#90364B] text-[10px] sm:text-[11px] font-mono font-semibold tracking-[0.26em] uppercase inline-flex items-center gap-2 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#90364B]" />
                <span>DÚVIDAS FREQUENTES</span>
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight">
                Tudo bem esclarecido
              </h2>
            </div>

            <div className="space-y-3.5">
              {CHAMADAS_INFO_FAQS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={item.question}
                    className={`rounded-[22px] p-1.5 transition-all duration-300 ${
                      isOpen
                        ? 'bg-gradient-to-b from-[#661C30]/25 to-white/[0.04] border border-[#7A293D]/35 shadow-[0_12px_40px_rgba(0,0,0,0.8)]'
                        : 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.07] hover:border-white/15'
                    }`}
                  >
                    <div className="rounded-[18px] bg-[#07070a] overflow-hidden border border-white/[0.03]">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <span
                          className={`font-serif text-base sm:text-lg font-normal transition-colors ${
                            isOpen ? 'text-[#F5EEE9]' : 'text-white'
                          }`}
                        >
                          {item.question}
                        </span>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isOpen
                              ? 'bg-[#661C30] text-white shadow-[0_0_16px_rgba(102,28,48,0.5)]'
                              : 'bg-white/[0.06] text-zinc-400'
                          }`}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-300 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-white/[0.04]">
                              <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Bloco Final: O que está disponível agora */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[32px] bg-gradient-to-b from-[#0d0a0d] to-[#070709] border border-[#661C30]/35 p-6 sm:p-9 shadow-[0_24px_70px_rgba(0,0,0,0.9)]"
          >
            <div className="text-center max-w-2xl mx-auto mb-7">
              <span className="text-[#90364B] text-[10px] sm:text-[11px] font-mono font-semibold tracking-[0.26em] uppercase block mb-2">
                DISPONÍVEL AGORA
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight">
                Enquanto a agenda não abre, explore outros caminhos
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2 leading-relaxed">
                Todas as demais experiências do universo Nua Borges seguem abertas normalmente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/acervo"
                className="group rounded-[22px] bg-[#08080c] border border-white/[0.08] hover:border-[#7A293D]/60 p-5 transition-all duration-300 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] mb-3">
                    <Crown className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif text-lg text-white group-hover:text-[#F5EEE9] transition-colors">
                    Acervo VIP
                  </h3>
                  <p className="text-zinc-400 text-xs font-light mt-1 leading-relaxed">
                    Acesso completo e sem censura a todos os ensaios, vídeos e atualizações mensais.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#90364B] group-hover:text-[#F5EEE9] transition-colors">
                  <span>Conhecer acervo</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              <Link
                href="/avulsos"
                className="group rounded-[22px] bg-[#08080c] border border-white/[0.08] hover:border-[#7A293D]/60 p-5 transition-all duration-300 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B] mb-3">
                    <Camera className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif text-lg text-white group-hover:text-[#F5EEE9] transition-colors">
                    Obras Avulsas
                  </h3>
                  <p className="text-zinc-400 text-xs font-light mt-1 leading-relaxed">
                    Escolha apenas os ensaios e vídeos que te despertam, sem mensalidade e com acesso vitalício.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#90364B] group-hover:text-[#F5EEE9] transition-colors">
                  <span>Ver catálogo</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>

              <Link
                href="/personalizados"
                className="group rounded-[22px] bg-[#08080c] border border-white/[0.08] hover:border-[#7A293D]/60 p-5 transition-all duration-300 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B] mb-3">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif text-lg text-white group-hover:text-[#F5EEE9] transition-colors">
                    Pedidos Personalizados
                  </h3>
                  <p className="text-zinc-400 text-xs font-light mt-1 leading-relaxed">
                    Encomende fotos ou vídeos produzidos sob medida para você, com entrega totalmente sigilosa.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#90364B] group-hover:text-[#F5EEE9] transition-colors">
                  <span>Montar pedido</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>

            <div className="mt-7 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-[#90364B]" />
                <span>Ficou com alguma dúvida? Envie uma mensagem</span>
              </button>

              <p className="text-zinc-400 text-xs font-serif italic flex items-center gap-1.5">
                <span>Deixa de vergonha</span>
                <span className="text-[#90364B] not-italic">♡</span>
              </p>
            </div>
          </motion.section>
        </div>
      </main>

      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
        customChannelsData={content.channels}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
      />
    </div>
  );
}
