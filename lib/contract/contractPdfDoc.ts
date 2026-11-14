import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CANONICAL_CLAUSES,
  CONTRACTOR_INFO,
  CLIENT_INFO,
  CONTRACT_FINANCIAL,
  CONTRACT_PREAMBLE,
  CONTRACT_CLOSING,
  CONTRACT_VERSION,
} from '../contractCanonical';

export interface ContractSignatureData {
  signedAt?: string;
  ip?: string;
  certificateHash?: string;
  documentHash?: string;
  signatureDataUrl?: string;
  signatureType?: 'drawn' | 'typed';
}

export function buildContractPdfDoc(
  signatures?: {
    contractor?: ContractSignatureData | null;
    client?: ContractSignatureData | null;
  },
  parties?: {
    contractor?: any;
    client?: any;
  }
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const cInfo = parties?.contractor || CONTRACTOR_INFO;
  const clInfo = parties?.client || CLIENT_INFO;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkNewPage(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 35) {
      doc.addPage();
      y = margin + 20;
      return true;
    }
    return false;
  }

  // === CABEÇALHO EXECUTIVO (PÁGINA 1) ===
  // Tag / Badge superior
  doc.setFillColor(244, 244, 246);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth / 2 - 130, y, 260, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y + 11, { align: 'center' });
  y += 26;

  // Título Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATO DE DESENVOLVIMENTO WEB & GESTÃO DIGITAL', pageWidth / 2, y, { align: 'center' });
  y += 14;

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Portal Web Autoral, CMS Autônomo, Implantação em Nuvem e Suporte Técnico', pageWidth / 2, y, { align: 'center' });
  y += 11;
  doc.text(`Projeto Nua Borges · Versão Definitiva ${CONTRACT_VERSION} · 2026`, pageWidth / 2, y, { align: 'center' });
  y += 16;

  // Linha divisória elegante
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Card Executivo de Resumo das Partes e Condições
  const cardHeight = 68;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, 'FD');

  const halfWidth = contentWidth / 2;
  const col1Left = margin + 12;
  const col2Left = margin + halfWidth + 8;

  // Coluna CONTRATADO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATADO:', col1Left, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(` ${cInfo.name}`, col1Left + 62, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(82, 82, 91);
  doc.text(`CPF: ${cInfo.cpf} · ${cInfo.address}`, col1Left, y + 24);
  doc.text(`WhatsApp: ${cInfo.phone} · ${cInfo.email}`, col1Left, y + 34);

  // Coluna CONTRATANTE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(24, 24, 27);
  doc.text('CONTRATANTE:', col2Left, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(` ${clInfo.name} ("${clInfo.artisticName || 'Nua Borges'}")`, col2Left + 68, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(82, 82, 91);
  doc.text(`CPF/Doc: ${clInfo.cpfFormatted || clInfo.cpf} · ${clInfo.address}`, col2Left, y + 24);
  doc.text(`WhatsApp: ${clInfo.phone} · ${clInfo.email}`, col2Left, y + 34);

  // Linha inferior do Card (Valores & Vigência)
  doc.setDrawColor(235, 235, 238);
  doc.setLineWidth(0.5);
  doc.line(col1Left, y + 43, margin + contentWidth - 12, y + 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(24, 24, 27);
  doc.text('VALOR GLOBAL:', col1Left, y + 56);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);
  doc.text(` ${CONTRACT_FINANCIAL.totalValue} (${CONTRACT_FINANCIAL.installmentsCount} parcelas de ${CONTRACT_FINANCIAL.installmentValue})`, col1Left + 66, y + 56);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 24, 27);
  doc.text('GARANTIA & SUPORTE:', col2Left, y + 56);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(82, 82, 91);
  doc.text(' 12 meses nos termos da Cláusula 6', col2Left + 98, y + 56);

  y += cardHeight + 14;

  // Preâmbulo
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  const splitPre = doc.splitTextToSize(CONTRACT_PREAMBLE, contentWidth);
  doc.text(splitPre, margin, y);
  y += splitPre.length * 11 + 10;

  // === CLÁUSULAS CANÔNICAS ===
  for (const clause of CANONICAL_CLAUSES) {
    // Evita título órfão no final da página
    checkNewPage(65);

    // Faixa elegante do título da cláusula
    doc.setFillColor(245, 245, 247);
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text(clause.fullTitle, margin + 8, y + 12);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);

    for (const p of clause.paragraphs) {
      const splitP = doc.splitTextToSize(p, contentWidth);
      checkNewPage(splitP.length * 11 + 6);
      doc.text(splitP, margin, y);
      y += splitP.length * 11 + 4;
    }

    if (clause.hasTable) {
      checkNewPage(120);

      autoTable(doc, {
        startY: y + 2,
        margin: { left: margin, right: margin },
        head: [['Condição Financeira', 'Detalhamento dos Prazos e Obrigações', 'Valor (R$)']],
        body: [
          ['Valor Global do Projeto', 'Desenvolvimento, publicação, homologação e suporte inicial', CONTRACT_FINANCIAL.totalValue],
          ['Plano de Pagamento', `${CONTRACT_FINANCIAL.installmentsCount} (dez) parcelas mensais, iguais e sucessivas de ${CONTRACT_FINANCIAL.installmentValue}`, `${CONTRACT_FINANCIAL.installmentsCount}x ${CONTRACT_FINANCIAL.installmentValue}`],
          ['Forma de Quitação', `Chave PIX do CONTRATADO (CPF: ${CONTRACTOR_INFO.cpfClean})`, 'À vista da parcela'],
          ['Primeiro Vencimento', `${CONTRACT_FINANCIAL.firstDueDate} (04/10/2026)`, `1ª Parcela: ${CONTRACT_FINANCIAL.installmentValue}`],
          ['Parcelas Subsequentes', 'Todo dia 04 dos meses subsequentes até quitação integral', `Demais: ${CONTRACT_FINANCIAL.installmentValue}/mês`],
        ],
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 243],
          textColor: [24, 24, 27],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: 4.5,
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          fontSize: 7.5,
          cellPadding: 4,
          lineColor: [230, 230, 235],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 95, halign: 'right', fontStyle: 'bold' },
        },
      });

      // @ts-expect-error lastAutoTable is injected by jspdf-autotable
      y = doc.lastAutoTable.finalY + 8;

      if (clause.afterTableParagraphs) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        for (const p of clause.afterTableParagraphs) {
          const splitP = doc.splitTextToSize(p, contentWidth);
          checkNewPage(splitP.length * 11 + 6);
          doc.text(splitP, margin, y);
          y += splitP.length * 11 + 4;
        }
      }
    }

    y += 6;
  }

  // === SEÇÃO DE FECHO E ASSINATURAS ===
  checkNewPage(215);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text('Brasília/DF (Brasil) — República da Irlanda, 2026.', margin, y);
  y += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  const splitFecho = doc.splitTextToSize(CONTRACT_CLOSING, contentWidth);
  doc.text(splitFecho, margin, y);
  y += splitFecho.length * 11 + 35;

  const sigColWidth = (contentWidth - 28) / 2;
  const col1X = margin;
  const col2X = margin + sigColWidth + 28;

  // Imagens das Rubricas
  if (signatures?.contractor?.signatureDataUrl) {
    try {
      doc.addImage(signatures.contractor.signatureDataUrl, 'PNG', col1X + 25, y - 38, 100, 32);
    } catch {}
  }
  if (signatures?.client?.signatureDataUrl) {
    try {
      doc.addImage(signatures.client.signatureDataUrl, 'PNG', col2X + 25, y - 38, 100, 32);
    } catch {}
  }

  // Linhas de Assinatura
  doc.setDrawColor(180, 180, 186);
  doc.setLineWidth(0.8);
  doc.line(col1X, y, col1X + sigColWidth, y);
  doc.line(col2X, y, col2X + sigColWidth, y);
  y += 12;

  // Nome e Qualificação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 24, 27);
  doc.text(CONTRACTOR_INFO.name.toUpperCase(), col1X, y);
  doc.text(CLIENT_INFO.name.toUpperCase(), col2X, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text(CONTRACTOR_INFO.role, col1X, y);
  doc.text(CLIENT_INFO.role, col2X, y);
  y += 9;
  doc.text(`CPF: ${CONTRACTOR_INFO.cpf} · Tel: ${CONTRACTOR_INFO.phone}`, col1X, y);
  doc.text(`CPF/Doc: ${CLIENT_INFO.cpfFormatted} · WhatsApp: ${CLIENT_INFO.phone}`, col2X, y);
  y += 9;
  doc.text(`E-mail: ${CONTRACTOR_INFO.email}`, col1X, y);
  doc.text(`E-mail: ${CLIENT_INFO.email}`, col2X, y);

  // Cards de Auditoria Digital Criptográfica
  if (signatures?.contractor?.signedAt || signatures?.client?.signedAt) {
    y += 14;
    const certBoxHeight = 50;

    if (signatures?.contractor?.signedAt) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.6);
      doc.roundedRect(col1X, y, sigColWidth, certBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(22, 101, 52);
      doc.text('[✓] ASSINADO ELETRONICAMENTE (LEI 14.063)', col1X + 8, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(75, 85, 99);
      const dt = new Date(signatures.contractor.signedAt).toLocaleString('pt-BR');
      doc.text(`Carimbo: ${dt}`, col1X + 8, y + 20);
      if (signatures.contractor.documentHash) {
        doc.text(`Doc SHA-256: ${signatures.contractor.documentHash.slice(0, 22)}...`, col1X + 8, y + 28);
      }
      if (signatures.contractor.certificateHash) {
        doc.text(`Cert: ${signatures.contractor.certificateHash.slice(0, 22)}...`, col1X + 8, y + 36);
      }
      if (signatures.contractor.ip) {
        doc.text(`IP: ${signatures.contractor.ip}`, col1X + 8, y + 44);
      }
    }

    if (signatures?.client?.signedAt) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.6);
      doc.roundedRect(col2X, y, sigColWidth, certBoxHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(22, 101, 52);
      doc.text('[✓] ASSINADO ELETRONICAMENTE (LEI 14.063)', col2X + 8, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(75, 85, 99);
      const dt = new Date(signatures.client.signedAt).toLocaleString('pt-BR');
      doc.text(`Carimbo: ${dt}`, col2X + 8, y + 20);
      if (signatures.client.documentHash) {
        doc.text(`Doc SHA-256: ${signatures.client.documentHash.slice(0, 22)}...`, col2X + 8, y + 28);
      }
      if (signatures.client.certificateHash) {
        doc.text(`Cert: ${signatures.client.certificateHash.slice(0, 22)}...`, col2X + 8, y + 36);
      }
      if (signatures.client.ip) {
        doc.text(`IP: ${signatures.client.ip}`, col2X + 8, y + 44);
      }
    }
  }

  // === RODAPÉS E CABEÇALHOS PERIÓDICOS ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Cabeçalho da página 2 em diante
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 170);
      doc.text(`PROJETO NUA BORGES — CONTRATO DE PRESTAÇÃO DE SERVIÇOS — V${CONTRACT_VERSION}`, margin, 30);
      doc.setDrawColor(228, 228, 231);
      doc.setLineWidth(0.5);
      doc.line(margin, 34, pageWidth - margin, 34);
    }

    // Rodapé em todas as páginas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text('Documento Eletrônico Confidencial · SHA-256 Canônico · MP 2.200-2/2001 · Lei 14.063/2020', margin, pageHeight - 24);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);
  }

  return doc;
}

export function downloadContractPdf(
  signatures?: {
    contractor?: ContractSignatureData | null;
    client?: ContractSignatureData | null;
  },
  parties?: {
    contractor?: any;
    client?: any;
  }
) {
  const doc = buildContractPdfDoc(signatures, parties);
  doc.save('Contrato_Desenvolvimento_Web_Nua_Borges.pdf');
}
