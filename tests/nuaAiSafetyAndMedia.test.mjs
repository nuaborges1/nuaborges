/**
 * tests/nuaAiSafetyAndMedia.test.mjs
 *
 * Testes unitários para:
 * 1. Regras de Segurança Operacional (operationalSafety.mjs)
 * 2. Proteção contra destruição em massa (Anti-Purge e Anti-Cagada)
 * 3. Validação de ferramentas sensíveis
 * 4. Verificação de remoção do slogan repetitivo nas respostas da IA
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  isMassDestructionIntent,
  getProtectiveRefusalResponse,
  validateToolSafety,
  OPERATIONAL_SAFETY_PROMPT_RULES,
} from '../lib/nuaAi/rules/operationalSafety.mjs';

describe('Nua IA - Regras de Segurança Operacional & Blindagem', () => {
  test('isMassDestructionIntent: detecta comandos perigosos de exclusão em massa', () => {
    assert.equal(isMassDestructionIntent('apaga tudo do site'), true);
    assert.equal(isMassDestructionIntent('deleta todas as fotos'), true);
    assert.equal(isMassDestructionIntent('limpa o banco de dados'), true);
    assert.equal(isMassDestructionIntent('exclui todos os packs'), true);
    assert.equal(isMassDestructionIntent('drop table site_content'), true);
    assert.equal(isMassDestructionIntent('formata o painel'), true);
    assert.equal(isMassDestructionIntent('DELETE FROM orders'), true);
  });

  test('isMassDestructionIntent: permite comandos normais de trabalho', () => {
    assert.equal(isMassDestructionIntent('mostre as fotos da biblioteca'), false);
    assert.equal(isMassDestructionIntent('crie um novo pack chamado Segredos ao Luar'), false);
    assert.equal(isMassDestructionIntent('remova o ensaio 2 da vitrine'), false);
    assert.equal(isMassDestructionIntent('quais são os pedidos pendentes de hoje?'), false);
    assert.equal(isMassDestructionIntent('bloqueie o dia 20 de dezembro na agenda'), false);
  });

  test('getProtectiveRefusalResponse: retorna mensagem acolhedora sem jargões frios', () => {
    const refusal = getProtectiveRefusalResponse('apaga tudo');
    assert.match(refusal, /total segurança/i);
    assert.match(refusal, /não posso realizar exclusões em massa/i);
    assert.match(refusal, /cartão de confirmação individual/i);
  });

  test('validateToolSafety: bloqueia tentativa de excluir múltiplas mídias de uma vez', () => {
    const single = validateToolSafety('delete_media_file', { id: 'media-1' });
    assert.equal(single.safe, true);

    const multiple = validateToolSafety('delete_media_file', { ids: ['media-1', 'media-2'] });
    assert.equal(multiple.safe, false);
    assert.match(multiple.reason, /1 por vez/i);
  });

  test('adminAssistant: prompt não contém slogan repetitivo como assinatura obrigatória', () => {
    const assistantSource = readFileSync(resolve('lib/nuaAi/adminAssistant.mjs'), 'utf-8');
    // Não pode conter: Assinatura e carinho oficial da marca: "Deixa de vergonha ♡"
    assert.equal(
      assistantSource.includes('Assinatura e carinho oficial da marca: "Deixa de vergonha ♡"'),
      false,
      'A assinatura repetitiva "Deixa de vergonha ♡" deve ter sido removida do prompt da IA'
    );
    // Deve conter instrução explícita de proibição de slogan repetitivo
    assert.match(assistantSource, /NUNCA repita ou termine mensagens com slogans ou assinaturas repetitivas/i);
    // Deve conter instrução de miniaturas visuais
    assert.match(assistantSource, /Miniaturas Visuais Obrigatórias para Mídias/i);
  });

  test('functions/api/content/sync.ts: não possui .catch em PostgrestBuilder do Supabase', () => {
    const syncSource = readFileSync(resolve('functions/api/content/sync.ts'), 'utf-8');
    assert.equal(
      syncSource.includes(".insert({\n          content_key: KV_PRIVATE_CONTENT_KEY,\n          snapshot: rawContent,\n        }).catch("),
      false,
      'O .catch() indevido em supabase.from(...).insert(...) foi corrigido para try/catch'
    );
    assert.match(syncSource, /await supabase\.from\('content_backups'\)\.insert/);
  });
});
