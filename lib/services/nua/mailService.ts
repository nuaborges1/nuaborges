export type MailAccountId = 'profissional' | 'pessoal';
export type MailAccountScope = MailAccountId | 'unificada';

export interface MailAccount {
  id: MailAccountId;
  label: string;
  address: string;
  provider: 'hostinger' | 'yahoo';
  available: boolean;
  reason?: string;
}

export interface MailFolder {
  path: string;
  name?: string;
  specialUse?: string | null;
  messages?: number;
  unseen?: number;
  accountId?: MailAccountId;
}

export interface MailAttachmentMeta {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  cid?: string;
  inline?: boolean;
}

export interface MailMessage {
  id: string;
  uid: number;
  folder: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  snippet: string;
  date: string;
  size?: number;
  read: boolean;
  starred?: boolean;
  answered?: boolean;
  attachments?: MailAttachmentMeta[];
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  accountId?: MailAccountId;
  account?: string;
}

export interface MailMessageBody {
  message: MailMessage;
  html: string;
  text: string;
  imagesAllowed: boolean;
}

export interface MailContact {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  notes?: string;
  source?: string;
  updatedAt?: string;
}

export interface MailSearchFilters {
  q?: string;
  unread?: '1' | '0';
  starred?: '1';
  hasAttachment?: '1';
  from?: string;
  to?: string;
  subject?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest';
}

const API_BASE = '/api/mail';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { ...(init?.headers || {}) },
  });
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {}
  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.error || `Não foi possível acessar a caixa de e-mail (${res.status}).`);
  }
  return payload as T;
}

const query = (values: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return `?${params.toString()}`;
};

const post = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function addressText(value: any): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(addressText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return [value.name, value.address || value.email].filter(Boolean).join(' ');
  return '';
}

function normalizeMessage(value: any, fallbackFolder: string, fallbackAccount?: MailAccountId): MailMessage {
  const flags = Array.isArray(value?.flags) ? value.flags.join(' ') : String(value?.flags || '');
  const uid = Number(value?.uid ?? value?.id ?? value?.messageId);
  const folder = String(value?.folder || fallbackFolder);
  const accountId: MailAccountId =
    value?.accountId === 'profissional' || value?.accountId === 'pessoal'
      ? value.accountId
      : fallbackAccount || 'profissional';
  return {
    ...value,
    id: String(value?.id ?? `${accountId}:${folder}:${uid}`),
    uid,
    folder,
    accountId,
    from: addressText(value?.from),
    to: Array.isArray(value?.to) ? value.to.map(addressText) : addressText(value?.to) ? [addressText(value.to)] : [],
    cc: Array.isArray(value?.cc) ? value.cc.map(addressText) : addressText(value?.cc) ? [addressText(value.cc)] : [],
    subject: String(value?.subject || '(sem assunto)'),
    snippet: String(value?.snippet || value?.preview || ''),
    date: String(value?.date || value?.internalDate || ''),
    size: typeof value?.size === 'number' ? value.size : undefined,
    read: typeof value?.read === 'boolean' ? value.read : Boolean(value?.isRead || /\\Seen/i.test(flags)),
    starred: typeof value?.starred === 'boolean' ? value.starred : Boolean(value?.isStarred || /\\Flagged/i.test(flags)),
    answered: typeof value?.answered === 'boolean' ? value.answered : Boolean(/\\Answered/i.test(flags)),
    attachments: Array.isArray(value?.attachments) ? value.attachments : [],
    messageId: String(value?.messageId || value?.headers?.['message-id'] || ''),
    inReplyTo: String(value?.inReplyTo || value?.headers?.['in-reply-to'] || ''),
    references: String(value?.references || value?.headers?.['references'] || ''),
  };
}

export const mailService = {
  listAccounts: () => request<{ accounts: MailAccount[] }>('/accounts'),
  listFolders: (account: MailAccountScope) =>
    request<{ folders: MailFolder[]; byAccount?: Record<MailAccountId, MailFolder[]> }>(
      '/folders' + query({ account })
    ),
  createFolder: (account: MailAccountId, name: string) =>
    request<{ success: boolean; folder: { path: string; name: string } }>(
      '/folders',
      post({ account, action: 'create', name })
    ),
  renameFolder: (account: MailAccountId, path: string, newName: string) =>
    request<{ success: boolean; folder: { oldPath: string; path: string; name: string } }>(
      '/folders',
      post({ account, action: 'rename', path, newName })
    ),
  deleteFolder: (account: MailAccountId, path: string) =>
    request<{ success: boolean }>('/folders', post({ account, action: 'delete', path })),

  async listMessages(
    account: MailAccountScope,
    folder: string,
    page = 1,
    perPage = 25,
    q = '',
    filters?: MailSearchFilters
  ) {
    const result = await request<{
      messages: any[];
      pagination?: { page: number; perPage: number; total: number; totalPages: number };
    }>(
      '/messages' +
        query({
          account,
          folder,
          page,
          perPage,
          q: filters?.q ?? (q || undefined),
          unread: filters?.unread,
          starred: filters?.starred,
          hasAttachment: filters?.hasAttachment,
          from: filters?.from,
          to: filters?.to,
          subject: filters?.subject,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          sort: filters?.sort,
        })
    );
    const fallbackAcct: MailAccountId | undefined = account === 'unificada' ? undefined : account;
    return {
      ...result,
      messages: (result.messages || []).map((item) => normalizeMessage(item, folder, fallbackAcct)),
    };
  },

  async getMessage(account: MailAccountId, folder: string, uid: number, images = false) {
    const result = await request<Omit<MailMessageBody, 'message'> & { message: any }>(
      '/message' + query({ account, folder, uid, images: images ? 1 : undefined })
    );
    return { ...result, message: normalizeMessage(result.message, folder, account) };
  },

  send: (payload: Record<string, unknown>) => request<{ success: boolean }>('/send', post(payload)),
  saveDraft: (payload: {
    account: MailAccountId;
    to?: string[];
    cc?: string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename: string; contentType: string; content: string }>;
    replaceUid?: number;
  }) => request<{ success: boolean; saved: boolean; folder: string }>('/draft', post(payload)),

  updateFlags: (payload: {
    account: MailAccountId;
    folder: string;
    uids: number[];
    addFlags?: string[];
    removeFlags?: string[];
  }) => request<{ success: boolean }>('/flags', post(payload)),

  move: (payload: { account: MailAccountId; folder: string; uids: number[]; targetFolder: string }) =>
    request<{ success: boolean }>('/move', post(payload)),

  delete: (payload: { account: MailAccountId; folder: string; uids: number[]; permanent?: boolean }) =>
    request<{ success: boolean; mode?: 'trash' | 'permanent'; targetFolder?: string }>('/delete', post(payload)),

  attachmentUrl: (
    account: MailAccountId,
    folder: string,
    uid: number,
    id: string,
    name: string,
    inline = false
  ) => API_BASE + '/attachment' + query({ account, folder, uid, id, name, inline: inline ? 1 : undefined }),

  listContacts: () => request<{ contacts: MailContact[] }>('/contacts'),
  saveContact: (contact: Partial<MailContact> & { email: string }) =>
    request<{ contact: MailContact; contacts: MailContact[] }>('/contacts', post({ action: 'save', ...contact })),
  deleteContact: (id: string) =>
    request<{ contacts: MailContact[] }>('/contacts', post({ action: 'delete', id })),
};
