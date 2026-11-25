import AdminPage from '../page';

export function generateStaticParams() {
  return [
    { module: 'dashboard' },
    { module: 'inicio' },
    { module: 'midias' },
    { module: 'biblioteca' },
    { module: 'seo' },
    { module: 'divulgacao' },
    { module: 'beta_player' },
    { module: 'beta_ia' },
    { module: 'conteudos' },
    { module: 'personalizados' },
    { module: 'chamadas' },
    { module: 'clientes' },
    { module: 'vitrine' },
    { module: 'conexoes' },
    { module: 'financeiro' },
    { module: 'contratos' },
    { module: 'configuracoes' },
    { module: 'mensalidade' },
    { module: 'player' },
    { module: 'ia' },
    { module: 'alertas' },
    { module: 'historico' },
    { module: 'avaliacoes' },
    { module: 'mail' },
  ];
}

export default function AdminModulePage() {
  return <AdminPage />;
}
