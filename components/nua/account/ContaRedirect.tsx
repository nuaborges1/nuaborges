'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ContaRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`/conta${search}`);
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="w-7 h-7 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin" />
        <p className="text-[11px] font-mono uppercase tracking-[0.2em]">
          Redirecionando para Minha Conta...
        </p>
      </div>
    </div>
  );
}
