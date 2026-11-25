# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: publicFooter.spec.ts >> rodapé mantém duas ou quatro áreas alinhadas e sem overflow
- Location: tests\e2e\publicFooter.spec.ts:44:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('contentinfo', { name: 'Rodapé' }).getByRole('navigation', { name: 'Informações' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Nua Borges — Página Inicial" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e5]: Nua Borges
        - generic [ref=e6]: ♡
      - navigation "Navegação principal" [ref=e7]:
        - link "Início" [ref=e8] [cursor=pointer]:
          - /url: /
        - link "Avulsos" [ref=e10] [cursor=pointer]:
          - /url: /avulsos
        - link "Chamadas" [ref=e11] [cursor=pointer]:
          - /url: /chamadas
        - link "Personalizados" [ref=e12] [cursor=pointer]:
          - /url: /personalizados
        - link "Sobre mim" [ref=e13] [cursor=pointer]:
          - /url: /sobre
  - generic [ref=e15]:
    - main [ref=e16]:
      - generic [ref=e17]:
        - generic:
          - generic:
            - generic:
              - img "Nua Borges"
        - generic [ref=e18]:
          - generic [ref=e19]: PLATAFORMA OFICIAL
          - generic [ref=e20]:
            - heading "Nua Borges" [level=1] [ref=e21]
            - img "Nua Borges" [ref=e22]
          - paragraph [ref=e23]: “Onde o corpo é arte e o prazer é livre de culpas.”
          - paragraph [ref=e24]: Um olhar íntimo, sofisticado e sem rodeios sobre o desejo, a autoimagem e a liberdade feminina.
          - link "Acessar Acervo Exclusivo" [ref=e26] [cursor=pointer]:
            - /url: /acervo
            - generic [ref=e31]: →
        - generic [ref=e32]:
          - button "Ir para foto 1" [pressed] [ref=e33] [cursor=pointer]
          - button "Ir para foto 2" [ref=e35] [cursor=pointer]
          - button "Ir para foto 3" [ref=e37] [cursor=pointer]
          - button "Ir para foto 4" [ref=e39] [cursor=pointer]
        - generic [ref=e41]:
          - generic [ref=e42]: EXPLORE O MUNDO DA NUA ♥️
          - link "Explorar acervo de fotos" [ref=e43] [cursor=pointer]:
            - /url: "#lançamentos"
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]: ACERVO SOB DEMANDA
            - heading "Acervo Sob Demanda" [level=2] [ref=e55]
            - paragraph [ref=e56]: Escolha e adquira obras e produções unitárias sem necessidade de mensalidade. Acesso vitalício e cobrança 100% discreta.
          - link "Explorar todo o catálogo" [ref=e57] [cursor=pointer]:
            - /url: /avulsos
        - link "Lançamento 1 foto Ensaio Autoral QA Pack exclusivo de teste automatizado. Acervo Autoral • Acesso Privado Conhecer Obra" [ref=e62] [cursor=pointer]:
          - /url: /avulsos/teste
          - generic [ref=e63]: Lançamento
          - generic [ref=e69]:
            - generic [ref=e70]:
              - paragraph [ref=e71]: 1 foto
              - heading "Ensaio Autoral QA" [level=3] [ref=e72]
              - paragraph [ref=e73]: Pack exclusivo de teste automatizado.
            - generic [ref=e74]:
              - generic [ref=e75]: Acervo Autoral • Acesso Privado
              - generic [ref=e76]: Conhecer Obra
      - generic [ref=e82]:
        - generic [ref=e84]:
          - img "Nua Borges" [ref=e85]
          - generic [ref=e86]: Deixa de vergonha ♡
        - generic [ref=e88]:
          - generic [ref=e89]: MANIFESTO & BIOGRAFIA
          - heading "“A coragem de despir a vergonha.”" [level=3] [ref=e90]
          - paragraph [ref=e92]: Meu trabalho nasce do encontro entre a ciência da sexologia e a expressão fotográfica autoral. Acredito na desmistificação do prazer como ferramenta de autoconhecimento e dignidade.
          - link "Conheça a Nua" [ref=e94] [cursor=pointer]:
            - /url: /sobre
      - generic [ref=e99]:
        - generic [ref=e100]:
          - generic [ref=e101]:
            - generic [ref=e102]: GALERIA DE ENSAIOS
            - heading "Acervo Autoral" [level=2] [ref=e107]
            - paragraph [ref=e108]: Produções independentes sob luz natural, revelando a estética e a verdade do corpo.
          - link "Acervo Completo" [ref=e109] [cursor=pointer]:
            - /url: /acervo
        - region "Prévias do acervo" [ref=e113]:
          - generic [ref=e114]:
            - button "Luz & Silhueta" [ref=e115] [cursor=pointer]:
              - generic [ref=e116]:
                - paragraph [ref=e117]: Luz & Silhueta
                - paragraph [ref=e118]: Estudo autoral sobre contorno e naturalidade
            - button "Sombras Íntimas" [ref=e119] [cursor=pointer]:
              - generic [ref=e120]:
                - paragraph [ref=e121]: Sombras Íntimas
                - paragraph [ref=e122]: Linhas do corpo sob a penumbra suave
            - button "Pele & Textura" [ref=e123] [cursor=pointer]:
              - generic [ref=e124]:
                - paragraph [ref=e125]: Pele & Textura
                - paragraph [ref=e126]: Composição minimalista e toque
            - button "Presença & Olhar" [ref=e127] [cursor=pointer]:
              - generic [ref=e128]:
                - paragraph [ref=e129]: Presença & Olhar
                - paragraph [ref=e130]: Sensualidade desarmada e presença autêntica
      - generic [ref=e133]:
        - generic [ref=e134]:
          - generic [ref=e135]: FORMAS DE VIVER A NUA
          - heading "Três caminhos de acesso" [level=2] [ref=e136]
          - paragraph [ref=e137]: Escolha como deseja se conectar com o universo autoral de Nua Borges.
        - generic [ref=e138]:
          - generic [ref=e139]:
            - img "Acervo Completo" [ref=e141]
            - generic [ref=e143]:
              - generic [ref=e147]: Tudo, sem censura, todo mês
              - heading "Acervo Completo" [level=3] [ref=e148]
              - paragraph [ref=e149]: Acesso irrestrito e ilimitado a todos os ensaios, vídeos 4K e registros do clube privativo.
            - link "Acessar Clube VIP" [ref=e151] [cursor=pointer]:
              - /url: /acervo
          - generic [ref=e155]:
            - img "Obras Avulsas" [ref=e157]
            - generic [ref=e159]:
              - generic [ref=e163]: Escolha só o que te desperta
              - heading "Obras Avulsas" [level=3] [ref=e164]
              - paragraph [ref=e165]: Adquira produções e ensaios unitários de forma avulsa, sem mensalidade e com acesso vitalício.
            - link "Explorar Catálogo" [ref=e167] [cursor=pointer]:
              - /url: /avulsos
          - generic [ref=e171]:
            - img "Experiências Privativas" [ref=e173]
            - generic [ref=e175]:
              - generic [ref=e178]: Atendimento e encomendas sob medida
              - heading "Experiências Privativas" [level=3] [ref=e179]
              - paragraph [ref=e180]: Agende chamadas privativas 1-on-1 com total sigilo ou solicite fotos e vídeos personalizados.
            - link "Solicitar Atendimento" [ref=e182] [cursor=pointer]:
              - /url: /chamadas
      - generic [ref=e188]:
        - generic [ref=e189]:
          - generic [ref=e190]: PRIVACIDADE & DISCRIÇÃO
          - heading "Dúvidas frequentes" [level=2] [ref=e195]
          - paragraph [ref=e196]: Respostas claras sobre sigilo, segurança e formato de entrega.
        - generic [ref=e197]:
          - generic [ref=e199]:
            - button "Aparece no extrato bancário?" [ref=e200] [cursor=pointer]
            - paragraph [ref=e208]: A identificação da cobrança no extrato depende do banco e do meio de pagamento. Confira os dados exibidos no seu aplicativo bancário antes de confirmar o Pix.
          - button "Como recebo o conteúdo após o pagamento?" [ref=e211] [cursor=pointer]
          - button "Qual a diferença entre obras avulsas e assinatura mensal?" [ref=e218] [cursor=pointer]
          - button "O pagamento é seguro e confidencial?" [ref=e225] [cursor=pointer]
    - contentinfo "Rodapé" [ref=e230]:
      - generic [ref=e231]:
        - generic [ref=e232]:
          - generic [ref=e233]:
            - link "Nua Borges — Voltar ao início" [ref=e234] [cursor=pointer]:
              - /url: /
              - generic [ref=e235]: Nua Borges
              - generic [aria-hidden] [ref=e236]: ♡
            - generic [ref=e237]:
              - paragraph [ref=e238]: Educadora Sexual & Sexóloga em Formação
              - paragraph [ref=e239]: Corpo, relações e liberdade.
          - generic [ref=e240]:
            - generic [ref=e241]: Explore
            - navigation "Explore" [ref=e242]:
              - link "Início" [ref=e243] [cursor=pointer]:
                - /url: /
              - link "Acervo VIP" [ref=e245] [cursor=pointer]:
                - /url: /acervo
              - link "Avulsos" [ref=e247] [cursor=pointer]:
                - /url: /avulsos
              - link "Chamadas VIP" [ref=e249] [cursor=pointer]:
                - /url: /chamadas
              - link "Personalizados" [ref=e251] [cursor=pointer]:
                - /url: /personalizados
          - generic [ref=e253]:
            - generic [ref=e254]: Institucional
            - navigation "Institucional" [ref=e255]:
              - link "Sobre mim" [ref=e256] [cursor=pointer]:
                - /url: /sobre
              - link "Contato" [ref=e257] [cursor=pointer]:
                - /url: /contato
              - link "Termos de Uso" [ref=e258] [cursor=pointer]:
                - /url: /termos
              - link "Política de Privacidade" [ref=e259] [cursor=pointer]:
                - /url: /privacidade
              - link "Acesso privado" [ref=e260] [cursor=pointer]:
                - /url: /conta
          - generic [ref=e265]:
            - generic [ref=e266]: Plataformas
            - navigation "Plataformas" [ref=e267]:
              - link "Instagram @nuaborges" [ref=e268] [cursor=pointer]:
                - /url: https://www.instagram.com/nuaborges
                - generic [ref=e272]: "@nuaborges"
              - link "OnlyFans de Nua Borges" [ref=e273] [cursor=pointer]:
                - /url: https://onlyfans.com/nuaborges
                - generic [ref=e277]: OnlyFans
              - link "Privacy de Nua Borges" [ref=e278] [cursor=pointer]:
                - /url: https://privacy.com.br/checkout/nuaborges
                - generic [ref=e282]: Privacy
        - generic [ref=e283]:
          - generic [ref=e284]:
            - paragraph [ref=e285]: Nua Borges. Todos os direitos reservados.
            - paragraph [ref=e286]:
              - generic [ref=e287]: Deixa de vergonha
              - generic [aria-hidden] [ref=e288]: ♡
          - link "Desenvolvido por PHDEV.STORE" [ref=e290] [cursor=pointer]:
            - /url: https://phdev.store
            - generic [ref=e291]: Desenvolvido por
            - generic [ref=e292]: PHDEV.STORE
  - alert [ref=e297]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const qaPort = Number(process.env.QA_E2E_PORT || 3199);
  4   | test.use({ baseURL: `http://nua.localhost:${qaPort}` });
  5   | 
  6   | const destinations = [
  7   |   ['Início', '/'],
  8   |   ['Acervo VIP', '/acervo'],
  9   |   ['Avulsos', '/avulsos'],
  10  |   ['Chamadas VIP', '/chamadas'],
  11  |   ['Personalizados', '/personalizados'],
  12  |   ['Sobre mim', '/sobre'],
  13  |   ['Contato', '/contato'],
  14  |   ['Termos de Uso', '/termos'],
  15  |   ['Política de Privacidade', '/privacidade'],
  16  |   ['Acesso privado', '/conta'],
  17  | ] as const;
  18  | 
  19  | test('rodapé mantém os destinos públicos e o acesso privado sem links duplicados', async ({ page, request }) => {
  20  |   await page.goto('/');
  21  |   const footer = page.getByRole('contentinfo', { name: 'Rodapé' });
  22  | 
  23  |   for (const [label, href] of destinations) {
  24  |     await expect(footer.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
  25  |     const expectedCount = href === '/' ? 2 : 1;
  26  |     await expect(footer.locator('a[href="' + href + '"]')).toHaveCount(expectedCount);
  27  |     expect((await request.get(`http://127.0.0.1:${qaPort}${href}`)).ok(), href).toBe(true);
  28  |   }
  29  | 
  30  |   await expect(footer.getByRole('link', { name: 'Desenvolvido por PHDEV.STORE' })).toHaveAttribute('href', 'https://phdev.store');
  31  | 
  32  |   const privacy = footer.getByRole('link', { name: 'Política de Privacidade' });
  33  |   const privateAccess = footer.getByRole('link', { name: 'Acesso privado' });
  34  |   await privacy.focus();
  35  |   await page.keyboard.press('Tab');
  36  |   await expect(privateAccess).toBeFocused();
  37  |   await expect(privateAccess).toHaveCSS('outline-style', 'solid');
  38  |   await page.keyboard.press('Enter');
  39  |   await expect(page).toHaveURL(/\/conta$/);
  40  |   await expect(page.getByLabel('E-mail utilizado na compra')).toBeVisible();
  41  |   await expect(footer).toHaveCount(1);
  42  | });
  43  | 
  44  | test('rodapé mantém duas ou quatro áreas alinhadas e sem overflow', async ({ page }) => {
  45  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  46  |   await page.goto('/');
  47  |   const footer = page.getByRole('contentinfo', { name: 'Rodapé' });
  48  |   const explore = footer.getByRole('navigation', { name: 'Explore' });
  49  |   const information = footer.getByRole('navigation', { name: 'Informações' });
  50  |   const platforms = footer.getByRole('navigation', { name: 'Plataformas' });
  51  |   await expect(explore.getByRole('link', { name: 'Início', exact: true })).toHaveCSS('transition-duration', '0s');
  52  | 
  53  |   for (const width of [1440, 1024, 768, 390, 320]) {
  54  |     await page.setViewportSize({ width, height: 900 });
  55  |     const exploreBox = (await explore.boundingBox())!;
> 56  |     const infoBox = (await information.boundingBox())!;
      |                                        ^ Error: locator.boundingBox: Test timeout of 45000ms exceeded.
  57  |     const platformBox = (await platforms.boundingBox())!;
  58  |     expect(exploreBox.width).toBeGreaterThan(100);
  59  |     expect(infoBox.width).toBeGreaterThan(100);
  60  |     if (width >= 1024) {
  61  |       expect(exploreBox.y).toBeCloseTo(infoBox.y, 0);
  62  |       expect(infoBox.y).toBeCloseTo(platformBox.y, 0);
  63  |       expect(exploreBox.x).toBeLessThan(infoBox.x);
  64  |       expect(infoBox.x).toBeLessThan(platformBox.x);
  65  |     } else {
  66  |       expect(exploreBox.y).toBeCloseTo(infoBox.y, 0);
  67  |       expect(platformBox.y).toBeGreaterThan(infoBox.y);
  68  |     }
  69  | 
  70  |     const fits = await footer.evaluate((element) => element.scrollWidth <= element.clientWidth &&
  71  |       document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  72  |     expect(fits, width + ' px').toBe(true);
  73  |   }
  74  | });
  75  | 
  76  | test('rodapé aplica os dados publicados e oculta plataformas indisponíveis', async ({ page }) => {
  77  |   let showInstagram = true;
  78  |   await page.route('**/api/content/sync', (route) => route.fulfill({
  79  |     json: { content: {
  80  |       footer: {
  81  |         brandName: 'Marca publicada',
  82  |         role: showInstagram ? 'Descrição publicada' : 'Descrição atualizada',
  83  |         concept: 'Editorial publicado',
  84  |         copyrightText: '© Direitos personalizados',
  85  |         signOff: 'Assinatura publicada ♡',
  86  |       },
  87  |       institutional: {
  88  |         sectionTitle: 'Sobre o site',
  89  |         links: [
  90  |           { id: 'help', label: 'Ajuda publicada', active: true, url: 'https://example.org/ajuda', openInNewTab: true },
  91  |           { id: 'contact', label: 'Contato repetido', active: true, url: '/contato/' },
  92  |           { id: 'terms', label: 'Termos desativados', active: false, url: '/termos' },
  93  |         ],
  94  |       },
  95  |       channels: {
  96  |         instagram: { title: 'Instagram publicado', url: showInstagram ? 'https://www.instagram.com/nuaborges/' : '' },
  97  |         onlyfans: { title: 'OnlyFans desativado', url: 'https://onlyfans.com/nuaborges', active: false },
  98  |         privacy: { title: 'Privacy sem endereço', url: '', active: true },
  99  |         closefans: { title: 'Close Fans desativado', url: 'https://close.fans/nuaborges', active: false },
  100 |       },
  101 |     } },
  102 |   }));
  103 | 
  104 |   await page.goto('/');
  105 |   const footer = page.getByRole('contentinfo', { name: 'Rodapé' });
  106 |   await expect(footer).toContainText('Marca publicada');
  107 |   await expect(footer).toContainText('Descrição publicada');
  108 |   await expect(footer).toContainText('Editorial publicado');
  109 |   await expect(footer).toContainText('© Direitos personalizados');
  110 |   await expect(footer).toContainText('Assinatura publicada');
  111 |   await expect(footer).toContainText('♡');
  112 |   const information = footer.getByRole('navigation', { name: 'Sobre o site' });
  113 |   const help = information.getByRole('link', { name: 'Ajuda publicada' });
  114 |   await expect(help).toHaveAttribute('href', 'https://example.org/ajuda');
  115 |   await expect(help).toHaveAttribute('target', '_blank');
  116 |   await expect(information.getByRole('link', { name: /repetido|desativado/ })).toHaveCount(0);
  117 | 
  118 |   const platforms = footer.getByRole('navigation', { name: 'Plataformas' });
  119 |   await expect(platforms.getByRole('link', { name: 'Instagram publicado' })).toHaveAttribute('href', 'https://www.instagram.com/nuaborges/');
  120 |   await expect(platforms.getByRole('link')).toHaveCount(1);
  121 |   showInstagram = false;
  122 |   await page.reload();
  123 |   await expect(footer).toContainText('Descrição atualizada');
  124 |   await expect(platforms).toHaveCount(0);
  125 | });
  126 | 
```