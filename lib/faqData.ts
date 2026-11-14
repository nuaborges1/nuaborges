// lib/faqData.ts — FAQ Unificado e Canônico da Nua Borges

export interface FaqItem {
  question: string;
  answer: string;
}

export const CANONICAL_FAQS: FaqItem[] = [
  {
    question: 'Aparece no extrato bancário?',
    answer:
      'Não. A cobrança é 100% discreta e sigilosa. No extrato do seu banco ou fatura do cartão, aparece apenas um nome genérico de processamento de tecnologia, sem qualquer menção a Nua Borges ou conteúdo adulto.',
  },
  {
    question: 'Como recebo o conteúdo após o pagamento?',
    answer:
      'A liberação é automática e imediata via PIX. Assim que o pagamento é identificado, o acesso ao conteúdo ou vídeo abre diretamente na sua tela e é mantido no seu cofre digital vitalício.',
  },
  {
    question: 'Qual a diferença entre obras avulsas e assinatura mensal?',
    answer:
      'Nas Obras Avulsas, você adquire apenas os ensaios ou vídeos 4K que escolher, pagando uma única vez sem mensalidades. Na Assinatura (Clube VIP / Privacy / OnlyFans), você tem acesso ilimitado a todo o acervo já produzido.',
  },
  {
    question: 'O pagamento é seguro e confidencial?',
    answer:
      'Sim, totalmente. O sistema utiliza criptografia de ponta a ponta e o QR Code do PIX é gerado diretamente pela instituição financeira credenciada, garantindo sigilo absoluto dos seus dados pessoais.',
  },
];
