import AdminPage from '../page';

export function generateStaticParams() {
  return [
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
  ];
}

export default function AdminModulePage() {
  return <AdminPage />;
}
