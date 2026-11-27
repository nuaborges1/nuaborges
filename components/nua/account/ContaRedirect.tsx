'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCopy } from '@/lib/copy';

export function ContaRedirect() {
  const router = useRouter();
  const { copy } = useCopy();

  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`/conta${search}`);
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="w-7 h-7 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin" />
        <p className="text-[11px] font-mono uppercase tracking-[0.2em]">
          {copy.conta.redirectingLabel}
        </p>
      </div>
    </div>
  );
}
