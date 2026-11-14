import { LibraryImageItem, MediaAlbum } from '@/lib/types';

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
  library?: LibraryImageItem[];
  albums?: MediaAlbum[];
  onUploadNew?: (newImage: LibraryImageItem) => void;
  onSelectTab?: (tabId: string) => void;
}

export const WELCOME_MESSAGE_NUA_AI = `Oi, Nua! Que bom ter você por aqui.

Eu sou a **Nua IA**, sua assistente inteligente e parceira estratégica em todo o seu universo criativo e digital.

Aqui você pode conversar comigo com total liberdade sobre:
- **Sexologia & Educação Sexual**: Tire dúvidas teóricas, explore conceitos científicos, fisiologia, artigos e embasamentos técnicos para suas mentorias e posicionamento.
- **Criação & Roteiros**: Ideias autênticas de Reels, posts, carrosséis, newsletter, narrativas e temas envolventes para sua comunidade.
- **Seu Site & Painel Admin**: Pergunte onde editar fotos, textos, bio, redes ou como funciona qualquer cantinho da sua plataforma.
- **Solicitações de Melhorias para o Philippe**: Quer mudar algo no site, tem uma ideia nova ou notou algo no celular? É só me contar! Eu organizo o pedido e encaminho direto para a Central do Philippe para você.

Como posso te inspirar ou te ajudar hoje?`;

export const QUICK_PROMPTS = [
  { label: 'Sexologia & Ciência', text: 'Nua, me explica a diferença entre excitação e desejo responsivo segundo a ciência?' },
  { label: 'Ideia de Reel', text: 'Nua, me dá uma ideia de Reel autêntico e educativo para essa semana?' },
  { label: 'Onde mudo fotos?', text: 'Onde no painel administrativo eu consigo trocar as fotos da galeria?' },
  { label: 'Pedir ajuste ao Dev', text: 'Quero sugerir uma melhoria no visual da galeria para o celular.' },
];
