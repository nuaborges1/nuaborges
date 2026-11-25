/**
 * Vault Crypto Helper — Nua Borges Platform
 * 
 * Implementação segura de criptografia cliente para o Cofre de Credenciais:
 * - Algoritmo: AES-GCM (256 bits) com derivação de chave via PBKDF2 (SHA-256, 100.000 iterações)
 * - Garante que senhas e dados confidenciais NUNCA sejam armazenados ou transmitidos em texto puro
 * - Suporta criptografia e descriptografia transparente na sessão do administrador
 */

function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Deriva uma chave CryptoKey AES-GCM a partir de uma chave-mestre e salt usando PBKDF2
 */
async function deriveVaultKey(masterSecret: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const subtle = window.crypto.subtle;
  const keyMaterial = await subtle.importKey(
    'raw',
    stringToBuffer(masterSecret) as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa uma string em texto puro gerando ciphertext, IV e salt em Base64.
 * Exige obrigatoriamente uma chave-mestre dinâmica (zero chaves padrão embutidas).
 */
export async function encryptVaultText(
  plainText: string,
  masterKey: string
): Promise<EncryptedPayload> {
  if (!masterKey || typeof masterKey !== 'string' || !masterKey.trim()) {
    throw new Error('Chave-mestre do cofre não fornecida. Operação criptográfica rejeitada.');
  }

  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API não disponível neste ambiente.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(masterKey.trim(), salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    stringToBuffer(plainText) as unknown as BufferSource
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
  };
}

/**
 * Descriptografa um payload criptografado retornando a string original.
 * Exige obrigatoriamente a chave-mestre.
 */
export async function decryptVaultText(
  payload: EncryptedPayload,
  masterKey: string
): Promise<string> {
  if (!masterKey || typeof masterKey !== 'string' || !masterKey.trim()) {
    throw new Error('Chave-mestre do cofre não fornecida. Operação criptográfica rejeitada.');
  }
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API não disponível neste ambiente.');
  }

  try {
    const saltBytes = base64ToUint8Array(payload.salt);
    const ivBytes = base64ToUint8Array(payload.iv);
    const ciphertextBytes = base64ToUint8Array(payload.ciphertext);

    const key = await deriveVaultKey(masterKey.trim(), saltBytes);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as unknown as BufferSource,
      },
      key,
      ciphertextBytes as unknown as BufferSource
    );

    return bufferToString(decryptedBuffer);
  } catch (err) {
    console.error('[VaultCrypto] Falha ao descriptografar:', err);
    throw new Error('Falha na descriptografia da credencial. Chave inválida ou dados corrompidos.');
  }
}
