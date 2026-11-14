/**
 * NUA IA — Registro de Auditoria Append-Only
 * 
 * Registra todas as ações e tentativas executadas pela IA ou aprovadas pela administradora.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AuditLogEntry {
  timestamp: string;
  auditId: string;
  actor: string;
  source: 'nua_ai_assistant' | 'human_admin';
  action: string;
  resourceType: string;
  resourceId?: string;
  status: 'SUCCESS' | 'REJECTED' | 'FAILED' | 'PROPOSAL_GENERATED';
  riskLevel: 'LOW_RISK' | 'SENSITIVE' | 'PROHIBITED';
  details?: Record<string, any>;
  ip?: string;
  error?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'admin_audit_log.jsonl');

export function appendAuditLog(entry: Omit<AuditLogEntry, 'timestamp' | 'auditId'>): AuditLogEntry {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      auditId: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entry,
    };

    const line = JSON.stringify(fullEntry) + '\n';
    fs.appendFileSync(AUDIT_FILE, line, 'utf-8');
    return fullEntry;
  } catch (err) {
    console.error('[NuaAiAudit] Erro ao gravar registro de auditoria:', err);
    return {
      timestamp: new Date().toISOString(),
      auditId: `aud_err_${Date.now()}`,
      ...entry,
    };
  }
}

export function getRecentAuditLogs(limit = 50): AuditLogEntry[] {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const content = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: AuditLogEntry[] = [];
    for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
      try {
        entries.push(JSON.parse(lines[i]));
      } catch {}
    }
    return entries;
  } catch {
    return [];
  }
}
