'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { encryptVaultText, decryptVaultText, EncryptedPayload } from '@/lib/vaultCrypto';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { broadcastAdminUpdate, subscribeAdminUpdates } from '@/lib/adminSync';
import { VaultCredentialItem, STORAGE_LOCAL_VAULT_KEY, SERVICE_PRESETS } from './types';

function resolveVaultKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    sessionStorage.getItem('nua_vault_key') ||
    (process.env.NEXT_PUBLIC_VAULT_KEY as string) ||
    ''
  ).trim();
}

function buildVaultAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredSessionToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useVaultCredentials(externalSearchQuery: string = '') {
  const [credentials, setCredentials] = useState<VaultCredentialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [vaultKeyVersion, setVaultKeyVersion] = useState(0);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const hasVaultKey = useMemo(() => {
    void vaultKeyVersion;
    return Boolean(resolveVaultKey());
  }, [vaultKeyVersion]);

  const setVaultMasterKey = useCallback((rawKey: string) => {
    const clean = rawKey.trim();
    if (!clean || clean.length < 4) {
      setVaultError('Informe uma frase-mestre com pelo menos 4 caracteres.');
      return false;
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nua_vault_key', clean);
    }
    setDecryptedPasswords({});
    setVisiblePasswords({});
    setVaultError(null);
    setVaultKeyVersion((v) => v + 1);
    return true;
  }, []);

  const lockVault = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nua_vault_key');
    }
    setDecryptedPasswords({});
    setVisiblePasswords({});
    setVaultError(null);
    setVaultKeyVersion((v) => v + 1);
  }, []);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultCredentialItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<VaultCredentialItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formService, setFormService] = useState('hostinger');
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Hospedagem & E-mail');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAccessUrl, setFormAccessUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const loadCredentials = useCallback(async () => {
    try {
      setIsLoading(true);
      let list: VaultCredentialItem[] = [];

      try {
        const apiUrl = getPublicApiUrl();
        const res = await fetch(`${apiUrl}/api/admin/vault`, {
          credentials: 'include',
          headers: buildVaultAuthHeaders({ 'Cache-Control': 'no-cache' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.credentials)) {
            list = data.credentials;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_LOCAL_VAULT_KEY, JSON.stringify(list));
            }
          }
        }
      } catch {
        // Fallback para cache local se offline
      }

      if (list.length === 0 && typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_LOCAL_VAULT_KEY);
        if (stored) {
          try {
            list = JSON.parse(stored);
          } catch {}
        }
      }

      setCredentials(list);
    } catch (err) {
      console.error('[CofreCredenciais] Erro ao carregar credenciais:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // Alterações feitas pela IA ou em outra aba aparecem sem recarregar a página.
  useEffect(() => subscribeAdminUpdates('vault', () => loadCredentials()), [loadCredentials]);

  const getOrDecryptPassword = async (
    item: VaultCredentialItem
  ): Promise<{ ok: boolean; plaintext?: string; error?: string }> => {
    if (decryptedPasswords[item.id]) {
      return { ok: true, plaintext: decryptedPasswords[item.id] };
    }
    const key = resolveVaultKey();
    if (!key) {
      const msg = 'Desbloqueie o cofre informando sua chave-mestre acima antes de visualizar ou copiar senhas.';
      setVaultError(msg);
      return { ok: false, error: msg };
    }
    try {
      const plain = await decryptVaultText(item.encryptedPassword, key);
      setVaultError(null);
      setDecryptedPasswords((prev) => ({ ...prev, [item.id]: plain }));
      return { ok: true, plaintext: plain };
    } catch {
      const msg = 'Chave-mestre incorreta para este acesso. Verifique a chave informada no topo do cofre.';
      setVaultError(msg);
      return { ok: false, error: msg };
    }
  };

  const handleTogglePassword = async (item: VaultCredentialItem) => {
    const isCurrentlyVisible = !!visiblePasswords[item.id];
    if (isCurrentlyVisible) {
      setVisiblePasswords((prev) => ({ ...prev, [item.id]: false }));
      return;
    }

    const result = await getOrDecryptPassword(item);
    if (!result.ok) return;
    setVisiblePasswords((prev) => ({ ...prev, [item.id]: true }));

    setTimeout(() => {
      setVisiblePasswords((prev) => ({ ...prev, [item.id]: false }));
    }, 30000);
  };

  const handleCopyPassword = async (item: VaultCredentialItem) => {
    try {
      const result = await getOrDecryptPassword(item);
      if (result.ok && result.plaintext) {
        await navigator.clipboard.writeText(result.plaintext);
        setCopiedId(`pwd_${item.id}`);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch (err) {
      console.error('Falha ao copiar senha:', err);
    }
  };

  const handleCopyUsername = async (item: VaultCredentialItem) => {
    try {
      await navigator.clipboard.writeText(item.username);
      setCopiedId(`user_${item.id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleOpenCreateModal = (presetId?: string) => {
    setEditingItem(null);
    setFormError(null);
    setShowFormPassword(false);

    const preset = SERVICE_PRESETS.find((p) => p.id === presetId) || SERVICE_PRESETS[0];
    setFormService(preset.id);
    setFormTitle(preset.defaultTitle);
    setFormCategory(preset.category);
    setFormUsername('');
    setFormPassword('');
    setFormAccessUrl(preset.defaultUrl);
    setFormNotes('');

    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = async (item: VaultCredentialItem) => {
    setEditingItem(item);
    setFormError(null);
    setShowFormPassword(false);

    setFormService(item.service);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormUsername(item.username);
    setFormAccessUrl(item.accessUrl || '');

    const decrypted = await getOrDecryptPassword(item);
    if (decrypted.ok && decrypted.plaintext !== undefined) {
      setFormPassword(decrypted.plaintext);
    } else {
      setFormPassword('');
      setFormError(
        decrypted.error ||
          'Não foi possível abrir a senha atual. Desbloqueie o cofre com a chave-mestre correta ou informe uma nova senha.'
      );
    }

    let plainNotes = '';
    if (item.encryptedNotes) {
      const key = resolveVaultKey();
      if (key) {
        try {
          plainNotes = await decryptVaultText(item.encryptedNotes, key);
        } catch {}
      }
    }
    setFormNotes(plainNotes);

    setIsFormModalOpen(true);
  };

  const handleGenerateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+=-';
    let generated = '';
    const array = new Uint8Array(18);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < array.length; i++) {
      generated += chars[array[i] % chars.length];
    }
    setFormPassword(generated);
    setShowFormPassword(true);
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Informe um título ou nome para a conta.');
      return;
    }
    if (!formUsername.trim()) {
      setFormError('Informe o e-mail ou usuário de acesso.');
      return;
    }
    if (!formPassword.trim()) {
      setFormError('Informe a senha.');
      return;
    }

    try {
      setIsSubmitting(true);

      const key = resolveVaultKey();
      if (!key) {
        setFormError('Chave do cofre ausente. Desbloqueie o cofre ou entre novamente antes de salvar.');
        setIsSubmitting(false);
        return;
      }

      const encryptedPassword = await encryptVaultText(formPassword.trim(), key);
      let encryptedNotes: EncryptedPayload | undefined = undefined;
      if (formNotes.trim()) {
        encryptedNotes = await encryptVaultText(formNotes.trim(), key);
      }

      const id = editingItem ? editingItem.id : `cred_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();

      const record: VaultCredentialItem = {
        id,
        service: formService,
        category: formCategory,
        title: formTitle.trim(),
        username: formUsername.trim(),
        accessUrl: formAccessUrl.trim() || undefined,
        encryptedPassword,
        encryptedNotes,
        createdAt: editingItem ? editingItem.createdAt : now,
        updatedAt: now,
      };

      let persisted = false;
      try {
        const apiUrl = getPublicApiUrl();
        const res = await fetch(`${apiUrl}/api/admin/vault`, {
          method: 'POST',
          credentials: 'include',
          headers: buildVaultAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(record),
        });
        persisted = res.ok;
        if (!res.ok) {
          setFormError('Não foi possível salvar o acesso. Tente novamente em instantes.');
        }
      } catch (netErr) {
        console.warn('[Vault] Falha de rede ao persistir no servidor:', netErr);
        setFormError('Sem conexão no momento. O acesso não foi salvo.');
      }

      // Só atualiza a tela depois da confirmação real do servidor.
      if (!persisted) return;

      setCredentials((prev) => {
        const next = editingItem ? prev.map((c) => (c.id === id ? record : c)) : [record, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_LOCAL_VAULT_KEY, JSON.stringify(next));
        }
        return next;
      });

      setDecryptedPasswords((prev) => ({ ...prev, [id]: formPassword.trim() }));
      setIsFormModalOpen(false);
      setEditingItem(null);
      broadcastAdminUpdate('vault', { source: 'panel' });
    } catch (err: any) {
      setFormError('Não foi possível salvar o acesso. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.id;

    try {
      setIsSubmitting(true);
      let persisted = false;
      try {
        const apiUrl = getPublicApiUrl();
        const res = await fetch(`${apiUrl}/api/admin/vault?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: buildVaultAuthHeaders(),
        });
        persisted = res.ok;
      } catch {}

      if (!persisted) {
        setItemToDelete(null);
        setFormError('Não foi possível excluir o acesso. Nada foi alterado.');
        return;
      }

      setCredentials((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_LOCAL_VAULT_KEY, JSON.stringify(next));
        }
        return next;
      });

      broadcastAdminUpdate('vault', { source: 'panel' });
      setItemToDelete(null);
    } catch (err) {
      console.error('Falha ao excluir credencial:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCredentials = useMemo(() => {
    const q = (searchTerm || externalSearchQuery).toLowerCase().trim();
    return credentials.filter((c) => {
      if (selectedCategory !== 'todos' && c.service !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.accessUrl || '').toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [credentials, selectedCategory, searchTerm, externalSearchQuery]);

  return {
    credentials,
    isLoading,
    hasVaultKey,
    vaultError,
    setVaultMasterKey,
    lockVault,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    decryptedPasswords,
    visiblePasswords,
    copiedId,
    isFormModalOpen,
    setIsFormModalOpen,
    editingItem,
    itemToDelete,
    setItemToDelete,
    isSubmitting,
    formService,
    setFormService,
    formTitle,
    setFormTitle,
    formCategory,
    setFormCategory,
    formUsername,
    setFormUsername,
    formPassword,
    setFormPassword,
    formAccessUrl,
    setFormAccessUrl,
    formError,
    showFormPassword,
    setShowFormPassword,
    loadCredentials,
    handleTogglePassword,
    handleCopyPassword,
    handleCopyUsername,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleGenerateStrongPassword,
    handleSaveCredential,
    handleConfirmDelete,
    filteredCredentials,
  };
}
