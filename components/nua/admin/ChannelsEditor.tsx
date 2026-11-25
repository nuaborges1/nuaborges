/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import { AlertCircle, Crown, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { SiteContent, ChannelPlatformItem } from '@/lib/types';
import { PlatformChannelCard } from './channels/PlatformChannelCard';
import { InstagramChannelCard } from './channels/InstagramChannelCard';
import { ChannelsHeaderSettings } from './channels/ChannelsHeaderSettings';

interface ChannelsEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_ONLYFANS: ChannelPlatformItem = {
  title: 'OnlyFans',
  badge: 'INTERNACIONAL (USD)',
  description:
    'Acesso aos ensaios fotográficos completos em alta resolução, vídeos e produções autorais sem censura. Pagamento internacional em dólar.',
  tags: ['Ensaios Completos', 'Sem Censura', 'Produção Autoral'],
  buttonText: 'ACESSAR ONLYFANS (USD)',
  url: 'https://onlyfans.com/nuaborges',
  active: true,
};

const DEFAULT_PRIVACY: ChannelPlatformItem = {
  title: 'Privacy',
  badge: 'PIX & NACIONAL (R$)',
  description:
    'Acesso imediato com pagamento nacional via PIX ou cartão de crédito. Mesmo acervo completo com cobrança discreta.',
  tags: ['Pagamento em PIX', 'Acesso Imediato', 'Extrato Discreto'],
  buttonText: 'ACESSAR VIA PRIVACY (PIX)',
  url: 'https://privacy.com.br/checkout/nuaborges',
  active: true,
};

const DEFAULT_CLOSEFANS: ChannelPlatformItem = {
  title: 'Close Fans + Telegram',
  badge: 'CANAL VIP TELEGRAM',
  description:
    'Acesso pelo site e canal secreto VIP no Telegram com prévias, áudios e interação. Aceita PIX e cartões.',
  tags: ['Canal VIP Telegram', 'Áudios & Bastidores', 'PIX & Cartão'],
  buttonText: 'ENTRAR NO CLOSE FANS',
  url: 'https://close.fans/nuaborges',
  active: true,
};

export function ChannelsEditor({
  content,
  onChange,
  onAdministrativeChange,
}: ChannelsEditorProps) {
  const [showPageHeaderSettings, setShowPageHeaderSettings] = useState(false);
  const channels = content.channels;

  const onlyfans = channels?.onlyfans || DEFAULT_ONLYFANS;
  const privacy = channels?.privacy || DEFAULT_PRIVACY;
  const closefans = channels?.closefans || DEFAULT_CLOSEFANS;

  const updateChannels = (
    fields: Partial<typeof channels>,
    options?: { summary?: string; feedbackMessage?: string }
  ) => {
    if (onAdministrativeChange) {
      onAdministrativeChange(
        (prev) => ({
          ...prev,
          channels: { ...prev.channels, ...fields },
        }),
        {
          summary: options?.summary || 'Canais atualizados',
          feedbackMessage: options?.feedbackMessage || 'Canais atualizados com sucesso.',
        }
      );
    } else {
      onChange({
        ...content,
        channels: { ...channels, ...fields },
      });
    }
  };

  const isNoneActive =
    privacy.active === false &&
    onlyfans.active === false &&
    closefans.active === false;

  return (
    <div className="space-y-6">
      {/* Barra de Ações Rápidas dos Textos de Apresentação da Vitrine */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-white/[0.06]">
        <div>
          <span className="text-xs font-semibold text-white block">Canais Oficiais na Vitrine</span>
          <p className="text-[11px] text-zinc-400 font-light">
            Configure os links de assinatura, destaques e quais redes e plataformas VIP ficam visíveis.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPageHeaderSettings(!showPageHeaderSettings)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171821] hover:bg-[#20222d] text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5 text-[#843C52]" />
          <span>{showPageHeaderSettings ? 'Ocultar Textos da Seção' : 'Editar Textos da Seção'}</span>
          {showPageHeaderSettings ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>
      </div>

      {showPageHeaderSettings && (
        <ChannelsHeaderSettings
          channels={channels}
          onChange={updateChannels}
        />
      )}

      {/* Alerta de nenhum canal ativo */}
      {isNoneActive && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold block text-white text-xs">
              Nenhum canal de assinatura ativo
            </span>
            <span className="text-[11px] text-zinc-400 font-light">
              Ative pelo menos um canal para que os visitantes consigam assinar seus conteúdos no site.
            </span>
          </div>
        </div>
      )}

      {/* Seção 1: Assinaturas Pagas e Redes */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 px-1">
          <Crown className="w-3.5 h-3.5 text-[#843C52]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            Plataformas de Assinatura &amp; Redes Sociais
          </h3>
        </div>

        {/* Cards de Plataformas em Grid 2x2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlatformChannelCard
            title="Privacy"
            subtitle="Plataforma Nacional com PIX e Cartão"
            platform={privacy}
            badgePlaceholder="Ex: PIX & NACIONAL (R$)"
            urlPlaceholder="https://privacy.com.br/checkout/nuaborges"
            tagPlaceholder="Ex: Pagamento em PIX"
            onChange={(fields) =>
              updateChannels(
                { privacy: { ...privacy, ...fields } },
                {
                  summary: 'Privacy atualizado',
                  feedbackMessage:
                    fields.active !== undefined
                      ? fields.active
                        ? 'Privacy ativado no site.'
                        : 'Privacy ocultado do site.'
                      : 'Canal Privacy atualizado.',
                }
              )
            }
          />

          <PlatformChannelCard
            title="OnlyFans"
            subtitle="Plataforma Internacional em Dólar"
            platform={onlyfans}
            badgePlaceholder="Ex: INTERNACIONAL (USD)"
            urlPlaceholder="https://onlyfans.com/nuaborges"
            tagPlaceholder="Ex: Ensaios Completos"
            onChange={(fields) =>
              updateChannels(
                { onlyfans: { ...onlyfans, ...fields } },
                {
                  summary: 'OnlyFans atualizado',
                  feedbackMessage:
                    fields.active !== undefined
                      ? fields.active
                        ? 'OnlyFans ativado no site.'
                        : 'OnlyFans ocultado do site.'
                      : 'Canal OnlyFans atualizado.',
                }
              )
            }
          />

          <PlatformChannelCard
            title="Close Fans + Telegram"
            subtitle="Canal Secreto VIP e Comunidade"
            platform={closefans}
            badgePlaceholder="Ex: CANAL VIP TELEGRAM"
            urlPlaceholder="https://close.fans/nuaborges"
            tagPlaceholder="Ex: Canal VIP Telegram"
            onChange={(fields) =>
              updateChannels(
                { closefans: { ...closefans, ...fields } },
                {
                  summary: 'CloseFans atualizado',
                  feedbackMessage:
                    fields.active !== undefined
                      ? fields.active
                        ? 'CloseFans ativado no site.'
                        : 'CloseFans ocultado do site.'
                      : 'Canal CloseFans atualizado.',
                }
              )
            }
          />

          <InstagramChannelCard
            instagram={channels.instagram}
            onChange={(fields) =>
              updateChannels(
                { instagram: { ...channels.instagram, ...fields } },
                {
                  summary: 'Instagram atualizado',
                  feedbackMessage: 'Instagram atualizado.',
                }
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
