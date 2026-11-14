import { FileText, Shield, Scale, Heart, Info, ExternalLink } from 'lucide-react';
import { InstitutionalLinkItem } from '@/lib/types';

export const ICON_OPTIONS: { id: NonNullable<InstitutionalLinkItem['iconName']>; label: string; icon: any }[] = [
  { id: 'scale', label: 'Balança (Jurídico / Termos)', icon: Scale },
  { id: 'shield', label: 'Escudo (Privacidade / LGPD)', icon: Shield },
  { id: 'fileText', label: 'Documento (Regulamento / Artigo)', icon: FileText },
  { id: 'heart', label: 'Coração (Manifesto / Autoral)', icon: Heart },
  { id: 'external', label: 'Externo (Link de Terceiro)', icon: ExternalLink },
  { id: 'info', label: 'Informação (Avisos / FAQ)', icon: Info },
];
