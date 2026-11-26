'use client';

import React from 'react';
import {
  Archive,
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  Forward,
  Inbox,
  Italic,
  Layers,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  PencilLine,
  Plus,
  RefreshCw,
  Reply,
  ReplyAll,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Underline,
  UserPlus,
  Users,
  X,
  ZoomIn,
  AlertCircle,
  Image as ImageIcon,
  FolderInput,
} from 'lucide-react';
import { PageHeader } from './ui/AdminPrimitives';
import {
  mailService,
  type MailAccount,
  type MailAccountId,
  type MailAccountScope,
  type MailAttachmentMeta,
  type MailContact,
  type MailFolder,
  type MailMessage,
  type MailMessageBody,
  type MailSearchFilters,
} from '@/lib/services/nua/mailService';

/* -------------------------------------------------------------------------- */
/* Tipos internos e Utilitários                                                */
/* -------------------------------------------------------------------------- */

type SystemNavId =
  | 'inbox'
  | 'all'
  | 'unread'
  | 'starred'
  | 'drafts'
  | 'sent'
  | 'archive'
  | 'spam'
  | 'trash';

type AttachmentDraft = {
  filename: string;
  content: string;
  contentType: string;
  size?: number;
};

type LocalDraftState = {
  account: MailAccountId;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  html: string;
  updatedAt: string;
  inReplyToUid?: number;
  forwardOfUid?: number;
  refFolder?: string;
};

type ConversationThread = {
  key: string;
  latest: MailMessage;
  messages: MailMessage[];
  unreadCount: number;
  starred: boolean;
  hasAttachments: boolean;
};

type UndoAction = {
  label: string;
  run: () => Promise<void>;
};

const LOCAL_DRAFT_STORAGE_KEY = 'nua_admin_mail_draft_v2';
const LOCAL_SIGNATURE_STORAGE_KEY = 'nua_admin_mail_signature_v1';
const DEFAULT_SIGNATURE = `<br><br><div style="color:#71717a;font-size:13px;border-top:1px solid #e4e4e7;padding-top:10px;margin-top:16px;"><strong>Nua Borges</strong><br>contato@nuaborges.com.br</div>`;

function detectFolderRole(folder: MailFolder): SystemNavId | 'custom' {
  const special = String(folder.specialUse || '').toLowerCase();
  const path = String(folder.path || folder.name || '');
  if (/\\inbox/i.test(special) || /^inbox$/i.test(path)) return 'inbox';
  if (/\\sent/i.test(special) || /(^|[/.])sent( items)?$/i.test(path)) return 'sent';
  if (/\\drafts/i.test(special) || /(^|[/.])drafts?$/i.test(path)) return 'drafts';
  if (/\\trash/i.test(special) || /(^|[/.])(trash|deleted|lixeira)$/i.test(path)) return 'trash';
  if (/\\junk/i.test(special) || /(^|[/.])(spam|junk|bulk)$/i.test(path)) return 'spam';
  if (/\\archive/i.test(special) || /(^|[/.])(archive|arquivo)$/i.test(path)) return 'archive';
  return 'custom';
}

function cleanCustomFolderName(folder: MailFolder): string {
  const raw = String(folder.name || folder.path || '');
  return raw.replace(/^INBOX[./]/i, '');
}

function displayFolderName(rawPath: string): string {
  const cleaned = String(rawPath || '').replace(/^INBOX[./]/i, '').trim();
  const lower = cleaned.toLowerCase();
  if (!lower || lower === 'inbox') return 'Caixa de entrada';
  if (lower === 'sent' || lower === 'sent items') return 'Enviados';
  if (lower === 'draft' || lower === 'drafts') return 'Rascunhos';
  if (lower === 'trash' || lower === 'deleted' || lower === 'lixeira') return 'Lixeira';
  if (lower === 'spam' || lower === 'junk' || lower === 'bulk') return 'Spam';
  if (lower === 'archive' || lower === 'arquivo') return 'Arquivados';
  return cleaned;
}

function friendlyMailError(err: unknown, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  const msg = err.message.trim();
  if (
    /http|imap|smtp|socket|timeout|econn|etimedout|enotfound|json|fetch|network|server|servidor|500|502|503|504|401|403|404|error|failed|auth|login|token|ssl|tls|hostinger|yahoo|uid|mailbox/i.test(
      msg
    )
  ) {
    return fallback;
  }
  return msg;
}

function parseAddress(raw: string): { name: string; email: string; initials: string } {
  const cleaned = String(raw || '').replace(/["']/g, '').trim();
  const match = cleaned.match(/^(.*?)<([^>]+)>$/);
  let name = '';
  let email = '';
  if (match) {
    name = match[1].trim();
    email = match[2].trim();
  } else if (cleaned.includes('@')) {
    email = cleaned.trim();
    name = cleaned.split('@')[0];
  } else {
    name = cleaned || 'Remetente';
  }
  if (!name) name = email || 'Remetente';
  const parts = name.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return { name, email: email.toLowerCase(), initials: initials || 'M' };
}

function displayShortDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(
    'pt-BR',
    sameYear ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: '2-digit', year: '2-digit' }
  );
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayFullDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addressList(input: string): string[] {
  return input
    .split(/[;,\n]/)
    .flatMap((chunk) => {
      const m = chunk.match(/<([^>]+)>/);
      return m ? [m[1].trim()] : [chunk.trim()];
    })
    .filter((v) => v.includes('@'));
}

function emailAddresses(input: string): string[] {
  return input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(contentType?: string, filename?: string): boolean {
  const ct = String(contentType || '').toLowerCase();
  if (/^image\/(png|jpeg|jpg|gif|webp|bmp)$/i.test(ct)) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(filename || ''));
}

/**
 * Agrupa mensagens em conversas (threads) exclusivamente quando possuem vínculo real
 * de cabeçalhos RFC 5322 (`Message-ID`, `In-Reply-To`, `References`), nunca misturando
 * e-mails sem relação apenas pelo assunto.
 */
function groupMessagesIntoThreads(messages: MailMessage[]): ConversationThread[] {
  const msgById = new Map<string, MailMessage>();
  for (const m of messages) {
    const mid = String(m.messageId || '').trim();
    if (mid) msgById.set(mid, m);
  }

  const parentMap = new Map<string, string>();
  const findRoot = (id: string): string => {
    let curr = id;
    const visited = new Set<string>();
    while (parentMap.has(curr) && !visited.has(curr)) {
      visited.add(curr);
      curr = parentMap.get(curr)!;
    }
    return curr;
  };

  for (const m of messages) {
    const mid = String(m.messageId || '').trim();
    if (!mid) continue;
    const refs = [
      ...String(m.references || '')
        .split(/\s+/)
        .map((r) => r.trim())
        .filter(Boolean),
      String(m.inReplyTo || '').trim(),
    ].filter(Boolean);

    if (refs.length > 0) {
      const rootRef = refs[0];
      const r1 = findRoot(mid);
      const r2 = findRoot(rootRef);
      if (r1 !== r2) {
        parentMap.set(r1, r2);
      }
    }
  }

  const groups = new Map<string, MailMessage[]>();
  for (const m of messages) {
    const mid = String(m.messageId || '').trim();
    const key = mid ? `thread:${findRoot(mid)}` : `single:${m.accountId || 'pro'}:${m.folder}:${m.uid}`;
    const list = groups.get(key) || [];
    list.push(m);
    groups.set(key, list);
  }

  const threads: ConversationThread[] = [];
  for (const [key, list] of groups.entries()) {
    const sortedChronological = [...list].sort(
      (a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)
    );
    const latest = sortedChronological[sortedChronological.length - 1];
    threads.push({
      key,
      latest,
      messages: sortedChronological,
      unreadCount: list.filter((item) => !item.read).length,
      starred: list.some((item) => Boolean(item.starred)),
      hasAttachments: list.some((item) => Array.isArray(item.attachments) && item.attachments.length > 0),
    });
  }

  return threads;
}

/* -------------------------------------------------------------------------- */
/* Avatar do Remetente (Foto de Contato Confiável ou Iniciais Elegantes)      */
/* -------------------------------------------------------------------------- */

function SenderAvatar({
  name,
  email,
  initials,
  contacts,
  size = 'md',
}: {
  name: string;
  email: string;
  initials: string;
  contacts: MailContact[];
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgError, setImgError] = React.useState(false);
  const contact = React.useMemo(
    () => contacts.find((c) => c.email.toLowerCase() === email.toLowerCase()),
    [contacts, email]
  );

  React.useEffect(() => {
    setImgError(false);
  }, [contact?.avatarUrl, email]);

  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 text-[11px]'
      : size === 'lg'
      ? 'h-11 w-11 text-sm'
      : 'h-9 w-9 text-xs';

  if (contact?.avatarUrl && !imgError) {
    return (
      <img
        src={contact.avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover border border-white/[0.1] bg-[#181920]`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full flex items-center justify-center font-semibold tracking-tight border ${
        contact
          ? 'bg-[#843C52]/20 border-[#843C52]/40 text-[#e39ab0]'
          : 'bg-white/[0.04] border-white/[0.08] text-zinc-300'
      }`}
      title={contact ? `${contact.name} (Contato salvo)` : `${name} <${email}>`}
    >
      {initials}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Iframe de Leitura de E-mail com Auto-Altura e Isolamento Seguro            */
/* -------------------------------------------------------------------------- */

function EmailHtmlFrame({ html }: { html: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = React.useState<number>(260);

  const srcDoc = React.useMemo(() => {
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" />
<style>
  :root { color-scheme: light; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #18181b;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.65;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .nua-email-wrap {
    padding: 20px 24px;
    max-width: 100%;
    overflow-x: auto;
    box-sizing: border-box;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  img:not([src]), img[src=""] {
    display: none !important;
  }
  table {
    max-width: 100% !important;
  }
  a {
    color: #843C52;
  }
  blockquote {
    margin: 12px 0;
    padding-left: 12px;
    border-left: 3px solid #e4e4e7;
    color: #52525b;
  }
  pre {
    white-space: pre-wrap;
    background: #f4f4f5;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
  }
</style>
</head>
<body>
  <div class="nua-email-wrap" id="nua-root">${html}</div>
</body>
</html>`;
  }, [html]);

  const measureHeight = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const root = doc.getElementById('nua-root') || doc.body;
      const next = Math.max(120, Math.min(4000, root.scrollHeight + 16));
      setHeight(next);
    } catch {}
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(measureHeight, 120);
    const timer2 = window.setTimeout(measureHeight, 600);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, [srcDoc, measureHeight]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white">
      <iframe
        ref={iframeRef}
        title="Conteúdo da mensagem de e-mail"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        onLoad={measureHeight}
        style={{ height: `${height}px` }}
        className="w-full border-0 bg-white block transition-[height] duration-150"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Componente Principal MailModule                                             */
/* -------------------------------------------------------------------------- */

export function MailModule({ initialSearch = '' }: { initialSearch?: string } = {}) {
  const initialSearchTerm = initialSearch.trim();
  const isLocalMailHost = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }, []);
  // Contas e escopo ('profissional' | 'pessoal' | 'unificada')
  const [accounts, setAccounts] = React.useState<MailAccount[]>([]);
  const [accountScope, setAccountScope] = React.useState<MailAccountScope>('profissional');
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);

  // Pastas e navegação
  const [folders, setFolders] = React.useState<MailFolder[]>([]);
  const [activeNav, setActiveNav] = React.useState<string>(
    initialSearchTerm && isLocalMailHost ? 'all' : 'inbox'
  ); // SystemNavId | 'custom:<path>' | 'contacts'
  const [customFolderModal, setCustomFolderModal] = React.useState<null | {
    mode: 'create' | 'rename' | 'delete';
    account: MailAccountId;
    path?: string;
    currentName?: string;
  }>(null);
  const [folderNameInput, setFolderNameInput] = React.useState('');
  const [folderActionLoading, setFolderActionLoading] = React.useState(false);

  // Mensagens, threads e leitura
  const [messages, setMessages] = React.useState<MailMessage[]>([]);
  const [totalMessages, setTotalMessages] = React.useState<number>(0);
  const [selected, setSelected] = React.useState<MailMessage | null>(null);
  const [messageBody, setMessageBody] = React.useState<MailMessageBody | null>(null);
  const [expandedThreadBodies, setExpandedThreadBodies] = React.useState<Record<string, MailMessageBody>>({});
  const [expandedThreadIds, setExpandedThreadIds] = React.useState<Set<string>>(new Set());

  // Estados de carregamento
  const [loadingAccounts, setLoadingAccounts] = React.useState(true);
  const [loadingFolders, setLoadingFolders] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [loadingBody, setLoadingBody] = React.useState(false);
  const [syncingSilent, setSyncingSilent] = React.useState(false);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState('');

  // Busca e Filtros Avançados
  const [searchText, setSearchText] = React.useState(initialSearchTerm);
  const [filters, setFilters] = React.useState<MailSearchFilters>({
    sort: 'newest',
    q: initialSearchTerm || undefined,
  });
  const [advancedSearchOpen, setAdvancedSearchOpen] = React.useState(false);

  // Seleção em lote e paginação
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // Imagens remotas bloqueadas por padrão (privacidade/anti-tracking); botão permite carregar sob demanda
  const [allowImages, setAllowImages] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<null | {
    url: string;
    downloadUrl: string;
    filename: string;
    size?: number;
  }>(null);

  // Confirmação de exclusão permanente
  const [confirmPermanentDelete, setConfirmPermanentDelete] = React.useState<null | {
    targets: MailMessage[];
  }>(null);

  // Contatos
  const [contacts, setContacts] = React.useState<MailContact[]>([]);
  const [contactModal, setContactModal] = React.useState<null | {
    id?: string;
    name: string;
    email: string;
    avatarUrl: string;
    notes: string;
  }>(null);
  const [contactSearch, setContactSearch] = React.useState('');
  const [savingContact, setSavingContact] = React.useState(false);

  // Compositor Rico + Rascunho Automático
  const [composer, setComposer] = React.useState<null | {
    mode: 'new' | 'reply' | 'replyAll' | 'forward';
    senderAccount: MailAccountId;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    initialHtml: string;
    original?: MailMessage;
    draftUid?: number;
  }>(null);
  const [composerFiles, setComposerFiles] = React.useState<File[]>([]);
  const [showCcBcc, setShowCcBcc] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [savingDraftServer, setSavingDraftServer] = React.useState(false);
  const [localDraftSavedAt, setLocalDraftSavedAt] = React.useState<string>('');
  const [hasRecoverableLocalDraft, setHasRecoverableLocalDraft] = React.useState<LocalDraftState | null>(null);
  const [signatureHtml, setSignatureHtml] = React.useState<string>(DEFAULT_SIGNATURE);
  const [signatureModalOpen, setSignatureModalOpen] = React.useState(false);
  const [recipientSuggestions, setRecipientSuggestions] = React.useState<MailContact[]>([]);
  const [showRecipientSuggestions, setShowRecipientSuggestions] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  // Menus e Toasts (com suporte a Desfazer)
  const [notice, setNotice] = React.useState<{ text: string; undo?: UndoAction } | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Cache no cliente para troca rápida
  const clientMessagesCache = React.useRef<
    Map<string, { messages: MailMessage[]; total: number; totalPages: number }>
  >(new Map());
  const clientBodyCache = React.useRef<Map<string, MailMessageBody>>(new Map());

  const showToast = React.useCallback((text: string, undo?: UndoAction) => {
    setNotice({ text, undo });
    window.setTimeout(() => {
      setNotice((curr) => (curr?.text === text ? null : curr));
    }, 6000);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Inicialização: Contatos, Assinatura e Rascunho Local                     */
  /* ------------------------------------------------------------------------ */

  const loadContacts = React.useCallback(async () => {
    if (!isLocalMailHost) return;
    try {
      const res = await mailService.listContacts();
      setContacts(res.contacts || []);
    } catch {}
  }, [isLocalMailHost]);

  React.useEffect(() => {
    void loadContacts();
    try {
      const savedSig = window.localStorage.getItem(LOCAL_SIGNATURE_STORAGE_KEY);
      if (savedSig !== null) setSignatureHtml(savedSig);
      const savedDraft = window.localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as LocalDraftState;
        if (parsed && (parsed.subject || parsed.to || parsed.html)) {
          setHasRecoverableLocalDraft(parsed);
        }
      }
    } catch {}
  }, [loadContacts]);

  /* ------------------------------------------------------------------------ */
  /* Resolução de Pasta Real a partir do item de navegação                    */
  /* ------------------------------------------------------------------------ */

  const resolveFolderPathForAccount = React.useCallback(
    (navId: string, targetAccount: MailAccountScope, folderList: MailFolder[]): string => {
      if (navId.startsWith('custom:')) {
        return navId.slice('custom:'.length);
      }
      if (navId === 'all') return '__ALL__';
      if (navId === 'unread') return '__UNREAD__';
      if (navId === 'starred') return '__STARRED__';

      if (targetAccount === 'unificada') {
        if (navId === 'inbox') return 'INBOX';
        if (navId === 'sent') return 'Sent';
        if (navId === 'drafts') return 'Drafts';
        if (navId === 'spam') return 'Spam';
        if (navId === 'trash') return 'Trash';
        if (navId === 'archive') return 'Archive';
        return 'INBOX';
      }

      const acctFolders = folderList.filter((f) => !f.accountId || f.accountId === targetAccount);
      const matched = acctFolders.find((f) => detectFolderRole(f) === navId);
      if (matched) return matched.path;

      const isHostinger = targetAccount === 'profissional';
      if (navId === 'inbox') return isHostinger ? 'INBOX' : 'Inbox';
      if (navId === 'sent') return isHostinger ? 'INBOX.Sent' : 'Sent';
      if (navId === 'drafts') return isHostinger ? 'INBOX.Drafts' : 'Draft';
      if (navId === 'spam') return isHostinger ? 'INBOX.Junk' : 'Bulk';
      if (navId === 'trash') return isHostinger ? 'INBOX.Trash' : 'Trash';
      if (navId === 'archive') return isHostinger ? 'INBOX.Archive' : 'Archive';
      return 'INBOX';
    },
    []
  );

  const currentFolderPath = React.useMemo(
    () => resolveFolderPathForAccount(activeNav, accountScope, folders),
    [activeNav, accountScope, folders, resolveFolderPathForAccount]
  );

  /* ------------------------------------------------------------------------ */
  /* Carregamento de Contas, Pastas e Mensagens                               */
  /* ------------------------------------------------------------------------ */

  const loadAccounts = React.useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const result = await mailService.listAccounts();
      setAccounts(result.accounts || []);
      setError('');
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível carregar as contas de e-mail. Tente novamente em instantes.'));
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadFolders = React.useCallback(async (scope: MailAccountScope, silent = false) => {
    if (!silent) setLoadingFolders(true);
    try {
      const result = await mailService.listFolders(scope);
      setFolders(result.folders || []);
      if (!silent) setError('');
    } catch (err) {
      if (!silent) {
        setError(friendlyMailError(err, 'Não foi possível carregar as pastas. Tente novamente em instantes.'));
      }
    } finally {
      if (!silent) setLoadingFolders(false);
    }
  }, []);

  const loadMessages = React.useCallback(
    async (nextPage = 1, forceRefresh = false, silent = false) => {
      if (activeNav === 'contacts') return;
      const folderToFetch = resolveFolderPathForAccount(activeNav, accountScope, folders);
      if (!folderToFetch) return;

      const filterKey = JSON.stringify(filters);
      const cacheKey = `${accountScope}:${folderToFetch}:${nextPage}:${filterKey}`;

      if (!forceRefresh && !silent && clientMessagesCache.current.has(cacheKey)) {
        const cached = clientMessagesCache.current.get(cacheKey)!;
        setMessages(cached.messages);
        setTotalMessages(cached.total);
        setTotalPages(cached.totalPages);
        setPage(nextPage);
      } else if (!silent) {
        setLoadingMessages(true);
      } else {
        setSyncingSilent(true);
      }

      try {
        const result = await mailService.listMessages(
          accountScope,
          folderToFetch,
          nextPage,
          25,
          filters.q || '',
          filters
        );
        const nextList = result.messages || [];
        const total = result.pagination?.total ?? nextList.length;
        const pages = result.pagination?.totalPages || 1;

        clientMessagesCache.current.set(cacheKey, {
          messages: nextList,
          total,
          totalPages: pages,
        });

        setMessages(nextList);
        setTotalMessages(total);
        setPage(nextPage);
        setTotalPages(pages);
        if (!silent) setSelectedIds([]);
        setLastSyncedAt(new Date());
        if (!silent) setError('');
      } catch (err) {
        if (!silent) {
          setError(friendlyMailError(err, 'Não foi possível carregar as mensagens. Tente novamente em instantes.'));
        }
      } finally {
        setLoadingMessages(false);
        setSyncingSilent(false);
      }
    },
    [activeNav, accountScope, folders, filters, resolveFolderPathForAccount]
  );

  React.useEffect(() => {
    const term = initialSearch.trim();
    if (!term) return;
    setSearchText(term);
    setFilters({ sort: 'newest', q: term });
    setActiveNav('all');
    setPage(1);
  }, [initialSearch]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  React.useEffect(() => {
    void loadFolders(accountScope);
  }, [accountScope, loadFolders]);

  React.useEffect(() => {
    if (activeNav === 'contacts') return;
    void loadMessages(1);
  }, [activeNav, accountScope, filters, loadMessages]);

  // Sincronização silenciosa em segundo plano a cada 45s quando a aba estiver visível
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && activeNav !== 'contacts') {
        void loadFolders(accountScope, true);
        void loadMessages(page, true, true);
      }
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [accountScope, activeNav, page, loadFolders, loadMessages]);

  /* ------------------------------------------------------------------------ */
  /* Contadores de Não Lidos por Pasta e Contas                               */
  /* ------------------------------------------------------------------------ */

  const navCounts = React.useMemo(() => {
    const counts: Record<string, { unseen: number; messages: number }> = {
      inbox: { unseen: 0, messages: 0 },
      all: { unseen: 0, messages: 0 },
      unread: { unseen: 0, messages: 0 },
      starred: { unseen: 0, messages: 0 },
      drafts: { unseen: 0, messages: 0 },
      sent: { unseen: 0, messages: 0 },
      archive: { unseen: 0, messages: 0 },
      spam: { unseen: 0, messages: 0 },
      trash: { unseen: 0, messages: 0 },
    };
    for (const f of folders) {
      const role = detectFolderRole(f);
      const u = f.unseen || 0;
      const m = f.messages || 0;
      if (counts[role]) {
        counts[role].unseen += u;
        counts[role].messages += m;
      }
      if (role !== 'spam' && role !== 'trash') {
        counts.all.unseen += u;
        counts.all.messages += m;
        counts.unread.unseen += u;
      }
    }
    return counts;
  }, [folders]);

  const customFolders = React.useMemo(
    () => folders.filter((f) => detectFolderRole(f) === 'custom'),
    [folders]
  );

  /* ------------------------------------------------------------------------ */
  /* Agrupamento em Conversas (Threads)                                       */
  /* ------------------------------------------------------------------------ */

  const threads = React.useMemo(() => groupMessagesIntoThreads(messages), [messages]);

  const activeConversationMessages = React.useMemo(() => {
    if (!selected) return [];
    const found = threads.find((t) =>
      t.messages.some(
        (m) =>
          m.uid === selected.uid &&
          m.folder === selected.folder &&
          (m.accountId || 'profissional') === (selected.accountId || 'profissional')
      )
    );
    return found ? found.messages : [selected];
  }, [selected, threads]);

  const selectedCustomerEmail = React.useMemo(() => {
    if (!selected) return '';
    const ownAddresses = new Set(accounts.map((account) => account.address.trim().toLowerCase()).filter(Boolean));
    const senderEmail = parseAddress(selected.from).email.toLowerCase();
    if (senderEmail && !ownAddresses.has(senderEmail)) return senderEmail;
    for (const recipient of selected.to || []) {
      const recipientEmail = parseAddress(recipient).email.toLowerCase();
      if (recipientEmail && !ownAddresses.has(recipientEmail)) return recipientEmail;
    }
    return '';
  }, [accounts, selected]);

  /* ------------------------------------------------------------------------ */
  /* Abertura de Mensagem e Thread                                            */
  /* ------------------------------------------------------------------------ */

  const fetchSingleMessageBody = React.useCallback(
    async (msg: MailMessage, withImages: boolean): Promise<MailMessageBody | null> => {
      const targetAcc: MailAccountId =
        msg.accountId || (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
      const targetFolder = msg.folder || currentFolderPath;
      const key = `${targetAcc}:${targetFolder}:${msg.uid}:${withImages ? '1' : '0'}`;
      if (clientBodyCache.current.has(key)) {
        return clientBodyCache.current.get(key)!;
      }
      const body = await mailService.getMessage(targetAcc, targetFolder, msg.uid, withImages);
      clientBodyCache.current.set(key, body);
      return body;
    },
    [accountScope, currentFolderPath]
  );

  const openMessage = async (message: MailMessage, withImages = false) => {
    setSelected(message);
    setAllowImages(withImages);
    setExpandedThreadIds(new Set([message.id]));

    const targetAcc: MailAccountId =
      message.accountId || (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
    const targetFolder = message.folder || currentFolderPath;

    if (!message.read) {
      setMessages((items) =>
        items.map((item) =>
          item.uid === message.uid && item.folder === targetFolder && item.accountId === targetAcc
            ? { ...item, read: true }
            : item
        )
      );
      setFolders((items) =>
        items.map((f) =>
          f.path.toLowerCase() === targetFolder.toLowerCase() &&
          (!f.accountId || f.accountId === targetAcc) &&
          f.unseen
            ? { ...f, unseen: Math.max(0, f.unseen - 1) }
            : f
        )
      );
    }

    // Se for um rascunho na pasta Rascunhos, oferece reabertura direta no compositor
    const bodyCacheKey = `${targetAcc}:${targetFolder}:${message.uid}:${withImages ? '1' : '0'}`;
    if (clientBodyCache.current.has(bodyCacheKey)) {
      const cachedBody = clientBodyCache.current.get(bodyCacheKey)!;
      setMessageBody(cachedBody);
      setExpandedThreadBodies((prev) => ({ ...prev, [message.id]: cachedBody }));
      setLoadingBody(false);
      return;
    }

    setMessageBody(null);
    setLoadingBody(true);
    try {
      const body = await fetchSingleMessageBody(message, withImages);
      if (body) {
        setMessageBody(body);
        setExpandedThreadBodies((prev) => ({ ...prev, [message.id]: body }));
      }
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível abrir a mensagem. Tente novamente em instantes.'));
    } finally {
      setLoadingBody(false);
    }
  };

  const toggleThreadItem = async (msg: MailMessage) => {
    const isExpanded = expandedThreadIds.has(msg.id);
    const next = new Set(expandedThreadIds);
    if (isExpanded) {
      next.delete(msg.id);
      setExpandedThreadIds(next);
      return;
    }
    next.add(msg.id);
    setExpandedThreadIds(next);
    if (!expandedThreadBodies[msg.id]) {
      try {
        const body = await fetchSingleMessageBody(msg, allowImages);
        if (body) {
          setExpandedThreadBodies((prev) => ({ ...prev, [msg.id]: body }));
        }
      } catch {}
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Ações Reais de Servidor (Lida, Favorito, Arquivar, Mover, Spam, Lixeira) */
  /* ------------------------------------------------------------------------ */

  const resolveRoleFolderForAccount = React.useCallback(
    (role: SystemNavId, acct: MailAccountId): string | null => {
      const acctFolders = folders.filter((f) => !f.accountId || f.accountId === acct);
      const found = acctFolders.find((f) => detectFolderRole(f) === role);
      if (found) return found.path;
      if (role === 'inbox') return acct === 'profissional' ? 'INBOX' : 'Inbox';
      if (role === 'trash') return acct === 'profissional' ? 'INBOX.Trash' : 'Trash';
      if (role === 'spam') return acct === 'profissional' ? 'INBOX.Junk' : 'Bulk';
      if (role === 'archive') return acct === 'profissional' ? 'INBOX.Archive' : 'Archive';
      if (role === 'drafts') return acct === 'profissional' ? 'INBOX.Drafts' : 'Draft';
      if (role === 'sent') return acct === 'profissional' ? 'INBOX.Sent' : 'Sent';
      return null;
    },
    [folders]
  );

  const getTargetMessages = React.useCallback(
    (explicitTargets?: MailMessage[]): MailMessage[] => {
      if (explicitTargets && explicitTargets.length) return explicitTargets;
      if (selectedIds.length) {
        return messages.filter((m) => selectedIds.includes(m.id));
      }
      if (selected) return [selected];
      return [];
    },
    [selectedIds, messages, selected]
  );

  const groupTargetsByAccountAndFolder = (targets: MailMessage[]) => {
    const groups = new Map<string, { account: MailAccountId; folder: string; uids: number[] }>();
    for (const m of targets) {
      const account: MailAccountId =
        m.accountId || (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
      const folder = m.folder || currentFolderPath;
      const key = `${account}:::${folder}`;
      const existing = groups.get(key) || { account, folder, uids: [] };
      existing.uids.push(m.uid);
      groups.set(key, existing);
    }
    return Array.from(groups.values());
  };

  const runServerAction = async (
    action:
      | 'archive'
      | 'unarchive'
      | 'trash'
      | 'restore'
      | 'permanentDelete'
      | 'spam'
      | 'notSpam'
      | 'read'
      | 'unread'
      | 'star'
      | 'unstar',
    explicitTargets?: MailMessage[],
    customTargetFolder?: string
  ) => {
    const targets = getTargetMessages(explicitTargets);
    if (!targets.length) return;

    if (action === 'permanentDelete' && !confirmPermanentDelete) {
      setConfirmPermanentDelete({ targets });
      return;
    }

    setError('');
    const batches = groupTargetsByAccountAndFolder(targets);

    try {
      for (const batch of batches) {
        if (action === 'trash') {
          await mailService.delete({
            account: batch.account,
            folder: batch.folder,
            uids: batch.uids,
            permanent: false,
          });
        } else if (action === 'permanentDelete') {
          await mailService.delete({
            account: batch.account,
            folder: batch.folder,
            uids: batch.uids,
            permanent: true,
          });
        } else if (
          action === 'archive' ||
          action === 'unarchive' ||
          action === 'restore' ||
          action === 'spam' ||
          action === 'notSpam' ||
          customTargetFolder
        ) {
          let destFolder = customTargetFolder || '';
          if (!destFolder) {
            if (action === 'archive') {
              destFolder = resolveRoleFolderForAccount('archive', batch.account) || '';
              if (batch.account === 'profissional' && !folders.some((f) => detectFolderRole(f) === 'archive' && f.accountId === 'profissional')) {
                try {
                  await mailService.createFolder('profissional', 'Archive');
                  destFolder = 'INBOX.Archive';
                } catch {}
              }
            } else if (action === 'spam') {
              destFolder = resolveRoleFolderForAccount('spam', batch.account) || '';
            } else if (action === 'unarchive' || action === 'restore' || action === 'notSpam') {
              destFolder = resolveRoleFolderForAccount('inbox', batch.account) || 'INBOX';
            }
          }
          if (!destFolder) {
            throw new Error('Pasta de destino não encontrada nesta conta.');
          }
          await mailService.move({
            account: batch.account,
            folder: batch.folder,
            uids: batch.uids,
            targetFolder: destFolder,
          });
        } else {
          await mailService.updateFlags({
            account: batch.account,
            folder: batch.folder,
            uids: batch.uids,
            addFlags: ['read', 'star'].includes(action)
              ? [action === 'read' ? '\\Seen' : '\\Flagged']
              : [],
            removeFlags: ['unread', 'unstar'].includes(action)
              ? [action === 'unread' ? '\\Seen' : '\\Flagged']
              : [],
          });
        }
      }

      clientMessagesCache.current.clear();
      const targetIdSet = new Set(targets.map((t) => t.id));
      const isMoveOrDelete = [
        'trash',
        'permanentDelete',
        'archive',
        'unarchive',
        'restore',
        'spam',
        'notSpam',
      ].includes(action) || Boolean(customTargetFolder);

      if (selected && targetIdSet.has(selected.id)) {
        if (isMoveOrDelete) {
          setSelected(null);
          setMessageBody(null);
        } else if (action === 'read' || action === 'unread') {
          setSelected({ ...selected, read: action === 'read' });
        } else if (action === 'star' || action === 'unstar') {
          setSelected({ ...selected, starred: action === 'star' });
        }
      }

      setConfirmPermanentDelete(null);
      setMoveMenuOpen(false);
      await loadMessages(page, true);
      void loadFolders(accountScope, true);

      const labelMap: Record<string, string> = {
        trash: 'Mensagem movida para a Lixeira.',
        permanentDelete: 'Mensagem excluída definitivamente.',
        archive: 'Mensagem arquivada.',
        unarchive: 'Mensagem movida de volta para a Caixa de entrada.',
        restore: 'Mensagem restaurada para a Caixa de entrada.',
        spam: 'Mensagem marcada como Spam.',
        notSpam: 'Mensagem restaurada do Spam para a Caixa de entrada.',
        read: 'Marcada como lida.',
        unread: 'Marcada como não lida.',
        star: 'Adicionada aos Favoritos.',
        unstar: 'Removida dos Favoritos.',
      };

      let undoAction: UndoAction | undefined;
      if (['read', 'unread', 'star', 'unstar'].includes(action)) {
        const inverse =
          action === 'read'
            ? 'unread'
            : action === 'unread'
            ? 'read'
            : action === 'star'
            ? 'unstar'
            : 'star';
        undoAction = {
          label: 'Desfazer',
          run: async () => {
            await runServerAction(inverse, targets);
          },
        };
      } else if (action === 'archive' || action === 'trash' || action === 'spam') {
        const targetMessageIds = new Set(
          targets.map((t) => String(t.messageId || '').trim()).filter(Boolean)
        );
        undoAction = {
          label: 'Desfazer',
          run: async () => {
            for (const batch of batches) {
              const roleToLook: SystemNavId =
                action === 'archive' ? 'archive' : action === 'spam' ? 'spam' : 'trash';
              const destF = resolveRoleFolderForAccount(roleToLook, batch.account);
              if (!destF) continue;
              const listed = await mailService.listMessages(batch.account, destF, 1, 15);
              const matchedUids = (listed.messages || [])
                .filter((m) => targetMessageIds.has(String(m.messageId || '').trim()))
                .map((m) => m.uid);
              if (matchedUids.length) {
                await mailService.move({
                  account: batch.account,
                  folder: destF,
                  uids: matchedUids,
                  targetFolder: batch.folder,
                });
              }
            }
            clientMessagesCache.current.clear();
            await loadMessages(page, true);
            void loadFolders(accountScope, true);
            showToast('Ação desfeita.');
          },
        };
      }

      showToast(
        customTargetFolder
          ? `Mensagem movida para ${displayFolderName(customTargetFolder)}.`
          : labelMap[action] || 'Ação concluída.',
        undoAction
      );
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível concluir a ação. Tente novamente em instantes.'));
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Gerenciamento de Pastas Personalizadas                                   */
  /* ------------------------------------------------------------------------ */

  const handleFolderCrudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFolderModal) return;
    setFolderActionLoading(true);
    setError('');
    try {
      if (customFolderModal.mode === 'create') {
        await mailService.createFolder(customFolderModal.account, folderNameInput.trim());
        showToast(`Pasta "${folderNameInput.trim()}" criada com sucesso.`);
      } else if (customFolderModal.mode === 'rename' && customFolderModal.path) {
        await mailService.renameFolder(
          customFolderModal.account,
          customFolderModal.path,
          folderNameInput.trim()
        );
        showToast(`Pasta renomeada para "${folderNameInput.trim()}".`);
      } else if (customFolderModal.mode === 'delete' && customFolderModal.path) {
        await mailService.deleteFolder(customFolderModal.account, customFolderModal.path);
        if (activeNav === `custom:${customFolderModal.path}`) {
          setActiveNav('inbox');
        }
        showToast('Pasta excluída com sucesso.');
      }
      setCustomFolderModal(null);
      setFolderNameInput('');
      await loadFolders(accountScope);
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível gerenciar a pasta. Tente novamente em instantes.'));
    } finally {
      setFolderActionLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Compositor Rico, Rascunho Local & Servidor, e Envio Real                 */
  /* ------------------------------------------------------------------------ */

  const openComposer = (
    mode: 'new' | 'reply' | 'replyAll' | 'forward',
    targetMsg?: MailMessage,
    prefillTo?: string
  ) => {
    const refMsg = targetMsg || selected || undefined;
    const defaultSender: MailAccountId =
      refMsg?.accountId ||
      (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
    const senderAddress =
      accounts.find((a) => a.id === defaultSender)?.address || 'contato@nuaborges.com.br';

    let to = prefillTo || '';
    let cc = '';
    let subject = '';
    let initialHtml = `<div dir="ltr"><br></div>${signatureHtml}`;

    if (mode !== 'new' && refMsg) {
      const fromEmails = emailAddresses(refMsg.from);
      if (mode === 'reply') {
        to = fromEmails[0] || refMsg.from;
      } else if (mode === 'replyAll') {
        to = fromEmails[0] || refMsg.from;
        const others = [...(refMsg.to || []), ...(refMsg.cc || [])]
          .flatMap(emailAddresses)
          .filter((addr) => addr.toLowerCase() !== senderAddress.toLowerCase() && addr.toLowerCase() !== to.toLowerCase());
        cc = Array.from(new Set(others)).join(', ');
      }

      const cleanSub = refMsg.subject.replace(/^(re|enc|fwd|fw):\s*/i, '');
      subject = mode === 'forward' ? `Enc: ${cleanSub}` : `Re: ${cleanSub}`;

      const quotedBody =
        messageBody?.html ||
        `<p>${escapeHtml(messageBody?.text || refMsg.snippet || '').replace(/\n/g, '<br>')}</p>`;
      const quoteHeader =
        mode === 'forward'
          ? `---------- Mensagem encaminhada ----------<br><strong>De:</strong> ${escapeHtml(refMsg.from)}<br><strong>Data:</strong> ${escapeHtml(displayFullDate(refMsg.date))}<br><strong>Assunto:</strong> ${escapeHtml(refMsg.subject)}<br><strong>Para:</strong> ${escapeHtml((refMsg.to || []).join(', '))}<br><br>`
          : `Em ${escapeHtml(displayFullDate(refMsg.date))}, ${escapeHtml(refMsg.from)} escreveu:<br>`;

      initialHtml = `<div dir="ltr"><br></div>${signatureHtml}<br><blockquote style="margin:12px 0;padding-left:12px;border-left:2px solid #d4d4d8;color:#52525b;">${quoteHeader}${quotedBody}</blockquote>`;
    }

    setComposerFiles([]);
    setShowCcBcc(mode === 'replyAll' || Boolean(cc));
    setComposer({
      mode,
      senderAccount: defaultSender,
      to,
      cc,
      bcc: '',
      subject,
      initialHtml,
      original: refMsg,
    });
  };

  // Inicializa o conteúdo HTML no editor contentEditable quando o modal abre
  React.useEffect(() => {
    if (composer && editorRef.current) {
      editorRef.current.innerHTML = composer.initialHtml;
    }
  }, [composer]);

  const persistLocalDraft = React.useCallback(
    (nextComposer = composer) => {
      if (!nextComposer) return;
      const html = editorRef.current?.innerHTML || nextComposer.initialHtml;
      const draft: LocalDraftState = {
        account: nextComposer.senderAccount,
        mode: nextComposer.mode,
        to: nextComposer.to,
        cc: nextComposer.cc,
        bcc: nextComposer.bcc,
        subject: nextComposer.subject,
        html,
        updatedAt: new Date().toISOString(),
        inReplyToUid:
          nextComposer.mode === 'reply' || nextComposer.mode === 'replyAll'
            ? nextComposer.original?.uid
            : undefined,
        forwardOfUid: nextComposer.mode === 'forward' ? nextComposer.original?.uid : undefined,
        refFolder: nextComposer.original?.folder,
      };
      try {
        window.localStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setLocalDraftSavedAt(
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        );
      } catch {}
    },
    [composer]
  );

  const execEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    persistLocalDraft();
  };

  const encodeComposerFiles = async (): Promise<AttachmentDraft[]> => {
    return Promise.all(
      composerFiles.map(
        (file) =>
          new Promise<AttachmentDraft>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                content: String(reader.result).split(',')[1] || '',
              });
            reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`));
            reader.readAsDataURL(file);
          })
      )
    );
  };

  const handleSaveDraftToServer = async () => {
    if (!composer) return;
    setSavingDraftServer(true);
    setError('');
    try {
      const encoded = await encodeComposerFiles();
      const html = editorRef.current?.innerHTML || '';
      const text = editorRef.current?.innerText || '';
      await mailService.saveDraft({
        account: composer.senderAccount,
        to: addressList(composer.to),
        cc: addressList(composer.cc),
        subject: composer.subject,
        text,
        html,
        attachments: encoded,
        replaceUid: composer.draftUid,
      });
      window.localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
      setHasRecoverableLocalDraft(null);
      setComposer(null);
      clientMessagesCache.current.clear();
      void loadFolders(accountScope, true);
      if (activeNav === 'drafts') {
        void loadMessages(1, true);
      }
      showToast('Rascunho salvo na pasta Rascunhos.');
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível salvar o rascunho. Tente novamente em instantes.'));
    } finally {
      setSavingDraftServer(false);
    }
  };

  const submitComposer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer) return;
    const html = editorRef.current?.innerHTML || '';
    const text = editorRef.current?.innerText || '';
    const to = addressList(composer.to);
    const cc = addressList(composer.cc);
    const bcc = addressList(composer.bcc);

    if (!to.length && !cc.length && !bcc.length) {
      setError('Informe ao menos um destinatário válido.');
      return;
    }

    setSending(true);
    setError('');
    try {
      const encoded = await encodeComposerFiles();
      const payload: Record<string, unknown> = {
        account: composer.senderAccount,
        mode: composer.mode,
        to,
        cc,
        bcc,
        subject: composer.subject,
        text,
        html,
        attachments: encoded,
      };
      if (composer.original) {
        payload.refFolder = composer.original.folder || currentFolderPath;
        if (composer.mode === 'reply' || composer.mode === 'replyAll') {
          payload.inReplyToUid = composer.original.uid;
        }
        if (composer.mode === 'forward') {
          payload.forwardOfUid = composer.original.uid;
        }
      }
      await mailService.send(payload);
      window.localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
      setHasRecoverableLocalDraft(null);
      setComposer(null);
      setComposerFiles([]);
      clientMessagesCache.current.clear();
      void loadFolders(accountScope, true);
      void loadMessages(1, true);
      showToast('E-mail enviado com sucesso.');
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível enviar a mensagem. Tente novamente em instantes.'));
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Autocompletar de Destinatários                                           */
  /* ------------------------------------------------------------------------ */

  const knownContactsAndSenders = React.useMemo(() => {
    const map = new Map<string, MailContact>();
    for (const c of contacts) {
      map.set(c.email.toLowerCase(), c);
    }
    for (const m of messages) {
      const parsed = parseAddress(m.from);
      if (parsed.email && !map.has(parsed.email)) {
        map.set(parsed.email, {
          id: `recent_${parsed.email}`,
          name: parsed.name,
          email: parsed.email,
          source: 'recent',
        });
      }
    }
    return Array.from(map.values());
  }, [contacts, messages]);

  const handleToChange = (val: string) => {
    if (!composer) return;
    const next = { ...composer, to: val };
    setComposer(next);
    persistLocalDraft(next);
    const lastToken = val.split(/[;,]/).pop()?.trim().toLowerCase() || '';
    if (lastToken.length >= 1) {
      const matches = knownContactsAndSenders
        .filter(
          (c) =>
            c.email.toLowerCase().includes(lastToken) ||
            c.name.toLowerCase().includes(lastToken)
        )
        .slice(0, 6);
      setRecipientSuggestions(matches);
      setShowRecipientSuggestions(matches.length > 0);
    } else {
      setShowRecipientSuggestions(false);
    }
  };

  const applyRecipientSuggestion = (contact: MailContact) => {
    if (!composer) return;
    const parts = composer.to.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    parts.pop();
    parts.push(contact.email);
    const nextTo = parts.join(', ') + ', ';
    const next = { ...composer, to: nextTo };
    setComposer(next);
    persistLocalDraft(next);
    setShowRecipientSuggestions(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Gerenciamento de Contatos                                                */
  /* ------------------------------------------------------------------------ */

  const handleSaveContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactModal) return;
    setSavingContact(true);
    setError('');
    try {
      const res = await mailService.saveContact(contactModal);
      setContacts(res.contacts || []);
      setContactModal(null);
      showToast('Contato salvo com sucesso.');
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível salvar o contato. Tente novamente em instantes.'));
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const res = await mailService.deleteContact(id);
      setContacts(res.contacts || []);
      showToast('Contato removido.');
    } catch (err) {
      setError(friendlyMailError(err, 'Não foi possível remover o contato. Tente novamente em instantes.'));
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Rótulos de Navegação                                                     */
  /* ------------------------------------------------------------------------ */

  const allSystemNavItems: Array<{
    id: SystemNavId;
    label: string;
    icon: typeof Inbox;
    badge?: number;
    localOnly?: boolean;
  }> = [
    { id: 'inbox', label: 'Caixa de entrada', icon: Inbox, badge: navCounts.inbox.unseen },
    { id: 'all', label: 'Todas as mensagens', icon: Layers, localOnly: true },
    { id: 'unread', label: 'Não lidos', icon: Mail, badge: navCounts.unread.unseen, localOnly: true },
    { id: 'starred', label: 'Favoritos', icon: Star, localOnly: true },
    { id: 'drafts', label: 'Rascunhos', icon: FileText, badge: navCounts.drafts.messages },
    { id: 'sent', label: 'Enviados', icon: Send },
    { id: 'archive', label: 'Arquivados', icon: Archive },
    { id: 'spam', label: 'Spam', icon: ShieldAlert, badge: navCounts.spam.unseen },
    { id: 'trash', label: 'Lixeira', icon: Trash2 },
  ];
  const systemNavItems = isLocalMailHost
    ? allSystemNavItems
    : allSystemNavItems.filter((item) => !item.localOnly);

  const activeNavTitle = (() => {
    if (activeNav === 'contacts') return 'Contatos';
    if (activeNav.startsWith('custom:')) {
      return activeNav.slice('custom:'.length).replace(/^INBOX[./]/i, '');
    }
    return systemNavItems.find((i) => i.id === activeNav)?.label || 'Caixa de entrada';
  })();

  const activeAccountLabel = React.useMemo(() => {
    if (accountScope === 'unificada') return 'Todas as contas (Caixa Unificada)';
    const acc = accounts.find((a) => a.id === accountScope);
    return acc ? `${acc.label} — ${acc.address}` : accountScope;
  }, [accountScope, accounts]);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.unread ||
      filters.starred ||
      filters.hasAttachment ||
      filters.from ||
      filters.to ||
      filters.subject ||
      filters.dateFrom ||
      filters.dateTo
  );

  /* ------------------------------------------------------------------------ */
  /* Renderização                                                             */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex flex-col min-h-[calc(100vh-5.5rem)] text-zinc-100">
      {/* Cabeçalho Nativo do Painel Administrativo */}
      <PageHeader
        title="E-mails"
        subtitle="Gerencie seus e-mails profissional e pessoal diretamente no painel."
        badge={
          navCounts.inbox.unseen > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#843C52]/20 border border-[#843C52]/35 px-2.5 py-0.5 text-[11px] font-medium text-[#e39ab0]">
              {navCounts.inbox.unseen} não {navCounts.inbox.unseen === 1 ? 'lida' : 'lidas'}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Conta (Unificada / Profissional / Pessoal) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-3.5 py-2 text-left text-xs transition hover:border-white/[0.15]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#843C52]/25 text-[11px] font-semibold text-[#e39ab0]">
                  {accountScope === 'unificada' ? 'U' : accountScope === 'profissional' ? 'N' : 'P'}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-white leading-tight">
                    {accountScope === 'unificada'
                      ? 'Caixa Unificada'
                      : accounts.find((a) => a.id === accountScope)?.label || 'Conta'}
                  </span>
                  <span className="block max-w-[190px] truncate text-[11px] text-zinc-400 leading-tight">
                    {accountScope === 'unificada'
                      ? 'Profissional + Pessoal'
                      : accounts.find((a) => a.id === accountScope)?.address || ''}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {accountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setAccountMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-white/[0.1] bg-[#14151b] p-1.5 shadow-2xl">
                    {isLocalMailHost && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountScope('unificada');
                            setAccountMenuOpen(false);
                            setSelected(null);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition ${
                            accountScope === 'unificada'
                              ? 'bg-[#843C52]/20 text-white'
                              : 'text-zinc-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-white">Todas as contas (Unificada)</p>
                            <p className="truncate text-[11px] text-zinc-400">
                              contato@nuaborges.com.br + nuaborges@yahoo.com
                            </p>
                          </div>
                          {accountScope === 'unificada' && <Check className="h-4 w-4 text-[#e39ab0]" />}
                        </button>

                        <div className="my-1 border-t border-white/[0.06]" />
                      </>
                    )}

                    {accounts.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAccountScope(item.id);
                          setAccountMenuOpen(false);
                          setSelected(null);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition ${
                          item.id === accountScope
                            ? 'bg-[#843C52]/20 text-white'
                            : 'text-zinc-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-white">{item.label}</p>
                          </div>
                          <p className="truncate text-[11px] text-zinc-400">{item.address}</p>
                        </div>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            item.available ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botão Assinatura */}
            <button
              type="button"
              onClick={() => setSignatureModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.15] hover:text-white"
              title="Configurar assinatura de e-mail"
            >
              <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Assinatura</span>
            </button>

            {/* Botão Principal Escrever */}
            <button
              type="button"
              onClick={() => openComposer('new')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#843C52] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#96455e]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Escrever e-mail
            </button>
          </div>
        }
      />

      {/* Aviso de rascunho não finalizado salvo localmente */}
      {hasRecoverableLocalDraft && !composer && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#843C52]/30 bg-[#843C52]/10 px-4 py-2.5 text-xs text-zinc-200">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 shrink-0 text-[#e39ab0]" />
            <span className="truncate">
              Você possui um rascunho salvo automaticamente
              {hasRecoverableLocalDraft.subject ? `: "${hasRecoverableLocalDraft.subject}"` : ''}.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setComposer({
                  mode: hasRecoverableLocalDraft.mode,
                  senderAccount: hasRecoverableLocalDraft.account,
                  to: hasRecoverableLocalDraft.to,
                  cc: hasRecoverableLocalDraft.cc,
                  bcc: hasRecoverableLocalDraft.bcc,
                  subject: hasRecoverableLocalDraft.subject,
                  initialHtml: hasRecoverableLocalDraft.html,
                });
              }}
              className="rounded-lg bg-[#843C52] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#96455e]"
            >
              Continuar escrevendo
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
                setHasRecoverableLocalDraft(null);
              }}
              className="rounded-lg border border-white/[0.08] px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Mensagens de Erro ou Confirmação */}
      {error && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-200/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {notice && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          <span className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-300" />
            {notice.text}
          </span>
          {notice.undo && (
            <button
              type="button"
              onClick={() => {
                const fn = notice.undo?.run;
                setNotice(null);
                if (fn) void fn();
              }}
              className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/30"
            >
              {notice.undo.label}
            </button>
          )}
        </div>
      )}

      {/* Área Funcional de 3 Regiões (Integrada diretamente ao Layout da Página, sem caixa flutuante) */}
      <div className="flex flex-1 min-h-0 pt-4 gap-0 border-b border-white/[0.06]">
        {/* REGIÃO 1: Navegação Interna de E-mails */}
        <aside
          className={`${
            mobileNavOpen ? 'fixed inset-0 z-50 bg-[#0c0d12] p-5 overflow-y-auto' : 'hidden lg:flex'
          } w-full lg:w-56 xl:w-60 shrink-0 flex-col pr-4 border-r border-white/[0.06] select-none`}
        >
          {mobileNavOpen && (
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/[0.06] lg:hidden">
              <span className="text-sm font-semibold text-white">Pastas e Contas</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Pastas do Sistema */}
          <div className="space-y-0.5">
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    setSelected(null);
                    setMobileNavOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition ${
                    isActive
                      ? 'bg-[#843C52]/20 text-white font-medium border border-[#843C52]/30'
                      : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#e39ab0]' : 'text-zinc-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? 'bg-[#843C52] text-white'
                          : 'bg-white/[0.06] text-zinc-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pastas Personalizadas */}
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Pastas personalizadas
              </span>
              {isLocalMailHost && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultAcc: MailAccountId =
                      accountScope === 'pessoal' ? 'pessoal' : 'profissional';
                    setFolderNameInput('');
                    setCustomFolderModal({ mode: 'create', account: defaultAcc });
                  }}
                  className="rounded-md p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  title="Criar nova pasta"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {customFolders.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-zinc-500">
                Nenhuma pasta personalizada.
              </p>
            ) : (
              <div className="space-y-0.5">
                {customFolders.map((folder) => {
                  const navKey = `custom:${folder.path}`;
                  const isActive = activeNav === navKey;
                  const cleanName = cleanCustomFolderName(folder);
                  const folderAcct: MailAccountId =
                    folder.accountId || (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
                  return (
                    <div
                      key={`${folderAcct}:${folder.path}`}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                        isActive
                          ? 'bg-[#843C52]/20 text-white font-medium'
                          : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav(navKey);
                          setSelected(null);
                          setMobileNavOpen(false);
                        }}
                        className="flex flex-1 items-center gap-2 truncate text-left"
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{cleanName}</span>
                      </button>
                      {isLocalMailHost && (
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setFolderNameInput(cleanName);
                              setCustomFolderModal({
                                mode: 'rename',
                                account: folderAcct,
                                path: folder.path,
                                currentName: cleanName,
                              });
                            }}
                            className="p-0.5 text-zinc-400 hover:text-white"
                            title="Renomear pasta"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFolderModal({
                                mode: 'delete',
                                account: folderAcct,
                                path: folder.path,
                                currentName: cleanName,
                              })
                            }
                            className="p-0.5 text-zinc-400 hover:text-rose-400"
                            title="Excluir pasta"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contatos (disponível apenas no modo completo local) */}
          {isLocalMailHost && (
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('contacts');
                  setSelected(null);
                  setMobileNavOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition ${
                  activeNav === 'contacts'
                    ? 'bg-[#843C52]/20 text-white font-medium border border-[#843C52]/30'
                    : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users
                    className={`h-4 w-4 ${
                      activeNav === 'contacts' ? 'text-[#e39ab0]' : 'text-zinc-500'
                    }`}
                  />
                  <span>Contatos</span>
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-300">
                  {contacts.length}
                </span>
              </button>
            </div>
          )}

          {/* Rodapé informativo de sincronização */}
          <div className="mt-auto pt-6 px-2 text-[11px] text-zinc-500">
            <div className="flex items-center justify-between">
              <span>Atualização automática ativa</span>
              {syncingSilent && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
            </div>
            {lastSyncedAt && (
              <p className="mt-0.5 text-[10px] text-zinc-600">
                Atualizado às{' '}
                {lastSyncedAt.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </aside>

        {/* Se estiver na visão de CONTATOS */}
        {activeNav === 'contacts' ? (
          <div className="flex-1 min-w-0 pl-0 lg:pl-6 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-semibold text-white">Contatos de E-mail</h2>
                <p className="text-xs text-zinc-400">
                  Contatos usados para fotos de remetentes, autocompletar e filtros rápidos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar contato..."
                    className="h-9 rounded-xl border border-white/[0.08] bg-[#14151b] pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#843C52] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setContactModal({
                      name: '',
                      email: '',
                      avatarUrl: '',
                      notes: '',
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#843C52] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#96455e]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Novo contato
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {contacts
                .filter(
                  (c) =>
                    !contactSearch ||
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.email.toLowerCase().includes(contactSearch.toLowerCase())
                )
                .map((contact) => {
                  const parsed = parseAddress(`${contact.name} <${contact.email}>`);
                  return (
                    <div
                      key={contact.id}
                      className="flex flex-col justify-between rounded-xl border border-white/[0.07] bg-[#14151b] p-4 transition hover:border-white/[0.14]"
                    >
                      <div className="flex items-start gap-3">
                        <SenderAvatar
                          name={contact.name}
                          email={contact.email}
                          initials={parsed.initials}
                          contacts={contacts}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-white">
                              {contact.name}
                            </p>
                            <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-400">
                              Salvo
                            </span>
                          </div>
                          <p className="truncate text-xs text-zinc-400">{contact.email}</p>
                          {contact.notes && (
                            <p className="mt-1.5 line-clamp-2 text-[11px] text-zinc-500">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openComposer('new', undefined, contact.email)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#843C52]/20 border border-[#843C52]/30 px-2.5 py-1 text-[11px] font-medium text-[#e39ab0] hover:bg-[#843C52]/30"
                          >
                            <Mail className="h-3 w-3" />
                            Escrever
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFilters({ sort: 'newest', from: contact.email });
                              setActiveNav('all');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/[0.04]"
                          >
                            <Search className="h-3 w-3" />
                            Mensagens
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setContactModal({
                                id: contact.id,
                                name: contact.name,
                                email: contact.email,
                                avatarUrl: contact.avatarUrl || '',
                                notes: contact.notes || '',
                              })
                            }
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                            title="Editar contato"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteContact(contact.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300"
                            title="Remover contato"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* REGIÕES 2 e 3: Lista de Mensagens + Leitura Completa */
          <div className="flex flex-1 min-w-0">
            {/* REGIÃO 2: Coluna de Lista de Mensagens */}
            <div
              className={`${
                selected ? 'hidden xl:flex xl:w-[400px] 2xl:w-[440px]' : 'flex flex-1'
              } flex-col min-w-0 border-r border-white/[0.06] px-0 lg:px-4`}
            >
              {/* Barra de Busca, Filtros Avançados e Ações em Massa */}
              <div className="pb-3 border-b border-white/[0.06] space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="inline-flex lg:hidden items-center justify-center rounded-xl border border-white/[0.08] bg-[#14151b] p-2 text-zinc-300"
                    title="Abrir pastas"
                  >
                    <Folder className="h-4 w-4" />
                  </button>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setFilters((prev) => ({ ...prev, q: searchText.trim() || undefined }));
                    }}
                    className="relative flex-1 min-w-0"
                  >
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Pesquisar por assunto, remetente ou conteúdo..."
                      className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#14151b] pl-9 pr-16 text-xs text-white placeholder:text-zinc-500 focus:border-[#843C52] focus:outline-none"
                    />
                    {(searchText || hasActiveFilters) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setFilters({ sort: 'newest' });
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                        title="Limpar busca e filtros"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAdvancedSearchOpen((v) => !v)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition ${
                        advancedSearchOpen || hasActiveFilters
                          ? 'text-[#e39ab0] bg-[#843C52]/20'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Filtros avançados de pesquisa"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      clientMessagesCache.current.clear();
                      void loadMessages(page, true);
                      void loadFolders(accountScope, true);
                    }}
                    disabled={loadingMessages}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#14151b] text-zinc-300 transition hover:border-white/[0.15] hover:text-white disabled:opacity-50"
                    title="Atualizar mensagens agora"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Painel de Busca Avançada */}
                {advancedSearchOpen && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#14151b] p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Filtros avançados</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setFilters({ sort: 'newest' });
                        }}
                        className="text-[11px] text-zinc-400 hover:text-white"
                      >
                        Limpar tudo
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                          De (remetente)
                        </label>
                        <input
                          value={filters.from || ''}
                          onChange={(e) =>
                            setFilters((p) => ({ ...p, from: e.target.value || undefined }))
                          }
                          placeholder="Ex: cliente@email.com"
                          className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                          Para (destinatário)
                        </label>
                        <input
                          value={filters.to || ''}
                          onChange={(e) =>
                            setFilters((p) => ({ ...p, to: e.target.value || undefined }))
                          }
                          placeholder="Ex: contato@nuaborges.com.br"
                          className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                          Assunto contém
                        </label>
                        <input
                          value={filters.subject || ''}
                          onChange={(e) =>
                            setFilters((p) => ({ ...p, subject: e.target.value || undefined }))
                          }
                          placeholder="Palavras no assunto"
                          className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2.5 text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                            Data inicial
                          </label>
                          <input
                            type="date"
                            value={filters.dateFrom || ''}
                            onChange={(e) =>
                              setFilters((p) => ({ ...p, dateFrom: e.target.value || undefined }))
                            }
                            className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2 text-[11px] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-zinc-400 mb-1">
                            Data final
                          </label>
                          <input
                            type="date"
                            value={filters.dateTo || ''}
                            onChange={(e) =>
                              setFilters((p) => ({ ...p, dateTo: e.target.value || undefined }))
                            }
                            className="h-8 w-full rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2 text-[11px] text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((p) => ({
                              ...p,
                              unread: p.unread === '1' ? undefined : '1',
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] border ${
                            filters.unread === '1'
                              ? 'bg-[#843C52]/25 border-[#843C52]/40 text-white'
                              : 'border-white/[0.08] text-zinc-400'
                          }`}
                        >
                          Não lidas
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((p) => ({
                              ...p,
                              hasAttachment: p.hasAttachment === '1' ? undefined : '1',
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] border ${
                            filters.hasAttachment === '1'
                              ? 'bg-[#843C52]/25 border-[#843C52]/40 text-white'
                              : 'border-white/[0.08] text-zinc-400'
                          }`}
                        >
                          Com anexo
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((p) => ({
                              ...p,
                              starred: p.starred === '1' ? undefined : '1',
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] border ${
                            filters.starred === '1'
                              ? 'bg-[#843C52]/25 border-[#843C52]/40 text-white'
                              : 'border-white/[0.08] text-zinc-400'
                          }`}
                        >
                          Favoritos
                        </button>
                      </div>

                      <select
                        value={filters.sort || 'newest'}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            sort: e.target.value as 'newest' | 'oldest',
                          }))
                        }
                        className="h-7 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2 text-[11px] text-zinc-300"
                      >
                        <option value="newest">Mais recentes primeiro</option>
                        <option value="oldest">Mais antigas primeiro</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Sub-barra da Lista: Seleção em lote, Filtros rápidos e Contagem */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={
                        messages.length > 0 && selectedIds.length === messages.length
                      }
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked ? messages.map((m) => m.id) : []
                        )
                      }
                      className="h-3.5 w-3.5 rounded border-white/20 accent-[#843C52]"
                      title="Selecionar todas as mensagens visíveis"
                    />
                    <span className="text-xs font-semibold text-white">{activeNavTitle}</span>
                    <span className="text-[11px] text-zinc-500">
                      ({totalMessages})
                    </span>
                  </div>

                  {/* Quando há mensagens selecionadas em lote, mostra ações em massa */}
                  {selectedIds.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#e39ab0] mr-1">
                        {selectedIds.length} {selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void runServerAction('read')}
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        title="Marcar selecionadas como lidas"
                      >
                        <MailOpen className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void runServerAction('unread')}
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        title="Marcar selecionadas como não lidas"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void runServerAction('archive')}
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        title="Arquivar selecionadas"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void runServerAction('spam')}
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                        title="Mover selecionadas para Spam"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runServerAction(
                            activeNav === 'trash' ? 'permanentDelete' : 'trash'
                          )
                        }
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-rose-500/15 hover:text-rose-300"
                        title={
                          activeNav === 'trash'
                            ? 'Excluir definitivamente'
                            : 'Mover para a Lixeira'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            unread: p.unread === '1' ? undefined : '1',
                          }))
                        }
                        className={`rounded-lg px-2 py-0.5 text-[11px] transition ${
                          filters.unread === '1'
                            ? 'bg-[#843C52]/25 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Não lidas
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            hasAttachment: p.hasAttachment === '1' ? undefined : '1',
                          }))
                        }
                        className={`rounded-lg px-2 py-0.5 text-[11px] transition ${
                          filters.hasAttachment === '1'
                            ? 'bg-[#843C52]/25 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Anexos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Conversas / Mensagens */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05]">
                {loadingMessages && messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500">
                    <Loader2 className="mx-auto mb-2.5 h-5 w-5 animate-spin text-[#843C52]" />
                    Carregando mensagens...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <Inbox className="mx-auto mb-2.5 h-7 w-7 text-zinc-600" />
                    <p className="text-xs font-medium text-zinc-300">
                      Nenhuma mensagem encontrada
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {hasActiveFilters
                        ? 'Tente ajustar os filtros de pesquisa.'
                        : 'Esta pasta não possui e-mails no momento.'}
                    </p>
                  </div>
                ) : (
                  threads.map((thread) => {
                    const message = thread.latest;
                    const isSelected =
                      selected?.uid === message.uid &&
                      selected?.folder === message.folder &&
                      selected?.accountId === message.accountId;
                    const isChecked = selectedIds.includes(message.id);
                    const sender = parseAddress(message.from);
                    const isUnread = thread.unreadCount > 0;
                    const msgAcct = message.accountId || 'profissional';

                    return (
                      <div
                        key={thread.key}
                        onClick={() => void openMessage(message)}
                        className={`group relative flex cursor-pointer items-start gap-3 px-3 py-3 transition ${
                          isSelected
                            ? 'bg-[#843C52]/[0.16]'
                            : isUnread
                            ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Barra lateral de seleção ativa */}
                        {isSelected && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#843C52]" />
                        )}

                        <div
                          className="flex flex-col items-center gap-2 pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedIds((items) =>
                                e.target.checked
                                  ? [...items, message.id]
                                  : items.filter((id) => id !== message.id)
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-white/20 accent-[#843C52]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void runServerAction(
                                message.starred ? 'unstar' : 'star',
                                [message]
                              )
                            }
                            className="text-zinc-600 hover:text-amber-300"
                            title={message.starred ? 'Remover favorito' : 'Favoritar'}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                thread.starred
                                  ? 'fill-amber-400 text-amber-400'
                                  : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Avatar / Foto do Remetente */}
                        <SenderAvatar
                          name={sender.name}
                          email={sender.email}
                          initials={sender.initials}
                          contacts={contacts}
                          size="md"
                        />

                        {/* Conteúdo da linha */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isUnread && (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-[#c4627e]"
                                  title="Mensagem não lida"
                                />
                              )}
                              <span
                                className={`truncate text-xs ${
                                  isUnread
                                    ? 'font-semibold text-white'
                                    : 'font-medium text-zinc-300'
                                }`}
                              >
                                {sender.name}
                              </span>
                              {thread.messages.length > 1 && (
                                <span className="rounded bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-medium text-zinc-300">
                                  {thread.messages.length}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {thread.hasAttachments && (
                                <Paperclip className="h-3 w-3 text-zinc-400" />
                              )}
                              <span
                                className={`text-[11px] ${
                                  isUnread ? 'font-medium text-[#e39ab0]' : 'text-zinc-500'
                                }`}
                              >
                                {displayShortDate(message.date)}
                              </span>
                            </div>
                          </div>

                          {/* Endereço de e-mail do remetente + badge da conta */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="truncate text-[11px] text-zinc-500">
                              {sender.email}
                            </span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-medium uppercase tracking-wider ${
                                msgAcct === 'profissional'
                                  ? 'bg-[#843C52]/15 text-[#e39ab0]'
                                  : 'bg-purple-500/15 text-purple-300'
                              }`}
                            >
                              {msgAcct === 'profissional' ? 'Profissional' : 'Pessoal'}
                            </span>
                          </div>

                          {/* Assunto */}
                          <p
                            className={`mt-1 truncate text-xs ${
                              isUnread ? 'font-semibold text-zinc-100' : 'text-zinc-300'
                            }`}
                          >
                            {message.subject}
                          </p>

                          {/* Prévia limpa */}
                          {message.snippet && (
                            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                              {message.snippet}
                            </p>
                          )}
                        </div>

                        {/* Ações Rápidas no Hover */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="hidden group-hover:flex absolute right-2 top-2 items-center gap-0.5 rounded-lg border border-white/[0.1] bg-[#14151b] p-0.5 shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              void runServerAction(
                                message.read ? 'unread' : 'read',
                                [message]
                              )
                            }
                            className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                            title={message.read ? 'Marcar como não lida' : 'Marcar como lida'}
                          >
                            {message.read ? (
                              <Mail className="h-3.5 w-3.5" />
                            ) : (
                              <MailOpen className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void runServerAction('archive', [message])}
                            className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                            title="Arquivar"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void runServerAction(
                                activeNav === 'trash' ? 'permanentDelete' : 'trash',
                                [message]
                              )
                            }
                            className="rounded p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-400">
                    <span>
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={page <= 1 || loadingMessages}
                        onClick={() => void loadMessages(page - 1)}
                        className="rounded-lg border border-white/[0.08] px-2.5 py-1 hover:text-white disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || loadingMessages}
                        onClick={() => void loadMessages(page + 1)}
                        className="rounded-lg border border-white/[0.08] px-2.5 py-1 hover:text-white disabled:opacity-40"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* REGIÃO 3: Painel de Leitura Completa da Mensagem / Conversa */}
            <div
              className={`${
                selected ? 'flex flex-1' : 'hidden xl:flex xl:flex-1'
              } flex-col min-w-0 pl-0 xl:pl-6`}
            >
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 mb-3">
                    <Mail className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">
                    Selecione uma mensagem para ler
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500">
                    Escolha qualquer e-mail na lista ao lado para visualizar o conteúdo completo, imagens, anexos e histórico da conversa.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col min-w-0">
                  {/* Barra de Ações do Leitor */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(null);
                          setMessageBody(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span className="xl:hidden">Voltar</span>
                      </button>

                      {/* Ações contextuais conforme a pasta */}
                      {activeNav === 'drafts' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selected) return;
                            setComposer({
                              mode: 'new',
                              senderAccount: selected.accountId || 'profissional',
                              to: (selected.to || []).join(', '),
                              cc: (selected.cc || []).join(', '),
                              bcc: '',
                              subject: selected.subject === '(sem assunto)' ? '' : selected.subject,
                              initialHtml:
                                messageBody?.html ||
                                `<div dir="ltr">${escapeHtml(messageBody?.text || '').replace(/\n/g, '<br>')}</div>`,
                              draftUid: selected.uid,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#843C52] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#96455e]"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Continuar rascunho
                        </button>
                      ) : null}

                      {activeNav === 'spam' ? (
                        <button
                          type="button"
                          onClick={() => void runServerAction('notSpam', [selected])}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Não é spam
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void runServerAction(
                              activeNav === 'archive' ? 'unarchive' : 'archive',
                              [selected]
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                          title={activeNav === 'archive' ? 'Desarquivar' : 'Arquivar'}
                        >
                          <Archive className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            {activeNav === 'archive' ? 'Desarquivar' : 'Arquivar'}
                          </span>
                        </button>
                      )}

                      {activeNav === 'trash' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void runServerAction('restore', [selected])}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar
                          </button>
                          <button
                            type="button"
                            onClick={() => void runServerAction('permanentDelete', [selected])}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir definitivamente
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runServerAction('trash', [selected])}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-rose-300"
                          title="Mover para a Lixeira"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      )}

                      {activeNav !== 'spam' && (
                        <button
                          type="button"
                          onClick={() => void runServerAction('spam', [selected])}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-amber-300"
                          title="Marcar como Spam"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Spam</span>
                        </button>
                      )}

                      {/* Menu Mover para Pasta */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMoveMenuOpen((o) => !o)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                          title="Mover para pasta"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Mover</span>
                        </button>
                        {moveMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setMoveMenuOpen(false)}
                            />
                            <div className="absolute left-0 z-40 mt-1.5 w-52 rounded-xl border border-white/[0.1] bg-[#14151b] p-1.5 shadow-2xl">
                              <p className="px-2.5 py-1 text-[10px] font-semibold uppercase text-zinc-500">
                                Mover para
                              </p>
                              {folders
                                .filter(
                                  (f) =>
                                    !f.accountId ||
                                    f.accountId === (selected.accountId || 'profissional')
                                )
                                .map((f) => (
                                  <button
                                    key={f.path}
                                    type="button"
                                    onClick={() =>
                                      void runServerAction('archive', [selected], f.path)
                                    }
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                                  >
                                    <Folder className="h-3.5 w-3.5 text-zinc-500" />
                                    <span className="truncate">{displayFolderName(f.name || f.path)}</span>
                                  </button>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          void runServerAction(
                            selected.read ? 'unread' : 'read',
                            [selected]
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14151b] px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white"
                      >
                        {selected.read ? (
                          <>
                            <Mail className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Marcar não lida</span>
                          </>
                        ) : (
                          <>
                            <MailOpen className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Marcar lida</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void runServerAction(
                            selected.starred ? 'unstar' : 'star',
                            [selected]
                          )
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-[#14151b] p-1.5 text-zinc-300 hover:text-amber-300"
                        title={selected.starred ? 'Remover favorito' : 'Favoritar'}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            selected.starred ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo da Conversa / Mensagem */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Título do Assunto e Badges */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-lg sm:text-xl font-semibold text-white leading-snug">
                        {selected.subject}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedCustomerEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent('nua_admin_navigate', {
                                  detail: { module: 'clientes', subAction: selectedCustomerEmail },
                                })
                              );
                            }}
                            className="rounded-lg border border-adm-accent/30 bg-adm-accent/10 px-2.5 py-1 text-[11px] text-adm-accent hover:bg-adm-accent/20 cursor-pointer"
                            title="Buscar fichas ligadas a este endereço de e-mail"
                          >
                            Ver na Central Clientes
                          </button>
                        )}
                        <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300">
                          {displayFolderName(selected.folder)}
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                            (selected.accountId || 'profissional') === 'profissional'
                              ? 'bg-[#843C52]/20 text-[#e39ab0]'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {(selected.accountId || 'profissional') === 'profissional'
                            ? 'Profissional'
                            : 'Pessoal'}
                        </span>
                      </div>
                    </div>

                    {/* Se houver mais de 1 mensagem na conversa, mostra o histórico de mensagens da thread */}
                    {activeConversationMessages.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-zinc-400">
                          Histórico da conversa ({activeConversationMessages.length} mensagens)
                        </p>
                        {activeConversationMessages.map((tMsg) => {
                          const isCurrent = tMsg.id === selected.id;
                          const isExpanded = expandedThreadIds.has(tMsg.id) || isCurrent;
                          const tSender = parseAddress(tMsg.from);
                          const tBody = isCurrent ? messageBody : expandedThreadBodies[tMsg.id];
                          if (isCurrent) return null; // A mensagem selecionada principal é exibida completa abaixo
                          return (
                            <div
                              key={tMsg.id}
                              className="rounded-xl border border-white/[0.07] bg-[#14151b]/70 overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => void toggleThreadItem(tMsg)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/[0.03]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <SenderAvatar
                                    name={tSender.name}
                                    email={tSender.email}
                                    initials={tSender.initials}
                                    contacts={contacts}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">
                                      {tSender.name}{' '}
                                      <span className="font-normal text-zinc-500">
                                        &lt;{tSender.email}&gt;
                                      </span>
                                    </p>
                                    {!isExpanded && (
                                      <p className="text-[11px] text-zinc-500 truncate">
                                        {tMsg.snippet}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-400">
                                  <span>{displayFullDate(tMsg.date)}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </div>
                              </button>
                              {isExpanded && tBody && (
                                <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
                                  {tBody.html ? (
                                    <EmailHtmlFrame html={tBody.html} />
                                  ) : (
                                    <pre className="whitespace-pre-wrap rounded-xl bg-[#0c0d12] p-4 font-sans text-xs text-zinc-200">
                                      {tBody.text || '(Mensagem sem texto)'}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Cartão de Metadados do Remetente da Mensagem Selecionada */}
                    {(() => {
                      const sender = parseAddress(selected.from);
                      const savedContact = contacts.find(
                        (c) => c.email.toLowerCase() === sender.email.toLowerCase()
                      );
                      const msgAcct: MailAccountId =
                        selected.accountId ||
                        (accountScope === 'pessoal' ? 'pessoal' : 'profissional');
                      const attachments = messageBody?.message.attachments || selected.attachments || [];
                      const imageAttachments = attachments.filter((att) =>
                        isImageMime(att.contentType, att.filename)
                      );

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#14151b] p-3.5">
                            <div className="flex items-start gap-3 min-w-0">
                              <SenderAvatar
                                name={sender.name}
                                email={sender.email}
                                initials={sender.initials}
                                contacts={contacts}
                                size="lg"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-white">
                                    {sender.name}
                                  </span>
                                  <span className="text-xs text-zinc-400">
                                    &lt;{sender.email}&gt;
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setContactModal({
                                        id: savedContact?.id,
                                        name: savedContact?.name || sender.name,
                                        email: sender.email,
                                        avatarUrl: savedContact?.avatarUrl || '',
                                        notes: savedContact?.notes || '',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-300 hover:border-[#843C52]/40 hover:text-white"
                                  >
                                    <UserPlus className="h-2.5 w-2.5 text-[#e39ab0]" />
                                    {savedContact ? 'Editar contato' : 'Salvar contato'}
                                  </button>
                                </div>
                                <p className="mt-0.5 text-[11px] text-zinc-400">
                                  Para:{' '}
                                  <span className="text-zinc-300">
                                    {(messageBody?.message.to || selected.to || []).join(', ') ||
                                      'você'}
                                  </span>
                                  {Boolean(
                                    (messageBody?.message.cc || selected.cc)?.length
                                  ) && (
                                    <span className="ml-2">
                                      · CC:{' '}
                                      {(messageBody?.message.cc || selected.cc || []).join(', ')}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 text-[11px] text-zinc-400">
                              <span>{displayFullDate(selected.date)}</span>
                              <button
                                type="button"
                                onClick={() => void openMessage(selected, !allowImages)}
                                className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                              >
                                <ImageIcon className="h-3 w-3" />
                                {allowImages
                                  ? 'Imagens externas liberadas'
                                  : 'Exibir imagens externas'}
                              </button>
                            </div>
                          </div>

                          {/* Corpo da Mensagem */}
                          {loadingBody ? (
                            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#14151b] p-8 text-xs text-zinc-400">
                              <Loader2 className="h-4 w-4 animate-spin text-[#843C52]" />
                              Carregando conteúdo completo da mensagem...
                            </div>
                          ) : messageBody ? (
                            <>
                              {(() => {
                                const strippedHtmlText = (messageBody.html || '')
                                  .replace(/<[^>]+>/g, '')
                                  .trim();
                                const hasMeaningfulText =
                                  Boolean(strippedHtmlText) ||
                                  Boolean((messageBody.text || '').trim()) ||
                                  /<img\b/i.test(messageBody.html || '');

                                if (messageBody.html && hasMeaningfulText) {
                                  return <EmailHtmlFrame html={messageBody.html} />;
                                }
                                if ((messageBody.text || '').trim()) {
                                  return (
                                    <pre className="whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#14151b] p-5 font-sans text-sm leading-relaxed text-zinc-200">
                                      {messageBody.text}
                                    </pre>
                                  );
                                }
                                if (imageAttachments.length > 0) {
                                  return null; // A galeria de imagens anexadas abaixo exibirá a imagem em destaque
                                }
                                return (
                                  <div className="rounded-xl border border-white/[0.06] bg-[#14151b] p-5 text-xs text-zinc-400">
                                    (Mensagem sem texto)
                                  </div>
                                );
                              })()}

                              {/* Galeria de Anexos (Miniaturas de Imagens + Arquivos para Download) */}
                              {attachments.length > 0 && (
                                <div className="rounded-xl border border-white/[0.08] bg-[#14151b] p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-xs font-semibold text-white">
                                      <Paperclip className="h-3.5 w-3.5 text-[#e39ab0]" />
                                      Anexos ({attachments.length})
                                    </span>
                                  </div>

                                  {/* Pré-visualização de Imagens Anexadas */}
                                  {imageAttachments.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {imageAttachments.map((att) => {
                                        const inlineUrl = mailService.attachmentUrl(
                                          msgAcct,
                                          selected.folder || currentFolderPath,
                                          selected.uid,
                                          att.id,
                                          att.filename,
                                          true
                                        );
                                        const downloadUrl = mailService.attachmentUrl(
                                          msgAcct,
                                          selected.folder || currentFolderPath,
                                          selected.uid,
                                          att.id,
                                          att.filename,
                                          false
                                        );
                                        return (
                                          <div
                                            key={att.id}
                                            className="group overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d12] flex flex-col"
                                          >
                                            <div
                                              onClick={() =>
                                                setLightboxImage({
                                                  url: inlineUrl,
                                                  downloadUrl,
                                                  filename: att.filename,
                                                  size: att.size,
                                                })
                                              }
                                              className="relative flex items-center justify-center bg-black/40 p-3 min-h-[180px] max-h-[300px] cursor-pointer overflow-hidden"
                                            >
                                              <img
                                                src={inlineUrl}
                                                alt={att.filename}
                                                className="max-h-[260px] w-auto object-contain rounded transition group-hover:scale-[1.02]"
                                              />
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                                                <span className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 inline-flex items-center gap-1.5 rounded-xl bg-black/80 px-3 py-1.5 text-xs font-medium text-white">
                                                  <ZoomIn className="h-3.5 w-3.5" />
                                                  Ampliar imagem
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-white/[0.06]">
                                              <div className="min-w-0">
                                                <p className="truncate text-xs font-medium text-zinc-200">
                                                  {att.filename}
                                                </p>
                                                {att.size && (
                                                  <p className="text-[10px] text-zinc-500">
                                                    {formatBytes(att.size)}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setLightboxImage({
                                                      url: inlineUrl,
                                                      downloadUrl,
                                                      filename: att.filename,
                                                      size: att.size,
                                                    })
                                                  }
                                                  className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
                                                >
                                                  <Eye className="h-3 w-3" />
                                                  Ver
                                                </button>
                                                <a
                                                  href={downloadUrl}
                                                  className="inline-flex items-center gap-1 rounded-lg bg-[#843C52]/25 border border-[#843C52]/40 px-2.5 py-1 text-[11px] font-medium text-[#e39ab0] hover:bg-[#843C52]/35"
                                                >
                                                  <Download className="h-3 w-3" />
                                                  Baixar
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Demais arquivos anexados */}
                                  <div className="flex flex-wrap gap-2">
                                    {attachments
                                      .filter((att) => !isImageMime(att.contentType, att.filename))
                                      .map((att) => (
                                        <a
                                          key={att.id}
                                          href={mailService.attachmentUrl(
                                            msgAcct,
                                            selected.folder || currentFolderPath,
                                            selected.uid,
                                            att.id,
                                            att.filename,
                                            false
                                          )}
                                          className="inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3.5 py-2 text-xs text-zinc-200 transition hover:border-[#843C52]/50"
                                        >
                                          <Paperclip className="h-3.5 w-3.5 text-[#e39ab0]" />
                                          <span className="max-w-[220px] truncate font-medium">
                                            {att.filename}
                                          </span>
                                          {att.size && (
                                            <span className="text-[11px] text-zinc-500">
                                              {formatBytes(att.size)}
                                            </span>
                                          )}
                                          <Download className="h-3.5 w-3.5 text-zinc-400" />
                                        </a>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : null}

                          {/* Barra de Resposta Rápida no Rodapé da Mensagem */}
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => openComposer('reply', selected)}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#843C52] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#96455e]"
                            >
                              <Reply className="h-3.5 w-3.5" />
                              Responder
                            </button>
                            <button
                              type="button"
                              onClick={() => openComposer('replyAll', selected)}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#14151b] px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/[0.16] hover:text-white"
                            >
                              <ReplyAll className="h-3.5 w-3.5" />
                              Responder a todos
                            </button>
                            <button
                              type="button"
                              onClick={() => openComposer('forward', selected)}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#14151b] px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/[0.16] hover:text-white"
                            >
                              <Forward className="h-3.5 w-3.5" />
                              Encaminhar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Lightbox de Visualização de Imagem Anexada */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="flex w-full max-w-4xl items-center justify-between gap-3 pb-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{lightboxImage.filename}</p>
              {lightboxImage.size && (
                <p className="text-xs text-zinc-400">{formatBytes(lightboxImage.size)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#843C52] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#96455e]"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar arquivo
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="rounded-xl border border-white/[0.15] bg-white/[0.08] p-2 text-white hover:bg-white/[0.15]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            className="flex max-h-[82vh] max-w-4xl items-center justify-center overflow-auto rounded-2xl border border-white/[0.1] bg-[#0c0d12] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.filename}
              className="max-h-[78vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Modal de Composição de E-mail (Editor Rico + Seletor de Remetente + Rascunhos) */}
      {composer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
          <form
            onSubmit={submitComposer}
            className="flex w-full max-w-3xl flex-col rounded-2xl border border-white/[0.1] bg-[#14151b] shadow-2xl max-h-[92vh] overflow-hidden"
          >
            {/* Topo do Compositor */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-semibold text-white">
                  {composer.mode === 'new' && 'Nova mensagem'}
                  {composer.mode === 'reply' && 'Responder mensagem'}
                  {composer.mode === 'replyAll' && 'Responder a todos'}
                  {composer.mode === 'forward' && 'Encaminhar mensagem'}
                </h3>
                {localDraftSavedAt && (
                  <span className="text-[11px] text-zinc-500">
                    · Salvo às {localDraftSavedAt}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  persistLocalDraft();
                  setComposer(null);
                }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Fechar (o rascunho permanece salvo)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Campos de Destinatário e Remetente */}
            <div className="space-y-2.5 px-5 py-3.5 border-b border-white/[0.06] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-zinc-400">De:</span>
                <select
                  value={composer.senderAccount}
                  onChange={(e) => {
                    const next = {
                      ...composer,
                      senderAccount: e.target.value as MailAccountId,
                    };
                    setComposer(next);
                    persistLocalDraft(next);
                  }}
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2.5 text-xs text-white focus:border-[#843C52] focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      Nua Borges &lt;{acc.address}&gt; ({acc.label})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex items-center gap-2">
                <span className="w-14 shrink-0 text-zinc-400">Para:</span>
                <input
                  value={composer.to}
                  onChange={(e) => handleToChange(e.target.value)}
                  onBlur={() => window.setTimeout(() => setShowRecipientSuggestions(false), 180)}
                  placeholder="destinatario@exemplo.com (separe múltiplos por vírgula)"
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#843C52] focus:outline-none"
                />
                {!showCcBcc && (
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(true)}
                    className="shrink-0 text-[11px] text-zinc-400 hover:text-white"
                  >
                    CC / CCO
                  </button>
                )}

                {showRecipientSuggestions && recipientSuggestions.length > 0 && (
                  <div className="absolute left-16 right-0 top-9 z-40 rounded-xl border border-white/[0.1] bg-[#14151b] p-1 shadow-xl">
                    {recipientSuggestions.map((item) => (
                      <button
                        key={item.email}
                        type="button"
                        onMouseDown={() => applyRecipientSuggestion(item)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/[0.06]"
                      >
                        <span className="font-medium text-white">{item.name}</span>
                        <span className="text-zinc-400">{item.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {showCcBcc && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-zinc-400">CC:</span>
                    <input
                      value={composer.cc}
                      onChange={(e) => {
                        const next = { ...composer, cc: e.target.value };
                        setComposer(next);
                        persistLocalDraft(next);
                      }}
                      placeholder="Com cópia"
                      className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 sm:w-10 shrink-0 text-zinc-400">CCO:</span>
                    <input
                      value={composer.bcc}
                      onChange={(e) => {
                        const next = { ...composer, bcc: e.target.value };
                        setComposer(next);
                        persistLocalDraft(next);
                      }}
                      placeholder="Cópia oculta"
                      className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-zinc-400">Assunto:</span>
                <input
                  value={composer.subject}
                  onChange={(e) => {
                    const next = { ...composer, subject: e.target.value };
                    setComposer(next);
                    persistLocalDraft(next);
                  }}
                  placeholder="Assunto da mensagem"
                  className="h-8 flex-1 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white placeholder:text-zinc-500 focus:border-[#843C52] focus:outline-none"
                />
              </div>
            </div>

            {/* Barra de Formatação Rich Text */}
            <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.06] bg-[#0c0d12]/60 px-4 py-1.5">
              <button
                type="button"
                onClick={() => execEditorCommand('bold')}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Negrito"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execEditorCommand('italic')}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Itálico"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execEditorCommand('underline')}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Sublinhado"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-4 w-px bg-white/[0.08]" />
              <button
                type="button"
                onClick={() => execEditorCommand('insertUnorderedList')}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Lista com marcadores"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execEditorCommand('insertOrderedList')}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Lista numerada"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt('Digite o endereço do link (ex.: https://nuaborges.com.br):');
                  if (url) execEditorCommand('createLink', url);
                }}
                className="rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Inserir link"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <label
                className="cursor-pointer rounded p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                title="Inserir imagem no corpo do e-mail"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      execEditorCommand('insertImage', String(reader.result));
                    };
                    reader.readAsDataURL(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            {/* Área Editável do Corpo do E-mail */}
            <div className="flex-1 overflow-y-auto px-5 py-3 bg-[#0c0d12]">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => persistLocalDraft()}
                className="min-h-[220px] w-full text-sm leading-relaxed text-zinc-100 focus:outline-none [&_a]:text-[#e39ab0] [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_img]:max-w-full [&_img]:rounded"
              />
            </div>

            {/* Lista de Anexos Adicionados */}
            {composerFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 py-2.5 border-t border-white/[0.06] bg-[#14151b]">
                {composerFiles.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0d12] px-2.5 py-1 text-xs text-zinc-300"
                  >
                    <Paperclip className="h-3 w-3 text-[#e39ab0]" />
                    <span className="max-w-[180px] truncate">{file.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setComposerFiles((items) => items.filter((_, idx) => idx !== index))
                      }
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Rodapé do Compositor */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-5 py-3.5 bg-[#14151b]">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#843C52] px-5 py-2 text-xs font-medium text-white transition hover:bg-[#96455e] disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Enviar agora
                </button>

                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 hover:border-white/[0.16] hover:text-white">
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexar arquivo
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setComposerFiles((items) => [...items, ...files]);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>

                {isLocalMailHost && (
                  <button
                    type="button"
                    disabled={savingDraftServer}
                    onClick={() => void handleSaveDraftToServer()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 py-2 text-xs text-zinc-300 hover:border-white/[0.16] hover:text-white disabled:opacity-50"
                  >
                    {savingDraftServer ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Salvar rascunho
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
                  setHasRecoverableLocalDraft(null);
                  setComposer(null);
                  setComposerFiles([]);
                }}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Descartar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Criar / Renomear / Excluir Pasta Personalizada */}
      {customFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleFolderCrudSubmit}
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#14151b] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {customFolderModal.mode === 'create' && 'Nova pasta personalizada'}
                {customFolderModal.mode === 'rename' && 'Renomear pasta'}
                {customFolderModal.mode === 'delete' && 'Excluir pasta'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomFolderModal(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {customFolderModal.mode === 'create' && (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Conta</label>
                <select
                  value={customFolderModal.account}
                  onChange={(e) =>
                    setCustomFolderModal({
                      ...customFolderModal,
                      account: e.target.value as MailAccountId,
                    })
                  }
                  className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.label} ({acc.address})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {customFolderModal.mode === 'delete' ? (
              <p className="text-xs text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir a pasta{' '}
                <strong className="text-white">{customFolderModal.currentName}</strong>?
              </p>
            ) : (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Nome da pasta
                </label>
                <input
                  required
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="Ex: Parcerias, Clientes VIP, Notas..."
                  className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white focus:border-[#843C52] focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomFolderModal(null)}
                className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={folderActionLoading}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white ${
                  customFolderModal.mode === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-[#843C52] hover:bg-[#96455e]'
                }`}
              >
                {folderActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {customFolderModal.mode === 'create' && 'Criar pasta'}
                {customFolderModal.mode === 'rename' && 'Salvar'}
                {customFolderModal.mode === 'delete' && 'Excluir pasta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Criar / Editar Contato */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveContactSubmit}
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#14151b] p-5 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {contactModal.id ? 'Editar contato' : 'Salvar contato'}
              </h3>
              <button
                type="button"
                onClick={() => setContactModal(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Nome</label>
              <input
                required
                value={contactModal.name}
                onChange={(e) =>
                  setContactModal({ ...contactModal, name: e.target.value })
                }
                placeholder="Nome completo ou empresa"
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Endereço de e-mail
              </label>
              <input
                required
                type="email"
                value={contactModal.email}
                onChange={(e) =>
                  setContactModal({ ...contactModal, email: e.target.value })
                }
                placeholder="email@dominio.com"
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Link da foto de perfil (opcional)
              </label>
              <input
                value={contactModal.avatarUrl}
                onChange={(e) =>
                  setContactModal({ ...contactModal, avatarUrl: e.target.value })
                }
                placeholder="https://..."
                className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Observações (opcional)
              </label>
              <textarea
                rows={2}
                value={contactModal.notes}
                onChange={(e) =>
                  setContactModal({ ...contactModal, notes: e.target.value })
                }
                placeholder="Notas sobre este contato..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactModal(null)}
                className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingContact}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#843C52] px-4 py-2 text-xs font-medium text-white hover:bg-[#96455e]"
              >
                {savingContact && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar contato
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Assinatura de E-mail */}
      {signatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#14151b] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Assinatura automática de e-mail
              </h3>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Esta assinatura é adicionada automaticamente ao iniciar ou responder mensagens.
            </p>
            <textarea
              rows={5}
              value={signatureHtml}
              onChange={(e) => setSignatureHtml(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0c0d12] p-3 font-mono text-xs text-zinc-200"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignatureHtml(DEFAULT_SIGNATURE)}
                className="rounded-xl border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.setItem(LOCAL_SIGNATURE_STORAGE_KEY, signatureHtml);
                  } catch {}
                  setSignatureModalOpen(false);
                  showToast('Assinatura atualizada.');
                }}
                className="rounded-xl bg-[#843C52] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#96455e]"
              >
                Salvar assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Definitiva */}
      {confirmPermanentDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#14151b] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Excluir mensagem definitivamente?
              </h3>
              <button
                type="button"
                onClick={() => setConfirmPermanentDelete(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Esta ação apagará a mensagem para sempre e não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentDelete(null)}
                className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void runServerAction('permanentDelete', confirmPermanentDelete.targets);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-500"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
