'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  FileText,
  Layers,
  Printer,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  X,
  Loader2,
} from 'lucide-react';

const AUTH_KEY = 'nua_contract_auth_v2';

// Controle de visibilidade dos botões de exportação (PDF, Imprimir e Link)
// Mude para true quando a Contratante aprovar e você for liberar o download do PDF
const SHOW_EXPORT_BUTTONS = false;

type Tab = 'contrato' | 'anexo';

function Clausula({
  num,
  title,
  children,
  highlight = false,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`contract-section space-y-3 print:space-y-1.5 print:mb-4 ${
        highlight
          ? 'p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 print:p-0 print:bg-transparent print:border-none'
          : ''
      }`}
    >
      <h2 className="contract-clause-title font-serif text-base sm:text-lg text-white print:text-black font-medium flex items-start gap-2.5 leading-snug">
        <span className="text-[#f4a7b9] print:text-black font-mono text-sm shrink-0 pt-0.5">
          {num}.
        </span>
        {title}
      </h2>
      <div className="contract-body space-y-2.5 print:space-y-1.5 text-sm leading-relaxed text-zinc-300 print:text-zinc-800">
        {children}
      </div>
    </section>
  );
}

function ContractList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-none space-y-1.5 print:space-y-1 pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-zinc-400 print:text-zinc-700 text-xs sm:text-sm">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/60 print:bg-zinc-600 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Nota({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: 'neutral' | 'warning' | 'positive' }) {
  const classes: Record<string, string> = {
    neutral: 'bg-zinc-900/60 border-zinc-800 print:bg-zinc-50 print:border-zinc-300',
    warning: 'bg-amber-950/20 border-amber-500/25 print:bg-amber-50/40 print:border-amber-300',
    positive: 'bg-emerald-950/20 border-emerald-500/25 print:bg-emerald-50/40 print:border-emerald-300',
  };
  return (
    <div className={`contract-nota p-4 rounded-xl border text-xs text-zinc-300 print:text-zinc-800 leading-relaxed ${classes[variant]}`}>
      {children}
    </div>
  );
}

export default function ContratoPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('contrato');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    try {
      setAuth(sessionStorage.getItem(AUTH_KEY) === 'true');
    } catch {
      setAuth(false);
    }
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const clean = pwd.trim();
      if (!clean) {
        setError('Informe a chave de acesso.');
        return;
      }

      setIsLoggingIn(true);
      setError('');

      try {
        const res = await fetch('/api/auth/contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: clean }),
        });

        if (res.ok) {
          try {
            sessionStorage.setItem(AUTH_KEY, 'true');
          } catch {
            /* noop */
          }
          setAuth(true);
          setError('');
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error || 'Chave de acesso inválida. Verifique e tente novamente.');
        }
      } catch {
        setError('Erro de conexão com o servidor de autenticação. Tente novamente.');
      } finally {
        setIsLoggingIn(false);
      }
    },
    [pwd],
  );

  const handleLogout = () => {
    try { sessionStorage.removeItem(AUTH_KEY); } catch { /* noop */ }
    setAuth(false);
    setPwd('');
  };

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Download direto do arquivo PDF (vetorial, sem anarquia de impressão)
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { downloadContractPdf, downloadAnexoPdf } = await import('@/lib/generateContractPdf');
      if (tab === 'contrato') {
        downloadContractPdf();
      } else {
        downloadAnexoPdf();
      }
    } catch (err) {
      console.error('Falha ao gerar PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (auth === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-600 text-xs tracking-widest uppercase">
        Carregando…
      </div>
    );
  }

  /* === TELA DE BLOQUEIO === */
  if (!auth) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: printCSS }} />
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-5 relative overflow-hidden selection:bg-[#f4a7b9] selection:text-black">
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[480px] h-[480px] rounded-full bg-[#f4a7b9]/[0.04] blur-[120px]" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm bg-[#0b0b0e] border border-zinc-800/90 rounded-3xl p-7 sm:p-9 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#f4a7b9] shadow-[0_0_18px_rgba(244,167,185,0.1)] mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <p className="font-serif text-lg tracking-[0.22em] uppercase text-white mb-1">Nua Borges</p>
              <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-[#f4a7b9]/10 text-[#f4a7b9] border border-[#f4a7b9]/25 mb-4">
                Área Restrita
              </span>
              <h1 className="font-serif text-2xl text-white font-normal mb-2">Minuta Contratual</h1>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Acesso exclusivo para visualização e alinhamento dos termos contratuais.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="contract-password" className="block text-zinc-400 text-[11px] font-semibold tracking-widest uppercase mb-2">
                  Chave de Acesso
                </label>
                <div className="relative">
                  <input
                    id="contract-password"
                    type={showPwd ? 'text' : 'password'}
                    value={pwd}
                    onChange={(e) => { setPwd(e.target.value); if (error) setError(''); }}
                    placeholder="Digite a senha fornecida"
                    autoFocus
                    autoComplete="current-password"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-[#f4a7b9] rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1.5 transition-colors rounded-lg"
                    aria-label={showPwd ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/25 text-red-300 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_2px_18px_rgba(244,167,185,0.22)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando Chave...</span>
                  </>
                ) : (
                  <>
                    <span>Acessar Documento</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-zinc-900 text-center">
              <p className="text-zinc-600 text-[11px]">
                A chave de acesso foi fornecida diretamente pela equipe responsável.
              </p>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  /* === DOCUMENTO LIBERADO === */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />

      <div className="min-h-screen bg-[#070709] text-zinc-200 selection:bg-[#f4a7b9] selection:text-black print:bg-white print:text-black">

        {/* TOOLBAR */}
        <header className="contract-toolbar sticky top-0 z-50 bg-[#09090c]/95 backdrop-blur-md border-b border-zinc-800/70 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between gap-3 py-3">
              <Link href="/" className="flex items-center gap-1.5 group shrink-0" title="Voltar ao site">
                <span className="font-serif text-sm tracking-[0.2em] uppercase text-white group-hover:text-[#f4a7b9] transition-colors">
                  Nua Borges
                </span>
                <span className="text-[#f4a7b9] text-xs">♡</span>
              </Link>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* BOTÕES DE EXPORTAÇÃO (Ocultos até a Contratante concordar) */}
                {SHOW_EXPORT_BUTTONS && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_2px_14px_rgba(244,167,185,0.25)] cursor-pointer disabled:opacity-60"
                      title="Baixar arquivo .pdf organizado diretamente no seu dispositivo"
                    >
                      {isGeneratingPdf ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Gerando...</span></>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /><span>Baixar PDF</span></>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Abrir diálogo de impressão do navegador"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                      title="Copiar link da página"
                    >
                      {copied ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-[11px] font-semibold">Copiado</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /><span className="hidden sm:inline">Link</span></>
                      )}
                    </button>
                  </>
                )}

                {/* BOTÃO SAIR (Sempre visível) */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  title="Encerrar sessão"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>

            {/* Abas underline */}
            <div className="flex border-t border-zinc-900 overflow-x-auto scrollbar-none -mx-1 px-1">
              {([
                { id: 'contrato' as const, label: 'Contrato de Serviços', Icon: FileText },
                { id: 'anexo' as const, label: 'Anexo I — Memorial de Escopo', Icon: Layers },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-3 text-[11px] font-semibold uppercase tracking-widest border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    tab === id
                      ? 'border-[#f4a7b9] text-[#f4a7b9]'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 print:p-0 print:m-0 print:max-w-none print:w-full">

          {/* Aviso minuta */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Documento para Leitura e Alinhamento</p>
                <p className="text-[11px] text-zinc-400 font-light">
                  Leia atentamente as cláusulas e o memorial de escopo. Em caso de dúvidas ou sugestões, converse diretamente com o desenvolvedor.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#f4a7b9] shrink-0 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Apenas Leitura e Alinhamento
            </span>
          </div>

          {/* PAPEL DIGITAL */}
          <article className="contract-paper bg-[#0b0b0e] border border-zinc-800/80 rounded-3xl p-5 sm:p-10 md:p-14 shadow-2xl print:bg-transparent print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0">

            {/* Cabeçalho impresso exclusivo para impressão física */}
            <div className="hidden print:block text-right text-[8pt] text-zinc-500 border-b border-zinc-300 pb-1.5 mb-5">
              <span>NUA BORGES — MINUTA CONTRATUAL — DOCUMENTO CONFIDENCIAL</span>
            </div>

            {/* Cabeçalho do documento */}
            <div className="contract-header border-b border-zinc-800/60 pb-8 mb-10 print:border-zinc-300 print:pb-4 print:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f4a7b9] print:text-zinc-600 mb-2 print:text-[8pt]">
                    Instrumento Particular
                  </span>
                  <h1 className="contract-title font-serif text-2xl sm:text-3xl lg:text-4xl text-white print:text-black font-normal leading-tight">
                    {tab === 'contrato'
                      ? 'Contrato de Prestação de Serviços de Desenvolvimento Web'
                      : 'Anexo I — Memorial Descritivo & Escopo Técnico-Funcional'}
                  </h1>
                </div>
                <div className="text-left sm:text-right text-xs text-zinc-500 print:text-zinc-600 shrink-0 print:text-[8.5pt]">
                  <span className="block font-medium text-zinc-300 print:text-black">Projeto Nua Borges</span>
                  <span className="block">Brasília / DF — 2026</span>
                  <span className="block text-[#f4a7b9] print:text-zinc-600 text-[10px] print:text-[8pt] mt-0.5">Para Análise Prévia</span>
                </div>
              </div>
              <p className="text-zinc-400 print:text-zinc-700 text-xs sm:text-sm font-light leading-relaxed max-w-3xl print:text-[8.5pt]">
                {tab === 'contrato'
                  ? 'Pelo presente instrumento particular, as partes abaixo identificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços de Desenvolvimento Web, mediante as cláusulas e condições seguintes.'
                  : 'Detalhamento técnico e funcional integral de todas as páginas, galeria, motor sonoro, painel administrativo (CMS) e infraestrutura em nuvem que compõem o projeto acordado entre as partes.'}
              </p>
            </div>

            {/* ABA CONTRATO */}
            {tab === 'contrato' && (
              <div className="space-y-8 print:space-y-5">
                <Clausula num="01" title="Das Partes" highlight>
                  <p><strong className="text-white print:text-black">CONTRATADO:</strong> <strong>João Philippe de Oliveira Boechat</strong>, brasileiro, solteiro, desenvolvedor web, portador do RG nº 3.755.968 e CPF nº 053.795.071-07, residente e domiciliado em Ceilândia, Brasília/DF, e-mail: <span className="text-[#f4a7b9] print:text-black">philippeboechat1@gmail.com</span>.</p>
                  <p><strong className="text-white print:text-black">CONTRATANTE:</strong> <strong>Nua Borges</strong>, educadora sexual e sexóloga em formação, residente e domiciliada em <span className="italic text-zinc-400 print:text-zinc-600">[Cidade/UF a completar]</span>, portadora do CPF nº <span className="italic text-zinc-400 print:text-zinc-600">[CPF a completar]</span>, e-mail: <span className="italic text-zinc-400 print:text-zinc-600">[E-mail a completar]</span>.</p>
                  <p className="text-xs text-zinc-500 print:text-zinc-600 italic">As partes acima identificadas resolvem celebrar o presente contrato mediante as cláusulas a seguir.</p>
                </Clausula>

                <Clausula num="02" title="Do Objeto">
                  <p>O presente contrato tem como objeto o desenvolvimento de um website personalizado para o projeto <strong>Nua Borges</strong>, incluindo sua estrutura visual, programação, publicação e os recursos administrativos definidos entre as partes, conforme detalhado no <strong>Anexo I — Memorial Descritivo e Escopo Técnico-Funcional</strong>, parte integrante deste instrumento.</p>
                  <p>O projeto será desenvolvido de acordo com a identidade visual, necessidades e objetivos apresentados pela <strong>CONTRATANTE</strong> durante o processo de desenvolvimento, compreendendo não apenas uma página de links, mas uma presença digital autoral e exclusiva.</p>
                </Clausula>

                <Clausula num="03" title="Do Escopo do Projeto">
                  <p>O projeto contratado compreenderá:</p>
                  <div className="space-y-4 print:space-y-2">
                    <div>
                      <p className="text-[11px] print:text-[8.5pt] font-semibold uppercase tracking-widest text-[#f4a7b9] print:text-black mb-2">I — Site público:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 print:gap-0.5">
                        {['Página inicial com seção capa (Hero) e carrossel de fotos','Galeria de ensaios editoriais com visualizador lightbox','Seção Sobre Mim / Manifesto','Seção de canais e redes sociais','Modal de contato comercial com validação','Player musical editorial (YouTube + MP3)','Cabeçalho fixo responsivo com menu drawer (mobile)','Rodapé institucional','Responsividade total (mobile, tablet e desktop)','Animações e microinterações premium','Otimizações de desempenho e carregamento','SEO técnico básico e Open Graph'].map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/50 print:bg-zinc-600 shrink-0" />{item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] print:text-[8.5pt] font-semibold uppercase tracking-widest text-[#f4a7b9] print:text-black mb-2">II — Painel administrativo (CMS):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 print:gap-0.5">
                        {['Edição de textos e fotos da capa','Biblioteca de mídia com upload direto de arquivos','Gerenciamento completo da galeria','Alteração de links e canais','Gerenciamento da playlist musical','Configuração de SEO e Open Graph','Alteração de senha do painel'].map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/50 print:bg-zinc-600 shrink-0" />{item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Nota><strong>PARÁGRAFO ÚNICO:</strong> O detalhamento técnico integral consta no <strong>Anexo I</strong>, que integra este contrato para todos os fins de direito.</Nota>
                </Clausula>

                <Clausula num="04" title="Do Valor e da Forma de Pagamento">
                  <p>Pelo desenvolvimento integral do projeto, a <strong>CONTRATANTE</strong> pagará ao <strong>CONTRATADO</strong> o valor total de <strong className="text-white print:text-black">R$ 2.000,00 (dois mil reais)</strong>, dividido em <strong>10 (dez) parcelas mensais e sucessivas de R$ 200,00 (duzentos reais)</strong>. Os pagamentos serão realizados por PIX ou outro meio acordado.</p>
                  <div className="overflow-x-auto -mx-1 px-1 print:mx-0 print:px-0">
                    <table className="w-full min-w-[280px] text-left text-xs print:text-[8pt] border border-zinc-800 print:border-zinc-300 overflow-hidden">
                      <thead className="bg-zinc-900/80 print:bg-zinc-100 text-zinc-400 print:text-zinc-800 font-semibold uppercase">
                        <tr><th className="py-2.5 px-4 print:py-1.5 print:px-2">Parcela</th><th className="py-2.5 px-4 print:py-1.5 print:px-2">Valor</th><th className="py-2.5 px-4 print:py-1.5 print:px-2">Periodicidade / Vencimento</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 print:divide-zinc-200 text-zinc-300 print:text-zinc-800">
                        {Array.from({ length: 10 }, (_, i) => (
                          <tr key={i} className="hover:bg-zinc-900/30">
                            <td className="py-2 px-4 print:py-1 print:px-2 font-medium text-white print:text-black">{i + 1}ª Parcela</td>
                            <td className="py-2 px-4 print:py-1 print:px-2 font-mono font-medium text-[#f4a7b9] print:text-black">R$ 200,00</td>
                            <td className="py-2 px-4 print:py-1 print:px-2 text-zinc-500 print:text-zinc-700">Mensal sucessiva</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>Em caso de atraso, incidirão: multa moratória de 2%; juros de mora de 1% ao mês (<em>pro rata die</em>); correção monetária pelo IPCA/IBGE.</p>
                  <Nota variant="warning"><strong>PARÁGRAFO ÚNICO:</strong> Atraso superior a 15 dias corridos autoriza o CONTRATADO a suspender o suporte técnico e o acesso ao painel até regularização dos débitos.</Nota>
                </Clausula>

                <Clausula num="05" title="Do Prazo de Entrega">
                  <p>O prazo de desenvolvimento e entrega do projeto será acordado entre as partes no início da execução, levando em consideração a disponibilidade das partes e o fornecimento tempestivo dos materiais necessários.</p>
                  <p>O prazo terá início a partir do recebimento dos materiais essenciais (textos, fotos, links) e da confirmação do pagamento da primeira parcela.</p>
                  <Nota><strong>PARÁGRAFO ÚNICO:</strong> Atrasos no fornecimento de materiais pela CONTRATANTE implicarão extensão proporcional do prazo, sem que isso caracterize inadimplemento do CONTRATADO.</Nota>
                </Clausula>

                {/* CLÁUSULA 06 — PERÍODO DE AJUSTES E SUPORTE VITALÍCIO */}
                <Clausula num="06" title="Do Período de Ajustes e do Suporte Vitalício" highlight>
                  <p>O <strong>CONTRATADO</strong> prestará suporte técnico contínuo e vitalício à <strong>CONTRATANTE</strong> relacionado ao website e seus recursos, sem qualquer cobrança de mensalidade, compreendendo:</p>
                  <ContractList items={[
                    <><strong>Período de Ajustes e Homologação Inicial:</strong> Durante a fase inicial de implantação e aprovação do projeto, estão plenamente inclusos todos os ajustes necessários para que o website e o painel administrativo fiquem perfeitamente alinhados ao gosto e às diretrizes da CONTRATANTE, abrangendo refinamentos visuais, inclusão ou remoção de seções, criação de páginas institucionais de estrutura similar e ajustes no painel administrativo (CMS);</>,
                    <><strong>Correção de Bugs:</strong> Resolução de eventuais inconsistências ou falhas que venham a surgir no código-fonte do desenvolvimento original;</>,
                    <><strong>Auxílio Operacional:</strong> Suporte, esclarecimento de dúvidas e orientações sobre a gestão de conteúdo via painel administrativo;</>,
                    <><strong>Pequenas Evoluções:</strong> Pequenas melhorias, ajustes de layout e adaptações rotineiras no website e no painel para acompanhar a evolução do projeto da CONTRATANTE;</>,
                    <><strong>Compatibilidade:</strong> Manutenção contínua para garantir que o site funcione perfeitamente com atualizações de navegadores web e sistemas operacionais de celulares (iOS e Android).</>,
                  ]} />
                  <p className="text-xs text-zinc-400 print:text-zinc-600 pt-1">
                    <strong className="text-zinc-300 print:text-black">Prazo de Resposta:</strong> Até 48 horas úteis para primeira resposta. O suporte não constitui regime de plantão 24 horas ou sobreaviso permanente.
                  </p>
                </Clausula>

                {/* CLÁUSULA 07 — ALTA COMPLEXIDADE */}
                <Clausula num="07" title="Das Demandas de Alta Complexidade Técnica">
                  <p>Permanecem fora do escopo do suporte vitalício apenas projetos ou módulos de <strong>alta complexidade estrutural</strong> que caracterizem um produto digital novo ou independente, tais como:</p>
                  <ContractList items={[
                    <>Desenvolvimento de sistema próprio de pagamentos online (checkout transparente integrado com gateway de cartão ou PIX automatizado);</>,
                    <>Área de membros restrita com controle de assinaturas e autenticação automatizada de usuários finais;</>,
                    <>Desenvolvimento de aplicativos móveis nativos para publicação nas lojas Google Play Store ou Apple App Store;</>,
                    <>Infraestrutura própria para transmissão e hospedagem massiva de vídeos pesados de streaming;</>,
                    <>Redesign estrutural total e reconstrução completa do projeto do zero após a homologação definitiva.</>,
                  ]} />
                  <Nota><strong>PARÁGRAFO ÚNICO:</strong> Demandas dessa magnitude serão previamente dialogadas e objeto de orçamento específico, mantendo-se o website original plenamente ativo e suportado independentemente da contratação de novos módulos.</Nota>
                </Clausula>

                <Clausula num="08" title="Das Alterações Realizadas por Terceiros">
                  <p>O suporte vitalício não abrangerá problemas causados por alterações de terceiros no código, banco de dados, infraestrutura ou configurações sem autorização do CONTRATADO. Reparos necessários por esses danos poderão ser objeto de orçamento específico.</p>
                </Clausula>

                <Clausula num="09" title="Do Domínio e dos Serviços de Terceiros">
                  <p>O valor de R$ 2.000,00 corresponde exclusivamente ao desenvolvimento do CONTRATADO. Não estão incluídos: anuidade de domínio (ex: Registro.br); hospedagens pagas externas; APIs e ferramentas terceiras contratadas pela CONTRATANTE. Nenhuma despesa será realizada sem ciência e concordância prévia da CONTRATANTE.</p>
                </Clausula>

                <Clausula num="10" title="Das Obrigações do Contratado">
                  <ContractList items={['Desenvolver o projeto conforme o escopo acordado;','Entregar os recursos previstos neste contrato e em seu Anexo I;','Prestar o período de ajustes e o suporte vitalício conforme pactuado;','Corrigir falhas técnicas relacionadas ao desenvolvimento original;','Manter sigilo sobre informações privadas e credenciais acessadas;','Comunicar previamente à CONTRATANTE qualquer limitação técnica ou custos de terceiros.']} />
                </Clausula>

                <Clausula num="11" title="Das Obrigações da Contratante">
                  <ContractList items={['Fornecer textos, imagens, vídeos, links e demais materiais necessários;','Fornecer informações corretas e atualizadas;','Realizar os pagamentos nas datas acordadas;','Zelar pela guarda e sigilo de suas senhas de acesso;','Comunicar prontamente eventuais problemas encontrados no funcionamento;','Responsabilizar-se integralmente pelos conteúdos e imagens que fornecer para publicação;','Arcar com os custos de domínio e serviços de terceiros previamente aprovados.']} />
                </Clausula>

                <Clausula num="12" title="Da Responsabilidade pelo Negócio">
                  <p>O CONTRATADO é responsável pelo funcionamento técnico da plataforma, <strong>não sendo responsável</strong> por garantir volume de acessos, vendas, clientes, faturamento ou resultados financeiros. Resultados comerciais dependem de fatores mercadológicos alheios ao desenvolvimento de software.</p>
                </Clausula>

                <Clausula num="13" title="Da Propriedade Intelectual e do Direito de Uso">
                  <p>Os materiais fornecidos pela CONTRATANTE permanecem de sua exclusiva propriedade. Após quitação integral de R$ 2.000,00, a CONTRATANTE terá direito irrestrito de utilização do website desenvolvido. O direito de utilização não implica transferência automática da propriedade de bibliotecas de código aberto (open-source) que possuem licenças próprias.</p>
                </Clausula>

                <Clausula num="14" title="Da Confidencialidade">
                  <p>As partes comprometem-se a preservar o sigilo de informações não públicas. O CONTRATADO não divulgará, sem autorização, informações privadas, credenciais, dados administrativos, estratégias comerciais ou informações de clientes da CONTRATANTE.</p>
                </Clausula>

                <Clausula num="15" title="Da Proteção de Dados Pessoais (LGPD)" highlight>
                  <p>As partes declaram que tratarão dados pessoais em conformidade com a <strong>Lei Federal nº 13.709/2018 (LGPD)</strong>. O CONTRATADO não utilizará, compartilhará ou comercializará dados pessoais para finalidades estranhas à execução dos serviços, adotando medidas técnicas adequadas de proteção.</p>
                </Clausula>

                <Clausula num="16" title="Do Portfólio">
                  <p>A CONTRATANTE autoriza o CONTRATADO a apresentar o website em seu portfólio profissional (capturas de tela e menção da autoria técnica). Não estão autorizados: senhas, dados pessoais de clientes, informações financeiras ou conteúdos expressamente confidenciais.</p>
                </Clausula>

                <Clausula num="17" title="Da Rescisão">
                  <p>O contrato poderá ser encerrado por qualquer das partes mediante comunicação <strong>prévia e por escrito</strong>, com antecedência mínima de <strong>15 (quinze) dias corridos</strong>.</p>
                  <ContractList items={[
                    'Em caso de rescisão antes da quitação integral, apurar-se-ão os serviços proporcionalmente prestados para acerto de contas;',
                    'A rescisão imotivada não prejudica o recebimento de valores devidos pelas etapas concluídas;',
                    'Ocorrendo rescisão pelo CONTRATADO sem justa causa, este disponibilizará todos os arquivos e acessos já pagos até aquele momento.',
                  ]} />
                </Clausula>

                <Clausula num="18" title="Da Segurança e dos Acessos">
                  <p>O CONTRATADO adotará medidas técnicas sólidas de segurança. A CONTRATANTE manterá protegidas suas senhas, não as compartilhando sem necessidade. O CONTRATADO não será responsável por problemas decorrentes de repasse indevido de credenciais a terceiros.</p>
                </Clausula>

                <Clausula num="19" title="Das Disposições Gerais">
                  <ContractList items={[
                    'Qualquer alteração relevante deste contrato será formalizada por escrito;',
                    'Novos serviços de alta complexidade técnica poderão ser contratados separadamente, mediante proposta prévia;',
                    'A tolerância quanto ao descumprimento temporário de alguma obrigação não implicará renúncia de direitos;',
                    'Este contrato substitui entendimentos verbais anteriores sobre o mesmo objeto.',
                  ]} />
                </Clausula>

                <Clausula num="20" title="Do Foro" highlight>
                  <p>Para dirimir eventuais controvérsias, fica eleito o <strong>foro da comarca de Brasília/DF</strong>, com expressa renúncia a qualquer outro, por mais privilegiado que seja.</p>
                  <p className="text-xs text-zinc-400 print:text-zinc-600">As partes declaram ter lido e compreendido integralmente este instrumento e o <strong>Anexo I</strong> que o acompanha, concordando com todas as suas cláusulas, de livre e espontânea vontade.</p>
                </Clausula>

                {/* Finalização limpa e discreta sem assinaturas ou caixas de 'Alinhamento' */}
                <div className="pt-8 border-t border-zinc-800/60 print:border-zinc-300 mt-10 print:mt-6 text-center">
                  <p className="text-xs text-zinc-500 print:text-zinc-600 italic">
                    Minuta elaborada para análise e alinhamento prévio das condições do Projeto Nua Borges — Brasília/DF, 2026.
                  </p>
                </div>
              </div>
            )}

            {/* ABA ANEXO I */}
            {tab === 'anexo' && (
              <div className="space-y-10 print:space-y-5">
                <Nota><strong>ANEXO I AO CONTRATO:</strong> Este memorial descritivo delimita com clareza as funcionalidades, componentes e infraestrutura entregues no projeto.</Nota>

                <Clausula num="01" title="Identificação do Projeto e Objetivo">
                  <p><strong>Nome:</strong> Plataforma Digital Oficial Nua Borges & Sistema de Gerenciamento de Conteúdo (CMS).</p>
                  <p><strong>Propósito:</strong> Portal web de alto padrão estético (editorial de luxo) para consolidação da marca pessoal da criadora Nua Borges, como hub oficial de portfólio artístico, canal de assessoria comercial e direcionamento para suas plataformas de conteúdo.</p>
                </Clausula>

                <Clausula num="02" title="Estrutura do Site Público (Front-end)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-1.5">
                    {[
                      {label:'Cabeçalho Fixo Global',desc:'Barra flutuante com efeito glassmorphism, logotipo, menu responsivo (drawer mobile) e CTAs para OnlyFans e Instagram.'},
                      {label:'Seção Capa (Hero)',desc:'Carrossel cinematográfico com fotos verticais editoriais, transições suaves a 60/120 FPS e botão primário de direcionamento.'},
                      {label:'Galeria de Ensaios',desc:'Esteira contínua infinita (Infinite Marquee) com pausa ao interagir e visualizador Lightbox em tela cheia.'},
                      {label:'Seção Manifesto & Biografia',desc:'Apresentação editorial com retrato autoral, titulação oficial, pull quote e assinatura artística.'},
                      {label:'Canais Oficiais & Redes',desc:'Cards parametrizados para OnlyFans e Instagram, além de banner para contato comercial.'},
                      {label:'Modal de Contato',desc:'Formulário com envio via e-mail, botão de cópia rápida e validação RFC-5322.'},
                      {label:'Rodapé Institucional',desc:'Créditos da marca, links de navegação secundária e copyright.'},
                      {label:'Player Musical Editorial',desc:'Motor híbrido MP3 e YouTube IFrame API, equalizador sincronizado via Web Audio API, pílula miniaturizada, fade-in/fade-out.'},
                    ].map(({label, desc}) => (
                      <div key={label} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/70 print:p-2 print:bg-transparent print:border print:border-zinc-200 space-y-1">
                        <span className="block text-[10px] print:text-[8pt] font-semibold uppercase tracking-widest text-[#f4a7b9] print:text-black">{label}</span>
                        <p className="text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </Clausula>

                <Clausula num="03" title="Painel de Controle Administrativo (CMS — /admin)">
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/70 print:p-2.5 print:bg-transparent print:border print:border-zinc-200 space-y-3 print:space-y-1.5">
                    <p className="text-xs print:text-[8pt] font-medium text-zinc-300 print:text-black"><strong>Autenticação:</strong> Acesso por senha mestra, proteção contra força bruta por IP, cookies HMAC-SHA256 com expiração em 24h.</p>
                    <p className="text-xs print:text-[8pt] font-semibold text-zinc-300 print:text-black">Gestão de Conteúdo — 8 Abas:</p>
                    <div className="space-y-1.5 print:space-y-0.5">
                      {[
                        ['Aba 1 — Capa','Edição e ordenação dos slides da seção Hero.'],
                        ['Aba 2 — Biblioteca de Mídia','Upload e gestão de imagens (JPG, PNG, WebP, AVIF) e vídeos (MP4, WebM), com otimização automática e detecção de duplicatas.'],
                        ['Aba 3 — Galeria','Ativação/pausa de fotos e legendas curatoriais.'],
                        ['Aba 4 — Sobre Mim','Gestão de biografia, manifesto e foto de perfil.'],
                        ['Aba 5 — Redes','Edição dos cards e etiquetas de redes sociais/OnlyFans.'],
                        ['Aba 6 — Contato','Configuração de e-mail e assuntos do modal de contato.'],
                        ['Aba 7 — Música','Gerenciador do player: links do YouTube, uploads de MP3 e controle de playlist.'],
                        ['Aba 8 — SEO & Ajustes','Título, meta description, Open Graph (WhatsApp/Instagram/Telegram) e alteração de senha.'],
                      ].map(([label, desc]) => (
                        <div key={label} className="flex items-start gap-2 text-xs print:text-[8pt]">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#f4a7b9]/50 print:bg-zinc-600 shrink-0" />
                          <span className="text-zinc-400 print:text-zinc-700"><strong className="text-zinc-200 print:text-black">{label}:</strong> {desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Clausula>

                <Clausula num="04" title="Infraestrutura Técnica e Desempenho">
                  <ContractList items={[<><strong>Framework Base:</strong> Next.js 15 (App Router) + React 19.</>,<><strong>Arquitetura:</strong> Jamstack Serverless + Edge Functions.</>,<><strong>Hospedagem & CDN:</strong> Cloudflare Pages Global Edge Network (+ 300 data centers, &lt; 1s de carregamento).</>,<><strong>Armazenamento de Mídia:</strong> Cloudflare R2 Object Storage com CDN dedicada e Zero Egress Fees.</>,<><strong>Animações:</strong> Motion (Framer Motion v12) + Tailwind CSS v4.</>]} />
                </Clausula>

                <Clausula num="05" title="Arquitetura de Segurança em Profundidade (Security Level 5)">
                  <ContractList items={['Criptografia SSL/TLS Universal com HSTS Preload por 1 ano;','Cabeçalhos de Segurança Estritos (Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff);','Middleware com arquitetura Fail-Closed;','Inspeção binária de arquivos enviados (Magic Bytes);','Higienização contra injeções XSS e proteção anti-IDOR.']} />
                </Clausula>

                <Clausula num="06" title="SEO & Acessibilidade">
                  <ContractList items={['Meta tags dinâmicas e marcação estruturada JSON-LD (ProfilePage, Person, WebSite);','Suporte completo a Open Graph para WhatsApp, Telegram, Instagram e X;','Acessibilidade conforme HTML5 semântico e rótulos ARIA;','Responsividade total com design mobile-first.']} />
                </Clausula>

                <Clausula num="07" title="Delimitação de Escopo">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-2">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 print:p-2.5 print:bg-transparent print:border print:border-zinc-300">
                      <strong className="block text-[11px] print:text-[8.5pt] uppercase tracking-widest text-emerald-400 print:text-black mb-1">Inclusos:</strong>
                      <p className="text-xs print:text-[8pt] text-zinc-300 print:text-zinc-700 leading-relaxed">Portal completo, CMS autônomo, implantação em Cloudflare Pages/R2, regras de segurança, player de música, apontamento de DNS, suporte vitalício e período inicial de ajustes e homologação.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 print:p-2.5 print:bg-transparent print:border print:border-zinc-300">
                      <strong className="block text-[11px] print:text-[8.5pt] uppercase tracking-widest text-zinc-300 print:text-black mb-1">Não Inclusos:</strong>
                      <p className="text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">Streaming e hospedagem massiva de vídeos pesados, anuidade de domínio, criação/captação de conteúdos, desenvolvimento de aplicativos móveis nativos, custeio de serviços terceiros.</p>
                    </div>
                  </div>
                </Clausula>

                <Clausula num="08" title="Termo de Homologação">
                  <p className="text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">A entrega e aceite do projeto são consolidados mediante disponibilização do portal e do painel administrativo no domínio oficial (ou subdomínio de homologação) em perfeito funcionamento, conforme os recursos descritos neste memorial.</p>
                </Clausula>
              </div>
            )}

          </article>
        </main>

        <footer className="py-8 text-center text-[11px] text-zinc-700 print:hidden border-t border-zinc-900/60">
          <p>Documento para visualização prévia de Nua Borges · Todos os direitos reservados.</p>
        </footer>

      </div>
    </>
  );
}

const printCSS = `
@media print {
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 16mm 14mm;
  }

  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box !important;
  }

  html, body {
    background: #ffffff !important;
    color: #18181b !important;
    font-family: Georgia, "Times New Roman", Times, serif !important;
    font-size: 8.5pt !important;
    line-height: 1.45 !important;
    overflow: visible !important;
    overflow-x: visible !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body::after,
  body::before,
  .contract-toolbar,
  audio,
  header,
  footer,
  [data-music-player],
  .music-player-container,
  button,
  [class*="print:hidden"] {
    display: none !important;
  }

  .contract-paper {
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .contract-title {
    font-size: 13.5pt !important;
    color: #000000 !important;
    font-weight: 700 !important;
    line-height: 1.25 !important;
    margin-bottom: 4pt !important;
  }

  .contract-section {
    margin-bottom: 9pt !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    break-inside: auto !important;
  }

  .contract-clause-title {
    font-size: 9.5pt !important;
    font-weight: 700 !important;
    color: #000000 !important;
    margin-bottom: 3pt !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  .contract-body {
    color: #27272a !important;
    font-size: 8.5pt !important;
    line-height: 1.4 !important;
  }

  table {
    border-collapse: collapse !important;
    width: 100% !important;
    font-size: 7.5pt !important;
    margin: 5pt 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  th, td {
    border: 0.5pt solid #d4d4d8 !important;
    padding: 2.5pt 5pt !important;
    color: #18181b !important;
  }

  th {
    background-color: #f4f4f5 !important;
    font-weight: 700 !important;
  }

  .contract-nota {
    background-color: #fafafa !important;
    border-left: 2pt solid #71717a !important;
    border-top: none !important;
    border-right: none !important;
    border-bottom: none !important;
    border-radius: 0 !important;
    padding: 3.5pt 6pt !important;
    font-size: 7.5pt !important;
    margin: 5pt 0 !important;
  }
}
`;
