# Central de Deploy Nua Borges

1. Extraia todo o ZIP para uma pasta temporária.
2. Feche a Central de Deploy antiga.
3. Rode **Instalar.bat**. Depois, abra o atalho **Deploy Nua Borges** na Área de Trabalho.

O instalador atualiza a pasta Deploy_NuaBorges na Área de Trabalho e guarda cópias dos arquivos substituídos em uma pasta backup com a data. Ele aproveita o config.json e os logs existentes. Em uma instalação sem atalho, abra iniciar.bat na pasta instalada.

## Uso diário

- **Site + painel** seleciona o site público e o painel da Nua. **Todos** inclui a Central Dev. As caixas permitem selecionar qualquer combinação.
- **Publicar** usa a branch main dos projetos Cloudflare Pages. A opção padrão sincroniza o conteúdo e roda o build do projeto uma vez. **Rodar testes antes** executa typecheck e testes.
- **Ver plano** mostra o que seria executado. **Só gerar pacotes**, **Só rodar testes**, **Checar domínios** e **Conta Cloudflare** são ações independentes.
- **Reutilizar o último build** envia os pacotes gerados anteriormente por esta versão. Alterações no código ou no conteúdo posteriores ao build exigem uma nova compilação.
- **Publicar destinos pendentes** fica disponível após uma publicação parcial com outros destinos ainda aguardando. O painel revalida os pacotes antes de enviar. Se um upload terminou sem confirmação, confira o histórico daquele projeto no Cloudflare antes de repetir esse destino.
- **Domínio** abre o endereço de produção. **Versão** abre o link retornado pelo Cloudflare. Um alerta HTTP em um destino publicado fica visível junto do resultado do upload.
- **Histórico** inclui os logs antigos e os resumos das novas execuções. Use **Detalhado** para ver mais saída no console.

Ctrl + Enter publica, Ctrl + L abre o último log e Esc cancela a execução atual. Após cancelar durante um envio, consulte o resultado por destino.

A Central usa o Node.js 22 ou superior, o Wrangler instalado no projeto e a sessão Cloudflare disponível neste Windows. Se precisar ajustar caminhos ou domínios, edite project_dir e production_urls no config.json da pasta da Central. Os padrões são o projeto nuaborges/nuasite na Área de Trabalho, nuaborges.com.br, admin.nuaborges.com.br e admingeral.pages.dev.
