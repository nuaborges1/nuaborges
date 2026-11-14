# Testes e verificações

| Verificação | Comando/método | Resultado | Limite |
|---|---|---|---|
| Tipos | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | exit 0 | configuração principal; não compila Pages Functions |
| Lint | ESLint sobre app/components/lib/functions/tests/types | 0 erros, 5 avisos | 543 arquivos; JSON completo em evidence |
| Segurança estática existente | `node --test scripts/security-audit.test.mjs` | 25/25 | inclui lógica isolada; não prova deploy |
| Contrato/pagamentos/validação | `node --test scripts/checkout-unified.test.mjs scripts/audit-validation.test.mjs` | consultar log anexado | asserções por substring e lógica mockada; não é integração |
| Prova webhook/checkout | harness sintético evidence/payments-proof.cjs | 8 cenários reproduzidos | stubs, sem rede nem gateway |
| Gateway | harness sintético evidence/security-local.cjs | 7 cenários; 475 decisões | encaminhamento middleware, não todos os handlers |

Arquivo de log de testes: `evidence/existing-tests.log`. Não foi executado `npm run build`: Next config/build pode inicializar serviços e scripts de build podem sincronizar dados externos, limpar saídas preexistentes ou consumir arquivos locais. Teste persistência foi excluído: habilita escrita em Supabase/JSON e explicitamente permite mutações destrutivas. Teste B2 PUT/GET/DELETE foi excluído. Playwright/produção e envio de mensagem não foram executados.

ECC verification-loop recomenda cobertura, mas não foi alegada cobertura inexistente. Testes que usam Map, fixture, regex ou stub são evidência apenas da condição representada.
