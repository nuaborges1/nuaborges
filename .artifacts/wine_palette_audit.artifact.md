# Auditoria de Paleta de Cores: Transição para Vinho Maduro (Nua Borges)

> [!IMPORTANT]
> **Status da Sessão:** Modo de Discussão/Planejamento. **Nenhum arquivo de código foi ou será editado** até a sua aprovação explícita desta proposta de paleta.

---

## 1. Diagnóstico do Problema Visual ("Cores Apagadas / Sumindo")

Com base nos testes e nas capturas de tela enviadas, a aplicação do tom de vinho puro (`#82233f`) gerou dois efeitos colaterais visuais que empobreceram a interface comparado à identidade original:

1. **Baixo Contraste no Fundo Preto (Luminância Insuficiente):**
   O tom de vinho escuro puro misturou-se com o fundo obsidiana (`#000000` / `#09090b`), fazendo com que ícones, *eyebrows* e bordas sutis perdessem destaque visual ("sumissem").
2. **Perda de Contraste nos Botões Principais (Texto Branco vs. Texto Preto):**
   Na identidade visual original de luxo da Nua Borges, os botões de destaque utilizavam fundo vibrante com **texto preto de alto contraste (`text-zinc-950` / `text-black`)**, o que criava um ponto focal magnético e elegante. Ao mudar para botões escuros com texto branco ou vinho escuro, o botão perdeu o brilho e o impacto de conversão.
3. **Ausência de uma Paleta Escalonada:**
   O projeto utilizou uma cor única em vez de uma **escala harmônica de tons de vinho** (do vinho profundo de fundo até o vinho vibrante de destaque e o rosa-vinho suave para brilhos/glows).

---

## 2. Proposta de Nova Paleta "Vinho Maduro & Luxo" (Multi-Tone Palette)

Para resolver a sensação de "apagado" mantendo a maturidade e a sofisticação exigidas, propomos uma **paleta de 4 tons de vinho escalonados** com contraste otimizado para fundos pretos:

| Token / Nome | Código Hex / RGBA | Aplicação Visual Proposta |
| :--- | :--- | :--- |
| **`--wine-deep`** (Base Escura) | `#6b172f` | Fundos de cards elevados, sombras densas e estados *active*. |
| **`--wine-primary`** (Estrutural) | `#962c4a` | Bordas principais, ícones secundários e textos de destaque (*eyebrows*). |
| **`--wine-vibrant`** (Destaque / CTA) | `#c2416c` | **Fundo dos botões principais**, com **texto preto (`text-zinc-950`)** para contraste máximo e luxo. |
| **`--wine-glow`** (Luz Ambiente) | `rgba(194, 65, 108, 0.18)` | Efeitos de desfoque (*blur*), halos de luz e fundos translúcidos de badges. |

---

## 3. Diretrizes de Correção (Aprovadas para Discussão)

1. **Retorno do Texto Preto nos Botões Principais:**
   - Todos os botões de conversão e CTAs principais (`.btn-primary`, botões de acervo, PIX e VIP) usarão fundo `--wine-vibrant` (`#c2416c`) com **texto em preto profundo (`text-zinc-950 font-bold`)**, garantindo leitura imediata e alto impacto visual sem parecer apagado.
2. **Paleta de Vinho Escalonada:**
   - Ícones e títulos secundários utilizarão `--wine-primary` (`#962c4a`) para garantir legibilidade perfeita contra o fundo preto.
   - Brilhos de fundo (*glows*) usarão `--wine-glow` para manter o ar intimista e sensual da marca.
3. **Preservação do Minimalismo:**
   - Nenhum elemento será exagerado; o objetivo é restaurar o brilho executivo e elegante que a marca Nua Borges exige.

---
*Aguardando sua avaliação e aprovação para aplicar esta paleta estruturada.*
