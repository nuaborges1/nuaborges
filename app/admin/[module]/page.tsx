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
    { module: 'vitrine' },
    { module: 'conexoes' },
    { module: 'financeiro' },
    { module: 'contratos' },
    { module: 'cofre' },
    { module: 'configuracoes' },
    { module: 'mensalidade' },
    { module: 'player' },
    { module: 'ia' },
    { module: 'alertas' },
    { module: 'historico' },
  ];
}

export default function AdminModulePage() {
  return <AdminPage />;
}
