import fs from 'node:fs';
import path from 'node:path';
import { buildContractPdfDoc, buildAnexoPdfDoc } from '../lib/generateContractPdf.ts';

const rootDir = process.cwd();
const desktopDir = 'C:\\Users\\Philippe\\Desktop';
const nuaborgesDir = 'C:\\Users\\Philippe\\Desktop\\nuaborges';
const publicDir = path.join(rootDir, 'public');

console.log('📄 Gerando PDF do Contrato Atualizado (Versão Definitiva 1.1 com Assinaturas)...');

// 1. Contrato Principal
const contractDoc = buildContractPdfDoc();
const contractBuffer = Buffer.from(contractDoc.output('arraybuffer'));

const contractPaths = [
  path.join(desktopDir, 'Contrato_Desenvolvimento_Web_Nua_Borges.pdf'),
  path.join(nuaborgesDir, 'Contrato_Desenvolvimento_Web_Nua_Borges.pdf'),
  path.join(publicDir, 'Contrato_Desenvolvimento_Web_Nua_Borges.pdf'),
];

for (const p of contractPaths) {
  fs.writeFileSync(p, contractBuffer);
  console.log(`✅ Contrato salvo em: ${p}`);
}

// 2. Anexo I — Memorial Descritivo
console.log('📄 Gerando PDF do Anexo I (Memorial Descritivo)...');
const anexoDoc = buildAnexoPdfDoc();
const anexoBuffer = Buffer.from(anexoDoc.output('arraybuffer'));

const anexoPaths = [
  path.join(desktopDir, 'Anexo_I_Memorial_Descritivo_Nua_Borges.pdf'),
  path.join(nuaborgesDir, 'Anexo_I_Memorial_Descritivo_Nua_Borges.pdf'),
  path.join(publicDir, 'Anexo_I_Memorial_Descritivo_Nua_Borges.pdf'),
];

for (const p of anexoPaths) {
  fs.writeFileSync(p, anexoBuffer);
  console.log(`✅ Anexo I salvo em: ${p}`);
}

console.log('🎉 Todos os PDFs foram gerados e salvos com sucesso!');
