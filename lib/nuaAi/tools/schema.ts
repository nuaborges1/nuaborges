/**
 * NUA IA — Schemas das Ferramentas da IA (OpenAPI / Gemini Function Declarations)
 * 
 * Define os parâmetros estritos e tipados para as funções que o Gemini pode chamar.
 */

export interface ToolParameterSchema {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description: string;
  items?: { type: string };
  properties?: Record<string, any>;
  required?: string[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, ToolParameterSchema>;
    required?: string[];
  };
}

export const ADMIN_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'list_content_summary',
    description: 'Consulta a lista de conteúdos, packs e produtos existentes no acervo com títulos, preços e status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          description: 'Filtro opcional: "all", "active" ou "draft".',
        },
      },
    },
  },
  {
    name: 'get_media_library',
    description: 'Consulta fotos e vídeos disponíveis no Cofre de Mídias para seleção em novos packs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filter: {
          type: 'STRING',
          description: 'Termo de busca ou categoria (ex: "praia", "ensaio", "vídeo").',
        },
        limit: {
          type: 'NUMBER',
          description: 'Número máximo de mídias para retornar (padrão 10).',
        },
      },
    },
  },
  {
    name: 'create_pack_draft',
    description: 'Cria um novo rascunho de Pack ou Conteúdo no acervo da Nua Borges. Operação segura salva em rascunho.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Título atraente e autoral do pack (ex: "Ensaio Especial Praia").',
        },
        price: {
          type: 'STRING',
          description: 'Valor formatado em reais (ex: "R$ 39,90").',
        },
        description: {
          type: 'STRING',
          description: 'Descrição ou chamada sensual e elegante para o pack.',
        },
        previewImages: {
          type: 'ARRAY',
          description: 'Lista de URLs de fotos para a galeria do pack.',
          items: { type: 'STRING' },
        },
        badge: {
          type: 'STRING',
          description: 'Selo visual opcional (ex: "EXCLUSIVO", "NOVIDADE", "4K UHD").',
        },
        duration: {
          type: 'STRING',
          description: 'Duração estimada caso contenha vídeos (ex: "12 Minutos").',
        },
      },
      required: ['title', 'price', 'description'],
    },
  },
  {
    name: 'update_draft_fields',
    description: 'Atualiza informações descritivas, preço, selo ou estado de um rascunho de pack existente no acervo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: {
          type: 'STRING',
          description: 'ID do produto ou rascunho a ser editado.',
        },
        title: {
          type: 'STRING',
          description: 'Novo título para o rascunho.',
        },
        price: {
          type: 'STRING',
          description: 'Novo preço formatado (ex: "R$ 49,90" ou "49.90").',
        },
        description: {
          type: 'STRING',
          description: 'Nova descrição ou texto promocional.',
        },
        badge: {
          type: 'STRING',
          description: 'Novo selo em destaque.',
        },
        active: {
          type: 'BOOLEAN',
          description: 'Define se o pack está ativo ou rascunho inativo.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_admin_content_fields',
    description: 'Atualiza campos de texto e configurações de seções do site no rascunho do painel (ex: na seção "hero", campos como "eyebrow" [Texto de Destaque no Topo], "title" [Seu Nome], "tagline" [Frase de Boas-Vindas], "description" [Breve Apresentação], "ctaText", "exploreText").',
    parameters: {
      type: 'OBJECT',
      properties: {
        section: {
          type: 'STRING',
          description: 'Seção a ser editada: "hero" (Início & Capa), "about" (Sobre Mim), "gallery" (Galeria), "header", "contact", "seo".',
        },
        fields: {
          type: 'OBJECT',
          description: 'Objeto contendo os campos a atualizar (ex: { eyebrow: "PLATAFORMA DA NUA" } ou { tagline: "Nova frase..." }).',
        },
      },
      required: ['section', 'fields'],
    },
  },
  {
    name: 'propose_sensitive_action',
    description: 'Prepara uma proposta formal para uma ação sensível (ex: Publicar no site público ou alterar preço publicado), gerando um card de aprovação para a administradora confirmar com 1 clique.',
    parameters: {
      type: 'OBJECT',
      properties: {
        actionType: {
          type: 'STRING',
          description: 'Tipo da ação: "publish_content" ou "update_published_price".',
        },
        targetId: {
          type: 'STRING',
          description: 'ID do item no acervo que será afetado.',
        },
        summary: {
          type: 'STRING',
          description: 'Explicação clara do que mudará no site para a administradora revisar.',
        },
        proposedChanges: {
          type: 'OBJECT',
          description: 'Objeto com os novos dados propostos (ex: { newPrice: "R$ 49,90" }).',
        },
      },
      required: ['actionType', 'targetId', 'summary'],
    },
  },
];
