import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que você procura não existe ou foi movida.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center select-none overflow-hidden">
      {/* Glow ambiental de fundo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-[#f4a7b9]/[0.035] rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Marca d'água arquitetônica de fundo (sem risco de colisão com texto) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[12rem] sm:text-[18rem] md:text-[22rem] font-light leading-none text-white/[0.025] select-none pointer-events-none tabular-nums tracking-tighter"
        aria-hidden="true"
      >
        404
      </div>

      {/* Container principal com hierarquia clara e fluxo natural */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* Badge editorial */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9]" />
          <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.28em] uppercase">
            NUA BORGES
          </span>
        </div>

        {/* Numeral editorial no fluxo */}
        <div
          className="font-serif text-6xl sm:text-7xl md:text-8xl text-white/20 tabular-nums leading-none tracking-tight mb-4"
          aria-label="Código 404"
        >
          404
        </div>

        {/* Título principal */}
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-white font-normal tracking-tight leading-snug mb-3">
          Página não encontrada
        </h1>

        {/* Subtítulo explicativo */}
        <p className="text-zinc-400 text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-sm sm:max-w-md mb-8">
          O endereço que você acessou não existe, foi alterado ou está temporariamente indisponível.
        </p>

        {/* Linha divisória sutil com gradiente */}
        <div
          className="w-16 h-px bg-gradient-to-r from-transparent via-[#f4a7b9]/40 to-transparent mb-8"
          aria-hidden="true"
        />

        {/* Ações de navegação responsivas */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:shadow-[0_4px_24px_rgba(244,167,185,0.3)] text-center min-h-[44px] flex items-center justify-center"
          >
            Voltar ao início
          </Link>
          <Link
            href="/#galeria"
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.03] text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
          >
            Galeria
          </Link>
          <Link
            href="/#sobre-mim"
            className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.03] text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition-all duration-200 text-center min-h-[44px] flex items-center justify-center"
          >
            Sobre mim
          </Link>
        </div>
      </div>
    </div>
  );
}
