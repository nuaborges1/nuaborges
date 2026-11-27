# NUA Protocol — Konohagakure Edition (PHDEV Assets & Provenance)

Documentação de procedência, licenciamento e organização dos assets exclusivos do console técnico **PHDEV**.

## Origem do pacote principal

- **Pacote fonte:** `NUA_Protocol_Konohagakure_Assets.zip` (33 arquivos totais).
- **Assets de runtime copiados para `public/phdev/konohagakure/` (31 arquivos):**
  - `backgrounds/`: `konoha.webp`, `konoha-dark.webp`, `konoha-blur.webp`
  - `cards/`: `kakashi.webp`, `minato.webp`, `kakuzu.webp`, `neji.webp`, `tobirama.webp`, `itachi.webp`, `madara.webp`, `naruto-baryon.webp`, `kaguya.webp`, `hagoromo.webp`
  - `banners/`: `peace-art.webp`, `pain-art.webp`
  - `effects/`: `embers.svg`, `leaf-red.svg`, `leaf-red-02.svg`, `leaf-red-03.svg`, `leaves-overlay.svg`
  - `icons/`: `byakugan.svg`, `hagoromo.svg`, `kunai.svg`, `mangekyou-itachi.svg`, `mangekyou-kakashi.svg`, `rinne-sharingan.svg`, `rinnegan.svg`, `sharingan.svg`, `uzumaki.svg`
  - `patterns/`: `asanoha.svg`, `seigaiha.svg`
- **Referência mantida fora de `public/` (2 arquivos):**
  - `docs/design/konohagakure/dashboard-aprovado.webp`
  - `docs/design/konohagakure/ASSETS-README.md`

## Assets complementares produzidos para esta implementação (4 SVGs)

Produzidos em SVG vetorial mínimo (`viewBox="0 0 64 64"` / `80 56`), auditados contra scripts, handlers e URLs externas:

| Arquivo | Uso | Justificativa |
| --- | --- | --- |
| `icons/kakuzu-stitch.svg` | P03 — KAKUZU | Ausente no ZIP; representa integridade financeira na mesma estética vetorial dos demais símbolos. |
| `icons/tobirama-suiton.svg` | P05 — TOBIRAMA | Ausente no ZIP; representa Suiton / engenharia e publicação na mesma estética vetorial. |
| `icons/akatsuki-cloud.svg` | Banner de incidente grave (PAIN) | Reproduz o emblema da nuvem à esquerda do banner na referência `dashboard-aprovado.webp`. |
| `icons/konoha-emblem.svg` | Emblema da sidebar PHDEV | Reproduz o emblema espiral carmesim no topo da sidebar na referência `dashboard-aprovado.webp`. |

## Isolamento de distribuição e aviso de licenciamento

- Os assets em `public/phdev/konohagakure/` são destinados **exclusivamente ao ambiente privado PHDEV** (`out-admin`) e são removidos do pacote do site público (`out-site`) durante `tools/prepareDeploys.mjs`.
- As artes fornecidas no ZIP foram geradas para personalização privada do painel técnico do desenvolvedor; os símbolos SVG são versões estilizadas, não arquivos oficiais nem licenciados comercialmente.
- **Restrição:** não apresentar como material oficialmente licenciado, não utilizar em divulgação comercial nem distribuir no site público.

## Divergências conceituais corrigidas em relação a `dashboard-aprovado.webp`

1. Exibição dos **9 protocolos oficiais** (`KAKASHI`, `MINATO`, `KAKUZU`, `NEJI`, `TOBIRAMA`, `ITACHI`, `MADARA`, `NARUTO`, `KAGUYA`) em vez dos 6 ilustrativos do mockup.
2. **HAGOROMO** posicionado em faixa dedicada de autoridade técnica transversal (`ROOT AUTHORITY`), separado dos 9 protocolos.
3. **KAGE BUNSHIN** removido; **NARUTO** representado com a arte `naruto-baryon.webp` e com status real da fila de recuperação (sem marcar `BARYON MODE` ativo sem ativação operacional).
4. **PAIN** não é um card/protocolo operacional — atua apenas como banner visual derivado de contenção crítica confirmada (`MADARA` ou `KAGUYA`).
5. Removidos botões fictícios de *play/stop* em protocolos contínuos; controles mutáveis existentes (ITACHI, MADARA, KAGUYA, flags de manutenção e revogação global) continuam exigindo confirmação de senha PHDEV via `/api/control/system`.
