import AdminPage from '../../page';

export function generateStaticParams() {
  return [
    { slug: 'kakashi' },
    { slug: 'minato' },
    { slug: 'kakuzu' },
    { slug: 'neji' },
    { slug: 'tobirama' },
    { slug: 'itachi' },
    { slug: 'madara' },
    { slug: 'naruto' },
    { slug: 'kaguya' },
    { slug: 'hagoromo' },
  ];
}

export default function AdminProtocolDetailRoute() {
  return <AdminPage />;
}
