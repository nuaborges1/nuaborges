/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Clausula, ContractList, Nota } from './ContractUiElements';

export function ContractAnexoView() {
  return (
    <div className="space-y-10 print:space-y-5">
      <Nota>
        <strong>ANEXO I AO CONTRATO:</strong> Este memorial descritivo delimita com clareza as funcionalidades, componentes e infraestrutura entregues no projeto. Em caso de divergência com o contrato, prevalecem as disposições do contrato.
      </Nota>

      <Clausula num="01" title="Identificação do Projeto e Objetivo">
        <p><strong>Nome:</strong> Plataforma Digital Oficial Nua Borges &amp; Sistema de Gerenciamento de Conteúdo (CMS).</p>
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
              <span className="block text-[10px] print:text-[8pt] font-semibold uppercase tracking-widest text-[#90364B] print:text-black">{label}</span>
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
                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#90364B]/50 print:bg-zinc-600 shrink-0" />
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
          <><strong>Hospedagem &amp; CDN:</strong> Cloudflare Pages Global Edge Network. O desempenho efetivo depende da qualidade de conexão e hardware do visitante;</>,
          <><strong>Armazenamento de Mídia:</strong> Backblaze B2 Object Storage (bucket `nuaborges-media`) com CDN dedicada e S3 SDK;</>,
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

      <Clausula num="06" title="SEO &amp; Acessibilidade">
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
            <p className="text-xs print:text-[8pt] text-zinc-300 print:text-zinc-700 leading-relaxed">Portal web completo, CMS autônomo, implantação em Cloudflare Pages com armazenamento Backblaze B2, regras de segurança, player de música, apontamento de DNS, período de homologação, garantia e suporte delimitados na Cláusula 6 do contrato.</p>
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
          <p>• <strong>Recursos Adicionais Entregues por Liberalidade:</strong> Módulo de perguntas anônimas (&quot;Asks&quot;); gravador de vídeo vertical com teleprompter integrado; páginas institucionais de Termos de Uso e Política de Privacidade; e painel técnico de auditoria e estatísticas (Cláusula 15.2).</p>
          <p>• <strong>Navegadores Suportados:</strong> As duas últimas versões estáveis dos navegadores Google Chrome, Apple Safari, Microsoft Edge e Mozilla Firefox, em ambientes operacionais móveis (iOS e Android) e desktop (Windows e macOS).</p>
          <p>• <strong>Limites Técnicos de Upload e Armazenamento:</strong> Uploads de fotos de até 15 MB e vídeos curtos de até 25 MB; limites diários conforme as cotas padrão do plano gratuito (Cláusula 9.3).</p>
        </div>
      </Clausula>
    </div>
  );
}
