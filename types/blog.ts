export type TumblrPostType = 'text' | 'photo' | 'quote' | 'audio' | 'video' | 'ask' | 'chat';

export type BlogCategory =
  | 'Todos'
  | 'Confissões de Sexologia'
  | 'Diário Noturno'
  | 'Bastidores 35mm'
  | 'Pergunte à Nua (Asks)'
  | 'Trilhas & Áudios'
  | 'Vídeos & VHS';

export interface BlogPost {
  id: string;
  slug: string;                  // URL amigável
  postType: TumblrPostType;       // 'text' | 'photo' | 'quote' | 'audio' | 'video' | 'ask' | 'chat'
  title: string;                 // Título do post
  subtitle?: string;             // Subtítulo ou lead
  category: Exclude<BlogCategory, 'Todos'>;
  coverUrl?: string;             // Foto principal ou 35mm
  polaroidCaption?: string;      // Legenda manuscrita abaixo da foto
  content: string;               // Texto principal da confissão
  locationTime?: string;         // Ex: "Paris, 03:14 AM • Loft no Marais"
  weatherMood?: string;          // Ex: "Chuva fria na claraboia • Velas de sândalo"
  readingTimeMinutes: number;    // Minutos de leitura
  published: boolean;            // Status
  featured: boolean;             // Destaque fixado
  notesCount: number;            // Contador de "notes" clássico do Tumblr
  likesCount?: number;           // Alias de compatibilidade
  tags: string[];                // Cascata de hashtags narrativas (#desabafo #paris #35mm)
  createdAt: string;             // ISO Date
  updatedAt: string;             // ISO Date
  signOff?: string;              // "Deixa de vergonha ♡"
  author: {
    name: string;
    avatar: string;
    role?: string;
  };

  // Dados específicos para formato Quote
  quoteData?: {
    quote: string;
    source: string;
  };

  // Dados específicos para formato Audio
  audioData?: {
    songTitle: string;
    artist: string;
    albumArt: string;
    duration: string;
    audioUrl?: string;           // URL direta de áudio (MP3, WAV)
    audioSnippetUrl?: string;
  };

  // Dados específicos para formato Video
  videoData?: {
    videoUrl: string;            // URL direta do MP4/WebM ou embed
    posterUrl?: string;          // Capa/Thumbnail
    caption?: string;            // Legenda do vídeo
    duration?: string;           // Ex: "01:45"
    resolution?: string;         // Ex: "4K 60fps" ou "VHS 35mm"
  };

  // Dados específicos para formato Ask (Perguntas Anônimas)
  askData?: {
    askerName: string;
    question: string;
    answeredAt: string;
    askId?: string;              // ID da pergunta enviada
    responseFormat?: 'text' | 'video'; // Formato da resposta
  };

  // Dados específicos para formato Chat (Diálogos Íntimos)
  chatData?: Array<{
    speaker: string;
    text: string;
  }>;

  // Bloco VIP Secreto
  vipSeal?: {
    enabled: boolean;
    title: string;
    description: string;
    buttonText: string;
    link: string;
  };
}

export interface SubmittedAsk {
  id: string;
  question: string;
  askerName: string;
  anonymous: boolean;
  createdAt: string;
  answered?: boolean;
  answeredPostId?: string;
}
