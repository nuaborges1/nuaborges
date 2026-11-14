import React from 'react';
import { AdminModuleId } from '../AdminSidebar';
import { SiteContent } from '@/lib/types';

export interface SpotlightItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'action' | 'metric' | 'content' | 'order' | 'ai';
  categoryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleId?: AdminModuleId;
  subAction?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'info';
  onExecute?: () => void;
}

export interface NuaSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleId: AdminModuleId, subAction?: string) => void;
  content?: SiteContent | null;
}

export interface StaticAction {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  moduleId: AdminModuleId;
  subAction?: string;
  icon: React.ComponentType<{ className?: string }>;
}
