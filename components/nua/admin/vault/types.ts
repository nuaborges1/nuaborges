import React from 'react';
import {
  Server,
  Mail,
  ShieldCheck,
  CreditCard,
  Cloud,
  Globe,
} from 'lucide-react';
import { EncryptedPayload } from '@/lib/vaultCrypto';

export interface VaultCredentialItem {
  id: string;
  service: string;
  category: string;
  title: string;
  username: string;
  accessUrl?: string;
  encryptedPassword: EncryptedPayload;
  encryptedNotes?: EncryptedPayload;
  createdAt: string;
  updatedAt: string;
}

export const STORAGE_LOCAL_VAULT_KEY = 'nua_admin_vault_credentials_v1';

export interface ServicePreset {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  defaultTitle: string;
  defaultUrl: string;
  color: string;
}

export const SERVICE_PRESETS: ServicePreset[] = [
  {
    id: 'hostinger',
    name: 'Hostinger',
    category: 'Hospedagem & E-mail',
    icon: Server,
    defaultTitle: 'E-mail Titan / Painel Hostinger',
    defaultUrl: 'https://mail.hostinger.com',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    category: 'E-mail Pessoal / Negócios',
    icon: Mail,
    defaultTitle: 'Conta Yahoo Mail',
    defaultUrl: 'https://mail.yahoo.com',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'admin',
    name: 'Painel Administrativo',
    category: 'Acesso Mestre',
    icon: ShieldCheck,
    defaultTitle: 'Acesso Administrativo Nua Borges',
    defaultUrl: '/admin',
    color: 'text-[#f4a7b9] bg-[#f4a7b9]/10 border-[#f4a7b9]/20',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Gateway de Pagamentos',
    icon: CreditCard,
    defaultTitle: 'Painel Comercial Stripe',
    defaultUrl: 'https://dashboard.stripe.com',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    category: 'DNS & CDN',
    icon: Cloud,
    defaultTitle: 'Painel Cloudflare DNS & Segurança',
    defaultUrl: 'https://dash.cloudflare.com',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'outros',
    name: 'Outro Serviço',
    category: 'Serviços Gerais',
    icon: Globe,
    defaultTitle: 'Conta de Serviço',
    defaultUrl: '',
    color: 'text-zinc-300 bg-white/5 border-white/10',
  },
];
