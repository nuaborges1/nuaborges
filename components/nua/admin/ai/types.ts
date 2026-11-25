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

export const WELCOME_MESSAGE_NAY = `Oi, Nua! Que bom te ver por aqui. ☕

Eu sou a **Nay**, sua parceira de bastidores para cuidar da organização do painel enquanto você foca na sua arte.

Posso montar packs com fotos da sua biblioteca, atualizar a vitrine do site, consultar vendas, personalizados e chamadas VIP, ou ajustar sua agenda com total segurança. Como posso te ajudar hoje?`;

export const WELCOME_MESSAGE_NUA_AI = WELCOME_MESSAGE_NAY;

export const QUICK_PROMPTS = [
  { label: '📊 Vendas e agenda', text: 'Oi, Nay! Me faz um resumo das minhas vendas, personalizados pendentes e próximas chamadas.' },
  { label: '📸 Montar novo pack', text: 'Oi, Nay! Quero criar um novo pack com fotos da minha biblioteca.' },
  { label: '🌿 Renovar Vitrine', text: 'Oi, Nay! Me sugere fotos para atualizar a Vitrine de Ensaios da página inicial?' },
  { label: '💬 Só conversar', text: 'Oi, Nay! Hoje o dia foi bem puxado, queria só bater um papo leve.' },
];
