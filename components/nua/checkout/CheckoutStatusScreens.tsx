import React from 'react';
import { XCircle, Clock, RefreshCw } from 'lucide-react';

interface CheckoutStatusScreenProps {
  status: 'rejected' | 'expired';
  onRetry: () => void;
}

export function CheckoutStatusScreens({ status, onRetry }: CheckoutStatusScreenProps) {
  if (status === 'rejected') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
          <XCircle className="w-7 h-7" />
        </div>
        <div>
          <h4 className="font-serif text-xl text-white">Pagamento Recusado ou Cancelado</h4>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto font-light leading-relaxed">
            A instituição financeira informou que o Pix não pôde ser concluído. Nenhuma cobrança foi efetuada.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Gerar Nova Cobrança</span>
        </button>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <div>
          <h4 className="font-serif text-xl text-white">Chave Pix Expirada</h4>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto font-light leading-relaxed">
            O tempo de 15 minutos para pagamento esgotou. Gere um novo QR Code para concluir seu pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Gerar Novo QR Code</span>
        </button>
      </div>
    );
  }

  return null;
}
