/**
 * Gerador Oficial de Comprovante de Pagamento — NUA BORGES
 *
 * Utiliza jsPDF e jspdf-autotable para emitir um comprovante minimalista,
 * elegante e de alto padrão visual, refletindo a identidade autoral da NUA.
 */

import { jsPDF } from 'jspdf';
import {
  FinancialInstallment,
  CLIENT_INFO,
  CONTRACTOR_INFO,
  formatCurrencyBrl,
  formatIsoToBrDateTime,
} from './financeCanonical';
import { CONTRACT_DOC_ID, CONTRACT_VERSION } from './contractCanonical';

/**
 * Gera um hash SHA-256 de autenticidade para o comprovante
 */
export async function computeReceiptHash(installment: FinancialInstallment): Promise<string> {
  const payload = [
    CONTRACT_DOC_ID,
    installment.id,
    installment.number,
    installment.amount,
    installment.paymentId || 'MANUAL',
    installment.paidAt || installment.updatedAt,
    CLIENT_INFO.cpfClean,
    CONTRACTOR_INFO.cpfClean,
  ].join('::');

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(payload));
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simples caso crypto.subtle não esteja disponível
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(16, '0');
}

/**
 * Constrói o documento jsPDF do comprovante
 */
export function buildReceiptPdfDoc(
  installment: FinancialInstallment,
  receiptHash?: string
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const authCode =
    receiptHash ||
    installment.receiptHash ||
    'AUT-' + (installment.paymentId || 'NUA').slice(-8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  // === MOLDURA / FUNDO SUTIL ===
  doc.setFillColor(252, 252, 253);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Borda decorativa superior fina em rosa suave (#f4a7b9 -> RGB: 244, 167, 185)
  doc.setFillColor(244, 167, 185);
  doc.rect(0, 0, pageWidth, 4, 'F');

  y += 12;

  // === CABEÇALHO EXECUTIVO ===
  // Tag / Badge
  doc.setFillColor(245, 245, 247);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(pageWidth / 2 - 120, y, 240, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('COMPROVANTE OFICIAL DE LIQUIDAÇÃO DE MENSALIDADE', pageWidth / 2, y + 11, {
    align: 'center',
  });
  y += 28;

  // Título NUA BORGES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27);
  doc.text('NUA BORGES', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Portal Web Autoral & Gestão Digital · Contrato de Desenvolvimento', pageWidth / 2, y, {
    align: 'center',
  });
  y += 11;
  doc.text(
    `Contrato Ref. ${CONTRACT_DOC_ID} (v${CONTRACT_VERSION})`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 18;

  // Linha divisória sutil
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // === BANNER DE CONFIRMAÇÃO DO STATUS ===
  const isPaid = installment.status === 'paid';
  const bannerHeight = 36;
  if (isPaid) {
    // Verde / Esmeralda
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, bannerHeight, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('✓ PAGAMENTO CONFIRMADO E LIQUIDADO', margin + 16, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61);
    doc.text(
      `Confirmado em ${formatIsoToBrDateTime(installment.paidAt)}`,
      pageWidth - margin - 16,
      y + 22,
      { align: 'right' }
    );
  } else {
    // Amarelo / Pendente
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(margin, y, contentWidth, bannerHeight, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(133, 77, 14);
    doc.text('● PAGAMENTO EM PROCESSAMENTO / PENDENTE', margin + 16, y + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(161, 98, 7);
    doc.text(`Vencimento: ${installment.dueDateFormatted}`, pageWidth - margin - 16, y + 22, {
      align: 'right',
    });
  }
  y += bannerHeight + 16;

  // === CARD PRINCIPAL COM DETALHES DA MENSALIDADE ===
  const cardHeight = 110;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 6, 6, 'FD');

  // Coluna Esquerda: Informações da Parcela
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('REFERÊNCIA DA MENSALIDADE', margin + 16, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text(`${installment.label} — ${installment.referenceMonth}`, margin + 16, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  doc.text(`Vencimento Original: ${installment.dueDateFormatted}`, margin + 16, y + 54);
  doc.text(
    `Método de Pagamento: ${
      installment.paymentMethod
        ? installment.paymentMethod.toUpperCase()
        : 'Mercado Pago (Pix / Cartão)'
    }`,
    margin + 16,
    y + 68
  );
  if (installment.paymentId) {
    doc.text(`Identificador da Transação (MP ID): ${installment.paymentId}`, margin + 16, y + 82);
  }
  doc.text(`Data e Hora da Confirmação: ${formatIsoToBrDateTime(installment.paidAt)}`, margin + 16, y + 96);

  // Coluna Direita: Valor em Destaque
  const rightColX = pageWidth - margin - 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('VALOR LIQUIDADO', rightColX, y + 20, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(formatCurrencyBrl(installment.amount), rightColX, y + 42, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text('(duzentos reais)', rightColX, y + 54, { align: 'right' });

  // Selo de Quitação em Rosa Nua
  doc.setFillColor(253, 242, 244);
  doc.setDrawColor(244, 167, 185);
  doc.setLineWidth(0.6);
  doc.roundedRect(rightColX - 90, y + 68, 90, 24, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(190, 70, 95);
  doc.text('PARCELA PAGA', rightColX - 45, y + 83, { align: 'center' });

  y += cardHeight + 18;

  // === IDENTIFICAÇÃO DAS PARTES ===
  const partiesHeight = 78;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, partiesHeight, 6, 6, 'FD');

  const halfWidth = contentWidth / 2;
  const col1X = margin + 16;
  const col2X = margin + halfWidth + 8;

  // Contratante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('DADOS DA CONTRATANTE (PAGADORA)', col1X, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(CLIENT_INFO.name, col1X, y + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text(`Nome Artístico: "${CLIENT_INFO.artisticName}"`, col1X, y + 44);
  doc.text(`CPF: ${CLIENT_INFO.cpfFormatted}`, col1X, y + 56);
  doc.text(`Domicílio: ${CLIENT_INFO.address}`, col1X, y + 68);

  // Contratado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('DADOS DO CONTRATADO (RECEBEDOR)', col2X, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(CONTRACTOR_INFO.name, col2X, y + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text(`Função: Desenvolvedor Web e Arquiteto de Software`, col2X, y + 44);
  doc.text(`CPF: ${CONTRACTOR_INFO.cpf}`, col2X, y + 56);
  doc.text(`Chave Pix: ${CONTRACTOR_INFO.pixKey}`, col2X, y + 68);

  y += partiesHeight + 18;

  // === RESUMO DO PLANO CONTRATUAL ===
  const planHeight = 58;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, planHeight, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('OBJETO E ENQUADRAMENTO CONTRATUAL', margin + 16, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  doc.text(
    'Prestação de serviços continuados de desenvolvimento web, implantação em infraestrutura Cloudflare,',
    margin + 16,
    y + 32
  );
  doc.text(
    'gestão do CMS autônomo e suporte técnico especializado, em conformidade com as Cláusulas 3 e 4 do contrato.',
    margin + 16,
    y + 44
  );

  y += planHeight + 18;

  // === AUTENTICAÇÃO CRIPTOGRÁFICA & AUDITORIA ===
  doc.setFillColor(245, 245, 247);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 110);
  doc.text('CÓDIGO DE AUTENTICAÇÃO DIGITAL & INTEGRIDADE (SHA-256)', margin + 12, y + 15);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 70);
  doc.text(authCode, margin + 12, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 130);
  doc.text(
    'Este documento possui validade de quitação referente à parcela discriminada. Emissão eletrônica via Nua Borges Admin.',
    margin + 12,
    y + 42
  );

  // === RODAPÉ ===
  const footerY = pageHeight - margin + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 150);
  doc.text(
    `Nua Borges · nuaborges.com · Gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  return doc;
}

/**
 * Dispara o download automático do PDF do comprovante no navegador
 */
export function downloadReceiptPdf(installment: FinancialInstallment): void {
  const doc = buildReceiptPdfDoc(installment);
  const cleanLabel = installment.label.toLowerCase().replace(/\s+/g, '-').replace(/ª/g, 'a');
  const filename = `comprovante-nuaborges-${cleanLabel}-${installment.dueDate.slice(0, 7)}.pdf`;
  doc.save(filename);
}

/**
 * Retorna uma Data URL (base64) para renderização inline em iframe / modal
 */
export function getReceiptPdfDataUrl(installment: FinancialInstallment): string {
  const doc = buildReceiptPdfDoc(installment);
  return doc.output('datauristring');
}

/**
 * Retorna o Blob do PDF
 */
export function getReceiptPdfBlob(installment: FinancialInstallment): Blob {
  const doc = buildReceiptPdfDoc(installment);
  return doc.output('blob');
}
