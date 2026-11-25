// lib/faqData.ts — FAQ Unificado e Canônico da Nua Borges

export interface FaqItem {
  question: string;
  answer: string;
}

export const CANONICAL_FAQS: FaqItem[] = [
  {
    question: 'Aparece no extrato bancário?',
    answer:
      'A identificação da cobrança no extrato depende do banco e do meio de pagamento. Confira os dados exibidos no seu aplicativo bancário antes de confirmar o Pix.',
  },
  {
    question: 'Como recebo o conteúdo após o pagamento?',
    answer:
      'Depois que o pagamento for confirmado, você recebe por e-mail as instruções para acessar a compra no Cofre.',
  },
  {
    question: 'Qual a diferença entre obras avulsas e assinatura mensal?',
    answer:
      'Nas obras avulsas, você compra a produção que escolher em pagamento único. Na assinatura, o acesso depende do plano e das condições da plataforma escolhida.',
  },
  {
    question: 'O pagamento é seguro e confidencial?',
    answer:
      'O site gera o Pix para o seu pedido. Você confirma o pagamento no aplicativo do seu banco. Veja na Política de Privacidade como o site trata os dados da compra.',
  },
];
