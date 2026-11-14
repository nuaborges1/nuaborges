export interface KnowledgeItem {
  id: string;
  category: 'branding' | 'communication' | 'portal' | 'design' | 'editorial' | 'site_page' | 'site_section' | 'admin_tab' | 'admin_mapping';
  title: string;
  content: string;
  confidence: number;
  status: 'active' | 'archived';
  origin: string;
  updatedAt: string;
  version: number;
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: string;
  items: KnowledgeItem[];
}

export interface SiteAdminKnowledgeBase {
  version: string;
  lastUpdated: string;
  scope: string;
  excludedScope: string[];
  description: string;
  brand: {
    name: string;
    monogram: string;
    profession: string;
    concept: string;
    signOff: string;
    palette: Record<string, string>;
    rules: string[];
  };
  publicSite: {
    url: string;
    pages: Array<{
      id: string;
      name: string;
      route: string;
      purpose: string;
      orderOfSections?: string[];
      sections?: Record<string, any>;
      categories?: string[];
      interactiveFeatures?: string[];
      keyPoints?: string[];
      adminEditable?: string;
    }>;
  };
  clientAdmin: {
    url: string;
    name: string;
    purpose: string;
    accessControl: string;
    headerControls: Record<string, any>;
    tabs: Array<{
      id: string;
      label: string;
      purpose: string;
      fields?: any[];
      buttons?: string[];
      features?: string[];
      effectOnSite: string;
    }>;
    assistantDrawer: Record<string, any>;
  };
  adminToSiteMapping: Array<{
    adminTab: string;
    field: string;
    effect: string;
    siteLocation: string;
    editableByClient: boolean;
    requiresPublish: boolean;
  }>;
  faqCatalog: Array<{
    question: string;
    answer: string;
  }>;
}
