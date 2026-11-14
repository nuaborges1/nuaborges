import { KNOWN_FILES } from './types';
import { normalizeText } from './classifier';

/**
 * Detecta com precisão os arquivos-alvo no repositório a partir de termos no texto e na categoria.
 * Usa limites de palavras (\b) para evitar falsos positivos ("cor", "som", "texto").
 */
export function detectTargetFilesHeuristic(text: string, category = ''): string[] {
  const norm = normalizeText(`${text} ${category}`);
  const files: string[] = [];

  const add = (...paths: string[]) => {
    for (const p of paths) {
      if (!files.includes(p)) files.push(p);
    }
  };

  // Galeria / Fotos / Ensaios
  if (/\b(galeria|foto|fotos|imagem|imagens|lightbox|carrossel|zoom|ensaio|ensaios)\b/.test(norm)) {
    add(
      'components/GallerySection.tsx',
      'components/GalleryLightbox.tsx',
      'components/admin/GalleryEditor.tsx'
    );
  }

  // Capa / Hero / Topo / Banner principal
  if (/\b(capa|hero|topo|banner|inicio|abertura|video principal)\b/.test(norm)) {
    add('components/Hero.tsx', 'components/admin/HeroEditor.tsx');
  }

  // Sobre / Biografia / Manifesto / Perfil
  if (/\b(sobre|bio|biografia|perfil|manifesto|especialidade|credenciais)\b/.test(norm)) {
    add('components/AboutSection.tsx', 'components/admin/AboutEditor.tsx');
  }

  // Links / Serviços / Contato / WhatsApp
  if (
    /\b(servico|servicos|pacote|pacotes|link|links|botao|botoes|whatsapp|contato|fale conosco)\b/.test(
      norm
    )
  ) {
    add('components/LinksSection.tsx', 'components/ContactModal.tsx');
  }

  // Música / Player de áudio
  if (/\b(musica|musicas|player|audio|audios|som|sons|trilha|playlist)\b/.test(norm)) {
    add('components/MusicPlayer.tsx');
  }

  // Chamadas de Vídeo Privativas
  if (/\b(chamada|chamadas|videochamada|agendamento|agenda|reuniao|meet|google meet)\b/.test(norm)) {
    add('app/chamadas/page.tsx', 'app/chamadas/reserva/page.tsx', 'components/nua/admin/AppointmentsEditor.tsx');
  }

  // Contrato Digital e PDF
  if (/\b(contrato|minuta|pdf do contrato|assinar contrato)\b/.test(norm)) {
    add('app/contrato/page.tsx', 'lib/generateContractPdf.ts');
  }

  // Termos de Uso e Política de Privacidade
  if (/\b(termo|termos|privacidade|politica de privacidade|termos de uso|lgpd)\b/.test(norm)) {
    add('app/termos/page.tsx', 'app/privacidade/page.tsx');
  }

  // Asks / Perguntas Anônimas
  if (/\b(ask|asks|pergunta|perguntas|anonima|anonimas|duvida|duvidas da audiencia)\b/.test(norm)) {
    add('components/AsksSection.tsx', 'components/admin/AsksEditor.tsx');
  }

  // Auditoria / Logs Técnicos
  if (/\b(auditoria|log|logs|feed de auditoria|eventos de seguranca)\b/.test(norm)) {
    add('components/admin/AuditFeed.tsx', 'functions/api/_auditHelper.ts');
  }

  // SEO / Meta tags / Open Graph
  if (/\b(seo|google|meta tag|meta tags|open graph|favicon|compartilhamento|indexacao)\b/.test(norm)) {
    add('app/layout.tsx');
  }

  // Painel Administrativo da Cliente (Senha, Solicitações, Central)
  if (/\b(painel admin|senha|senha mestre|solicitacoes|central de pedidos|login admin)\b/.test(norm)) {
    add(
      'components/admin/ClientRequestsEditor.tsx',
      'components/admin/RequestsCenter.tsx',
      'components/admin/GeneralAdminSettings.tsx'
    );
  }

  // Painel Geral de Monitoramento do Desenvolvedor
  if (/\b(admingeral|admin geral|painel do dev|painel do philippe|monitoramento dev)\b/.test(norm)) {
    add('app/admingeral/page.tsx');
  }

  // Rodapé
  if (/\b(rodape|footer|direitos autorais|creditos)\b/.test(norm)) {
    add('components/Footer.tsx');
  }

  // Se nenhum arquivo específico foi detectado, fornece padrão seguro
  if (files.length === 0) {
    add('components/Hero.tsx');
  }

  return files.slice(0, 8);
}

/**
 * Valida e sanitiza a lista de arquivos-alvo retornada pelo modelo.
 * Rejeita caminhos maliciosos (com '..', '.env', barras iniciais) e limita a 8 caminhos.
 */
export function sanitizeTargetFiles(
  candidateFiles: unknown,
  fallbackText: string,
  category = ''
): string[] {
  if (!Array.isArray(candidateFiles)) {
    return detectTargetFilesHeuristic(fallbackText, category);
  }

  const validPaths: string[] = [];
  const safeRegex = /^[A-Za-z0-9_\-./[\]]+$/;
  const knownSet = new Set<string>(KNOWN_FILES);

  for (const item of candidateFiles) {
    if (typeof item !== 'string') continue;
    const clean = item.trim();
    if (!clean) continue;

    // Bloqueios de segurança: path traversal e segredos
    const lower = clean.toLowerCase();
    if (
      clean.includes('..') ||
      clean.startsWith('/') ||
      lower.includes('.env') ||
      lower.includes('.dev.vars') ||
      lower.includes('wrangler') ||
      lower.includes('package.json') ||
      lower.includes('node_modules') ||
      lower.includes('.git') ||
      lower.includes('secret') ||
      lower.includes('key')
    ) {
      continue;
    }

    // Se estiver em KNOWN_FILES ou casar o regex seguro
    if (knownSet.has(clean) || safeRegex.test(clean)) {
      // Se for arquivo genérico não-Next.js (ex: home.html, assets/css/hero.css), descarta
      if (/\.(html|css)$/i.test(clean) && !knownSet.has(clean)) {
        continue;
      }
      if (!validPaths.includes(clean)) {
        validPaths.push(clean);
      }
    }

    if (validPaths.length >= 8) break;
  }

  if (validPaths.length === 0) {
    return detectTargetFilesHeuristic(fallbackText, category);
  }

  return validPaths;
}
