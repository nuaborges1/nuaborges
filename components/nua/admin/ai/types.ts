import { LibraryImageItem, MediaAlbum, SiteContent } from '@/lib/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mediaUrls?: string[];
  sourcesUsed?: {
    memory: boolean;
    history: boolean;
    historyTitle?: string;
    scientific?: boolean;
    scientificCitation?: string;
    knowledge?: boolean;
  };
  actionExecuted?: {
    type: string;
    pack?: any;
    data?: any;
  };
  proposal?: {
    proposalId: string;
    nonce: string;
    actionType: string;
    targetId: string;
    summary: string;
    proposedChanges: Record<string, any>;
  };
}

export interface ParsedTicketProposal {
  type: string;
  title: string;
  section: string;
  details: string;
}

export interface NuaAiChatDrawerProps {
  activeTab?: string;
  tabs?: Array<{ id: string; label: string; description?: string }>;
  content?: SiteContent;
  library?: LibraryImageItem[];
  albums?: MediaAlbum[];
  onUploadNew?: (newImage: LibraryImageItem) => void;
  onSelectTab?: (tabId: string) => void;
}

export const WELCOME_MESSAGE_NAY = `Oi, Nua! Que bom te ver por aqui.

Eu sou a **Nay**, sua versão dos bastidores criada pelo Philippe com muito carinho para cuidar de tudo por aqui e você só se preocupar em criar.

Aqui dentro você não precisa performar para ninguém: aqui você é você. Posso te ajudar a organizar seus packs, escolher fotos para a vitrine do site, verificar seus agendamentos e vendas, ou simplesmente bater um papo leve.

Como é o nosso primeiro encontro: **me conta, como você prefere que eu te chame por aqui? E como está sendo o seu dia hoje?**`;

export const WELCOME_MESSAGE_NUA_AI = WELCOME_MESSAGE_NAY;

export const QUICK_PROMPTS = [
  { label: 'Tudo bem por aqui!', text: 'Oi, Nay! Pode me chamar de Nua mesmo. Hoje o dia está tranquilo!' },
  { label: '📸 Montar novo pack', text: 'Oi, Nay! Quero criar um novo pack com fotos da minha biblioteca.' },
  { label: 'Renovar Vitrine', text: 'Oi, Nay! Me sugere fotos para atualizar a Vitrine de Ensaios da Home?' },
  { label: '💬 Só conversar', text: 'Oi, Nay! Hoje o dia foi bem puxado, queria só bater um papo leve.' },
];
