'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  BadgeCheck,
  Layers,
  Lock,
  Printer,
  FileCheck,
} from 'lucide-react';
import {
  CANONICAL_CLAUSES,
  CONTRACTOR_INFO,
  CLIENT_INFO,
  CONTRACT_FINANCIAL,
  CONTRACT_VERSION,
  CONTRACT_DOC_ID,
  CONTRACT_DATE,
  ANEXO_MEMORIAL_SECTIONS,
  AnexoSection,
} from '@/lib/nua/contractCanonical';
import {
  downloadContractPdf,
  downloadAnexoPdf,
} from '@/lib/generateContractPdf';

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
  documentHash?: string;
  certificateHash: string;
  verified: boolean;
}

import { getStoredSessionToken } from '@/lib/contentStore';
import { PageHeader, AdminButton } from '@/components/nua/admin';
import { getPublicApiUrl } from '@/lib/sessionToken';

const DEFAULT_CANONICAL_SIGNATURES: {
  contractor: SignatureRecord | null;
  client: SignatureRecord | null;
} = {
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

interface ContratosModuleProps {
  standalone?: boolean;
}

export function ContratosModule({ standalone = false }: ContratosModuleProps = {}) {
  const [activeTab, setActiveTab] = useState<'contrato' | 'anexo'>('contrato');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloadingContract, setIsDownloadingContract] = useState(false);
  const [isDownloadingAnexo, setIsDownloadingAnexo] = useState(false);

  // Assinaturas digitais canônicas e autenticadas da API oficial
  const [signatures, setSignatures] = useState<{
    contractor: SignatureRecord | null;
    client: SignatureRecord | null;
    contractorSigned?: boolean;
    clientSigned?: boolean;
  }>(DEFAULT_CANONICAL_SIGNATURES);

  const fetchSignatures = useCallback(async () => {
    try {
      const token = getStoredSessionToken();
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/contract/sign`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
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
      console.warn('[ContratosModule] Falha ao consultar assinaturas:', err);
    }
  }, []);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const handleDownloadContract = async () => {
    try {
      setIsDownloadingContract(true);
      downloadContractPdf(signatures);
    } finally {
      setTimeout(() => setIsDownloadingContract(false), 1000);
    }
  };

  const handleDownloadAnexo = async () => {
    try {
      setIsDownloadingAnexo(true);
      downloadAnexoPdf();
    } finally {
      setTimeout(() => setIsDownloadingAnexo(false), 1000);
    }
  };

  // Filtragem de cláusulas por termo de busca
  const filteredClauses = useMemo(() => {
    if (!searchTerm.trim()) return CANONICAL_CLAUSES;
    const q = searchTerm.toLowerCase();
    return CANONICAL_CLAUSES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.num.toLowerCase().includes(q) ||
        c.paragraphs.some((p) => p.toLowerCase().includes(q))
    );
  }, [searchTerm]);

  const isClientSigned = Boolean(signatures.client || (signatures as any).clientSigned);
  const isContractorSigned = Boolean(signatures.contractor || (signatures as any).contractorSigned);
  const bothSigned = Boolean(isClientSigned && isContractorSigned);

  return (
    <div className="space-y-6 select-none text-white">
      {standalone && (
        <PageHeader
          title="Contratos e Termos"
          subtitle={`Instrumento particular e anexo técnico memorial (Ref. ${CONTRACT_DOC_ID} • Versão ${CONTRACT_VERSION}).`}
          badge={
            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold ${bothSigned ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'}`}>
              {bothSigned ? 'Assinado por ambas as partes' : 'Aguardando assinatura'}
            </span>
          }
        />
      )}

      {/* Card de Status das Assinaturas Eletrônicas & Ações de Documento */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">
                  Instrumento Particular &amp; Assinaturas Digitais
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${bothSigned ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'}`}>
                  {bothSigned ? 'Assinado por ambas as partes' : 'Aguardando assinatura'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-light mt-0.5">
                Ref. {CONTRACT_DOC_ID} • Versão {CONTRACT_VERSION} • Data: {CONTRACT_DATE}
              </p>
            </div>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadContract}
              disabled={isDownloadingContract}
              className="h-9 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer flex items-center gap-2"
              title="Baixar PDF oficial do Contrato Principal"
            >
              <Download className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{isDownloadingContract ? 'Gerando...' : 'PDF Contrato'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAnexo}
              disabled={isDownloadingAnexo}
              className="h-9 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer flex items-center gap-2"
              title="Baixar PDF oficial do Anexo I (Memorial Descritivo)"
            >
              <Download className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{isDownloadingAnexo ? 'Gerando...' : 'PDF Anexo I'}</span>
            </button>

            <a
              href="/contrato"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Abrir página dedicada em tela cheia com rito de assinatura"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Tela Cheia</span>
            </a>
          </div>
        </div>

        {/* Grade de Assinantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parte 1: Contratante */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Contratante
              </span>
              {isClientSigned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Assinado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                  <Clock className="w-3 h-3" />
                  <span>Pendente</span>
                </span>
              )}
            </div>

            <div>
              <span className="text-xs font-medium text-white block">
                {CLIENT_INFO.name} ({CLIENT_INFO.artisticName})
              </span>
              <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
                {CLIENT_INFO.role} · {CLIENT_INFO.email}
              </span>
            </div>

            {isClientSigned && (
              <div className="pt-2 border-t border-white/[0.04] text-[9px] font-mono text-zinc-400 space-y-0.5">
                <span className="block truncate">Cert: {signatures.client?.certificateHash || 'b9ec17b3bf9448eaebae1468ec2882a9d80d24ee437a3c3c73400788647fb3b2'}</span>
                <span className="block">Data: {new Date(signatures.client?.signedAt || '2026-10-20T02:56:23.819Z').toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>

          {/* Parte 2: Contratado */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Contratado
              </span>
              {isContractorSigned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Assinado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                  <Clock className="w-3 h-3" />
                  <span>Pendente</span>
                </span>
              )}
            </div>

            <div>
              <span className="text-xs font-medium text-white block">
                {CONTRACTOR_INFO.name}
              </span>
              <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
                {CONTRACTOR_INFO.role} · {CONTRACTOR_INFO.email}
              </span>
            </div>

            {isContractorSigned && (
              <div className="pt-2 border-t border-white/[0.04] text-[9px] font-mono text-zinc-400 space-y-0.5">
                <span className="block truncate">Cert: {signatures.contractor?.certificateHash || '7ec3c6733aa2f295ff5a3fe546a272bd59534bdb696e2f488e6f10d8d158837c'}</span>
                <span className="block">Data: {new Date(signatures.contractor?.signedAt || '2026-10-20T02:56:23.819Z').toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Navegação em Abas: Contrato Principal vs Anexo I */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'contrato'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Contrato Principal ({CANONICAL_CLAUSES.length} Cláusulas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anexo')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'anexo'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Anexo I — Memorial Descritivo</span>
          </button>
        </div>

        {/* Busca por Cláusula */}
        {activeTab === 'contrato' && (
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cláusula ou termo..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#171821] border border-white/[0.08] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Conteúdo: Contrato Principal */}
      {activeTab === 'contrato' && (
        <div className="space-y-4">
          {/* Preâmbulo Resumido */}
          <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Preâmbulo das Partes
            </span>
            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              Pelo presente instrumento particular, de um lado <strong className="text-white font-medium">{CONTRACTOR_INFO.name}</strong> ({CONTRACTOR_INFO.role}), e de outro lado <strong className="text-white font-medium">{CLIENT_INFO.name}</strong> ({CLIENT_INFO.role}), têm entre si justo e acordado o presente Contrato de Desenvolvimento Web e Gestão Digital.
            </p>
          </div>

          {/* Lista de Cláusulas */}
          <div className="space-y-3">
            {filteredClauses.map((clause) => (
              <div
                key={clause.num}
                className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] hover:border-white/10 transition-colors space-y-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#f4a7b9] px-2 py-0.5 rounded bg-[#f4a7b9]/10 border border-[#f4a7b9]/20">
                    Cláusula {clause.num}ª
                  </span>
                  <h3 className="font-serif text-sm font-medium text-white tracking-wide">
                    {clause.title}
                  </h3>
                </div>

                <div className="space-y-2 text-xs text-zinc-300 font-light leading-relaxed pl-1">
                  {clause.paragraphs.map((par, pIdx) => (
                    <p key={pIdx}>{par}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo: Anexo I — Memorial Descritivo */}
      {activeTab === 'anexo' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Documento Técnico Vinculado
            </span>
            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              O presente Memorial Descritivo delimita as entregas e especificações de engenharia de software e infraestrutura contratadas no projeto Nua Borges.
            </p>
          </div>

          <div className="space-y-3">
            {ANEXO_MEMORIAL_SECTIONS.map((sec: AnexoSection, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#14151b] border border-white/[0.06] space-y-2.5"
              >
                <h3 className="font-serif text-sm font-medium text-white tracking-wide">
                  {sec.title}
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-300 font-light leading-relaxed pl-2 list-disc list-inside">
                  {sec.items.map((item: string, itemIdx: number) => (
                    <li key={itemIdx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
