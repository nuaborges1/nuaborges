/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  Eraser,
  ImagePlus,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Highlighter,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';
import {
  EditorialImageLayout,
  EditorialImageSize,
  ParsedEditorialImageBlock,
  buildEditorialImageTag,
  normalizePastedOrAiTextToCanonical,
  parseEditorialImageTag,
} from '@/lib/editorialRichText';

export interface RichTextPostEditorHandle {
  insertImages: (urls: string[]) => void;
  replaceActiveImage: (urls: string[]) => void;
}

interface RichTextPostEditorProps {
  label?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  rows?: number;
  helperText?: string;
  compact?: boolean;
  align?: 'left' | 'center';
  headlineContext?: string;
  roleContext?: string;
  onRequestInsertImage?: () => void;
  onRequestReplaceImage?: (currentUrls: string[]) => void;
  editorHandleRef?: React.Ref<RichTextPostEditorHandle>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkupToHtml(input: string): string {
  let s = escapeHtml(input)
    .replace(/¨{2,}([^¨\n]+?)¨{2,}/g, '**$1**')
    .replace(/__([^_\n]+?)__/g, '**$1**')
    .replace(/¨([^¨\n]{2,80})¨/g, '“$1”')
    .replace(/¨+/g, '');
  // Bold: **text** or [b]text[/b]
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[b\]([\s\S]+?)\[\/b\]/gi, '<strong>$1</strong>');
  // Underline: [u]text[/u]
  s = s.replace(
    /\[u\]([\s\S]+?)\[\/u\]/gi,
    '<u style="text-decoration-color:#90364B;text-underline-offset:4px">$1</u>'
  );
  // Strikethrough: ~~text~~ or [s]text[/s]
  s = s.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');
  s = s.replace(/\[s\]([\s\S]+?)\[\/s\]/gi, '<s>$1</s>');
  // Vinho highlight: [vinho]text[/vinho]
  s = s.replace(
    /\[vinho\]([\s\S]+?)\[\/vinho\]/gi,
    '<span data-nua-color="vinho" style="color:#c8647d;font-weight:500">$1</span>'
  );
  // Dourado highlight: [dourado]text[/dourado]
  s = s.replace(
    /\[dourado\]([\s\S]+?)\[\/dourado\]/gi,
    '<span data-nua-color="dourado" style="color:#e5b894;font-weight:500">$1</span>'
  );
  // Grifo vinho: [grifo]text[/grifo]
  s = s.replace(
    /\[grifo\]([\s\S]+?)\[\/grifo\]/gi,
    '<mark data-nua-mark="grifo" style="background:rgba(102,28,48,0.48);color:#F5EEE9;padding:2px 6px;border-radius:6px;border-bottom:1px solid rgba(144,54,75,0.65)">$1</mark>'
  );
  // Tamanhos de fonte: [pequeno], [grande], [gigante]
  s = s.replace(
    /\[pequeno\]([\s\S]+?)\[\/pequeno\]/gi,
    '<span data-nua-size="pequeno" style="font-size:0.82em;color:#a1a1aa">$1</span>'
  );
  s = s.replace(
    /\[grande\]([\s\S]+?)\[\/grande\]/gi,
    '<span data-nua-size="grande" style="font-size:1.18em;color:#f4f4f5">$1</span>'
  );
  s = s.replace(
    /\[gigante\]([\s\S]+?)\[\/gigante\]/gi,
    '<span data-nua-size="gigante" style="font-family:serif;font-size:1.38em;color:#ffffff">$1</span>'
  );
  // Italic: *text* or [i]text[/i]
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[i\]([\s\S]+?)\[\/i\]/gi, '<em>$1</em>');
  return s;
}

export function renderVisualImageBlockHtml(block: ParsedEditorialImageBlock): string {
  const cleanUrls = block.urls.map((u) => u.trim()).filter(Boolean);
  if (cleanUrls.length === 0) return '';

  const isMulti = cleanUrls.length > 1;
  const layout: EditorialImageLayout = isMulti ? 'grid' : block.layout || 'full';
  const size: EditorialImageSize = block.size || 'md';
  const safeUrlsAttr = escapeHtml(cleanUrls.join('|'));
  const safeCaptionAttr = escapeHtml(block.caption || '');
  const safeAltAttr = escapeHtml(block.alt || '');

  // Larguras adaptativas conforme tamanho (P / M / G) e posição (Esquerda / Direita / Centro / Largura Total)
  const sideWidthStyle =
    size === 'sm'
      ? 'width:32%;max-width:240px;'
      : size === 'lg'
      ? 'width:56%;max-width:420px;'
      : 'width:44%;max-width:330px;';
  const portraitWidthStyle =
    size === 'sm'
      ? 'max-width:260px;'
      : size === 'lg'
      ? 'max-width:520px;'
      : 'max-width:370px;';
  const fullWidthStyle =
    size === 'sm'
      ? 'max-width:460px;margin:20px auto'
      : 'width:100%;margin:20px 0';

  const wrapperAlignStyle =
    layout === 'left'
      ? `float:left;${sideWidthStyle}margin:8px 24px 16px 0`
      : layout === 'right'
      ? `float:right;${sideWidthStyle}margin:8px 0 16px 24px`
      : layout === 'portrait'
      ? `clear:both;${portraitWidthStyle}margin:20px auto`
      : `clear:both;${fullWidthStyle}`;

  const layoutButtons = isMulti
    ? `<span style="font-size:10.5px;color:#f3d4dc;font-weight:600;padding:2px 8px;background:rgba(144,54,75,0.4);border-radius:6px;border:1px solid rgba(144,54,75,0.6)">Mosaico (${cleanUrls.length} fotos)</span>`
    : `<div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.06);border-radius:8px;padding:2px;gap:2px">${[
        { id: 'left', icon: '◧', label: 'Esq', title: 'Alinhar à esquerda (texto ao lado)' },
        { id: 'portrait', icon: '◉', label: 'Meio', title: 'Centralizar retrato' },
        { id: 'right', icon: '◨', label: 'Dir', title: 'Alinhar à direita (texto ao lado)' },
        { id: 'full', icon: '↔', label: 'Total', title: 'Largura total' },
      ]
        .map((opt) => {
          const active = layout === opt.id;
          const bg = active ? '#843C52' : 'transparent';
          const border = active ? '1px solid rgba(229,184,148,0.5)' : '1px solid transparent';
          const color = active ? '#ffffff' : '#a1a1aa';
          return `<button type="button" data-img-action="layout" data-layout="${opt.id}" title="${opt.title}" style="padding:2px 6px;border-radius:5px;font-size:10px;font-weight:600;background:${bg};border:${border};color:${color};cursor:pointer;display:inline-flex;align-items:center;gap:3px;transition:all 0.15s ease"><span style="font-size:11px;line-height:1">${opt.icon}</span><span>${opt.label}</span></button>`;
        })
        .join('')}</div>`;

  const sizeButtons = isMulti
    ? ''
    : `<div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.06);border-radius:8px;padding:2px;gap:2px">${[
        { id: 'sm', label: 'P', title: 'Tamanho Pequeno' },
        { id: 'md', label: 'M', title: 'Tamanho Médio' },
        { id: 'lg', label: 'G', title: 'Tamanho Grande' },
      ]
        .map((opt) => {
          const active = size === opt.id;
          const bg = active ? 'rgba(229,184,148,0.32)' : 'transparent';
          const border = active ? '1px solid rgba(229,184,148,0.6)' : '1px solid transparent';
          const color = active ? '#ffffff' : '#a1a1aa';
          return `<button type="button" data-img-action="size" data-size="${opt.id}" title="${opt.title}" style="padding:2px 6px;border-radius:5px;font-size:10px;font-weight:700;background:${bg};border:${border};color:${color};cursor:pointer;transition:all 0.15s ease">${opt.label}</button>`;
        })
        .join('')}</div>`;

  const actionButtons = `
    <div style="display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,0.06);border-radius:8px;padding:2px">
      <button type="button" data-img-action="up" title="Subir foto no post" style="padding:2px 5px;border-radius:5px;font-size:10px;background:transparent;border:none;color:#d4d4d8;cursor:pointer">↑</button>
      <button type="button" data-img-action="down" title="Descer foto no post" style="padding:2px 5px;border-radius:5px;font-size:10px;background:transparent;border:none;color:#d4d4d8;cursor:pointer">↓</button>
      <button type="button" data-img-action="replace" title="Trocar por outra foto da biblioteca" style="padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:600;background:rgba(132,60,82,0.4);border:1px solid rgba(144,54,75,0.5);color:#f3d4dc;cursor:pointer">Trocar</button>
      <button type="button" data-img-action="remove" title="Remover esta foto do post" style="padding:2px 6px;border-radius:5px;font-size:10.5px;font-weight:700;background:rgba(244,63,94,0.18);border:none;color:#fda4af;cursor:pointer">✕</button>
    </div>
  `;

  const imagesGridHtml = isMulti
    ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(
        cleanUrls.length,
        3
      )},1fr);gap:8px;padding:10px;padding-top:46px;background:#090a0f">${cleanUrls
        .map(
          (u) =>
            `<img src="${escapeHtml(
              resolveMediaUrl(u, 'mobile')
            )}" alt="Foto do post" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;display:block" />`
        )
        .join('')}</div>`
    : `<div style="background:#090a0f"><img src="${escapeHtml(
        resolveMediaUrl(cleanUrls[0], 'mobile')
      )}" alt="Foto do post" style="width:100%;${
        layout === 'portrait' || layout === 'left' || layout === 'right'
          ? 'aspect-ratio:3/4;'
          : 'max-height:460px;'
      }object-fit:cover;display:block" /></div>`;

  return `<div data-nua-img="${safeUrlsAttr}" data-nua-layout="${layout}" data-nua-img-size="${size}" data-nua-caption="${safeCaptionAttr}" data-nua-alt="${safeAltAttr}" contenteditable="false" style="${wrapperAlignStyle};position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:#0e1015;box-shadow:0 14px 36px rgba(0,0,0,0.72);user-select:none">
    <div style="position:absolute;top:8px;left:8px;right:8px;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px;padding:4px 6px;background:rgba(10,12,18,0.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.65)">
      <div style="display:inline-flex;align-items:center;gap:4px">
        ${layoutButtons}
        ${sizeButtons}
      </div>
      ${actionButtons}
    </div>
    ${imagesGridHtml}
    <div style="padding:8px 12px;background:#0c0e14;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
      <input type="text" data-img-caption-input="true" value="${safeCaptionAttr}" placeholder="Legenda da foto (opcional)..." style="width:100%;background:transparent;border:none;outline:none;color:#d4d4d8;font-size:12px;font-style:italic;text-align:center" />
    </div>
  </div>`;
}

function unwrapCanonicalBlockAlign(rawBlock: string): {
  inner: string;
  align: 'left' | 'center' | 'right';
} {
  const trimmed = rawBlock.trim();
  const centerMatch = trimmed.match(/^\[centro\]([\s\S]*)\[\/centro\]$/i);
  if (centerMatch) return { inner: centerMatch[1].trim(), align: 'center' };
  const rightMatch = trimmed.match(/^\[direita\]([\s\S]*)\[\/direita\]$/i);
  if (rightMatch) return { inner: rightMatch[1].trim(), align: 'right' };
  return { inner: trimmed, align: 'left' };
}

export function canonicalToVisualHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';
  const normalized = String(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/(\[img[^\]]*\][\s\S]+?\[\/img\])/gi, '\n\n$1\n\n');

  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return rawBlocks
    .map((rawBlock) => {
      const { inner: block, align } = unwrapCanonicalBlockAlign(rawBlock);
      const alignStyle =
        align === 'center'
          ? 'text-align:center;'
          : align === 'right'
          ? 'text-align:right;'
          : '';
      const alignAttr = align !== 'left' ? ` data-nua-align="${align}"` : '';

      const lines = block.split('\n');

      // 1. Imagem inline ou galeria
      if (lines.length === 1) {
        const parsedImg = parseEditorialImageTag(lines[0]);
        if (parsedImg) {
          return renderVisualImageBlockHtml(parsedImg);
        }
      }

      // 2. Separador editorial
      if (lines.length === 1 && /^(-{3,}|✦|\*{3,})$/.test(lines[0].trim())) {
        return '<hr data-nua-divider="true" style="clear:both;border:none;border-top:1px solid rgba(144,54,75,0.45);margin:18px 0" />';
      }

      // 3. Títulos (# Título, ## Subtítulo, ### Tópico)
      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0].trim())) {
        const rawLine = lines[0].trim();
        const levelMatch = rawLine.match(/^(#{1,3})\s+/);
        const level = levelMatch ? levelMatch[1].length : 2;
        const text = rawLine.replace(/^#{1,3}\s+/, '');

        if (level === 1) {
          return `<h2 data-nua-heading="1"${alignAttr} style="${alignStyle}font-family:serif;font-size:1.65rem;color:#ffffff;font-weight:600;margin:18px 0 8px;line-height:1.25">${inlineMarkupToHtml(
            text
          )}</h2>`;
        }
        if (level === 3) {
          return `<h4 data-nua-heading="3"${alignAttr} style="${alignStyle}font-family:serif;font-size:1.12rem;color:#F5EEE9;font-weight:600;margin:12px 0 4px">${inlineMarkupToHtml(
            text
          )}</h4>`;
        }
        return `<h3 data-nua-heading="2"${alignAttr} style="${alignStyle}font-family:serif;font-size:1.35rem;color:#ffffff;font-weight:600;margin:14px 0 6px">${inlineMarkupToHtml(
          text
        )}</h3>`;
      }

      // 4. Lista com marcadores
      if (lines.every((l) => /^[-•*]\s+/.test(l.trim()))) {
        const items = lines
          .map((l) => l.trim().replace(/^[-•*]\s+/, ''))
          .map((item) => `<li style="margin:4px 0">${inlineMarkupToHtml(item)}</li>`)
          .join('');
        return `<ul style="padding-left:1.35rem;list-style-type:disc;margin:8px 0">${items}</ul>`;
      }

      // 4b. Lista numerada
      if (lines.every((l) => /^\d+[.)]\s+/.test(l.trim()))) {
        const items = lines
          .map((l) => l.trim().replace(/^\d+[.)]\s+/, ''))
          .map((item) => `<li style="margin:4px 0">${inlineMarkupToHtml(item)}</li>`)
          .join('');
        return `<ol style="padding-left:1.35rem;list-style-type:decimal;margin:8px 0">${items}</ol>`;
      }

      // 5. Citação
      if (lines.every((l) => /^>\s*/.test(l.trim()))) {
        const quote = lines.map((l) => l.trim().replace(/^>\s*/, '')).join(' ');
        return `<blockquote${alignAttr} style="${alignStyle}border-left:2px solid #90364B;padding-left:14px;font-style:italic;color:#f3d4dc;margin:12px 0">${inlineMarkupToHtml(
          quote
        )}</blockquote>`;
      }

      // 6. Parágrafo normal
      const inner = lines.map((l) => inlineMarkupToHtml(l)).join('<br>');
      return `<p${alignAttr} style="${alignStyle}margin:0 0 12px">${inner}</p>`;
    })
    .join('');
}

function serializeImageElement(el: HTMLElement): string {
  const rawUrls = (el.getAttribute('data-nua-img') || '')
    .split('|')
    .map((u) => u.trim())
    .filter(Boolean);
  if (rawUrls.length === 0) return '';
  const rawLayout = (el.getAttribute('data-nua-layout') || 'full') as EditorialImageLayout;
  const rawSize = (el.getAttribute('data-nua-img-size') || 'md') as EditorialImageSize;
  const captionInput = el.querySelector(
    'input[data-img-caption-input="true"]'
  ) as HTMLInputElement | null;
  const caption =
    captionInput !== null
      ? captionInput.value
      : el.getAttribute('data-nua-caption') || '';
  const alt = el.getAttribute('data-nua-alt') || undefined;

  return buildEditorialImageTag({
    urls: rawUrls,
    layout: rawLayout,
    size: rawSize,
    caption,
    alt,
  });
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') return '\n';
  if (tag === 'hr') return '\n\n---\n\n';
  if (el.hasAttribute('data-nua-img')) {
    const serialized = serializeImageElement(el);
    return serialized ? `\n\n${serialized}\n\n` : '';
  }

  const childrenText = Array.from(el.childNodes).map(serializeInlineNode).join('');
  if (!childrenText) return '';

  let result = childrenText;

  // Marcas de grifo (<mark>)
  if (tag === 'mark' || el.getAttribute('data-nua-mark') === 'grifo') {
    result = `[grifo]${result.trim()}[/grifo]`;
  }

  // Tamanhos de fonte (data-nua-size ou <font size>)
  const nuaSize = el.getAttribute('data-nua-size');
  const fontSizeAttr = el.getAttribute('size');
  if (nuaSize === 'pequeno' || fontSizeAttr === '1' || fontSizeAttr === '2') {
    result = `[pequeno]${result.trim()}[/pequeno]`;
  } else if (nuaSize === 'grande' || fontSizeAttr === '4') {
    result = `[grande]${result.trim()}[/grande]`;
  } else if (nuaSize === 'gigante' || fontSizeAttr === '5' || fontSizeAttr === '6') {
    result = `[gigante]${result.trim()}[/gigante]`;
  }

  // Cores da marca
  if (tag === 'span' || tag === 'font') {
    const nuaColor = el.getAttribute('data-nua-color');
    const styleColor = (el.style?.color || el.getAttribute('color') || '').toLowerCase();
    const bgStyle = (el.style?.backgroundColor || '').toLowerCase();

    if (bgStyle.includes('102, 28, 48') || bgStyle.includes('#661c30')) {
      if (!result.startsWith('[grifo]')) {
        result = `[grifo]${result.trim()}[/grifo]`;
      }
    } else if (
      nuaColor === 'vinho' ||
      styleColor.includes('e388a0') ||
      styleColor.includes('c8647d') ||
      styleColor.includes('90364b') ||
      styleColor.includes('227, 136, 160') ||
      styleColor.includes('200, 100, 125')
    ) {
      result = `[vinho]${result.trim()}[/vinho]`;
    } else if (
      nuaColor === 'dourado' ||
      styleColor.includes('e5b894') ||
      styleColor.includes('229, 184, 148')
    ) {
      result = `[dourado]${result.trim()}[/dourado]`;
    }
  }

  const styleWeight = (el.style?.fontWeight || '').toLowerCase();
  const styleItalic = (el.style?.fontStyle || '').toLowerCase();
  const styleDecor = (
    el.style?.textDecoration ||
    el.style?.textDecorationLine ||
    ''
  ).toLowerCase();

  if (
    tag === 'strong' ||
    tag === 'b' ||
    styleWeight === 'bold' ||
    styleWeight === '700' ||
    styleWeight === '800'
  ) {
    if (!result.startsWith('**')) {
      result = `**${result.trim()}**`;
    }
  }
  if (tag === 'em' || tag === 'i' || styleItalic === 'italic') {
    if (!result.startsWith('*') || result.startsWith('**')) {
      result = `*${result.trim()}*`;
    }
  }
  if (tag === 'u' || styleDecor.includes('underline')) {
    if (!result.startsWith('[u]')) {
      result = `[u]${result.trim()}[/u]`;
    }
  }
  if (
    tag === 's' ||
    tag === 'strike' ||
    tag === 'del' ||
    styleDecor.includes('line-through')
  ) {
    if (!result.startsWith('~~')) {
      result = `~~${result.trim()}~~`;
    }
  }

  return result;
}

function wrapWithBlockAlignment(text: string, el: HTMLElement): string {
  if (!text) return '';
  const dataAlign = el.getAttribute('data-nua-align');
  const styleAlign = (el.style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  const effective = dataAlign || styleAlign;
  if (effective === 'center') {
    return `[centro]${text}[/centro]`;
  }
  if (effective === 'right') {
    return `[direita]${text}[/direita]`;
  }
  return text;
}

export function visualDomToCanonical(root: HTMLElement): string {
  const blocks: string[] = [];

  const processBlockNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent || '').trim();
      if (txt) blocks.push(txt);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (el.hasAttribute('data-nua-img')) {
      const serialized = serializeImageElement(el);
      if (serialized) blocks.push(serialized);
      return;
    }

    if (tag === 'hr') {
      blocks.push('---');
      return;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const txt = Array.from(el.childNodes)
        .map(serializeInlineNode)
        .join('')
        .replace(/\n+/g, ' ')
        .trim();
      if (!txt) return;
      const explicitLevel = el.getAttribute('data-nua-heading');
      let prefix = '## ';
      if (explicitLevel === '1' || tag === 'h1' || tag === 'h2') prefix = '# ';
      else if (explicitLevel === '3' || tag === 'h4') prefix = '### ';
      else prefix = '## ';

      blocks.push(wrapWithBlockAlignment(`${prefix}${txt}`, el));
      return;
    }

    if (tag === 'blockquote') {
      const txt = Array.from(el.childNodes)
        .map(serializeInlineNode)
        .join('')
        .replace(/\n+/g, ' ')
        .trim();
      if (txt) blocks.push(wrapWithBlockAlignment(`> ${txt}`, el));
      return;
    }

    if (tag === 'ul') {
      const items: string[] = [];
      Array.from(el.children).forEach((li) => {
        const txt = Array.from(li.childNodes)
          .map(serializeInlineNode)
          .join('')
          .replace(/\n+/g, ' ')
          .trim();
        if (txt) items.push(`- ${txt}`);
      });
      if (items.length > 0) blocks.push(items.join('\n'));
      return;
    }

    if (tag === 'ol') {
      const items: string[] = [];
      Array.from(el.children).forEach((li, idx) => {
        const txt = Array.from(li.childNodes)
          .map(serializeInlineNode)
          .join('')
          .replace(/\n+/g, ' ')
          .trim();
        if (txt) items.push(`${idx + 1}. ${txt}`);
      });
      if (items.length > 0) blocks.push(items.join('\n'));
      return;
    }

    if (tag === 'p' || tag === 'div') {
      const hasBlockChildren = Array.from(el.children).some(
        (c) =>
          c.hasAttribute('data-nua-img') ||
          ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote', 'hr'].includes(
            c.tagName.toLowerCase()
          )
      );
      if (hasBlockChildren) {
        Array.from(el.childNodes).forEach(processBlockNode);
        return;
      }
      const txt = Array.from(el.childNodes).map(serializeInlineNode).join('').trim();
      if (txt) blocks.push(wrapWithBlockAlignment(txt, el));
      return;
    }

    const inlineTxt = serializeInlineNode(el).trim();
    if (inlineTxt) blocks.push(inlineTxt);
  };

  Array.from(root.childNodes).forEach(processBlockNode);
  return blocks.join('\n\n').trim();
}

export function RichTextPostEditor({
  label,
  value,
  onChange,
  placeholder = 'Escreva seu post aqui...',
  rows = 4,
  helperText,
  compact = false,
  align = 'left',
  headlineContext,
  roleContext,
  onRequestInsertImage,
  onRequestReplaceImage,
  editorHandleRef,
}: RichTextPostEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<string>(value || '');
  const savedRangeRef = useRef<Range | null>(null);
  const activeReplacingNodeRef = useRef<HTMLElement | null>(null);

  const [isEmpty, setIsEmpty] = useState(!value?.trim());
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [floatingMenuPos, setFloatingMenuPos] = useState<{ top: number; left: number } | null>(null);
  const areaWrapperRef = useRef<HTMLDivElement | null>(null);

  // Histórico de Undo/Redo consistente + Snapshot exclusivo pré-IA
  const [historyStack, setHistoryStack] = useState<string[]>([value || '']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Menu de Clique Direito (Context Menu Customizado para Texto Selecionado, Parágrafo ou Foto)
  const [contextMenu, setContextMenu] = useState<{
    top: number;
    left: number;
    mode: 'image' | 'selection' | 'paragraph';
    targetImgEl?: HTMLElement | null;
  } | null>(null);

  // Estado ativo da barra de ferramentas conforme posição do cursor ou seleção
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    blockType: 'p' | 'h1' | 'h2' | 'h3' | 'quote';
    listType: 'none' | 'ul' | 'ol';
    align: 'left' | 'center' | 'right';
    fontSize: 'pequeno' | 'normal' | 'grande' | 'gigante';
    color: 'padrao' | 'vinho' | 'dourado';
    grifo: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    blockType: 'p',
    listType: 'none',
    align: 'left',
    fontSize: 'normal',
    color: 'padrao',
    grifo: false,
  });

  const pushHistorySnapshot = (nextVal: string) => {
    setHistoryStack((prev) => {
      const current = prev[historyIndex];
      if (current === nextVal) return prev;
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, nextVal].slice(-40);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  };

  const applyCanonicalValueToDom = (nextCanonical: string, recordHistory = true) => {
    const el = editorRef.current;
    if (el) {
      el.innerHTML = canonicalToVisualHtml(nextCanonical);
    }
    lastEmittedRef.current = nextCanonical;
    setIsEmpty(!nextCanonical.trim());
    if (recordHistory) {
      pushHistorySnapshot(nextCanonical);
    }
    onChange(nextCanonical);
  };

  const updateFloatingBubblePosition = (range: Range, sel: Selection) => {
    const wrapper = areaWrapperRef.current;
    const el = editorRef.current;
    if (!wrapper || !el || sel.isCollapsed || !sel.toString().trim()) {
      setFloatingMenuPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setFloatingMenuPos(null);
      return;
    }

    const menuWidth = 230;
    const menuHeight = 36;
    const halfWidth = menuWidth / 2;

    // Se estiver no topo da tela/editor, exibe abaixo da linha selecionada; caso contrário, acima
    let top = rect.top - wrapperRect.top - menuHeight - 10;
    if (top < 6) {
      top = rect.bottom - wrapperRect.top + 10;
    }

    const centerLeft = rect.left - wrapperRect.left + rect.width / 2;
    // Clamping seguro para NUNCA cortar o menu flutuante nem na margem esquerda nem na direita
    const clampedLeft = Math.max(halfWidth + 14, Math.min(wrapperRect.width - halfWidth - 14, centerLeft));

    setFloatingMenuPos({ top, left: clampedLeft });
  };

  const saveCurrentSelectionRange = () => {
    const el = editorRef.current;
    if (!el || typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setFloatingMenuPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
      inspectSelectionFormats(range);
      updateFloatingBubblePosition(range, sel);
    } else {
      setFloatingMenuPos(null);
    }
  };

  const inspectSelectionFormats = (range: Range) => {
    if (typeof document === 'undefined') return;
    const root = editorRef.current;
    if (!root) return;

    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.ELEMENT_NODE && range.startOffset < node.childNodes.length) {
      node = node.childNodes[range.startOffset] || node;
    }

    let blockType: 'p' | 'h1' | 'h2' | 'h3' | 'quote' = 'p';
    let listType: 'none' | 'ul' | 'ol' = 'none';
    let blockAlign: 'left' | 'center' | 'right' = 'left';
    let fontSize: 'pequeno' | 'normal' | 'grande' | 'gigante' = 'normal';
    let color: 'padrao' | 'vinho' | 'dourado' = 'padrao';
    let grifo = false;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrike = false;

    let cur: Node | null = node;
    while (cur && cur !== root) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        const el = cur as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'h1' || tag === 'h2' || el.getAttribute('data-nua-heading') === '1') {
          blockType = 'h1';
        } else if (tag === 'h3' || el.getAttribute('data-nua-heading') === '2') {
          blockType = 'h2';
        } else if (tag === 'h4' || el.getAttribute('data-nua-heading') === '3') {
          blockType = 'h3';
        } else if (tag === 'blockquote') {
          blockType = 'quote';
        }

        if (tag === 'ul') listType = 'ul';
        if (tag === 'ol') listType = 'ol';

        const alignAttr = (el.getAttribute('data-nua-align') || el.style?.textAlign || '').toLowerCase();
        if (alignAttr === 'center' || alignAttr === 'right') {
          blockAlign = alignAttr;
        }

        const sz = el.getAttribute('data-nua-size');
        if (sz === 'pequeno' || sz === 'grande' || sz === 'gigante') {
          fontSize = sz;
        }

        const col = el.getAttribute('data-nua-color');
        const stCol = (el.style?.color || '').toLowerCase();
        if (col === 'vinho' || stCol.includes('c8647d') || stCol.includes('200, 100, 125')) {
          color = 'vinho';
        } else if (col === 'dourado' || stCol.includes('e5b894') || stCol.includes('229, 184, 148')) {
          color = 'dourado';
        }

        if (tag === 'mark' || el.getAttribute('data-nua-mark') === 'grifo') {
          grifo = true;
        }
        if (tag === 'strong' || tag === 'b' || el.style?.fontWeight === 'bold' || el.style?.fontWeight === '700') {
          isBold = true;
        }
        if (tag === 'em' || tag === 'i' || el.style?.fontStyle === 'italic') {
          isItalic = true;
        }
        if (tag === 'u' || (el.style?.textDecoration || '').includes('underline')) {
          isUnderline = true;
        }
        if (tag === 's' || tag === 'strike' || tag === 'del' || (el.style?.textDecoration || '').includes('line-through')) {
          isStrike = true;
        }
      }
      cur = cur.parentNode;
    }

    try {
      setActiveFormats({
        bold: isBold || document.queryCommandState('bold'),
        italic: isItalic || document.queryCommandState('italic'),
        underline: isUnderline || document.queryCommandState('underline'),
        strike: isStrike || document.queryCommandState('strikeThrough'),
        blockType,
        listType,
        align: blockAlign,
        fontSize,
        color,
        grifo,
      });
    } catch {
      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strike: isStrike,
        blockType,
        listType,
        align: blockAlign,
        fontSize,
        color,
        grifo,
      });
    }
  };

  // Garante que nós de texto soltos na raiz do editor estejam dentro de <p> e restaura a seleção
  const ensureSelectionAndBlocks = (): { root: HTMLElement; sel: Selection; range: Range } | null => {
    const root = editorRef.current;
    if (!root || typeof window === 'undefined') return null;

    // Envolve text nodes soltos diretamente na raiz em <p>
    Array.from(root.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim()) {
        const p = document.createElement('p');
        p.style.margin = '0 0 12px';
        root.insertBefore(p, child);
        p.appendChild(child);
      }
    });

    if (root.childNodes.length === 0) {
      const p = document.createElement('p');
      p.style.margin = '0 0 12px';
      p.innerHTML = '<br>';
      root.appendChild(p);
    }

    root.focus();
    const sel = window.getSelection();
    if (!sel) return null;

    if (savedRangeRef.current && root.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } else if (sel.rangeCount === 0 || !root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const firstBlock =
        Array.from(root.children).find(
          (c) => !c.hasAttribute('data-nua-img') && c.tagName.toLowerCase() !== 'hr'
        ) || root.firstChild;
      if (firstBlock) {
        const fallbackRange = document.createRange();
        fallbackRange.selectNodeContents(firstBlock);
        sel.removeAllRanges();
        sel.addRange(fallbackRange);
        savedRangeRef.current = fallbackRange.cloneRange();
      }
    }

    if (sel.rangeCount === 0) return null;
    return { root, sel, range: sel.getRangeAt(0) };
  };

  const selectNodeAndSave = (targetNode: Node) => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel) return;
    const newRange = document.createRange();
    newRange.selectNodeContents(targetNode);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();
    inspectSelectionFormats(newRange);
    updateFloatingBubblePosition(newRange, sel);
  };

  const findDirectChildBlock = (node: Node | null, root: HTMLElement): HTMLElement | null => {
    let cur: Node | null = node;
    while (cur && cur !== root && cur.parentNode !== root) {
      cur = cur.parentNode;
    }
    if (cur && cur !== root && cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as HTMLElement;
      if (!el.hasAttribute('data-nua-img') && el.tagName.toLowerCase() !== 'hr') {
        return el;
      }
    }
    return null;
  };

  const findAncestorMatching = (
    node: Node | null,
    root: HTMLElement,
    predicate: (el: HTMLElement) => boolean
  ): HTMLElement | null => {
    let cur: Node | null = node;
    while (cur && cur !== root) {
      if (cur.nodeType === Node.ELEMENT_NODE && predicate(cur as HTMLElement)) {
        return cur as HTMLElement;
      }
      cur = cur.parentNode;
    }
    return null;
  };

  const unwrapElementPreservingChildren = (el: HTMLElement): Node[] => {
    const parent = el.parentNode;
    if (!parent) return [];
    const moved: Node[] = [];
    while (el.firstChild) {
      moved.push(el.firstChild);
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
    return moved;
  };

  const syncFromDom = (recordHistory = true) => {
    const el = editorRef.current;
    if (!el) return;
    const nextCanonical = visualDomToCanonical(el);

    // Escudo anti-perda de conteúdo: se o DOM estiver vazio mas o rascunho anterior tinha texto,
    // e o editor não estiver em foco (ex: blur, remount, Fast Refresh), protege e restaura o DOM.
    const hadContent = (lastEmittedRef.current || '').trim().length > 10;
    const isNowEmpty = !nextCanonical.trim();
    if (isNowEmpty && hadContent && typeof document !== 'undefined' && document.activeElement !== el) {
      el.innerHTML = canonicalToVisualHtml(lastEmittedRef.current);
      return;
    }

    lastEmittedRef.current = nextCanonical;
    setIsEmpty(!nextCanonical.trim());
    if (recordHistory) {
      pushHistorySnapshot(nextCanonical);
    }
    onChange(nextCanonical);
  };

  useImperativeHandle(editorHandleRef, () => ({
    insertImages: (urls: string[]) => {
      const el = editorRef.current;
      const cleanUrls = (urls || []).map((u) => u.trim()).filter(Boolean);
      if (!el || cleanUrls.length === 0) return;

      const blockHtml = renderVisualImageBlockHtml({
        urls: cleanUrls,
        layout: cleanUrls.length > 1 ? 'grid' : 'full',
        caption: '',
      });

      const temp = document.createElement('div');
      temp.innerHTML = `${blockHtml}<p style="margin:0 0 12px"><br></p>`;
      const newImgNode = temp.firstElementChild as HTMLElement;
      const trailingP = temp.lastElementChild as HTMLElement;

      let inserted = false;
      if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
        let anchor: Node | null = savedRangeRef.current.commonAncestorContainer;
        while (anchor && anchor.parentNode !== el) {
          anchor = anchor.parentNode;
        }
        if (anchor && anchor.parentNode === el) {
          el.insertBefore(trailingP, anchor.nextSibling);
          el.insertBefore(newImgNode, trailingP);
          inserted = true;
        }
      }

      if (!inserted) {
        el.appendChild(newImgNode);
        el.appendChild(trailingP);
      }

      syncFromDom(true);
    },

    replaceActiveImage: (urls: string[]) => {
      const el = editorRef.current;
      const target = activeReplacingNodeRef.current;
      const cleanUrls = (urls || []).map((u) => u.trim()).filter(Boolean);
      if (!el || !target || !el.contains(target) || cleanUrls.length === 0) return;

      const currentCaptionInput = target.querySelector(
        'input[data-img-caption-input="true"]'
      ) as HTMLInputElement | null;
      const currentCaption =
        currentCaptionInput?.value ?? target.getAttribute('data-nua-caption') ?? '';
      const currentLayout = (target.getAttribute('data-nua-layout') || 'full') as EditorialImageLayout;
      const currentSize = (target.getAttribute('data-nua-img-size') || 'md') as EditorialImageSize;

      const temp = document.createElement('div');
      temp.innerHTML = renderVisualImageBlockHtml({
        urls: cleanUrls,
        layout: cleanUrls.length > 1 ? 'grid' : currentLayout === 'grid' ? 'full' : currentLayout,
        size: currentSize,
        caption: currentCaption,
      });
      const replacement = temp.firstElementChild as HTMLElement;
      if (replacement) {
        target.replaceWith(replacement);
      }
      activeReplacingNodeRef.current = null;
      syncFromDom(true);
    },
  }));

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = value || '';
    const hasDomContent = Boolean(
      el.textContent?.trim() || el.querySelector('[data-nua-img]') || el.querySelector('hr')
    );
    if (incoming !== lastEmittedRef.current || (incoming.trim() && !hasDomContent)) {
      el.innerHTML = canonicalToVisualHtml(incoming);
      lastEmittedRef.current = incoming;
      setIsEmpty(!incoming.trim());
    }
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = canonicalToVisualHtml(value || '');
    lastEmittedRef.current = value || '';
    setIsEmpty(!(value || '').trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const targetVal = historyStack[prevIdx];
    setHistoryIndex(prevIdx);
    applyCanonicalValueToDom(targetVal, false);
  };

  const handleRedo = () => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    const targetVal = historyStack[nextIdx];
    setHistoryIndex(nextIdx);
    applyCanonicalValueToDom(targetVal, false);
  };

  const executeImageCardAction = (
    imgCard: HTMLElement,
    action: string,
    param?: string
  ) => {
    const root = editorRef.current;
    if (!root || !imgCard || !root.contains(imgCard)) return;

    if (action === 'remove') {
      imgCard.remove();
      syncFromDom(true);
      return;
    }

    if (action === 'up') {
      const prev = imgCard.previousElementSibling;
      if (prev) {
        imgCard.parentNode?.insertBefore(imgCard, prev);
        syncFromDom(true);
      }
      return;
    }

    if (action === 'down') {
      const next = imgCard.nextElementSibling;
      if (next) {
        imgCard.parentNode?.insertBefore(next, imgCard);
        syncFromDom(true);
      }
      return;
    }

    if (action === 'layout' || action === 'size') {
      const currentLayout = (imgCard.getAttribute('data-nua-layout') || 'full') as EditorialImageLayout;
      const currentSize = (imgCard.getAttribute('data-nua-img-size') || 'md') as EditorialImageSize;
      const nextLayout =
        action === 'layout' ? ((param || 'full') as EditorialImageLayout) : currentLayout;
      const nextSize =
        action === 'size' ? ((param || 'md') as EditorialImageSize) : currentSize;

      const rawUrls = (imgCard.getAttribute('data-nua-img') || '')
        .split('|')
        .map((u) => u.trim())
        .filter(Boolean);
      const captionInput = imgCard.querySelector(
        'input[data-img-caption-input="true"]'
      ) as HTMLInputElement | null;
      const caption = captionInput?.value ?? imgCard.getAttribute('data-nua-caption') ?? '';

      const temp = document.createElement('div');
      temp.innerHTML = renderVisualImageBlockHtml({
        urls: rawUrls,
        layout: nextLayout,
        size: nextSize,
        caption,
      });
      const updatedNode = temp.firstElementChild as HTMLElement;
      if (updatedNode) {
        imgCard.replaceWith(updatedNode);
        syncFromDom(true);
      }
      return;
    }

    if (action === 'replace') {
      activeReplacingNodeRef.current = imgCard;
      const rawUrls = (imgCard.getAttribute('data-nua-img') || '')
        .split('|')
        .map((u) => u.trim())
        .filter(Boolean);
      if (onRequestReplaceImage) {
        onRequestReplaceImage(rawUrls);
      } else if (onRequestInsertImage) {
        onRequestInsertImage();
      }
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setContextMenu(null);
    const root = editorRef.current;
    if (!root) return;
    const targetEl = e.target as HTMLElement;
    const actionBtn = targetEl.closest('[data-img-action]') as HTMLElement | null;
    if (!actionBtn) {
      saveCurrentSelectionRange();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const imgCard = actionBtn.closest('[data-nua-img]') as HTMLElement | null;
    if (!imgCard || !root.contains(imgCard)) return;

    const action = actionBtn.getAttribute('data-img-action') || '';
    const param =
      actionBtn.getAttribute('data-layout') ||
      actionBtn.getAttribute('data-size') ||
      undefined;
    executeImageCardAction(imgCard, action, param);
  };

  const handleEditorContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = areaWrapperRef.current;
    const root = editorRef.current;
    if (!wrapper || !root) return;

    e.preventDefault();
    setFloatingMenuPos(null);

    const wrapperRect = wrapper.getBoundingClientRect();
    const rawTop = e.clientY - wrapperRect.top;
    const rawLeft = e.clientX - wrapperRect.left;
    const top = Math.max(8, Math.min(wrapperRect.height - 80, rawTop));
    const left = Math.max(12, Math.min(wrapperRect.width - 255, rawLeft));

    const targetEl = e.target as HTMLElement;
    const imgCard = targetEl.closest('[data-nua-img]') as HTMLElement | null;
    if (imgCard && root.contains(imgCard)) {
      setContextMenu({
        top,
        left,
        mode: 'image',
        targetImgEl: imgCard,
      });
      return;
    }

    saveCurrentSelectionRange();
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const hasTextSelection = Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);

    setContextMenu({
      top,
      left,
      mode: hasTextSelection ? 'selection' : 'paragraph',
      targetImgEl: null,
    });
  };

  // Expande a seleção para a palavra sob o cursor quando nenhuma seleção existir
  const expandRangeToCurrentWord = (range: Range): Range | null => {
    if (!range.collapsed) return range;
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const offset = range.startOffset;
      if (!text.trim()) return null;

      let start = offset;
      while (start > 0 && !/\s|[.,;!?:()"“”«»[\]]/.test(text[start - 1])) {
        start--;
      }

      let end = offset;
      while (end < text.length && !/\s|[.,;!?:()"“”«»[\]]/.test(text[end])) {
        end++;
      }

      if (start < end) {
        const wordRange = document.createRange();
        wordRange.setStart(node, start);
        wordRange.setEnd(node, end);
        return wordRange;
      }
    }
    return null;
  };

  // Negrito, Itálico, Sublinhar e Riscado com tags HTML semânticas e preservação de seleção
  const runExec = (cmd: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { sel, range } = ctx;

    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch {}

    if (range.collapsed) {
      const wordRange = expandRangeToCurrentWord(range);
      if (wordRange) {
        sel.removeAllRanges();
        sel.addRange(wordRange);
      }
    }

    document.execCommand(cmd, false);
    saveCurrentSelectionRange();
    syncFromDom(true);
  };

  const createStyledBlockElement = (
    type: 'p' | 'h1' | 'h2' | 'h3' | 'quote',
    alignVal: string
  ): HTMLElement => {
    const alignCss =
      alignVal === 'center'
        ? 'text-align:center;'
        : alignVal === 'right'
        ? 'text-align:right;'
        : '';

    let newEl: HTMLElement;
    if (type === 'h1') {
      newEl = document.createElement('h2');
      newEl.setAttribute('data-nua-heading', '1');
      newEl.style.cssText = `${alignCss}font-family:serif;font-size:1.65rem;color:#ffffff;font-weight:600;margin:18px 0 8px;line-height:1.25`;
    } else if (type === 'h2') {
      newEl = document.createElement('h3');
      newEl.setAttribute('data-nua-heading', '2');
      newEl.style.cssText = `${alignCss}font-family:serif;font-size:1.35rem;color:#ffffff;font-weight:600;margin:14px 0 6px;line-height:1.3`;
    } else if (type === 'h3') {
      newEl = document.createElement('h4');
      newEl.setAttribute('data-nua-heading', '3');
      newEl.style.cssText = `${alignCss}font-family:serif;font-size:1.14rem;color:#F5EEE9;font-weight:600;margin:12px 0 4px;line-height:1.35`;
    } else if (type === 'quote') {
      newEl = document.createElement('blockquote');
      newEl.style.cssText = `${alignCss}border-left:3px solid #90364B;padding:6px 12px 6px 14px;font-style:italic;color:#f3d4dc;margin:12px 0;background:rgba(102,28,48,0.14);border-radius:0 8px 8px 0`;
    } else {
      newEl = document.createElement('p');
      newEl.style.cssText = `${alignCss}margin:0 0 12px`;
    }

    if (alignVal === 'center' || alignVal === 'right') {
      newEl.setAttribute('data-nua-align', alignVal);
    }
    return newEl;
  };

  // Aplica formato de bloco: Parágrafo (P), Título (H2), Subtítulo (H3), Tópico (H4) ou Citação (BLOCKQUOTE)
  const applyBlockStructure = (requestedType: 'p' | 'h1' | 'h2' | 'h3' | 'quote') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, range } = ctx;

    // Se clicar novamente no botão de Título/Subtítulo/Tópico/Citação que já está ativo, volta para Parágrafo normal
    const targetType =
      requestedType !== 'p' && activeFormats.blockType === requestedType ? 'p' : requestedType;

    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    if (!blockEl) return;

    const currentAlign =
      blockEl.getAttribute('data-nua-align') || blockEl.style?.textAlign || 'left';

    // Se o bloco atual for uma lista (UL/OL), converte os itens da lista para o formato solicitado
    const blockTag = blockEl.tagName.toLowerCase();
    if (blockTag === 'ul' || blockTag === 'ol') {
      const items = Array.from(blockEl.querySelectorAll('li'));
      let lastInserted: HTMLElement | null = null;
      items.forEach((li) => {
        const newBlock = createStyledBlockElement(targetType, currentAlign);
        while (li.firstChild) newBlock.appendChild(li.firstChild);
        root.insertBefore(newBlock, blockEl);
        lastInserted = newBlock;
      });
      blockEl.remove();
      if (lastInserted) selectNodeAndSave(lastInserted);
      syncFromDom(true);
      return;
    }

    const fullText = (blockEl.textContent || '').trim();
    const selectedText = range.toString().trim();

    // Se a cliente selecionou apenas uma frase ou linha curta dentro de um parágrafo longo,
    // separa o trecho selecionado em seu próprio bloco de Título/Subtítulo/Citação sem transformar o post inteiro!
    if (
      !range.collapsed &&
      selectedText.length > 0 &&
      fullText.length > 80 &&
      selectedText.length < fullText.length * 0.78 &&
      blockEl.contains(range.startContainer) &&
      blockEl.contains(range.endContainer)
    ) {
      const beforeRange = document.createRange();
      beforeRange.setStart(blockEl, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const beforeFrag = beforeRange.extractContents();

      const selectedFrag = range.extractContents();

      const afterRange = document.createRange();
      afterRange.selectNodeContents(blockEl);
      const afterFrag = afterRange.extractContents();

      const parent = blockEl.parentNode || root;

      if ((beforeFrag.textContent || '').trim()) {
        const beforeBlock = createStyledBlockElement('p', currentAlign);
        beforeBlock.appendChild(beforeFrag);
        parent.insertBefore(beforeBlock, blockEl);
      }

      const targetBlock = createStyledBlockElement(targetType, currentAlign);
      targetBlock.appendChild(selectedFrag);
      parent.insertBefore(targetBlock, blockEl);

      if ((afterFrag.textContent || '').trim()) {
        const afterBlock = createStyledBlockElement('p', currentAlign);
        afterBlock.appendChild(afterFrag);
        parent.insertBefore(afterBlock, blockEl);
      }

      blockEl.remove();
      selectNodeAndSave(targetBlock);
      syncFromDom(true);
      return;
    }

    // Converte o bloco atual diretamente no DOM (funciona 100% em todos os navegadores)
    const newBlock = createStyledBlockElement(targetType, currentAlign);
    while (blockEl.firstChild) {
      newBlock.appendChild(blockEl.firstChild);
    }

    // Se voltou para Parágrafo normal, limpa eventuais spans de tamanho gigante que estivessem travando o bloco
    if (targetType === 'p') {
      Array.from(newBlock.querySelectorAll('[data-nua-size]')).forEach((szNode) => {
        unwrapElementPreservingChildren(szNode as HTMLElement);
      });
    }

    blockEl.replaceWith(newBlock);
    selectNodeAndSave(newBlock);
    syncFromDom(true);
  };

  // Alterna Lista com Marcadores (UL) ou Lista Numerada (OL) com visual imediato
  const toggleListBlock = (targetListTag: 'ul' | 'ol') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, range } = ctx;

    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    if (!blockEl) return;

    const currentTag = blockEl.tagName.toLowerCase();

    // Se já é a mesma lista, desfaz a lista voltando para parágrafos
    if (currentTag === targetListTag) {
      const items = Array.from(blockEl.querySelectorAll('li'));
      let lastP: HTMLElement | null = null;
      items.forEach((li) => {
        const p = createStyledBlockElement('p', 'left');
        while (li.firstChild) p.appendChild(li.firstChild);
        root.insertBefore(p, blockEl);
        lastP = p;
      });
      blockEl.remove();
      if (lastP) selectNodeAndSave(lastP);
      syncFromDom(true);
      return;
    }

    // Se é o outro tipo de lista (ex.: UL -> OL), troca a tag mantendo os itens
    if (currentTag === 'ul' || currentTag === 'ol') {
      const newList = document.createElement(targetListTag);
      newList.style.cssText = `padding-left:1.45rem;list-style-type:${
        targetListTag === 'ul' ? 'disc' : 'decimal'
      };margin:8px 0 12px`;
      while (blockEl.firstChild) {
        newList.appendChild(blockEl.firstChild);
      }
      blockEl.replaceWith(newList);
      selectNodeAndSave(newList);
      syncFromDom(true);
      return;
    }

    // Converte o bloco (ou linhas separadas por <br>) em itens <li>
    const newList = document.createElement(targetListTag);
    newList.style.cssText = `padding-left:1.45rem;list-style-type:${
      targetListTag === 'ul' ? 'disc' : 'decimal'
    };margin:8px 0 12px`;

    const rawHtmlLines = blockEl.innerHTML
      .split(/<br\s*\/?>/i)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawHtmlLines.length > 1) {
      rawHtmlLines.forEach((lineHtml) => {
        const li = document.createElement('li');
        li.style.margin = '4px 0';
        li.innerHTML = lineHtml;
        newList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.style.margin = '4px 0';
      while (blockEl.firstChild) {
        li.appendChild(blockEl.firstChild);
      }
      if (!li.hasChildNodes()) li.innerHTML = '<br>';
      newList.appendChild(li);
    }

    blockEl.replaceWith(newList);
    selectNodeAndSave(newList);
    syncFromDom(true);
  };

  // Altera o tamanho de fonte do trecho selecionado ou bloco atual (A-, Normal, A+, A++) mantendo a seleção
  const applyInlineFontSize = (requestedSize: 'pequeno' | 'normal' | 'grande' | 'gigante') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, sel, range } = ctx;

    const size =
      requestedSize !== 'normal' && activeFormats.fontSize === requestedSize
        ? 'normal'
        : requestedSize;

    const styleMap: Record<'pequeno' | 'grande' | 'gigante', string> = {
      pequeno: 'font-size:0.82em;color:#a1a1aa',
      grande: 'font-size:1.2em;color:#f4f4f5',
      gigante: 'font-family:serif;font-size:1.44em;color:#ffffff;line-height:1.35',
    };

    const existingSizeSpan = findAncestorMatching(range.commonAncestorContainer, root, (el) =>
      el.hasAttribute('data-nua-size')
    );

    // Se clicou em "Normal" e o bloco inteiro é um Título (H1/H2/H3), também converte o bloco para Parágrafo normal
    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    if (
      size === 'normal' &&
      blockEl &&
      ['h1', 'h2', 'h3', 'h4'].includes(blockEl.tagName.toLowerCase()) &&
      (range.collapsed ||
        range.toString().trim().length >= (blockEl.textContent || '').trim().length * 0.8)
    ) {
      applyBlockStructure('p');
      return;
    }

    // Se o cursor está dentro de um span de tamanho existente (ou todo o span está selecionado)
    if (
      existingSizeSpan &&
      (range.collapsed ||
        range.toString().trim() === (existingSizeSpan.textContent || '').trim())
    ) {
      if (size === 'normal') {
        const parentBlock = findDirectChildBlock(existingSizeSpan, root);
        unwrapElementPreservingChildren(existingSizeSpan);
        if (parentBlock) selectNodeAndSave(parentBlock);
      } else {
        existingSizeSpan.setAttribute('data-nua-size', size);
        existingSizeSpan.style.cssText = styleMap[size];
        selectNodeAndSave(existingSizeSpan);
      }
      syncFromDom(true);
      return;
    }

    // Se nenhum texto foi selecionado com o mouse, expande para a palavra sob o cursor
    let effectiveRange = range;
    if (range.collapsed) {
      const wordRange = expandRangeToCurrentWord(range);
      if (wordRange) {
        effectiveRange = wordRange;
        sel.removeAllRanges();
        sel.addRange(wordRange);
      } else {
        if (size === 'normal' && blockEl) {
          Array.from(blockEl.querySelectorAll('[data-nua-size]')).forEach((el) =>
            unwrapElementPreservingChildren(el as HTMLElement)
          );
          selectNodeAndSave(blockEl);
          syncFromDom(true);
        }
        return;
      }
    }

    // Trecho selecionado com o mouse ou palavra sob o cursor
    const frag = effectiveRange.extractContents();
    Array.from(frag.querySelectorAll('[data-nua-size], font[size]')).forEach((el) =>
      unwrapElementPreservingChildren(el as HTMLElement)
    );

    if (size === 'normal') {
      const wrapper = document.createElement('span');
      wrapper.appendChild(frag);
      effectiveRange.insertNode(wrapper);
      const parentBlock = findDirectChildBlock(wrapper, root);
      unwrapElementPreservingChildren(wrapper);
      if (existingSizeSpan) {
        unwrapElementPreservingChildren(existingSizeSpan);
      }
      if (parentBlock) selectNodeAndSave(parentBlock);
      syncFromDom(true);
      return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-nua-size', size);
    span.style.cssText = styleMap[size];
    span.appendChild(frag);
    effectiveRange.insertNode(span);
    selectNodeAndSave(span);
    syncFromDom(true);
  };

  // Aplica ou remove cor da identidade visual (Vinho, Dourado ou Padrão) mantendo a seleção
  const applyBrandColor = (requestedColor: 'vinho' | 'dourado' | 'padrao') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, sel, range } = ctx;

    const colorType =
      requestedColor !== 'padrao' && activeFormats.color === requestedColor
        ? 'padrao'
        : requestedColor;

    const colorStyleMap: Record<'vinho' | 'dourado', string> = {
      vinho: 'color:#c8647d;font-weight:500',
      dourado: 'color:#e5b894;font-weight:500',
    };

    const existingColorSpan = findAncestorMatching(range.commonAncestorContainer, root, (el) =>
      Boolean(
        el.getAttribute('data-nua-color') ||
          (el.tagName.toLowerCase() === 'font' && el.hasAttribute('color')) ||
          (el.tagName.toLowerCase() === 'span' && el.style?.color)
      )
    );

    if (
      existingColorSpan &&
      (range.collapsed ||
        range.toString().trim() === (existingColorSpan.textContent || '').trim())
    ) {
      if (colorType === 'padrao') {
        const parentBlock = findDirectChildBlock(existingColorSpan, root);
        unwrapElementPreservingChildren(existingColorSpan);
        if (parentBlock) selectNodeAndSave(parentBlock);
      } else {
        existingColorSpan.setAttribute('data-nua-color', colorType);
        existingColorSpan.style.cssText = colorStyleMap[colorType];
        selectNodeAndSave(existingColorSpan);
      }
      syncFromDom(true);
      return;
    }

    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    let effectiveRange = range;
    if (range.collapsed) {
      const wordRange = expandRangeToCurrentWord(range);
      if (wordRange) {
        effectiveRange = wordRange;
        sel.removeAllRanges();
        sel.addRange(wordRange);
      } else {
        if (colorType === 'padrao' && blockEl) {
          Array.from(blockEl.querySelectorAll('[data-nua-color], font[color]')).forEach((el) =>
            unwrapElementPreservingChildren(el as HTMLElement)
          );
          selectNodeAndSave(blockEl);
          syncFromDom(true);
        }
        return;
      }
    }

    const frag = effectiveRange.extractContents();
    Array.from(frag.querySelectorAll('[data-nua-color], font[color]')).forEach((el) =>
      unwrapElementPreservingChildren(el as HTMLElement)
    );

    if (colorType === 'padrao') {
      const temp = document.createElement('span');
      temp.appendChild(frag);
      effectiveRange.insertNode(temp);
      const parentBlock = findDirectChildBlock(temp, root);
      unwrapElementPreservingChildren(temp);
      if (existingColorSpan) unwrapElementPreservingChildren(existingColorSpan);
      if (parentBlock) selectNodeAndSave(parentBlock);
      syncFromDom(true);
      return;
    }

    const span = document.createElement('span');
    span.setAttribute('data-nua-color', colorType);
    span.style.cssText = colorStyleMap[colorType];
    span.appendChild(frag);
    effectiveRange.insertNode(span);
    selectNodeAndSave(span);
    syncFromDom(true);
  };

  // Aplica ou remove Grifo / Marca-texto Vinho mantendo a seleção e a formatação interna
  const toggleWineHighlightMark = () => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, sel, range } = ctx;

    const markCss =
      'background:rgba(102,28,48,0.52);color:#F5EEE9;padding:2px 6px;border-radius:6px;border-bottom:1px solid rgba(144,54,75,0.75)';

    const existingMark = findAncestorMatching(
      range.commonAncestorContainer,
      root,
      (el) => el.tagName.toLowerCase() === 'mark' || el.getAttribute('data-nua-mark') === 'grifo'
    );

    if (existingMark) {
      const parentBlock = findDirectChildBlock(existingMark, root);
      unwrapElementPreservingChildren(existingMark);
      if (parentBlock) selectNodeAndSave(parentBlock);
      syncFromDom(true);
      return;
    }

    let effectiveRange = range;
    if (range.collapsed) {
      const wordRange = expandRangeToCurrentWord(range);
      if (wordRange) {
        effectiveRange = wordRange;
        sel.removeAllRanges();
        sel.addRange(wordRange);
      } else {
        return;
      }
    }

    const frag = effectiveRange.extractContents();
    const nestedMarks = Array.from(frag.querySelectorAll('mark, [data-nua-mark="grifo"]'));
    if (nestedMarks.length > 0) {
      nestedMarks.forEach((m) => unwrapElementPreservingChildren(m as HTMLElement));
      const wrapper = document.createElement('span');
      wrapper.appendChild(frag);
      effectiveRange.insertNode(wrapper);
      const parentBlock = findDirectChildBlock(wrapper, root);
      unwrapElementPreservingChildren(wrapper);
      if (parentBlock) selectNodeAndSave(parentBlock);
      syncFromDom(true);
      return;
    }

    const mark = document.createElement('mark');
    mark.setAttribute('data-nua-mark', 'grifo');
    mark.style.cssText = markCss;
    mark.appendChild(frag);
    effectiveRange.insertNode(mark);
    selectNodeAndSave(mark);
    syncFromDom(true);
    syncFromDom(true);
  };

  // Alinhamento somente do(s) parágrafo(s)/bloco(s) selecionado(s)
  const applyBlockAlignment = (targetAlign: 'left' | 'center' | 'right') => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, range } = ctx;

    const touchedBlocks: HTMLElement[] = [];
    Array.from(root.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.hasAttribute('data-nua-img') || el.tagName.toLowerCase() === 'hr') return;
      try {
        if (range.intersectsNode(el)) {
          touchedBlocks.push(el);
        }
      } catch {}
    });

    if (touchedBlocks.length === 0) {
      const single = findDirectChildBlock(range.commonAncestorContainer, root);
      if (single) touchedBlocks.push(single);
    }

    touchedBlocks.forEach((blockEl) => {
      blockEl.setAttribute('data-nua-align', targetAlign);
      blockEl.style.textAlign = targetAlign;
    });

    saveCurrentSelectionRange();
    syncFromDom(true);
  };

  const insertEditorialDivider = () => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, range } = ctx;

    const hr = document.createElement('hr');
    hr.setAttribute('data-nua-divider', 'true');
    hr.style.cssText =
      'clear:both;border:none;border-top:1px solid rgba(144,54,75,0.45);margin:18px 0';
    const nextP = createStyledBlockElement('p', 'left');
    nextP.innerHTML = '<br>';

    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    if (blockEl && blockEl.parentNode === root) {
      root.insertBefore(nextP, blockEl.nextSibling);
      root.insertBefore(hr, nextP);
    } else {
      root.appendChild(hr);
      root.appendChild(nextP);
    }

    selectNodeAndSave(nextP);
    syncFromDom(true);
  };

  // Limpa formatação preservando todas as imagens e o texto
  const executeClearFormatting = () => {
    const ctx = ensureSelectionAndBlocks();
    if (!ctx) return;
    const { root, range } = ctx;

    if (!range.collapsed && root.contains(range.commonAncestorContainer)) {
      const plainText = range.toString();
      range.deleteContents();
      const textNode = document.createTextNode(plainText);
      range.insertNode(textNode);
      selectNodeAndSave(textNode);
      syncFromDom(true);
      setConfirmClearOpen(false);
      return;
    }

    // Se nenhuma palavra específica estiver selecionada, limpa estilos do documento preservando as fotos [img...]
    const currentCanonical = lastEmittedRef.current || '';
    const cleanedBlocks = currentCanonical
      .split(/\n{2,}/)
      .map((block) => {
        const trimmed = block.trim();
        if (parseEditorialImageTag(trimmed)) return trimmed;
        return trimmed
          .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
          .replace(/\*([^*\n]+)\*/g, '$1')
          .replace(/~~([\s\S]+?)~~/g, '$1')
          .replace(
            /\[(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]([\s\S]*?)\[\/(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]/gi,
            '$1'
          )
          .replace(/^#{1,3}\s+/gm, '')
          .replace(/^>\s+/gm, '');
      })
      .filter(Boolean)
      .join('\n\n');

    applyCanonicalValueToDom(cleanedBlocks, true);
    setConfirmClearOpen(false);
  };

  // Estatísticas editoriais em tempo real (sem IA) para o rodapé do editor
  const liveCanonical = value || historyStack[historyIndex] || '';
  const liveStats = React.useMemo(() => {
    const cleanBlocks = liveCanonical
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    let photos = 0;
    let paragraphs = 0;
    for (const b of cleanBlocks) {
      const parsedImg = parseEditorialImageTag(b);
      if (parsedImg) {
        photos += parsedImg.urls.length;
      } else if (b !== '---') {
        paragraphs += 1;
      }
    }
    const plainWords = liveCanonical
      .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '')
      .replace(/\[[^\]]+\]/g, ' ')
      .replace(/[#*>~_-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const words = plainWords.length;
    const readMin = Math.max(1, Math.round(words / 180));
    return { words, paragraphs, photos, readMin };
  }, [liveCanonical]);

  // Intercepta Colar (Ctrl+V / Botão Direito -> Colar) de textos de IA (ChatGPT/Gemini), WhatsApp, Docs ou Sites
  // e converte automaticamente **negrito**, ¨¨trecho¨¨, ## títulos, listas e parágrafos em formatação visual limpa!
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const plain = e.clipboardData?.getData('text/plain') || '';
    const html = e.clipboardData?.getData('text/html') || '';
    if (!plain && !html) return;

    e.preventDefault();
    setContextMenu(null);

    const formattedCanonical = normalizePastedOrAiTextToCanonical(plain, html);
    if (!formattedCanonical) return;

    const root = editorRef.current;
    if (!root) return;

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    const currentWholeText = (root.textContent || '').trim();
    const selectedText = sel ? sel.toString().trim() : '';

    // Se o editor estava vazio ou se todo o texto existente estava selecionado, substitui o documento inteiro já diagramado
    if (
      !currentWholeText ||
      (selectedText.length > 0 && selectedText.length >= currentWholeText.length * 0.9)
    ) {
      applyCanonicalValueToDom(formattedCanonical, true);
      return;
    }

    // Caso esteja colando no meio de um texto já existente, insere os blocos formatados na posição do cursor
    const pastedVisualHtml = canonicalToVisualHtml(formattedCanonical);
    if (sel && sel.rangeCount > 0 && root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const temp = document.createElement('div');
      temp.innerHTML = pastedVisualHtml;

      // Se colou vários parágrafos/títulos, insere após o bloco atual na raiz
      if (temp.children.length > 1) {
        const currentBlock = findDirectChildBlock(range.commonAncestorContainer, root);
        let refNode: Node | null = currentBlock ? currentBlock.nextSibling : null;
        let lastInserted: HTMLElement | null = null;
        Array.from(temp.childNodes).forEach((node) => {
          root.insertBefore(node, refNode);
          if (node.nodeType === Node.ELEMENT_NODE) {
            lastInserted = node as HTMLElement;
          }
        });
        if (currentBlock && !(currentBlock.textContent || '').trim()) {
          currentBlock.remove();
        }
        if (lastInserted) selectNodeAndSave(lastInserted);
      } else {
        const firstChild = temp.firstElementChild;
        const innerHtmlToInsert = firstChild ? firstChild.innerHTML : pastedVisualHtml;
        document.execCommand('insertHTML', false, innerHtmlToInsert);
      }
    } else {
      const temp = document.createElement('div');
      temp.innerHTML = pastedVisualHtml;
      while (temp.firstChild) {
        root.appendChild(temp.firstChild);
      }
    }

    saveCurrentSelectionRange();
    syncFromDom(true);
  };

  // Inteligência nativa de digitação (Sem IA):
  // - Enter no fim de um Título/Subtítulo/Citação abre automaticamente um Parágrafo normal
  // - Digitar "---" + Enter cria um divisor editorial
  // - Digitar "- " ou "1. " ou "> " no começo da linha cria Lista ou Citação
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setFloatingMenuPos(null);
      setContextMenu(null);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (k === 'b') {
        e.preventDefault();
        runExec('bold');
        return;
      }
      if (k === 'i') {
        e.preventDefault();
        runExec('italic');
        return;
      }
      if (k === 'u') {
        e.preventDefault();
        runExec('underline');
        return;
      }
    }

    const root = editorRef.current;
    if (!root || typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const blockEl = findDirectChildBlock(range.commonAncestorContainer, root);
    if (!blockEl) return;

    const tag = blockEl.tagName.toLowerCase();
    const blockText = (blockEl.textContent || '').trim();

    if (e.key === 'Enter' && !e.shiftKey) {
      // Se digitou "---" na linha e deu Enter, converte em Divisor Editorial
      if (blockText === '---' || blockText === '***') {
        e.preventDefault();
        const hr = document.createElement('hr');
        hr.setAttribute('data-nua-divider', 'true');
        hr.style.cssText =
          'clear:both;border:none;border-top:1px solid rgba(144,54,75,0.45);margin:18px 0';
        const nextP = createStyledBlockElement('p', 'left');
        nextP.innerHTML = '<br>';
        root.insertBefore(hr, blockEl);
        root.insertBefore(nextP, blockEl);
        blockEl.remove();
        selectNodeAndSave(nextP);
        syncFromDom(true);
        return;
      }

      // Se estava em um Título (H1/H2/H3) ou Citação e apertou Enter, a linha de baixo nasce como Parágrafo normal!
      if (['h1', 'h2', 'h3', 'h4', 'blockquote'].includes(tag) && range.collapsed) {
        e.preventDefault();
        const nextP = createStyledBlockElement('p', 'left');
        nextP.innerHTML = '<br>';
        root.insertBefore(nextP, blockEl.nextSibling);
        const caretRange = document.createRange();
        caretRange.setStart(nextP, 0);
        caretRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caretRange);
        savedRangeRef.current = caretRange.cloneRange();
        inspectSelectionFormats(caretRange);
        syncFromDom(true);
        return;
      }
    }

    // Atalhos nativos ao pressionar Espaço no início do parágrafo: "- ", "* ", "1. ", "> "
    if (e.key === ' ' && range.collapsed && (tag === 'p' || tag === 'div')) {
      if (blockText === '-' || blockText === '*' || blockText === '•') {
        e.preventDefault();
        blockEl.innerHTML = '<br>';
        toggleListBlock('ul');
        return;
      }
      if (blockText === '1.' || blockText === '1)') {
        e.preventDefault();
        blockEl.innerHTML = '<br>';
        toggleListBlock('ol');
        return;
      }
      if (blockText === '>') {
        e.preventDefault();
        blockEl.innerHTML = '<br>';
        applyBlockStructure('quote');
        return;
      }
    }
  };

  const minHeightPx = Math.max(rows * 26 + 32, compact ? 84 : 300);

  return (
    <div className="space-y-2">
      {label && <label className="block text-zinc-200 text-xs font-medium">{label}</label>}

      <div className="rounded-2xl bg-[#0e1015] border border-white/[0.08] focus-within:border-[#843C52]/60 transition-colors">
        {/* BARRA DE FERRAMENTAS EDITORIAL */}
        <div className="rounded-t-2xl bg-[#13151d] border-b border-white/[0.06]">
          {/* LINHA 1 DA BARRA: Estrutura (Parágrafo/Título/Subtítulo/Tópico), Tamanho (A-/A/A+/A++), Ênfase e Cores/Grifo */}
          <div className="flex flex-wrap items-center gap-1 px-3 py-2">
          {!compact && (
            <>
              {/* Grupo 1: Estrutura do Bloco */}
              <div className="inline-flex items-center rounded-lg bg-[#0e1015] border border-white/[0.07] p-0.5 gap-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyBlockStructure('p');
                  }}
                  aria-label="Parágrafo normal"
                  title="Voltar para Parágrafo normal"
                  className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                    activeFormats.blockType === 'p'
                      ? 'bg-[#843C52]/30 text-white font-medium'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Pilcrow className="w-3.5 h-3.5" />
                  <span>Parágrafo</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyBlockStructure('h1');
                  }}
                  aria-label="Título grande"
                  title="Transformar linha em Título Principal de Seção"
                  className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                    activeFormats.blockType === 'h1'
                      ? 'bg-[#843C52]/30 text-white font-medium'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Heading1 className="w-3.5 h-3.5" />
                  <span>Título</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyBlockStructure('h2');
                  }}
                  aria-label="Subtítulo"
                  title="Transformar linha em Subtítulo"
                  className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                    activeFormats.blockType === 'h2'
                      ? 'bg-[#843C52]/30 text-white font-medium'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>Subtítulo</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyBlockStructure('h3');
                  }}
                  aria-label="Tópico menor"
                  title="Transformar linha em Tópico menor"
                  className={`h-7 px-2 rounded-md text-[11px] hidden sm:inline-flex items-center gap-1 transition cursor-pointer ${
                    activeFormats.blockType === 'h3'
                      ? 'bg-[#843C52]/30 text-white font-medium'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Heading3 className="w-3.5 h-3.5" />
                  <span>Tópico</span>
                </button>
              </div>

              {/* Grupo 2: Tamanho da Letra (A-, Normal, A+, A++) */}
              <div className="hidden md:inline-flex items-center rounded-lg bg-[#0e1015] border border-white/[0.07] p-0.5 gap-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyInlineFontSize('pequeno');
                  }}
                  title="Diminuir letra do trecho selecionado (A−)"
                  aria-label="Diminuir tamanho da letra"
                  className={`h-7 px-2 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    activeFormats.fontSize === 'pequeno'
                      ? 'bg-[#843C52]/30 text-white font-semibold'
                      : 'hover:bg-white/[0.08] text-zinc-300 hover:text-white'
                  }`}
                >
                  A−
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyInlineFontSize('normal');
                  }}
                  title="Tamanho normal da letra"
                  aria-label="Tamanho normal da letra"
                  className={`h-7 px-2 rounded-md text-[11px] transition cursor-pointer ${
                    activeFormats.fontSize === 'normal'
                      ? 'bg-[#843C52]/30 text-white font-medium'
                      : 'hover:bg-white/[0.08] text-zinc-300 hover:text-white'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyInlineFontSize('grande');
                  }}
                  title="Aumentar letra do trecho selecionado (A+)"
                  aria-label="Aumentar tamanho da letra"
                  className={`h-7 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                    activeFormats.fontSize === 'grande'
                      ? 'bg-[#843C52]/30 text-white'
                      : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
                  }`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyInlineFontSize('gigante');
                  }}
                  title="Letra Extra Grande para frase de impacto (A++)"
                  aria-label="Letra extra grande"
                  className={`h-7 px-2 rounded-md text-xs font-serif font-bold transition cursor-pointer ${
                    activeFormats.fontSize === 'gigante'
                      ? 'bg-[#843C52]/30 text-white'
                      : 'hover:bg-white/[0.08] text-white'
                  }`}
                >
                  A++
                </button>
              </div>
            </>
          )}

          {/* Grupo 3: Ênfase (Negrito, Itálico, Sublinhado, Riscado) */}
          <div className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                runExec('bold');
              }}
              aria-label="Negrito"
              title="Negrito (Ctrl+B)"
              className={`h-7 px-2 rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.bold
                  ? 'bg-[#843C52]/30 text-white font-semibold'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Negrito</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                runExec('italic');
              }}
              aria-label="Itálico"
              title="Itálico (Ctrl+I)"
              className={`h-7 px-2 rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.italic
                  ? 'bg-[#843C52]/30 text-white font-semibold'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Itálico</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                runExec('underline');
              }}
              aria-label="Sublinhar"
              title="Sublinhar (Ctrl+U)"
              className={`h-7 px-2 rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.underline
                  ? 'bg-[#843C52]/30 text-white font-semibold'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
            >
              <Underline className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Sublinhar</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                runExec('strikeThrough');
              }}
              aria-label="Riscado"
              title="Texto riscado"
              className={`h-7 px-2 rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.strike
                  ? 'bg-[#843C52]/30 text-white font-semibold'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

          {/* Grupo 4: Cores da Identidade & Grifo Vinho */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyBrandColor('vinho');
              }}
              className={`h-7 px-2 rounded-lg text-[#c8647d] text-[11px] font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeFormats.color === 'vinho'
                  ? 'bg-[#843C52]/35 border border-[#90364B]/60 text-white'
                  : 'hover:bg-[#843C52]/20'
              }`}
              title="Colorir letra em Vinho (clique novamente para voltar à cor padrão)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#90364B] border border-white/20" />
              <span>Vinho</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyBrandColor('dourado');
              }}
              className={`h-7 px-2 rounded-lg text-[#e5b894] text-[11px] font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                activeFormats.color === 'dourado'
                  ? 'bg-[#e5b894]/25 border border-[#e5b894]/50 text-white'
                  : 'hover:bg-[#e5b894]/15'
              }`}
              title="Colorir letra em Dourado (clique novamente para voltar à cor padrão)"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#e5b894] border border-white/20" />
              <span>Dourado</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleWineHighlightMark();
              }}
              className={`h-7 px-2 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.grifo
                  ? 'bg-[#661C30]/55 border border-[#90364B]/70 text-white'
                  : 'hover:bg-[#661C30]/35 text-zinc-200 hover:text-white'
              }`}
              title="Grifar fundo do trecho selecionado em Vinho (clique novamente para tirar o grifo)"
            >
              <Highlighter className="w-3 h-3 text-[#c8647d]" />
              <span>Grifar</span>
            </button>
          </div>

          {/* Botão Mobile "Mais formatação" */}
          {!compact && (
            <button
              type="button"
              onClick={() => setMobileMoreOpen((v) => !v)}
              className="sm:hidden ml-auto h-7 px-2 rounded-lg bg-white/[0.06] text-zinc-200 text-[11px] inline-flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{mobileMoreOpen ? 'Menos' : 'Mais'}</span>
            </button>
          )}
        </div>

        {/* LINHA 2 DA BARRA: Alinhamento por Parágrafo, Listas, Citação, Divisor, Mídia, Histórico, Limpar e IA */}
        {!compact && (
          <div
            className={`${
              mobileMoreOpen ? 'flex' : 'hidden sm:flex'
            } flex-wrap items-center gap-1 px-3 py-1.5 bg-[#101219] border-t border-white/[0.06]`}
          >
            {/* Tamanho de fonte visível no mobile dentro do menu Mais */}
            <div className="flex md:hidden items-center rounded-lg bg-[#0e1015] border border-white/[0.07] p-0.5 gap-0.5 mr-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyInlineFontSize('pequeno');
                }}
                className="h-7 px-2 rounded-md text-zinc-300 text-[11px]"
              >
                A−
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyInlineFontSize('grande');
                }}
                className="h-7 px-2 rounded-md text-white text-xs font-semibold"
              >
                A+
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyInlineFontSize('gigante');
                }}
                className="h-7 px-2 rounded-md text-white text-xs font-serif font-bold"
              >
                A++
              </button>
            </div>

            {/* Alinhamento por Parágrafo */}
            <div className="inline-flex items-center rounded-lg bg-[#0e1015] border border-white/[0.07] p-0.5 gap-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBlockAlignment('left');
                }}
                title="Alinhar este parágrafo à esquerda"
                aria-label="Alinhar à esquerda"
                className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                  activeFormats.align === 'left'
                    ? 'bg-[#843C52]/30 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBlockAlignment('center');
                }}
                title="Centralizar apenas este parágrafo ou título"
                aria-label="Centralizar parágrafo"
                className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                  activeFormats.align === 'center'
                    ? 'bg-[#843C52]/30 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBlockAlignment('right');
                }}
                title="Alinhar este parágrafo à direita"
                aria-label="Alinhar à direita"
                className={`h-7 px-2 rounded-md text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                  activeFormats.align === 'right'
                    ? 'bg-[#843C52]/30 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

            {/* Listas, Citação e Divisor */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleListBlock('ul');
              }}
              className={`h-7 px-2 rounded-lg text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.listType === 'ul'
                  ? 'bg-[#843C52]/30 text-white font-medium'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
              title="Lista com marcadores"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleListBlock('ol');
              }}
              className={`h-7 px-2 rounded-lg text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.listType === 'ol'
                  ? 'bg-[#843C52]/30 text-white font-medium'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
              title="Lista numerada (1, 2, 3...)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Numerada</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockStructure('quote');
              }}
              className={`h-7 px-2 rounded-lg text-[11px] inline-flex items-center gap-1 transition cursor-pointer ${
                activeFormats.blockType === 'quote'
                  ? 'bg-[#843C52]/30 text-white font-medium'
                  : 'hover:bg-white/[0.08] text-zinc-200 hover:text-white'
              }`}
              title="Destacar parágrafo como Citação"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Citação</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertEditorialDivider();
              }}
              className="h-7 px-2 rounded-lg hover:bg-white/[0.08] text-zinc-200 hover:text-white text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
              title="Inserir divisor entre seções"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Divisor</span>
            </button>

            {/* Inserir Foto da Biblioteca */}
            {onRequestInsertImage && (
              <>
                <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelectionRange();
                    onRequestInsertImage();
                  }}
                  className="h-7 px-2.5 rounded-lg bg-[#843C52]/25 hover:bg-[#843C52]/40 border border-[#843C52]/50 text-[#F5EEE9] text-[11px] font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Inserir 1 foto ou conjunto de 2 a 3 fotos da sua Biblioteca no ponto do cursor"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#c8647d]" />
                  <span>Inserir Foto</span>
                </button>
              </>
            )}

            {/* Lado Direito: Desfazer, Refazer, Limpar e Organizar com IA */}
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Desfazer última alteração"
                aria-label="Desfazer"
                className="h-7 px-2 rounded-lg hover:bg-white/[0.08] text-zinc-300 hover:text-white disabled:opacity-30 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= historyStack.length - 1}
                title="Refazer alteração"
                aria-label="Refazer"
                className="h-7 px-2 rounded-lg hover:bg-white/[0.08] text-zinc-300 hover:text-white disabled:opacity-30 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
                  if (sel && !sel.isCollapsed) {
                    executeClearFormatting();
                  } else {
                    setConfirmClearOpen(true);
                  }
                }}
                className="h-7 px-2 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                title="Limpar estilos do trecho selecionado (preserva o texto e todas as fotos)"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Limpar</span>
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Confirmação discreta antes de limpar formatação do post inteiro */}
        {confirmClearOpen && (
          <div className="px-3.5 py-2.5 bg-[#171216] border-b border-[#90364B]/40 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-200">
            <span>
              Deseja remover todos os estilos (negritos, cores e títulos) do texto? Suas palavras e suas fotos serão mantidas.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={executeClearFormatting}
                className="px-3 py-1 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-[11px] font-semibold cursor-pointer"
              >
                Sim, limpar estilos
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 text-[11px] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Área do Post com Menu Flutuante ao Selecionar Texto (Bubble Menu) e Menu de Clique Direito */}
        <div ref={areaWrapperRef} className="relative">
          {/* 1. MENU FLUTUANTE ESPECÍFICO PARA TEXTO SELECIONADO COM O MOUSE (BUBBLE MENU ULTRA SLEEK) */}
          {floatingMenuPos && !contextMenu && (
            <div
              style={{
                top: `${floatingMenuPos.top}px`,
                left: `${floatingMenuPos.left}px`,
                transform: 'translateX(-50%)',
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute z-40 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#12141c]/96 border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-fade-in select-none whitespace-nowrap"
            >
              {/* Negrito */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runExec('bold');
                }}
                aria-label="Negrito"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition cursor-pointer ${
                  activeFormats.bold
                    ? 'bg-[#843C52] text-white font-bold'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              {/* Itálico */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runExec('italic');
                }}
                aria-label="Itálico"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition cursor-pointer ${
                  activeFormats.italic
                    ? 'bg-[#843C52] text-white font-bold'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              {/* Sublinhar */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  runExec('underline');
                }}
                aria-label="Sublinhar"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition cursor-pointer ${
                  activeFormats.underline
                    ? 'bg-[#843C52] text-white font-bold'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-white/10 mx-0.5" />

              {/* Cor Vinho */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBrandColor('vinho');
                }}
                aria-label="Cor Vinho"
                className={`h-7 px-2 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer ${
                  activeFormats.color === 'vinho'
                    ? 'bg-[#843C52]/50 text-white border border-[#90364B]/60'
                    : 'text-[#e39ab0] hover:bg-white/10'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#90364B]" />
                <span className="text-[10.5px]">Vinho</span>
              </button>

              {/* Cor Dourado */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBrandColor('dourado');
                }}
                aria-label="Cor Dourada"
                className={`h-7 px-2 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer ${
                  activeFormats.color === 'dourado'
                    ? 'bg-[#e5b894]/30 text-white border border-[#e5b894]/50'
                    : 'text-[#e5b894] hover:bg-white/10'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#e5b894]" />
                <span className="text-[10.5px]">Dourado</span>
              </button>

              {/* Grifar */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleWineHighlightMark();
                }}
                aria-label="Grifar texto em Vinho"
                className={`h-7 px-2 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer ${
                  activeFormats.grifo
                    ? 'bg-[#661C30] text-white border border-[#90364B]/60'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Highlighter className="w-3 h-3 text-[#e39ab0]" />
                <span className="text-[10.5px]">Grifar</span>
              </button>

              <div className="w-px h-3.5 bg-white/10 mx-0.5" />

              {/* Limpar formatação */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeClearFormatting();
                }}
                aria-label="Limpar formatação do trecho"
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. MENU DE CLIQUE DIREITO ULTRA REFINADO (ESTILO MAC / LINEAR / NOTION / LUXO NUA BORGES) */}
          {contextMenu && (
            <div
              style={{
                top: `${contextMenu.top}px`,
                left: `${contextMenu.left}px`,
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute z-50 w-56 rounded-xl bg-[#0f1118]/96 border border-white/[0.08] shadow-[0_18px_42px_rgba(0,0,0,0.88)] backdrop-blur-2xl p-1 text-xs text-zinc-300 select-none ring-1 ring-white/[0.04] animate-fade-in"
            >
              {contextMenu.mode === 'image' && contextMenu.targetImgEl ? (
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'layout', 'left');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-4 text-center text-zinc-400">◧</span>
                    <span>Alinhar à Esquerda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'layout', 'portrait');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-4 text-center text-zinc-400">◉</span>
                    <span>Centralizar Retrato</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'layout', 'right');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-4 text-center text-zinc-400">◨</span>
                    <span>Alinhar à Direita</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'layout', 'full');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="w-4 text-center text-zinc-400">↔</span>
                    <span>Largura Total</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-zinc-400">
                    <span>Tamanho</span>
                    <div className="inline-flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-md border border-white/[0.06]">
                      {(['sm', 'md', 'lg'] as const).map((sz, idx) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            executeImageCardAction(contextMenu.targetImgEl!, 'size', sz);
                            setContextMenu(null);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold hover:bg-white/10 hover:text-white text-zinc-300 cursor-pointer"
                        >
                          {idx === 0 ? 'P' : idx === 1 ? 'M' : 'G'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'up');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Mover para cima</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'down');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Mover para baixo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'replace');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Trocar foto...</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => {
                      executeImageCardAction(contextMenu.targetImgEl!, 'remove');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400 hover:text-rose-200 text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover foto</span>
                  </button>
                </div>
              ) : contextMenu.mode === 'selection' ? (
                <div className="space-y-0.5">
                  {/* Barra rápida e minimalista de estilos inline */}
                  <div className="flex items-center justify-between p-1 bg-white/[0.03] rounded-lg mb-1 border border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => {
                        runExec('bold');
                        setContextMenu(null);
                      }}
                      title="Negrito"
                      className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        runExec('italic');
                        setContextMenu(null);
                      }}
                      title="Itálico"
                      className="w-7 h-7 rounded flex items-center justify-center italic text-xs text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        runExec('underline');
                        setContextMenu(null);
                      }}
                      title="Sublinhar"
                      className="w-7 h-7 rounded flex items-center justify-center underline text-xs text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      U
                    </button>
                    <div className="w-px h-3.5 bg-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        applyBrandColor('vinho');
                        setContextMenu(null);
                      }}
                      title="Cor Vinho"
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-[#90364B]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyBrandColor('dourado');
                        setContextMenu(null);
                      }}
                      title="Cor Dourada"
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
                    >
                      <span className="w-3 h-3 rounded-full bg-[#e5b894]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleWineHighlightMark();
                        setContextMenu(null);
                      }}
                      title="Grifar"
                      className="w-7 h-7 rounded flex items-center justify-center text-rose-300 hover:bg-[#661C30]/50 hover:text-white cursor-pointer"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('h1');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Heading1 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Virar Título</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('h2');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Heading2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Virar Subtítulo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('quote');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Quote className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Virar Citação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('p');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Pilcrow className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Voltar a Parágrafo</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => {
                      executeClearFormatting();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eraser className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Limpar formatação</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {onRequestInsertImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setContextMenu(null);
                        onRequestInsertImage();
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors text-zinc-200"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-[#e5b894]" />
                      <span>Inserir foto da biblioteca...</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      insertEditorialDivider();
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Inserir linha divisória</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('h1');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Heading1 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Título</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('h2');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Heading2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Subtítulo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyBlockStructure('quote');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Quote className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Citação editorial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleListBlock('ul');
                      setContextMenu(null);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.08] hover:text-white text-left flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <List className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Lista com marcadores</span>
                  </button>

                  <div className="my-1 h-px bg-white/[0.06]" />

                  <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-zinc-400">
                    <span>Alinhamento</span>
                    <div className="inline-flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-md border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          applyBlockAlignment('left');
                          setContextMenu(null);
                        }}
                        title="Esquerda"
                        className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white text-zinc-300 cursor-pointer"
                      >
                        <AlignLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyBlockAlignment('center');
                          setContextMenu(null);
                        }}
                        title="Centro"
                        className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white text-zinc-300 cursor-pointer"
                      >
                        <AlignCenter className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          applyBlockAlignment('right');
                          setContextMenu(null);
                        }}
                        title="Direita"
                        className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white text-zinc-300 cursor-pointer"
                      >
                        <AlignRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isEmpty && (
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 p-4 sm:p-5 text-zinc-500 text-sm leading-relaxed select-none ${
                align === 'center' ? 'text-center' : 'text-left'
              }`}
            >
              {placeholder}
            </div>
          )}

          <style>{`
            [data-nua-editor="true"] h1,
            [data-nua-editor="true"] h2 {
              font-family: serif !important;
              font-size: 1.65rem !important;
              color: #ffffff !important;
              font-weight: 600 !important;
              margin: 18px 0 8px !important;
              line-height: 1.25 !important;
              display: block;
            }
            [data-nua-editor="true"] h3 {
              font-family: serif !important;
              font-size: 1.35rem !important;
              color: #ffffff !important;
              font-weight: 600 !important;
              margin: 14px 0 6px !important;
              line-height: 1.3 !important;
              display: block;
            }
            [data-nua-editor="true"] h4 {
              font-family: serif !important;
              font-size: 1.14rem !important;
              color: #F5EEE9 !important;
              font-weight: 600 !important;
              margin: 12px 0 4px !important;
              line-height: 1.35 !important;
              display: block;
            }
            [data-nua-editor="true"] p {
              margin: 0 0 12px;
              display: block;
            }
            [data-nua-editor="true"] blockquote {
              border-left: 3px solid #90364B !important;
              padding: 6px 12px 6px 14px !important;
              font-style: italic !important;
              color: #f3d4dc !important;
              margin: 12px 0 !important;
              background: rgba(102, 28, 48, 0.14) !important;
              border-radius: 0 8px 8px 0 !important;
              display: block;
            }
            [data-nua-editor="true"] ul {
              padding-left: 1.5rem !important;
              list-style-type: disc !important;
              margin: 8px 0 12px !important;
              display: block;
            }
            [data-nua-editor="true"] ol {
              padding-left: 1.5rem !important;
              list-style-type: decimal !important;
              margin: 8px 0 12px !important;
              display: block;
            }
            [data-nua-editor="true"] li {
              margin: 4px 0 !important;
              display: list-item !important;
            }
            [data-nua-editor="true"] strong,
            [data-nua-editor="true"] b {
              font-weight: 700 !important;
              color: #ffffff;
            }
            [data-nua-editor="true"] u {
              text-decoration: underline !important;
              text-decoration-color: #90364B !important;
              text-underline-offset: 4px !important;
            }
            [data-nua-editor="true"] mark,
            [data-nua-editor="true"] [data-nua-mark="grifo"] {
              background: rgba(102, 28, 48, 0.52) !important;
              color: #F5EEE9 !important;
              padding: 2px 6px !important;
              border-radius: 6px !important;
              border-bottom: 1px solid rgba(144, 54, 75, 0.75) !important;
            }
            [data-nua-editor="true"] [data-nua-size="pequeno"] {
              font-size: 0.82em !important;
              color: #a1a1aa !important;
            }
            [data-nua-editor="true"] [data-nua-size="grande"] {
              font-size: 1.2em !important;
              color: #f4f4f5 !important;
            }
            [data-nua-editor="true"] [data-nua-size="gigante"] {
              font-family: serif !important;
              font-size: 1.44em !important;
              color: #ffffff !important;
              line-height: 1.35 !important;
            }
            [data-nua-editor="true"] [data-nua-color="vinho"] {
              color: #c8647d !important;
              font-weight: 500;
            }
            [data-nua-editor="true"] [data-nua-color="dourado"] {
              color: #e5b894 !important;
              font-weight: 500;
            }
          `}</style>

          <div
            ref={editorRef}
            data-nua-editor="true"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onClick={handleEditorClick}
            onContextMenu={handleEditorContextMenu}
            onPaste={handleEditorPaste}
            onMouseUp={saveCurrentSelectionRange}
            onKeyUp={saveCurrentSelectionRange}
            onKeyDown={handleEditorKeyDown}
            onInput={() => syncFromDom(true)}
            onBlur={() => {
              setFloatingMenuPos(null);
            }}
            style={{ minHeight: `${minHeightPx}px` }}
            className={
              compact
                ? `w-full p-3 text-zinc-100 text-xs sm:text-sm outline-none leading-relaxed overflow-y-auto ${
                    align === 'center' ? 'text-center' : 'text-left'
                  }`
                : `w-full p-4 sm:p-5 text-zinc-100 text-sm sm:text-[15px] outline-none leading-[1.8] after:content-[''] after:table after:clear-both ${
                    align === 'center' ? 'text-center' : 'text-left'
                  }`
            }
          />
        </div>

        {/* Rodapé Editorial Inteligente (Contagem de palavras, parágrafos, fotos e dica de clique direito) */}
        {!compact && (
          <div className="rounded-b-2xl px-3.5 py-2 bg-[#11131a] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 select-none">
            <div className="flex flex-wrap items-center gap-2">
              <span>{liveStats.words} palavras</span>
              <span>•</span>
              <span>{liveStats.paragraphs} parágrafos/blocos</span>
              {liveStats.photos > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#c8647d] font-medium">
                    {liveStats.photos} {liveStats.photos === 1 ? 'foto no texto' : 'fotos no texto'}
                  </span>
                </>
              )}
              <span>•</span>
              <span>~{liveStats.readMin} min de leitura</span>
            </div>
            <span className="text-zinc-500 hidden sm:inline">
              Dica: selecione um trecho ou clique com o botão direito para ações rápidas
            </span>
          </div>
        )}
      </div>

      {helperText && <span className="text-zinc-500 text-[11px] block">{helperText}</span>}
    </div>
  );
}
