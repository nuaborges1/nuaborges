/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  ShieldCheck,
  Clock,
  Download,
  Loader2,
  BadgeCheck,
  PenTool,
} from 'lucide-react';
import type { ContractSignaturesState } from './types';

interface ContractSignaturesCardProps {
  signatures: ContractSignaturesState;
  bothSigned: boolean;
  onOpenSignModal: (party: 'contractor' | 'client') => void;
  onDownloadPdf: () => void;
  isGeneratingPdf: boolean;
}

export function ContractSignaturesCard({
  signatures,
  bothSigned,
  onOpenSignModal,
  onDownloadPdf,
  isGeneratingPdf,
}: ContractSignaturesCardProps) {
  return (
    <div className="space-y-6 pt-6 border-t border-zinc-800/80 print:border-zinc-300">
      <div className="text-center space-y-2">
        <p className="font-serif text-sm text-zinc-300 print:text-black">
          Brasília/DF (Brasil) — República da Irlanda, 2026.
        </p>
        <p className="text-xs text-zinc-500 print:text-zinc-600 leading-relaxed max-w-xl mx-auto">
          E, por estarem assim justas e contratadas, as partes firmam o presente instrumento por meio de assinatura eletrônica (simples ou avançada), com plena validade, eficácia jurídica e força probatória nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020, produzindo todos os efeitos jurídicos e legais.
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
            onClick={onDownloadPdf}
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
            <Clock className="w-4 h-4 text-[#90364B] shrink-0" />
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
                    <span className="font-serif italic text-lg text-[#90364B] print:text-black">
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
              {signatures.contractor.documentHash && (
                <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.contractor.documentHash}>
                  Doc SHA-256: {signatures.contractor.documentHash.slice(0, 24)}...
                </p>
              )}
              <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.contractor.certificateHash}>
                Cert: {signatures.contractor.certificateHash.slice(0, 24)}...
              </p>
            </div>
          ) : (
            <div className="pt-3 print:hidden">
              <button
                type="button"
                onClick={() => onOpenSignModal('contractor')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-bold text-xs shadow-md shadow-[#661C30]/30 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                    <span className="font-serif italic text-lg text-[#90364B] print:text-black">
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
            <p className="text-[10px] text-zinc-500 print:text-zinc-600 font-mono">CPF/Doc: 059.681.011-30 · WhatsApp: +353 83 205 1073</p>
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
              {signatures.client.documentHash && (
                <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.client.documentHash}>
                  Doc SHA-256: {signatures.client.documentHash.slice(0, 24)}...
                </p>
              )}
              <p className="text-[9px] text-zinc-500 print:text-zinc-600 font-mono truncate" title={signatures.client.certificateHash}>
                Cert: {signatures.client.certificateHash.slice(0, 24)}...
              </p>
            </div>
          ) : (
            <div className="pt-3 print:hidden">
              <button
                type="button"
                onClick={() => onOpenSignModal('client')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-bold text-xs shadow-md shadow-[#661C30]/30 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                Assinar como Contratante
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
