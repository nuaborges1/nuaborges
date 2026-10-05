/**
 * Gerador Oficial de Pix EMVCo BR Code (Padrão Banco Central do Brasil)
 * 
 * Produz códigos Pix "Copia e Cola" e QR Codes reais, válidos e escaneáveis por
 * qualquer aplicativo de banco brasileiro (Nubank, Itaú, Inter, Bradesco, etc.).
 */

import QRCode from 'qrcode';
import { CONTRACTOR_INFO } from './contractCanonical';

/**
 * Calcula o checksum CRC16-CCITT exigido pelo padrão BR Code do Banco Central.
 * Polinômio: 0x1021 | Valor Inicial: 0xFFFF
 */
export function calculatePixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formata um campo TLV (Tag-Length-Value) do padrão EMVCo
 */
function formatTlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface RealPixOptions {
  pixKey?: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txid?: string;
  description?: string;
}

/**
 * Gera a string Pix Copia e Cola conforme o Manual de Padrões para Iniciação do Pix (Bacen)
 */
export function generateRealPixCopiaECola(options: RealPixOptions): string {
  const pixKey = options.pixKey || CONTRACTOR_INFO.pixKey;
  const merchantName = options.merchantName || 'JOAO PHILIPPE O BOECHAT';
  const merchantCity = options.merchantCity || 'BRASILIA';
  const txid = options.txid || 'NUA';

  // 00: Payload Format Indicator (sempre "01")
  const pfi = formatTlv('00', '01');

  // 26: Merchant Account Information (Pix)
  const gui = formatTlv('00', 'br.gov.bcb.pix');
  const keyField = formatTlv('01', pixKey);
  const merchantAccount = formatTlv('26', `${gui}${keyField}`);

  // 52: Merchant Category Code (0000 = genérico)
  const mcc = formatTlv('52', '0000');

  // 53: Transaction Currency (986 = Real Brasileiro / BRL)
  const currency = formatTlv('53', '986');

  // 54: Transaction Amount
  const amtFormatted = Number(options.amount).toFixed(2);
  const amtField = formatTlv('54', amtFormatted);

  // 58: Country Code (BR)
  const country = formatTlv('58', 'BR');

  // 59: Merchant Name (máximo 25 caracteres, sem acentos per spec)
  const cleanName = merchantName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25)
    .toUpperCase();
  const nameField = formatTlv('59', cleanName);

  // 60: Merchant City (máximo 15 caracteres, sem acentos per spec)
  const cleanCity = merchantCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 15)
    .toUpperCase();
  const cityField = formatTlv('60', cleanCity);

  // 62: Additional Data Field Template (TXID)
  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const txidField = formatTlv('05', cleanTxid);
  const additionalData = formatTlv('62', txidField);

  // 63: CRC16 (Tag 63, tamanho 04)
  const rawPayload = `${pfi}${merchantAccount}${mcc}${currency}${amtField}${country}${nameField}${cityField}${additionalData}6304`;
  const checksum = calculatePixCrc16(rawPayload);

  return `${rawPayload}${checksum}`;
}

/**
 * Converte qualquer string Pix em uma imagem QR Code real PNG Base64
 */
export async function generatePixQrCodePngDataUrl(pixString: string): Promise<string> {
  return await QRCode.toDataURL(pixString, {
    width: 320,
    margin: 1,
    color: {
      dark: '#09090b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
