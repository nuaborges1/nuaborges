'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  FileText,
  Layers,
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
  PenTool,
  CheckCircle2,
  RotateCcw,
  BadgeCheck,
  Sparkles,
  Clock,
} from 'lucide-react';

export interface SignatureRecord {
  id: string;
  party: 'contractor' | 'client';
  name: string;
  role: string;
  cpf: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signatureType: 'drawn' | 'typed';
  signatureDataUrl?: string;
  certificateHash: string;
  verified: boolean;
}

export interface ContractSignaturesState {
  contractor: SignatureRecord | null;
  client: SignatureRecord | null;
}

function generateTypedSignatureDataUrl(name: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f4a7b9';
  ctx.font = 'italic 38px "Times New Roman", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 5);
  ctx.strokeStyle = '#f4a7b9';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(80, canvas.height / 2 + 25);
  ctx.bezierCurveTo(220, canvas.height / 2 + 35, 380, canvas.height / 2 + 15, canvas.width - 80, canvas.height / 2 + 25);
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

function SignatureCanvas({
  onSave,
  onClear,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const isDrawing = React.useRef(false);
  const [hasDrawn, setHasDrawn] = React.useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#f4a7b9';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (isDrawing.current && canvasRef.current) {
      isDrawing.current = false;
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="relative border border-zinc-700/80 rounded-xl bg-zinc-950/90 overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="w-full h-36 cursor-crosshair block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 text-xs tracking-wider">
            Desenhe sua rubrica aqui (toque ou mouse)
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-zinc-500">Traço vetorial suave</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
        >
          <RotateCcw className="w-3 h-3" /> Limpar
        </button>
      </div>
    </div>
  );
}

const AUTH_KEY = 'nua_contract_auth_v2';

// Controle de visibilidade dos botões de exportação (PDF, Imprimir e Link)
const SHOW_EXPORT_BUTTONS = true;

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
      className={`contract-section space-y-3 print:space-y-1.5 print:mb-4 ${highlight
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
  const [auth, setAuth] = useState<boolean>(false);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('contrato');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Assinaturas Digitais
  const [signatures, setSignatures] = useState<ContractSignaturesState>({
    contractor: null,
    client: null,
  });
  const [signModalParty, setSignModalParty] = useState<'contractor' | 'client' | null>(null);
  const [signType, setSignType] = useState<'drawn' | 'typed'>('drawn');
  const [drawnDataUrl, setDrawnDataUrl] = useState<string>('');
  const [typedSignName, setTypedSignName] = useState<string>('');
  const [signAgreed, setSignAgreed] = useState<boolean>(false);
  const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
  const [signError, setSignError] = useState<string>('');
  const [signSuccessMessage, setSignSuccessMessage] = useState<string>('');

  // Status de assinatura de ambas as partes
  const bothSigned = Boolean(signatures.contractor && signatures.client);

  const fetchSignatures = useCallback(async () => {
    try {
      const res = await fetch('/api/contract/sign');
      if (res.ok) {
        const data = await res.json();
        setSignatures(data);
      }
    } catch (err) {
      console.error('Falha ao buscar assinaturas:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true';
      if (isAuth) {
        setAuth(true);
        fetchSignatures();
      } else {
        setAuth(false);
      }
    } catch {
      setAuth(false);
    }
  }, [fetchSignatures]);

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
            sessionStorage.setItem('nua_contract_pwd', clean);
          } catch {
            /* noop */
          }
          setAuth(true);
          setError('');
          fetchSignatures();
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
    [pwd, fetchSignatures],
  );

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem('nua_contract_pwd');
    } catch {
      /* noop */
    }
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

  const handleOpenSignModal = (party: 'contractor' | 'client') => {
    // BLOQUEIO: Se já estiver assinado por esta parte, não permite abrir modal
    if (signatures[party]) {
      return;
    }

    setSignModalParty(party);
    setSignType('drawn');
    setDrawnDataUrl('');
    setTypedSignName(
      party === 'contractor' ? 'João Philippe de Oliveira Boechat' : 'Nayara Borges da Costa'
    );
    setSignAgreed(false);
    setSignError('');
  };

  const handleCloseSignModal = () => {
    setSignModalParty(null);
    setSignError('');
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signModalParty) return;

    // BLOQUEIO: Imutabilidade estrita
    if (signatures[signModalParty]) {
      setSignError('Esta assinatura já foi registrada e possui registro definitivo e imutável.');
      return;
    }

    if (!signAgreed) {
      setSignError('É obrigatório declarar concordância formal com as cláusulas do contrato.');
      return;
    }

    let finalDataUrl = '';
    if (signType === 'drawn') {
      if (!drawnDataUrl) {
        setSignError('Por favor, desenhe sua rubrica no quadro acima.');
        return;
      }
      finalDataUrl = drawnDataUrl;
    } else {
      if (!typedSignName.trim()) {
        setSignError('Por favor, digite seu nome completo.');
        return;
      }
      finalDataUrl = generateTypedSignatureDataUrl(typedSignName.trim());
    }

    setIsSubmittingSign(true);
    setSignError('');

    const savedPwd = (typeof window !== 'undefined' ? sessionStorage.getItem('nua_contract_pwd') : '') || 'contrato2026';

    try {
      const res = await fetch('/api/contract/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party: signModalParty,
          password: savedPwd,
          signatureDataUrl: finalDataUrl,
          signatureType: signType,
          signerName: typedSignName.trim(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        signatures?: ContractSignaturesState;
        error?: string;
      };

      if (res.ok && data.success && data.signatures) {
        setSignatures(data.signatures);
        setSignModalParty(null);
        setSignSuccessMessage(
          `Assinatura de ${signModalParty === 'contractor' ? 'João Philippe' : 'Nayara Borges'} registrada com sucesso!`
        );
        setTimeout(() => setSignSuccessMessage(''), 6000);
      } else {
        setSignError(data.error || 'Falha ao registrar assinatura.');
      }
    } catch {
      setSignError('Erro de conexão ao enviar assinatura. Tente novamente.');
    } finally {
      setIsSubmittingSign(false);
    }
  };

  // Download direto do arquivo PDF oficial consolidado (apenas liberado quando ambos assinarem)
  const handleDownloadPdf = async () => {
    if (!bothSigned) {
      alert('O download do PDF oficial só é liberado após a assinatura de ambas as partes ser registrada.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const { downloadContractPdf, downloadAnexoPdf } = await import('@/lib/generateContractPdf');
      if (tab === 'contrato') {
        downloadContractPdf(signatures);
      } else {
        downloadAnexoPdf();
      }
    } catch (err) {
      console.error('Falha ao gerar PDF:', err);
      alert('Falha ao gerar o documento PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
              <h1 className="font-serif text-2xl text-white font-normal mb-2">Instrumento Contratual</h1>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Acesso restrito para visualização dos termos contratuais e do memorial descritivo.
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
                {/* BOTÕES DE EXPORTAÇÃO (Liberado apenas após a assinatura de ambos) */}
                {bothSigned ? (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:bg-emerald-700 text-zinc-950 text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-60"
                    title="Baixar Contrato Oficial Assinado em PDF"
                  >
                    {isGeneratingPdf ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Gerando...</span></>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /><span>Baixar PDF Assinado</span></>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                    <span className="hidden sm:inline">
                      {signatures.contractor || signatures.client ? '1 de 2 Assinaturas Registradas' : 'Aguardando Assinaturas'}
                    </span>
                  </div>
                )}


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
                  className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-3 text-[11px] font-semibold uppercase tracking-widest border-b-2 transition-all cursor-pointer whitespace-nowrap ${tab === id
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

          {/* Informações da Versão */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Contrato Oficial de Prestação de Serviços</p>
                <p className="text-[11px] text-zinc-400 font-light">
                  Versão consolidada com memorial de escopo, garantias e termos de suporte técnico delimitados.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#f4a7b9] shrink-0 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Versão Definitiva 1.1
            </span>
          </div>

          {/* PAPEL DIGITAL */}
          <article className="contract-paper bg-[#0b0b0e] border border-zinc-800/80 rounded-3xl p-5 sm:p-10 md:p-14 shadow-2xl print:bg-transparent print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0">

            {/* Cabeçalho impresso exclusivo para impressão física */}
            <div className="hidden print:block text-right text-[8pt] text-zinc-500 border-b border-zinc-300 pb-1.5 mb-5">
              <span>NUA BORGES — INSTRUMENTO CONTRATUAL — VERSÃO 1.1</span>
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
                  <span className="block text-[#f4a7b9] print:text-zinc-600 text-[10px] print:text-[8pt] mt-0.5">Versão Definitiva 1.1</span>
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
                  <p><strong className="text-white print:text-black">CONTRATADO:</strong> <strong>João Philippe de Oliveira Boechat</strong>, brasileiro, solteiro, desenvolvedor web, portador do RG nº 3.755.968 e CPF nº 053.795.071-07, residente e domiciliado em Ceilândia, Brasília/DF, e-mail: <span className="text-[#f4a7b9] print:text-black">philippeboechat1@gmail.com</span>, WhatsApp: <strong>(61) 99361-9554</strong>.</p>
                  <p><strong className="text-white print:text-black">CONTRATANTE:</strong> <strong>Nayara Borges da Costa</strong>, conhecida profissionalmente como <strong>"Nua Borges"</strong>, brasileira, casada, portadora do CPF nº <strong>0832051073</strong>, residente e domiciliada na República da Irlanda, e-mail oficial: <span className="text-[#f4a7b9] print:text-black">nua@nuaborges.com</span>, WhatsApp internacional: <strong>+353 83 205 1073</strong>.</p>
                  <Nota><strong>PARÁGRAFO ÚNICO:</strong> Os e-mails e números de WhatsApp acima constituem os canais oficiais de comunicação e notificação das partes para todos os fins deste contrato (Cláusula 19).</Nota>
                </Clausula>

                <Clausula num="02" title="Do Objeto">
                  <p><strong>2.1.</strong> O objeto deste contrato é o desenvolvimento, a publicação e a homologação do website do projeto <strong>"Nua Borges"</strong>, com o respectivo painel administrativo (CMS), exatamente conforme o <strong>Anexo I — Memorial Descritivo e Escopo Técnico-Funcional</strong>, bem como a prestação da garantia e do suporte nos estritos limites da Cláusula 6.</p>
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
                    <p><strong>PARÁGRAFO SEGUNDO:</strong> Os recursos adicionais entregues por liberalidade do <strong>CONTRATADO</strong> (módulo de perguntas "Asks", gravador de vídeo vertical com teleprompter, páginas de Termos de Uso e Política de Privacidade e painel técnico de auditoria) integram o website e encontram-se plenamente cobertos pela garantia originária da Cláusula 6.2. O suporte a eles observa rigorosamente os limites da Cláusula 6 e não gera qualquer obrigação de evolução perpétua ou desenvolvimento de novos recursos correlatos sem orçamento específico.</p>
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
                    <p className="mb-1.5"><strong>4.3.</strong> O atraso no pagamento de qualquer parcela superior a 15 (quinze) dias corridos, contados da notificação escrita enviada pelos canais oficiais, autoriza o <strong>CONTRATADO</strong> a suspender as atividades de suporte técnico, novas demandas e atualizações. Persistindo o inadimplemento por prazo superior a 30 (trinta) dias, o <strong>CONTRATADO</strong> poderá suspender temporariamente os acessos administrativos de edição ao painel (CMS), mantendo-se o website público no ar por até mais 15 (quinze) dias antes de eventual desativação dos serviços hospedados sob sua gestão técnica direta.</p>
                    <p><strong>4.4.</strong> Atraso superior a 30 (trinta) dias, não sanado em 10 (dez) dias após notificação escrita, autoriza o <strong>CONTRATADO</strong> a considerar vencidas antecipadamente todas as parcelas vincendas e/ou a resolver o contrato de pleno direito (Cláusula 17.2).</p>
                  </Nota>
                </Clausula>

                <Clausula num="05" title="Do Prazo de Entrega e da Homologação">
                  <p><strong>5.1.</strong> O website encontra-se plenamente desenvolvido e disponibilizado para homologação pela <strong>CONTRATANTE</strong> na data de assinatura deste instrumento, iniciando-se a contagem do prazo de homologação da Cláusula 6.1 a partir da confirmação do pagamento da primeira parcela.</p>
                  <p><strong>5.2.</strong> Atrasos no fornecimento de insumos ou nas respostas da <strong>CONTRATANTE</strong> prorrogam proporcionalmente o cronograma, sem caracterizar mora do <strong>CONTRATADO</strong>.</p>
                  <p><strong>5.3.</strong> A homologação ocorre estritamente na forma da Cláusula 6.1. A data da homologação será registrada por comunicação escrita oficial e inicia a contagem dos prazos das Cláusulas 6.2 e 6.3.</p>
                </Clausula>

                {/* CLÁUSULA 06 — HOMOLOGAÇÃO, GARANTIA E SUPORTE */}
                <Clausula num="06" title="Da Homologação, da Garantia e do Suporte" highlight>
                  <div className="space-y-3">
                    <p><strong>6.1. Período de ajustes e homologação:</strong> Disponibilizado o website para homologação, a <strong>CONTRATANTE</strong> terá 10 (dez) dias úteis para apresentar, em lista única e por escrito, os ajustes desejados dentro do escopo do Anexo I. Estão incluídas até 2 (duas) rodadas de ajustes, compreendendo refinamentos visuais, reorganização, inclusão ou remoção de seções existentes e até 2 (duas) páginas institucionais de estrutura semelhante às já existentes. Concluída a última rodada, ou decorrido o prazo sem apontamentos, ou iniciado o uso público do website pela CONTRATANTE, considera-se o projeto plenamente homologado e aceito tacitamente. Ajustes posteriores seguirão as Cláusulas 6.3 a 6.5.</p>

                    <p><strong>6.2. Garantia de correção de defeitos — 12 (doze) meses:</strong> Pelo prazo de 12 (doze) meses contados da homologação, o <strong>CONTRATADO</strong> corrigirá, sem custo adicional, os defeitos do código-fonte desenvolvido por ele, assim entendidos as falhas reproduzíveis em que um recurso descrito no Anexo I deixa de funcionar como descrito, nos navegadores e sistemas suportados (Anexo I, item 09), sem que a causa seja uma das hipóteses da Cláusula 8. Inclui a correção de vulnerabilidade de segurança identificada no código original ou em suas dependências diretas, quando houver atualização compatível disponível. Esta garantia é complementar à garantia legal.</p>

                    <p><strong>6.3. Suporte incluído — 12 (doze) meses:</strong> No mesmo período, o <strong>CONTRATADO</strong> prestará, sem custo adicional, até <strong>2 (duas) horas mensais, não cumulativas</strong>, de: (a) orientação sobre o uso do painel administrativo; (b) pequenos ajustes de texto, imagem, link, cor ou ordem de elementos já existentes; (c) adaptações pontuais de compatibilidade com versões atuais dos navegadores suportados, desde que não exijam atualização de versão maior de framework ou migração de plataforma. Demandas excedentes serão previamente orçadas (Cláusula 6.5).</p>

                    <p><strong>6.4. Suporte continuado:</strong> Encerrado o período da Cláusula 6.3, o <strong>CONTRATADO</strong> continuará disponível para correções, manutenção e ajustes, mediante orçamento avulso por demanda ao valor por hora acordado entre as partes, reajustado anualmente pelo IPCA, ou mediante plano mensal que as partes venham a contratar por escrito. O <strong>CONTRATADO</strong> poderá deixar de oferecer o suporte continuado mediante aviso prévio de 60 (sessenta) dias, entregando à <strong>CONTRATANTE</strong> código-fonte atualizado, credenciais e documentação básica, de modo que outro profissional possa assumir a sustentação do website.</p>

                    <p><strong>6.5. Demandas fora dos itens acima:</strong> Toda demanda não prevista expressamente nas Cláusulas 6.1 a 6.3 será orçada previamente por escrito e somente executada após formal aceite da <strong>CONTRATANTE</strong>. Sem aprovação do orçamento, o <strong>CONTRATADO</strong> não terá obrigação de executá-la.</p>

                    <p><strong>6.6. Atendimento:</strong> Solicitações serão encaminhadas pelos canais oficiais da Cláusula 1, com descrição objetiva do problema e capturas de tela. Primeira resposta em até 2 (dois) dias úteis (segunda a sexta, das 9h às 18h, horário de Brasília, exceto feriados nacionais e do Distrito Federal). Pequenos ajustes da franquia mensal (Cláusula 6.3) serão executados com prazo estimado informado na primeira resposta, habitualmente em até 5 (cinco) dias úteis conforme complexidade. Defeito crítico que deixe o website público fora do ar, quando causado pelo código do <strong>CONTRATADO</strong>, terá início de atendimento prioritário em até 1 (um) dia útil e empenho contínuo e diligente até o pronto restabelecimento do serviço. O suporte não constitui regime de plantão 24 horas, sobreaviso ou prazo garantido pré-fixado de solução, empregando o CONTRATADO diligência compatível com a complexidade técnica.</p>

                    <p><strong>6.7. Natureza e extinção:</strong> A garantia e o suporte constituem obrigações de meio quanto à disponibilidade de serviços e infraestruturas de terceiros, e de resultado apenas quanto à correção dos defeitos técnicos definidos na Cláusula 6.2. Extinguem-se pela morte ou incapacidade permanente do <strong>CONTRATADO</strong> (Código Civil, art. 607), conservando a <strong>CONTRATANTE</strong> todos os direitos de propriedade intelectual da Cláusula 13.</p>
                  </div>
                </Clausula>

                {/* CLÁUSULA 07 — SERVIÇOS NÃO INCLUÍDOS */}
                <Clausula num="07" title="Dos Serviços Não Incluídos" highlight>
                  <p><strong>7.1.</strong> Estão incluídos na garantia e no suporte contratado <strong>exclusivamente</strong> os itens previstos na Cláusula 6. São considerados serviços novos, sujeitos a orçamento e aceite prévio, entre outros:</p>
                  <ContractList items={[
                    <>Novas funcionalidades, páginas, módulos ou integrações externas (sistema próprio de pagamentos online, checkout transparente, integração com gateways de cartão ou PIX automatizado, área de membros restrita com controle de assinantes, agendamentos, newsletters, CRM, ferramentas de analytics avançadas e pixels);</>,
                    <>Redesign estrutural, total ou parcial, ou alteração da identidade visual após a homologação definitiva;</>,
                    <>Atualização de versão maior de framework e bibliotecas (ex.: upgrades principais de Next.js ou React) e migrações de plataforma ou de provedor de hospedagem;</>,
                    <>Adaptações exigidas por descontinuação ou mudanças de regras unilaterais de serviços de terceiros (Cloudflare, YouTube, Registro.br, redes sociais, navegadores ou sistemas operacionais) que excedam o suporte da Cláusula 6.3, "c";</>,
                    <>Desenvolvimento de aplicativos móveis nativos para publicação nas lojas Google Play Store ou Apple App Store;</>,
                    <>Infraestrutura própria para transmissão e hospedagem massiva de vídeos pesados de streaming;</>,
                    <>Produção, edição, gravação ou inserção massiva de conteúdos em lote;</>,
                    <>Recuperação de dados ou mídias apagadas acidentalmente pela CONTRATANTE ou por terceiros;</>,
                    <>Consultoria de marketing, gestão de tráfego, SEO avançado além do básico, ou suporte a equipamentos e contas pessoais da CONTRATANTE.</>,
                  ]} />
                  <Nota><strong>7.2.</strong> A não contratação de serviços adicionais não afeta a vigência da garantia e do suporte da Cláusula 6 em relação ao website original homologado.</Nota>
                </Clausula>

                {/* CLÁUSULA 08 — EXCLUDENTES */}
                <Clausula num="08" title="Das Excludentes de Garantia e Suporte" highlight>
                  <p><strong>8.1.</strong> Não estão cobertos pela garantia nem pelo suporte incluído, podendo ser objeto de orçamento de reparo específico, as falhas e inconsistências causadas por:</p>
                  <ContractList items={[
                    <>Ação ou omissão da CONTRATANTE ou de pessoas a quem ela fornecer credenciais (exclusão ou substituição de arquivos, uploads fora dos limites do Anexo I, alteração de DNS, de configurações ou de planos, ou compartilhamento de senhas);</>,
                    <>Alterações no código-fonte, nos dados ou na infraestrutura realizadas por terceiros, ainda que autorizados pela CONTRATANTE;</>,
                    <>Falhas, indisponibilidades, alterações de regras, limites de cota, preços ou descontinuação de serviços de terceiros (Cloudflare, Registro.br, YouTube, provedores de e-mail, redes sociais), bem como atualizações de navegadores que exijam mais do que a Cláusula 6.3, "c";</>,
                    <>Caso fortuito ou força maior (Código Civil, art. 393), inclusive ataques cibernéticos em escala que superem as medidas de segurança razoáveis adotadas;</>,
                    <>Utilização em desacordo com as instruções do Anexo I ou orientações técnicas do CONTRATADO.</>,
                  ]} />
                  <p className="text-xs text-zinc-400 print:text-zinc-600 pt-1">
                    <strong>8.2.</strong> A contratação de outro profissional pela <strong>CONTRATANTE</strong> é plenamente livre. Todavia, a garantia cessa imediatamente sobre as partes do código modificadas por terceiros e sobre os efeitos dessas intervenções externas.
                  </p>
                </Clausula>

                <Clausula num="09" title="Do Domínio, das Contas e dos Serviços de Terceiros">
                  <p><strong>9.1.</strong> O valor pactuado na Cláusula 4 remunera exclusivamente os serviços de desenvolvimento e suporte do <strong>CONTRATADO</strong>. Não estão incluídas anuidades de domínio (ex: Registro.br), planos pagos de hospedagem, armazenamento adicional ou APIs pagas contratadas pela <strong>CONTRATANTE</strong>.</p>
                  <p><strong>9.2.</strong> O domínio oficial deve ser registrado em nome e CPF da <strong>CONTRATANTE</strong>. As contas de hospedagem e banco de dados em nuvem (Cloudflare Pages, KV e R2) devem pertencer à <strong>CONTRATANTE</strong>, figurando o <strong>CONTRATADO</strong> como membro técnico convidado com acesso revogável a qualquer tempo. Caso alguma conta esteja provisoriamente sob titularidade do <strong>CONTRATADO</strong>, este a transferirá integralmente à <strong>CONTRATANTE</strong> quando solicitado, no prazo de até 10 (dez) dias úteis, ou ao término do contrato.</p>
                  <p><strong>9.3.</strong> A plataforma utiliza arquitetura em planos gratuitos sujeitos a limites operacionais de cota (Anexo I, item 09) e a eventuais alterações unilaterais dos provedores globais. Se o crescimento de tráfego exigir migração para plano pago, o <strong>CONTRATADO</strong> comunicará a <strong>CONTRATANTE</strong> para aprovação. Caso a <strong>CONTRATANTE</strong> opte por não arcar com custos adicionais de provedores, o <strong>CONTRATADO</strong> não responderá por eventuais bloqueios ou lentidões decorrentes.</p>
                  <p><strong>9.4.</strong> Nenhuma despesa financeira será realizada em nome da <strong>CONTRATANTE</strong> sem sua expressa autorização prévia por escrito.</p>
                  <p><strong>9.5.</strong> A guarda e preservação de cópias de segurança (backups) das fotos, vídeos, textos e músicas originais é de responsabilidade da <strong>CONTRATANTE</strong>. Rotinas personalizadas de backup em nuvem podem ser contratadas à parte.</p>
                </Clausula>

                <Clausula num="10" title="Das Obrigações do Contratado">
                  <ContractList items={[
                    'Desenvolver e publicar o website conforme o memorial técnico do Anexo I;',
                    'Realizar a homologação e prestar a garantia e o suporte técnico nos estritos termos e prazos da Cláusula 6;',
                    'Manter rigoroso sigilo sobre dados, arquivos e credenciais acessadas (Cláusula 14);',
                    'Tratar dados pessoais em estrita conformidade com a LGPD (Cláusula 15);',
                    'Comunicar previamente à CONTRATANTE limitações técnicas relevantes que impeçam recursos planejados;',
                    'Entregar à CONTRATANTE, após a homologação e a quitação integral, o código-fonte, credenciais e instruções básicas de operação.',
                  ]} />
                </Clausula>

                <Clausula num="11" title="Das Obrigações da Contratante">
                  <p><strong>11.1.</strong> Fornecer tempestivamente os materiais, fotos em alta resolução, textos e links necessários; honrar pontualmente os pagamentos nos prazos avençados; zelar pelo sigilo de suas senhas pessoais e manter autenticação em dois fatores (2FA) em seu e-mail e na Cloudflare; comunicar prontamente inconsistências observadas; e arcar com os custos de domínio e serviços de terceiros previamente aprovados.</p>
                  <p><strong>11.2.</strong> A <strong>CONTRATANTE</strong> declara e garante expressamente que: (a) detém os direitos autorais, patrimoniais ou as autorizações legais necessárias sobre todas as fotos, vídeos, textos, faixas musicais, marcas e imagens que fornecer ou publicar no website, inclusive perante fotógrafos e titulares de direitos fonomecânicos; (b) todas as pessoas retratadas no acervo são comprovadamente maiores de 18 (dezoito) anos e consentiram expressamente com a divulgação de sua imagem; (c) o conteúdo publicado é lícito e atende aos termos de uso das plataformas de terceiros.</p>
                  <Nota variant="warning"><strong>11.3.</strong> O <strong>CONTRATADO</strong> não revisa nem exerce moderação sobre os conteúdos artísticos e editoriais publicados. A <strong>CONTRATANTE</strong> responderá com exclusividade por quaisquer reclamações ou autuações de terceiros e ressarcirá integralmente o <strong>CONTRATADO</strong> por eventuais danos, condenações, custas e honorários que este vier a suportar por força do conteúdo publicado.</Nota>
                </Clausula>

                {/* CLÁUSULA 12 — RESPONSABILIDADE */}
                <Clausula num="12" title="Da Responsabilidade Civil e Limitações" highlight>
                  <p><strong>12.1.</strong> O <strong>CONTRATADO</strong> responde pelos defeitos técnicos de desenvolvimento nos estritos termos da Cláusula 6. Não assume qualquer responsabilidade ou garantia quanto a resultados comerciais, alcance de público, número de seguidores, volume de vendas, conversão de novos assinantes no OnlyFans ou faturamento financeiro, os quais dependem exclusivamente de fatores mercadológicos e do engajamento próprio da <strong>CONTRATANTE</strong>.</p>
                  <p><strong>12.2.</strong> A disponibilidade contínua e a segurança da plataforma constituem obrigações de meio: o <strong>CONTRATADO</strong> emprega padrões modernos de engenharia de software, sem garantir funcionamento ininterrupto ou invulnerabilidade absoluta.</p>
                  <p><strong>12.3.</strong> O <strong>CONTRATADO</strong> não responde por falhas de infraestrutura de terceiros (Cloudflare, YouTube, provedores de DNS e internet), caso fortuito ou força maior (Código Civil, art. 393), nem por lucros cessantes, perdas indiretas ou danos reflexos, salvo comprovado dolo ou culpa grave.</p>
                  <Nota><strong>12.4.</strong> Salvo dolo, culpa grave ou expressa vedação legal, a responsabilidade indenizatória total do <strong>CONTRATADO</strong> por quaisquer eventos relacionados a este contrato limita-se rigorosamente ao valor total efetivamente pago pela <strong>CONTRATANTE</strong>.</Nota>
                </Clausula>

                <Clausula num="13" title="Da Propriedade Intelectual e Cessão">
                  <p><strong>13.1.</strong> Os conteúdos fornecidos pela <strong>CONTRATANTE</strong> (fotografias, vídeos, ensaios, textos, músicas, marca e nome artístico) permanecem sob sua exclusiva propriedade ou de seus respectivos licenciantes.</p>
                  <p><strong>13.2.</strong> Mediante a quitação integral do valor acordado de R$ 2.000,00, o <strong>CONTRATADO</strong> cede em definitivo à <strong>CONTRATANTE</strong> os direitos patrimoniais sobre o código-fonte sob medida e o layout desenvolvidos especificamente para este projeto, assegurando o direito de utilizar, reproduzir, modificar (por si ou por terceiros) e hospedar a aplicação onde preferir. Até a quitação, a CONTRATANTE goza de direito de uso normal e precário.</p>
                  <p><strong>13.2.1.</strong> Na hipótese de rescisão antecipada legítima deste contrato na forma da Cláusula 17.1, caso a <strong>CONTRATANTE</strong> tenha quitado as parcelas proporcionais devidas até a fase correspondente da entrega, ser-lhe-á concedida a licença definitiva e não exclusiva de uso e modificação do código-fonte e do layout no estado em que se encontrarem, restrita exclusivamente ao projeto "Nua Borges".</p>
                  <p><strong>13.3.</strong> Permanecem sob titularidade do <strong>CONTRATADO</strong> as bibliotecas genéricas, ferramentas reutilizáveis, rotinas de infraestrutura e conhecimentos técnicos desenvolvidos independentemente deste contrato. Sobre esses elementos, é concedida à <strong>CONTRATANTE</strong> licença perpétua, irrevogável e gratuita para uso e modificação no âmbito deste website. O CONTRATADO não reutilizará o layout específico e a identidade visual da CONTRATANTE em outros projetos.</p>
                  <p><strong>13.4.</strong> Módulos open-source e bibliotecas de terceiros permanecem regidos por suas licenças originárias.</p>
                  <p><strong>13.5.</strong> Fica resguardado ao <strong>CONTRATADO</strong> o direito moral de ser identificado como autor técnico do software (Lei nº 9.609/1998, art. 2º, §1º), cabendo à <strong>CONTRATANTE</strong> a faculdade de solicitar a remoção ou preservação do crédito de rodapé.</p>
                </Clausula>

                <Clausula num="14" title="Da Confidencialidade">
                  <p><strong>14.1.</strong> As partes comprometem-se a resguardar sigilo sobre quaisquer informações confidenciais, dados de visitantes, credenciais de acesso, estratégias comerciais, código-fonte e métricas privadas recebidas em virtude deste contrato, durante a sua vigência e pelo prazo de 5 (cinco) anos subsequentes ao término. Para credenciais técnicas e senhas de acesso, o dever de sigilo perdura por prazo indeterminado.</p>
                  <p><strong>14.2.</strong> Não são confidenciais as informações que já sejam públicas sem violação deste contrato, sendo autorizada a revelação estritamente exigida por lei ou autoridade judicial competente, mediante aviso prévio à outra parte quando juridicamente viável.</p>
                </Clausula>

                {/* CLÁUSULA 15 — LGPD */}
                <Clausula num="15" title="Da Proteção de Dados Pessoais (LGPD)" highlight>
                  <p><strong>15.1.</strong> Quanto aos dados pessoais de visitantes coletados através do portal (mensagens do formulário de contato, perguntas enviadas, registros de data/hora, endereço IP, país de origem, navegador e referrer), a <strong>CONTRATANTE</strong> atua na qualidade de <strong>Controladora</strong> e o <strong>CONTRATADO</strong> atua como <strong>Operador</strong> (Lei nº 13.709/2018, art. 5º, VI e VII), realizando o tratamento exclusivamente para fins operacionais de hospedagem, segurança, diagnóstico de rede e estatísticas de uso, de acordo com as instruções da Controladora.</p>
                  <p><strong>15.2.</strong> A <strong>CONTRATANTE</strong> autoriza expressamente o <strong>CONTRATADO</strong> a acessar os registros de telemetria técnica e logs de auditoria, inclusive por meio de painel administrativo técnico, com o propósito exclusivo de monitoramento de integridade, mitigação de falhas e segurança. Esse acesso constará da Política de Privacidade do portal e poderá ser revogado a qualquer tempo pela CONTRATANTE.</p>
                  <p><strong>15.3.</strong> A Cloudflare atua como suboperadora de infraestrutura com rede global. A Política de Privacidade refletirá com exatidão os tratamentos realizados, incluindo a retenção técnica de logs de auditoria e IP por prazo de até 6 (seis) meses para garantia da segurança da aplicação, salvo necessidade legal de conservação.</p>
                  <p><strong>15.4.</strong> O <strong>CONTRATADO</strong> adotará medidas técnicas e administrativas razoáveis de proteção e comunicará à <strong>CONTRATANTE</strong>, no prazo de até 2 (dois) dias úteis da ciência inequívoca, qualquer incidente relevante de segurança que possa comprometer dados pessoais.</p>
                  <p><strong>15.5.</strong> Findo o contrato, o <strong>CONTRATADO</strong> eliminará os dados pessoais eventualmente mantidos fora da infraestrutura da CONTRATANTE, respeitadas as hipóteses legais de guarda (art. 16 da LGPD).</p>
                </Clausula>

                <Clausula num="16" title="Do Portfólio Profissional">
                  <p><strong>16.1.</strong> A <strong>CONTRATANTE</strong> autoriza o <strong>CONTRATADO</strong> a mencionar a autoria técnica do projeto e a exibir capturas de tela do website em seu portfólio profissional e redes de tecnologia, desde que não contenham imagens íntimas ou sensuais, credenciais, dados de visitantes ou métricas financeiras privadas.</p>
                  <p><strong>16.2.</strong> A <strong>CONTRATANTE</strong> poderá, a qualquer tempo, solicitar motivadamente a substituição ou retirada de capturas que contenham sua imagem, permanecendo inalterada a prerrogativa de menção à autoria técnica do desenvolvimento.</p>
                </Clausula>

                <Clausula num="17" title="Da Extinção do Contrato">
                  <p><strong>17.1. Resilição durante o desenvolvimento:</strong> Antes da homologação final, qualquer das partes poderá resilar o contrato mediante notificação prévia por escrito com antecedência mínima de 15 (quinze) dias corridos. Os valores devidos serão apurados proporcionalmente: até a aprovação do layout, 30% do valor total; até a disponibilização para homologação, 80% do valor total; e após a homologação, 100% do preço, mantido o cronograma de parcelamento original. Eventuais valores pagos a maior serão restituídos em até 10 (dez) dias úteis.</p>
                  <p><strong>17.2. Resolução por inadimplemento:</strong> O descumprimento injustificado de qualquer obrigação contratual não sanado no prazo de 10 (dez) dias após notificação escrita autoriza a parte inocente a resolver o contrato de pleno direito (Código Civil, art. 474), sem prejuízo da apuração de perdas e danos comprovados (art. 475).</p>
                  <p><strong>17.3. Garantia e suporte:</strong> Homologado o projeto, o <strong>CONTRATADO</strong> não poderá rescindir imotivadamente a garantia de defeitos (Cláusula 6.2) nem o suporte incluído (Cláusula 6.3) antes do término do prazo de 12 meses. O suporte continuado posterior (Cláusula 6.4) seguirá o aviso prévio de 60 dias ali pactuado.</p>
                  <p><strong>17.4. Efeitos da extinção:</strong> Em qualquer hipótese de rescisão, o <strong>CONTRATADO</strong>, no prazo de até 10 (dez) dias úteis e mediante a quitação das parcelas vencidas e proporcionais devidas até então (observada a Cláusula 13.2.1), entregará à <strong>CONTRATANTE</strong> o código-fonte atualizado no estado em que se encontrar, credenciais e exportação de mídias, prestando até 2 (duas) horas de transição técnica a outro profissional por ela designado. Nenhuma das partes reterá bens, códigos ou arquivos da outra como mecanismo coercitivo de cobrança.</p>
                  <p><strong>17.5.</strong> A morte ou incapacidade permanente de qualquer das partes extingue as obrigações personalíssimas de prestação de serviços (Código Civil, art. 607), resguardados os direitos de propriedade intelectual da Cláusula 13.</p>
                </Clausula>

                {/* CLÁUSULA 18 — SEGURANÇA */}
                <Clausula num="18" title="Da Segurança da Informação e Gestão de Acessos" highlight>
                  <p><strong>18.1.</strong> O <strong>CONTRATADO</strong> adotou as medidas técnicas de segurança descritas no Anexo I, item 05, e prestará correções de vulnerabilidade no código original durante a garantia de 12 meses (Cláusula 6.2). As medidas implementadas reduzem riscos operacionais, mas não consubstanciam garantia de invulnerabilidade absoluta (Cláusula 12.2).</p>
                  <p><strong>18.2.</strong> A <strong>CONTRATANTE</strong> é a única responsável pela guarda confidencial de suas senhas, pela ativação obrigatória de autenticação em dois fatores (2FA) em suas contas de e-mail e Cloudflare, e pela segurança dos dispositivos que utiliza. O <strong>CONTRATADO</strong> não responderá por incidentes decorrentes de senhas fracas, repasse voluntário de credenciais a terceiros, golpes de engenharia social (phishing) ou malwares presentes nos aparelhos da CONTRATANTE.</p>
                </Clausula>

                <Clausula num="19" title="Das Disposições Gerais">
                  <ContractList items={[
                    <>Toda e qualquer alteração a este instrumento será formalizada por aditivo escrito e assinado pelas partes, inclusive pelo meio de aceite eletrônico da Cláusula 19.4;</>,
                    <>Notificações, solicitações de suporte, orçamentos e comunicações oficiais são plenamente válidas quando encaminhadas aos e-mails ou números de WhatsApp cadastrados na Cláusula 1;</>,
                    <><strong>Cláusula de Substituição Integral:</strong> O presente contrato (Versão Definitiva 1.1) substitui, revoga e cancela integralmente todas as versões, minutas, arquivos PDF anteriores, termos de entrega e entendimentos verbais ou escritos pretéritos sobre o mesmo objeto. Em caso de conflito entre o contrato e o Anexo I, prevalecem as disposições do contrato;</>,
                    <><strong>Validade do Aceite Eletrônico:</strong> As partes reconhecem expressamente como plenamente válido, eficaz e dotado de força probatória, nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, o aceite eletrônico colhido na página digital do contrato, acompanhado do registro de carimbo de data/hora, endereço IP, user-agent e hash criptográfico SHA-256 do documento;</>,
                    <>A tolerância perante eventual descumprimento temporário constituirá mera liberalidade, não implicando novação ou renúncia de direitos. A nulidade de qualquer disposição não afetará as demais (Código Civil, art. 184). Este contrato não estabelece vínculo trabalhista nem exclusividade comercial entre as partes.</>,
                  ]} />
                </Clausula>

                <Clausula num="20" title="Do Foro de Eleição" highlight>
                  <p>Para dirimir quaisquer controvérsias decorrentes deste contrato, as partes elegem expressamente o <strong>foro da Circunscrição Judiciária de Brasília/Distrito Federal</strong>, com expressa renúncia a qualquer outro, por mais privilegiado que seja, reconhecendo a natureza civil e empresarial da relação jurídica entre profissionais independentes.</p>
                </Clausula>

                {/* Fecho definitivo e Assinaturas */}
                <div className="pt-10 border-t border-zinc-800/60 print:border-zinc-300 mt-10 print:mt-6 space-y-8">
                  <div className="text-center space-y-2">
                    <p className="font-serif text-sm text-zinc-300 print:text-black">
                      Brasília/DF — República da Irlanda, 2026.
                    </p>
                    <p className="text-xs text-zinc-500 print:text-zinc-600 leading-relaxed max-w-xl mx-auto">
                      E, por estarem assim justas e contratadas, as partes firmam o presente instrumento em conformidade com as disposições legais e manifestam sua concordância formal.
                    </p>
                  </div>

                  {/* Status Geral de Assinatura */}
                  {bothSigned ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/40 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm print:text-black">Contrato 100% Homologado & Assinado por Ambos</p>
                          <p className="text-[11px] text-emerald-300/80 print:text-zinc-600">Ambas as partes assinaram eletronicamente com registro de auditoria criptográfica e validade jurídica.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 shrink-0 print:hidden cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Baixar Contrato Oficial em PDF
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs flex items-center justify-between gap-3 print:hidden">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#f4a7b9] shrink-0" />
                        <span>
                          O arquivo PDF oficial consolidado será liberado para download imediatamente após a assinatura de ambas as partes.
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
                        {signatures.contractor || signatures.client ? '1 de 2 Assinaturas' : '0 de 2 Assinaturas'}
                      </span>
                    </div>
                  )}

                  {/* Campos de Assinatura Dinâmicos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                    {/* CONTRATADO - JOÃO PHILIPPE */}
                    <div className="text-center space-y-2 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 print:p-0 print:border-none print:bg-transparent flex flex-col justify-between">
                      <div>
                        {signatures.contractor ? (
                          <div className="space-y-2">
                            <div className="h-16 flex items-center justify-center mb-1">
                              {signatures.contractor.signatureDataUrl ? (
                                <img
                                  src={signatures.contractor.signatureDataUrl}
                                  alt="Assinatura João Philippe"
                                  className="max-h-16 max-w-full object-contain filter invert print:filter-none"
                                />
                              ) : (
                                <span className="font-serif italic text-lg text-[#f4a7b9] print:text-black">
                                  {signatures.contractor.name}
                                </span>
                              )}
                            </div>
                            <div className="w-full border-b border-zinc-500 print:border-black mb-2"></div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="h-16 flex items-center justify-center text-zinc-600 text-xs italic">
                              Aguardando assinatura digital
                            </div>
                            <div className="w-full border-b border-dashed border-zinc-700 print:border-black mb-2"></div>
                          </div>
                        )}

                        <p className="font-semibold text-xs sm:text-sm text-white print:text-black">JOÃO PHILIPPE DE OLIVEIRA BOECHAT</p>
                        <p className="text-[11px] text-zinc-400 print:text-zinc-700">CONTRATADO — Desenvolvedor Web</p>
                        <p className="text-[10px] text-zinc-500 print:text-zinc-600 font-mono">CPF: 053.795.071-07 · Tel: (61) 99361-9554</p>
                      </div>

                      {signatures.contractor ? (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 print:border-zinc-300 text-left space-y-1 bg-emerald-950/20 print:bg-emerald-50/50 p-3 rounded-xl border border-emerald-500/20">
                          <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-semibold text-[11px]">
                            <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Assinado Eletronicamente</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 print:text-zinc-600">
                            Data/Hora: {new Date(signatures.contractor.signedAt).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.contractor.certificateHash}>
                            Cert: {signatures.contractor.certificateHash.slice(0, 24)}...
                          </p>
                        </div>
                      ) : (
                        <div className="pt-3 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleOpenSignModal('contractor')}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e0859a] text-zinc-950 font-semibold text-xs hover:opacity-95 shadow-md shadow-[#f4a7b9]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            Assinar como Contratado
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CONTRATANTE - NAYARA BORGES */}
                    <div className="text-center space-y-2 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 print:p-0 print:border-none print:bg-transparent flex flex-col justify-between">
                      <div>
                        {signatures.client ? (
                          <div className="space-y-2">
                            <div className="h-16 flex items-center justify-center mb-1">
                              {signatures.client.signatureDataUrl ? (
                                <img
                                  src={signatures.client.signatureDataUrl}
                                  alt="Assinatura Nayara Borges"
                                  className="max-h-16 max-w-full object-contain filter invert print:filter-none"
                                />
                              ) : (
                                <span className="font-serif italic text-lg text-[#f4a7b9] print:text-black">
                                  {signatures.client.name}
                                </span>
                              )}
                            </div>
                            <div className="w-full border-b border-zinc-500 print:border-black mb-2"></div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="h-16 flex items-center justify-center text-zinc-600 text-xs italic">
                              Aguardando assinatura digital
                            </div>
                            <div className="w-full border-b border-dashed border-zinc-700 print:border-black mb-2"></div>
                          </div>
                        )}

                        <p className="font-semibold text-xs sm:text-sm text-white print:text-black">NAYARA BORGES DA COSTA</p>
                        <p className="text-[11px] text-zinc-400 print:text-zinc-700">CONTRATANTE — &ldquo;Nua Borges&rdquo;</p>
                        <p className="text-[10px] text-zinc-500 print:text-zinc-600 font-mono">CPF: 0832051073 · WhatsApp: +353 83 205 1073</p>
                      </div>

                      {signatures.client ? (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 print:border-zinc-300 text-left space-y-1 bg-emerald-950/20 print:bg-emerald-50/50 p-3 rounded-xl border border-emerald-500/20">
                          <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-semibold text-[11px]">
                            <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Assinado Eletronicamente</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 print:text-zinc-600">
                            Data/Hora: {new Date(signatures.client.signedAt).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.client.certificateHash}>
                            Cert: {signatures.client.certificateHash.slice(0, 24)}...
                          </p>
                        </div>
                      ) : (
                        <div className="pt-3 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleOpenSignModal('client')}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e0859a] text-zinc-950 font-semibold text-xs hover:opacity-95 shadow-md shadow-[#f4a7b9]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            Assinar como Contratante
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA ANEXO I */}
            {tab === 'anexo' && (
              <div className="space-y-10 print:space-y-5">
                <Nota><strong>ANEXO I AO CONTRATO:</strong> Este memorial descritivo delimita com clareza as funcionalidades, componentes e infraestrutura entregues no projeto. Em caso de divergência com o contrato, prevalecem as disposições do contrato.</Nota>

                <Clausula num="01" title="Identificação do Projeto e Objetivo">
                  <p><strong>Nome:</strong> Plataforma Digital Oficial Nua Borges & Sistema de Gerenciamento de Conteúdo (CMS).</p>
                  <p><strong>Propósito:</strong> Portal web com identidade visual aprovada pela CONTRATANTE, destinado a portfólio artístico, canal de assessoria comercial e direcionamento oficial para suas plataformas de conteúdo autoral.</p>
                </Clausula>

                <Clausula num="02" title="Estrutura do Site Público (Front-end)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-1.5">
                    {[
                      { label: 'Cabeçalho Fixo Global', desc: 'Barra flutuante com efeito glassmorphism, logotipo oficial, menu responsivo (drawer mobile) e botões CTA para OnlyFans e Instagram.' },
                      { label: 'Seção Capa (Hero)', desc: 'Carrossel fotográfico editorial com fotos verticais e transições suaves, com fluidez condicionada ao dispositivo e navegador do visitante.' },
                      { label: 'Galeria de Ensaios', desc: 'Esteira contínua infinita (Infinite Marquee) com pausa ao interagir e visualizador Lightbox em tela cheia.' },
                      { label: 'Seção Manifesto & Biografia', desc: 'Apresentação editorial com retrato autoral, titulação oficial, pull quote e assinatura artística.' },
                      { label: 'Canais Oficiais & Redes', desc: 'Cards parametrizados para OnlyFans e Instagram, além de banner para contato comercial.' },
                      { label: 'Modal de Contato', desc: 'Formulário com validação que aciona o aplicativo de e-mail do visitante (mailto:) com campos preenchidos e registra cópia no log do painel.' },
                      { label: 'Rodapé Institucional', desc: 'Créditos da marca, links de navegação secundária e menção de direitos reservados.' },
                      { label: 'Player Musical Editorial', desc: 'Motor híbrido MP3 e YouTube IFrame API, equalizador sincronizado via Web Audio API, pílula miniaturizada e fade de volume.' },
                    ].map(({ label, desc }) => (
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
                        ['Aba 1 — Capa', 'Edição e ordenação dos slides da seção Hero.'],
                        ['Aba 2 — Biblioteca de Mídia', 'Upload e gestão de imagens (JPG, PNG, WebP, AVIF) e vídeos (MP4, WebM), com otimização automática e detecção de duplicatas.'],
                        ['Aba 3 — Galeria', 'Ativação/pausa de fotos e legendas curatoriais.'],
                        ['Aba 4 — Sobre Mim', 'Gestão de biografia, manifesto e foto de perfil.'],
                        ['Aba 5 — Redes', 'Edição dos cards e links oficiais de redes sociais e OnlyFans.'],
                        ['Aba 6 — Contato', 'Configuração de e-mail e assuntos do modal de contato.'],
                        ['Aba 7 — Música', 'Gerenciador do player: links do YouTube, uploads de MP3 e controle de playlist.'],
                        ['Aba 8 — SEO & Ajustes', 'Título, meta description, Open Graph (WhatsApp/Instagram/Telegram) e alteração de senha mestra.'],
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
                  <ContractList items={[
                    <><strong>Framework Base:</strong> Next.js 15 (App Router) + React 19 na data da entrega. Migrações de versão maior são serviço novo (Cláusula 7);</>,
                    <><strong>Arquitetura:</strong> Jamstack Serverless com Edge Functions de baixa latência;</>,
                    <><strong>Hospedagem & CDN:</strong> Cloudflare Pages Global Edge Network. O desempenho efetivo depende da qualidade de conexão e hardware do visitante;</>,
                    <><strong>Armazenamento de Mídia:</strong> Cloudflare R2 Object Storage com CDN dedicada e Zero Egress Fees;</>,
                    <><strong>Animações:</strong> Motion (Framer Motion v12) + Tailwind CSS v4.</>,
                  ]} />
                </Clausula>

                <Clausula num="05" title="Medidas de Segurança Adotadas na Entrega">
                  <ContractList items={[
                    'Criptografia SSL/TLS Universal com HSTS Preload configurado;',
                    'Cabeçalhos de Segurança Estritos (Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff);',
                    'Middleware com arquitetura Fail-Closed para rotas restritas;',
                    'Inspeção binária de arquivos enviados (Magic Bytes) na biblioteca de mídia;',
                    'Higienização contra injeções XSS e proteção anti-IDOR;',
                    'As medidas reduzem riscos consideravelmente, sem promessa de invulnerabilidade absoluta (Cláusulas 12 e 18).',
                  ]} />
                </Clausula>

                <Clausula num="06" title="SEO & Acessibilidade">
                  <ContractList items={[
                    'Meta tags dinâmicas e marcação estruturada JSON-LD (ProfilePage, Person, WebSite);',
                    'Suporte completo a Open Graph para pré-visualização no WhatsApp, Telegram, Instagram e X;',
                    'Acessibilidade conforme HTML5 semântico e rótulos ARIA;',
                    'Design responsivo mobile-first.',
                  ]} />
                </Clausula>

                <Clausula num="07" title="Delimitação de Escopo">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-2">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 print:p-2.5 print:bg-transparent print:border print:border-zinc-300">
                      <strong className="block text-[11px] print:text-[8.5pt] uppercase tracking-widest text-emerald-400 print:text-black mb-1">Inclusos:</strong>
                      <p className="text-xs print:text-[8pt] text-zinc-300 print:text-zinc-700 leading-relaxed">Portal web completo, CMS autônomo, implantação em Cloudflare Pages/R2, regras de segurança, player de música, apontamento de DNS, período de homologação, garantia e suporte delimitados na Cláusula 6 do contrato.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 print:p-2.5 print:bg-transparent print:border print:border-zinc-300">
                      <strong className="block text-[11px] print:text-[8.5pt] uppercase tracking-widest text-zinc-300 print:text-black mb-1">Não Inclusos:</strong>
                      <p className="text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">Streaming e hospedagem massiva de vídeos pesados, anuidade de domínio, criação/captação de conteúdos, desenvolvimento de aplicativos móveis nativos, gateways de pagamento e custeio de serviços de terceiros.</p>
                    </div>
                  </div>
                </Clausula>

                <Clausula num="08" title="Termo de Homologação">
                  <p className="text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">A entrega e aceite do projeto consolidam-se mediante disponibilização do portal e do painel administrativo no domínio oficial (ou subdomínio de homologação) e cumprimento do rito de homologação previsto na Cláusula 6.1 do contrato.</p>
                </Clausula>

                <Clausula num="09" title="Recursos Adicionais, Navegadores Suportados e Limites">
                  <div className="space-y-2 text-xs print:text-[8pt] text-zinc-400 print:text-zinc-700 leading-relaxed">
                    <p>• <strong>Recursos Adicionais Entregues por Liberalidade:</strong> Módulo de perguntas anônimas ("Asks"); gravador de vídeo vertical com teleprompter integrado; páginas institucionais de Termos de Uso e Política de Privacidade; e painel técnico de auditoria e estatísticas (Cláusula 15.2).</p>
                    <p>• <strong>Navegadores Suportados:</strong> As duas últimas versões estáveis dos navegadores Google Chrome, Apple Safari, Microsoft Edge e Mozilla Firefox, em ambientes operacionais móveis (iOS e Android) e desktop (Windows e macOS).</p>
                    <p>• <strong>Limites Técnicos do Plano Gratuito Cloudflare:</strong> Uploads de fotos de até 15 MB e vídeos curtos de até 25 MB; limites de leitura/escrita diários conforme as cotas padrão do plano gratuito da Cloudflare (Cláusula 9.3).</p>
                  </div>
                </Clausula>
              </div>
            )}

          </article>
        </main>

        {/* MODAL DE ASSINATURA ELETRÔNICA */}
        <AnimatePresence>
          {signModalParty !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left my-8"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#f4a7b9] font-medium text-xs">
                      <PenTool className="w-4 h-4" />
                      <span>ASSINATURA ELETRÔNICA QUALIFICADA</span>
                    </div>
                    <h3 className="text-lg font-serif font-bold text-white">
                      {signModalParty === 'contractor'
                        ? 'Assinar como Contratado'
                        : 'Assinar como Contratante'}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {signModalParty === 'contractor'
                        ? 'João Philippe de Oliveira Boechat (CPF: 053.795.071-07)'
                        : 'Nayara Borges da Costa — "Nua Borges" (CPF: 0832051073)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseSignModal}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitSignature} className="space-y-4">
                  {/* Tipo de Assinatura: Rubrica vs Digitar */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-300 block">Formato da Assinatura:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignType('drawn')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          signType === 'drawn'
                            ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-[#f4a7b9]'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        Desenhar Rubrica
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignType('typed')}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          signType === 'typed'
                            ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-[#f4a7b9]'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Caligrafia com Nome
                      </button>
                    </div>
                  </div>

                  {/* Campo de Rubrica ou Texto */}
                  {signType === 'drawn' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 flex items-center justify-between">
                        <span>Desenhe abaixo com o dedo ou mouse:</span>
                        {drawnDataUrl && (
                          <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                            <Check className="w-3 h-3" /> Rubrica capturada
                          </span>
                        )}
                      </label>
                      <SignatureCanvas
                        onSave={(dataUrl) => setDrawnDataUrl(dataUrl)}
                        onClear={() => setDrawnDataUrl('')}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400">Nome completo a registrar:</label>
                      <input
                        type="text"
                        value={typedSignName}
                        onChange={(e) => setTypedSignName(e.target.value)}
                        placeholder="Nome Completo do Assinante"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-[#f4a7b9] focus:outline-none transition-colors"
                      />
                      {typedSignName.trim() && (
                        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                          <span className="text-[10px] text-zinc-500 block mb-1">Prévia da Caligrafia Digital:</span>
                          <span className="font-serif italic text-xl text-[#f4a7b9]">
                            {typedSignName.trim()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Termo de Concordância */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300 leading-relaxed">
                      <input
                        type="checkbox"
                        checked={signAgreed}
                        onChange={(e) => setSignAgreed(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-700 text-[#f4a7b9] focus:ring-[#f4a7b9] cursor-pointer"
                      />
                      <span>
                        Declaro sob as penas da lei que li e concordo integralmente com todas as cláusulas, obrigações, prazos e valores deste <strong>Contrato de Prestação de Serviços de Desenvolvimento Web</strong> e de seu <strong>Anexo I</strong>.
                      </span>
                    </label>
                  </div>

                  {/* Mensagem de Erro */}
                  {signError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{signError}</span>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseSignModal}
                      disabled={isSubmittingSign}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSign}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e0859a] text-zinc-950 font-semibold text-xs hover:opacity-95 shadow-lg shadow-[#f4a7b9]/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingSign ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Registrando Assinatura...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar Assinatura Digital
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* TOAST DE SUCESSO */}
        <AnimatePresence>
          {signSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 shadow-2xl flex items-center gap-3 backdrop-blur-md"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-white">Assinatura Gravada com Sucesso!</p>
                <p className="text-emerald-300/90">{signSuccessMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="py-8 text-center text-[11px] text-zinc-700 print:hidden border-t border-zinc-900/60">
          <p>Documento Oficial · Projeto Nua Borges · Todos os direitos reservados.</p>
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
