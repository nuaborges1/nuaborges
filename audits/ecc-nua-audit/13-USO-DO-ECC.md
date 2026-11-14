# Uso do ECC

Checkout oficial separado em `C:/Users/Philippe/Desktop/nuaborges/_audit-ecc`, commit `b38be6a7f6350964d59328b52f0624e1d1d552d1`, manifesto versão 2.2.3. O repositório informa 281 skills, conector Chrome DevTools padrão e hook SessionStart. O manifesto/hook/MCP foram inspecionados; nenhum hook foi confiado ou executado.

O marketplace oficial `ecc` foi registrado via Codex CLI. Instalação do plugin foi rejeitada pelo auto-review por registrar hooks executáveis e MCP browser de forma persistente. Portanto ECC foi aplicado operacionalmente como skills lidas e usadas, porém plugin nativo não foi instalado.

| Skill | Caminho | Aplicação efetiva | Limite |
|---|---|---|---|
| security-review | `_audit-ecc/skills/security-review/SKILL.md` | checklist de secrets, auth, CSRF, XSS e handlers | exemplos genéricos adaptados |
| verification-loop | `_audit-ecc/skills/verification-loop/SKILL.md` | typecheck/lint/testes escolhidos, resultado distinto de produção | build/integrations omitidos por efeitos |
| search-first | `_audit-ecc/skills/search-first/SKILL.md` | inventário existente antes de recomendar componentes | tarefa de auditoria, sem instalação |
| security-scan | `_audit-ecc/skills/security-scan/SKILL.md` | considerado para configuração de agentes | AgentShield ausente; npx não executado |
| iterative-retrieval | `_audit-ecc/skills/iterative-retrieval/SKILL.md` | buscas progressivas e divisão por domínios | agente interrompido por quota |
| deployment-patterns | `_audit-ecc/skills/deployment-patterns/SKILL.md` | revisão de ambientes, headers, rollback/CI | configuração externa indisponível |
| backend-patterns, postgres-patterns, database-migrations | caminhos correspondentes em skills ECC | revisão de handlers e persistência | schema sem acesso |
| frontend-patterns, e2e-testing | caminhos correspondentes | cobertura por rotas e cliente | browser real não exercido |
| api-design, content-hash-cache-pattern | caminhos correspondentes | contratos e cache/media | aplicabilidade limitada |
| cost-aware-llm-pipeline | `_audit-ecc/skills/cost-aware-llm-pipeline/SKILL.md` | revisão de custos Gemini/IA | custos reais não disponíveis |

Nenhum pacote foi instalado e nenhum dado privado foi enviado ao ECC. A integração nativa permanece pendente de aprovação explícita após revisão isolada dos comandos.
