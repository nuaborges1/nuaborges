'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function StatusRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      router.replace(`/chamadas/reserva?token=${encodeURIComponent(token)}`);
    } else {
      router.replace('/chamadas');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <Loader2 className="w-8 h-8 text-[#90364B] animate-spin mb-3" />
      <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Redirecionando para o seu voucher...</p>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={null}>
      <StatusRedirect />
    </Suspense>
  );
}
