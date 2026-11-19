/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

const EASE = [0.32, 0.72, 0, 1] as const;

const QUESTIONS = [
  {
    q: 'Aparece algo no meu extrato?',
    a: 'Não aparece o nome da Nua nem nada explícito. A cobrança chega com uma descrição neutra, tanto no PIX quanto no cartão.',
  },
  {
    q: 'Como eu recebo o conteúdo?',
    a: 'Assim que o pagamento é confirmado, o acesso é liberado na hora e fica salvo para você voltar quando quiser.',
  },
  {
    q: 'Qual a diferença entre assinatura e obra avulsa?',
    a: 'A assinatura libera todo o acervo e as novidades do mês. A obra avulsa é uma compra única, só daquele ensaio ou vídeo, sem mensalidade.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. O pagamento é processado por plataformas oficiais, e seus dados nunca são compartilhados ou expostos.',
  },
];

/** Dúvidas rápidas — tira as objeções de quem está quase decidindo. */
export function HomeFaq() {
  return (
    <section id="duvidas" className="relative bg-black py-24 sm:py-32 border-t border-white/[0.05]">
      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="md:col-span-4"
        >
          <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
            Discrição
          </span>
          <h2 className="mt-4 font-serif text-[2.3rem] sm:text-5xl text-white tracking-tight leading-[1.04]">
            Dúvidas rápidas
          </h2>
          <p className="mt-3 text-sm font-light text-zinc-400 leading-relaxed">
            Tudo o que você precisa saber antes de chegar mais perto.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="md:col-span-8 divide-y divide-white/[0.07] border-y border-white/[0.07]"
        >
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group py-5 sm:py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                <span className="font-serif text-lg sm:text-xl text-zinc-100 group-open:text-[#90364B] transition-colors">
                  {item.q}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45 group-open:border-[#661C30]/50">
                  <Plus className="w-3.5 h-3.5 text-zinc-300" />
                </span>
              </summary>
              <p className="mt-3 max-w-[60ch] text-sm sm:text-[15px] font-light text-zinc-400 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
