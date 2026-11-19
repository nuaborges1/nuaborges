/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Layers,
  Download,
  Copy,
  Check,
  ShieldCheck,
  X,
  Loader2,
  Clock,
} from 'lucide-react';
import type { ContractSignaturesState } from '@/components/nua/contract/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { printCSS } from '@/components/nua/contract/contractPrintStyles';
import { ContractAuthLockScreen } from '@/components/nua/contract/ContractAuthLockScreen';
import { ContractClausesView } from '@/components/nua/contract/ContractClausesView';
import { ContractAnexoView } from '@/components/nua/contract/ContractAnexoView';
import { ContractSignaturesCard } from '@/components/nua/contract/ContractSignaturesCard';
import { ContractSignModal } from '@/components/nua/contract/ContractSignModal';
import { generateTypedSignatureDataUrl } from '@/components/nua/contract/SignatureCanvas';
import { PublicBackground } from '@/components/nua/site/PublicBackground';

export type { SignatureRecord, ContractSignaturesState } from '@/components/nua/contract/types';

const AUTH_KEY = 'nua_contract_auth_v2';
type Tab = 'contrato' | 'anexo';

const DEFAULT_CANONICAL_SIGNATURES: ContractSignaturesState = {
  contractor: {
    id: 'e1d47ea3-a528-480a-8e14-ae4013118d59',
    party: 'contractor',
    name: 'João Philippe de Oliveira Boechat',
    role: 'CONTRATADO — Desenvolvedor Web',
    cpf: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    signedAt: '2026-10-20T02:56:23.819Z',
    ip: '127.0.0.1',
    userAgent: 'Antigravity / Nua Borges Digital System',
    signatureType: 'typed',
    certificateHash: '7ec3c6733aa2f295ff5a3fe546a272bd59534bdb696e2f488e6f10d8d158837c',
    verified: true,
  },
  client: {
    id: 'c8913b5e-0498-444a-a032-132d73315998',
    party: 'client',
    name: 'Nayara Borges da Costa',
    role: 'CONTRATANTE — "Nua Borges"',
    cpf: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    signedAt: '2026-10-20T02:56:23.819Z',
    ip: '127.0.0.1',
    userAgent: 'Antigravity / Nua Borges Digital System',
    signatureType: 'typed',
    certificateHash: 'b9ec17b3bf9448eaebae1468ec2882a9d80d24ee437a3c3c73400788647fb3b2',
    verified: true,
  },
};

export default function ContratoPage() {
  const [auth, setAuth] = useState<boolean>(false);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('contrato');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [signatures, setSignatures] = useState<ContractSignaturesState>(DEFAULT_CANONICAL_SIGNATURES);
  const [signModalParty, setSignModalParty] = useState<'contractor' | 'client' | null>(null);
  const [isSubmittingSign, setIsSubmittingSign] = useState<boolean>(false);
  const [signError, setSignError] = useState<string>('');
  const [, setSignSuccessMessage] = useState<string>('');

  const isContractorSigned = Boolean(signatures.contractor || (signatures as any).contractorSigned);
  const isClientSigned = Boolean(signatures.client || (signatures as any).clientSigned);
  const bothSigned = Boolean(isContractorSigned && isClientSigned);

  const fetchSignatures = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('nua_contract_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/contract/sign`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSignatures((prev) => ({
          ...prev,
          ...data,
          contractor: data.contractor || prev.contractor,
          client: data.client || prev.client,
        }));
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
        const apiUrl = getPublicApiUrl();
        const res = await fetch(`${apiUrl}/api/auth/contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: clean }),
        });

        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { token?: string };
          try {
            sessionStorage.setItem(AUTH_KEY, 'true');
            sessionStorage.setItem('nua_contract_pwd', clean);
            if (data.token) {
              sessionStorage.setItem('nua_contract_token', data.token);
            }
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
      sessionStorage.removeItem('nua_contract_token');
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
    if (signatures[party]) return;
    setSignModalParty(party);
    setSignError('');
  };

  const handleCloseSignModal = () => {
    setSignModalParty(null);
    setSignError('');
  };

  const handleSubmitSignature = async (
    e: React.FormEvent,
    payload: {
      signType: 'drawn' | 'typed';
      drawnDataUrl: string;
      typedSignName: string;
      signPassword: string;
      signAgreed: boolean;
    }
  ) => {
    e.preventDefault();
    if (!signModalParty) return;

    if (signatures[signModalParty]) {
      setSignError('Esta assinatura já foi registrada e possui registro definitivo e imutável.');
      return;
    }

    if (!payload.signAgreed) {
      setSignError('É obrigatório declarar concordância formal com as cláusulas do contrato.');
      return;
    }

    let finalDataUrl = '';
    if (payload.signType === 'drawn') {
      if (!payload.drawnDataUrl) {
        setSignError('Por favor, desenhe sua rubrica no quadro acima.');
        return;
      }
      finalDataUrl = payload.drawnDataUrl;
    } else {
      if (!payload.typedSignName.trim()) {
        setSignError('Por favor, digite seu nome completo.');
        return;
      }
      finalDataUrl = generateTypedSignatureDataUrl(payload.typedSignName.trim());
    }

    const savedPwd = (typeof window !== 'undefined' ? sessionStorage.getItem('nua_contract_pwd') : '') || pwd;
    const finalPwd = (payload.signPassword || savedPwd).trim();

    if (!finalPwd) {
      setSignError('Por favor, informe a chave de confirmação da assinatura.');
      return;
    }

    if (finalPwd) {
      try {
        sessionStorage.setItem('nua_contract_pwd', finalPwd);
      } catch {
        /* noop */
      }
    }

    setIsSubmittingSign(true);
    setSignError('');

    try {
      const { computeCanonicalContractHash } = await import('@/lib/contractCanonical');
      const documentHash = await computeCanonicalContractHash();

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('nua_contract_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/contract/sign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          party: signModalParty,
          password: finalPwd,
          signatureDataUrl: finalDataUrl,
          signatureType: payload.signType,
          signerName: payload.typedSignName.trim(),
          documentHash,
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

  if (!auth) {
    return (
      <ContractAuthLockScreen
        printCSS={printCSS}
        pwd={pwd}
        setPwd={setPwd}
        error={error}
        setError={setError}
        showPwd={showPwd}
        setShowPwd={setShowPwd}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />

      <div className="min-h-screen bg-black text-zinc-200 selection:bg-[#661C30] selection:text-white print:bg-white print:text-black relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        {/* TOOLBAR */}
        <header className="contract-toolbar sticky top-0 z-50 bg-[#09090c]/95 backdrop-blur-md border-b border-zinc-800/70 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-8">
            <div className="flex items-center justify-between gap-3 py-3">
              <Link href="/" className="flex items-center gap-1.5 group shrink-0" title="Voltar ao site">
                <span className="font-serif text-sm tracking-[0.2em] uppercase text-white group-hover:text-[#90364B] transition-colors">
                  Nua Borges
                </span>
                <span className="text-[#90364B] text-xs">♡</span>
              </Link>

              <div className="flex items-center gap-1.5 sm:gap-2">
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
                    <Clock className="w-3.5 h-3.5 text-[#90364B]" />
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
                      ? 'border-[#90364B] text-[#90364B]'
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
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Contrato Oficial de Prestação de Serviços</p>
                <p className="text-[11px] text-zinc-400 font-light">
                  Versão consolidada com memorial de escopo, garantias e termos de suporte técnico delimitados.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#90364B] shrink-0 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Versão Definitiva 1.2
            </span>
          </div>

          <article className="contract-paper bg-[#0b0b0e] border border-zinc-800/80 rounded-3xl p-5 sm:p-10 md:p-14 shadow-2xl print:bg-transparent print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0">
            <div className="hidden print:block text-right text-[8pt] text-zinc-500 border-b border-zinc-300 pb-1.5 mb-5">
              <span>NUA BORGES — INSTRUMENTO CONTRATUAL — VERSÃO 1.2</span>
            </div>

            <div className="contract-header border-b border-zinc-800/60 pb-8 mb-10 print:border-zinc-300 print:pb-4 print:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#90364B] print:text-zinc-600 mb-2 print:text-[8pt]">
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
                  <span className="block text-[#90364B] print:text-zinc-600 text-[10px] print:text-[8pt] mt-0.5">Versão Definitiva 1.2</span>
                </div>
              </div>
              <p className="text-zinc-400 print:text-zinc-700 text-xs sm:text-sm font-light leading-relaxed max-w-3xl print:text-[8.5pt]">
                {tab === 'contrato'
                  ? 'Pelo presente instrumento particular, as partes abaixo identificadas têm, entre si, justo e contratado o presente Contrato de Prestação de Serviços de Desenvolvimento Web, mediante as cláusulas e condições seguintes.'
                  : 'Detalhamento técnico e funcional integral de todas as páginas, galeria, motor sonoro, painel administrativo (CMS) e infraestrutura em nuvem que compõem o projeto acordado entre as partes.'}
              </p>
            </div>

            {tab === 'contrato' && (
              <div className="space-y-8 print:space-y-5">
                <ContractClausesView />
                <ContractSignaturesCard
                  signatures={signatures}
                  bothSigned={bothSigned}
                  onOpenSignModal={handleOpenSignModal}
                  onDownloadPdf={handleDownloadPdf}
                  isGeneratingPdf={isGeneratingPdf}
                />
              </div>
            )}

            {tab === 'anexo' && <ContractAnexoView />}
          </article>
        </main>

        <ContractSignModal
          signModalParty={signModalParty}
          onClose={handleCloseSignModal}
          onSubmit={handleSubmitSignature}
          isSubmitting={isSubmittingSign}
          signError={signError}
          setSignError={setSignError}
        />
      </div>
    </>
  );
}
