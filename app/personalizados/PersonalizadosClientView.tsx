/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { LazyCheckoutModal } from '@/components/nua/site/LazyCheckoutModal';
import type { UniversalCheckoutContext } from '@/components/nua/checkout/types';
import { usePublishedContent } from '@/lib/contentStore';
import {
  DEFAULT_PERSONALIZADOS_SETTINGS,
  PersonalizadosSettings,
  PersonalizadoOrder,
  calculateOrderPrice,
  formatCurrencyBrl,
  DeliveryChannel,
} from '@/lib/personalizadosCanonical';
import {
  submitPersonalizadoOrder,
} from '@/lib/services/nua/personalizadosService';
import { fetchCustomerSession } from '@/lib/nuaIdClient';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { PersonalizadosPhotoCard } from '@/components/nua/personalizados/PersonalizadosPhotoCard';
import { PersonalizadosVideoCard } from '@/components/nua/personalizados/PersonalizadosVideoCard';
import { PersonalizadosPreferencesCard } from '@/components/nua/personalizados/PersonalizadosPreferencesCard';
import { MobilePurchaseSteps, focusMobilePurchaseStep } from '@/components/nua/site/MobilePurchaseSteps';
import {
  PersonalizadosOrderSummaryCard,
  PersonalizadosFinalizationCard,
} from '@/components/nua/personalizados/PersonalizadosOrderSummaryCard';

export function PersonalizadosClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const router = useRouter();
  const content = usePublishedContent(initialContent);
  const [step, setStep] = useState(0);
  const stepLabels = ['Monte seu pedido', 'Detalhes da produção', 'Revisar e pagar'];
  const changeStep = (next: number) => {
    setStep(next);
    focusMobilePurchaseStep();
  };
  const [contactOpen, setContactOpen] = useState(false);

  // Carrega configurações
  const settings: PersonalizadosSettings = useMemo(() => {
    return content.personalizados || DEFAULT_PERSONALIZADOS_SETTINGS;
  }, [content.personalizados]);

  // Estados da Calculadora
  const [photoCount, setPhotoCount] = useState<number>(settings.minPhotos || 5);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('vid_none');

  // Sincroniza photoCount caso o CMS altere minPhotos/maxPhotos após hidratação
  useEffect(() => {
    setPhotoCount((prev) => {
      if (prev === 0) return 0;
      const min = Math.max(1, settings.minPhotos || 1);
      const max = Math.max(min, settings.maxPhotos || 50);
      if (prev < min) return min;
      if (prev > max) return max;
      return prev;
    });
  }, [settings.minPhotos, settings.maxPhotos]);
  const [mentionName, setMentionName] = useState<boolean>(false);
  const [express24h, setExpress24h] = useState<boolean>(false);
  const deliveryChannel: DeliveryChannel = settings.deliveryMethods.vault || !settings.deliveryMethods.telegram ? "vault" : "telegram";

  // Formulário do Cliente
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [briefing, setBriefing] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pré-preenche automaticamente nome e e-mail se o cliente já estiver logado no NUA ID
  useEffect(() => {
    let mounted = true;
    fetchCustomerSession()
      .then((res) => {
        if (!mounted || !res.ok || !res.data?.authenticated || !res.data.profile) return;
        const prof = res.data.profile;
        setClientName((prev) => prev || prof.displayName || '');
        setClientContact((prev) => prev || prof.email || '');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Estados de Envio
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PersonalizadoOrder | null>(null);



  // Cálculo de Preços em Tempo Real
  const priceDetails = useMemo(() => {
    return calculateOrderPrice(photoCount, selectedVideoId, mentionName, express24h, settings);
  }, [photoCount, selectedVideoId, mentionName, express24h, settings]);

  // Contexto para o Modal Universal de Pagamento Compartilhado
  const personalizadoContext: UniversalCheckoutContext | null = useMemo(() => {
    if (!createdOrder) return null;
    const details = [
      { label: 'Fotos Sob Medida', value: `${createdOrder.photoCount} fotos em alta resolução` },
    ];
    if (createdOrder.videoOptionId && createdOrder.videoOptionId !== 'vid_none') {
      const vidOption = settings.videoOptions.find((v) => v.id === createdOrder.videoOptionId);
      const label = vidOption ? vidOption.label : `${createdOrder.videoDurationMinutes} min`;
      details.push({
        label: 'Vídeo Exclusivo',
        value: label,
      });
    }
    if (createdOrder.mentionName) {
      details.push({ label: 'Menção Nominal', value: 'Nua falará seu nome' });
    }
    if (createdOrder.express24h) {
      details.push({ label: 'Entrega Prioritária', value: 'Em até 24 horas' });
    }
    details.push({
      label: 'Canal de Entrega',
      value: createdOrder.deliveryChannel === "vault" ? "Cofre do site" : "Telegram",
    });

    return {
      type: 'personalizado',
      id: createdOrder.id,
      title: 'Ensaio Sob Medida Privativo',
      subtitle: `Produção autoral para ${createdOrder.clientName}`,
      priceFormatted: formatCurrencyBrl(createdOrder.totalPrice),
      numericPrice: createdOrder.totalPrice,
      badge: 'Produção Exclusiva',
      details,
      accessUrl: `/personalizados/pedido?token=${createdOrder.publicToken}`,
      accessButtonText: 'Acompanhar Status da Produção',
      initialPayment: createdOrder.payment ? {
        orderId: createdOrder.id,
        purchaseToken: createdOrder.publicToken,
        qrCode: createdOrder.payment.pixPayload || '',
        qrCodeUrl: createdOrder.payment.pixQrCode || '',
        expiresAt: createdOrder.payment.expiresAt,
        amount: createdOrder.payment.amount || createdOrder.totalPrice,
      } : undefined,
    };
  }, [createdOrder, settings.videoOptions]);

  // Submissão do Pedido
  const handleSubmitOrder = async (e: React.FormEvent, turnstileToken?: string) => {
    e.preventDefault();
    if (createdOrder) {
      setCheckoutOpen(true);
      return;
    }
    setSubmitError(null);

    if (!clientName.trim()) {
      setSubmitError('Por favor, informe seu nome ou como prefere ser chamado.');
      return;
    }

    if (!clientContact.trim()) {
      setSubmitError('Por favor, informe seu contato para alinhamento e entrega.');
      return;
    }

    if (!termsAccepted) {
      setSubmitError('Por favor, confirme que está de acordo com os termos de consentimento e limites de gravação.');
      return;
    }

    if (priceDetails.total <= 0) {
      setSubmitError('Selecione ao menos 1 foto ou vídeo para encomendar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPersonalizadoOrder(
        {
          clientName: clientName.trim(),
          clientContact: clientContact.trim(),
          deliveryChannel,
          photoCount,
          videoOptionId: selectedVideoId,
          mentionName,
          express24h,
          briefing: briefing.trim(),
        },
        settings,
        turnstileToken
      );

      if (res.success && res.order) {
        setCreatedOrder(res.order);
        setCheckoutOpen(true);
      } else {
        setSubmitError(res.error || 'Não foi possível gerar a encomenda. Tente novamente.');
      }
    } catch {
      setSubmitError('Falha na comunicação com o servidor de pagamentos. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col font-sans">
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="personalizados"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        {/* Header Unificado & Padronizado */}
        <PublicPageHero
          icon={Camera}
          eyebrow={settings.eyebrow || 'PRODUÇÃO AUTORAL SOB MEDIDA'}
          title={settings.title || 'Ateliê Privativo'}
          subtitle={settings.subtitle || 'Encomende uma produção exclusiva de fotos e vídeos feita sob medida para você, com discrição absoluta e entrega personalizada.'}
        />

        {/* Conteúdo Principal em 3 Faixas Equilibradas */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto relative z-10">
          <MobilePurchaseSteps labels={stepLabels} step={step} onChange={changeStep} summary={priceDetails.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />

          <div className="space-y-8 lg:space-y-10">
            {/* FAIXA 1: Cabeçalho de seção + Card único unificando Fotografia (esq.) & Audiovisual (dir.) */}
            <div className={step === 0 ? 'block' : 'hidden lg:block'}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08] text-left">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C97A8D] block">
                    Composição
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl text-[#F5EEE9] font-normal tracking-tight mt-0.5 flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-[#C97A8D] shrink-0" aria-hidden="true" />
                    <span>Monte seu ensaio sob medida</span>
                  </h2>
                </div>
                <div className="self-start sm:self-auto shrink-0">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 whitespace-nowrap tabular-nums">
                    <span>{photoCount} fotos</span>
                    {priceDetails.videoPrice > 0 && priceDetails.selectedVideoOption && (
                      <>
                        <span className="text-zinc-600">&bull;</span>
                        <span>{priceDetails.selectedVideoOption.durationMinutes} min vídeo</span>
                      </>
                    )}
                    <span className="text-zinc-600">&bull;</span>
                    <strong className="text-[#F5EEE9] font-medium">
                      {formatCurrencyBrl(priceDetails.photosPrice + priceDetails.videoPrice)}
                    </strong>
                  </span>
                </div>
              </div>

              <section
                aria-label="Composição de fotos e vídeo"
                className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-stretch">
                  <div
                    className={
                      settings.videoEnabled
                        ? 'lg:col-span-5 lg:pr-8 lg:border-r lg:border-white/[0.08]'
                        : 'lg:col-span-12'
                    }
                  >
                    <PersonalizadosPhotoCard
                      embedded
                      settings={settings}
                      photoCount={photoCount}
                      setPhotoCount={setPhotoCount}
                      photosPrice={priceDetails.photosPrice}
                    />
                  </div>

                  {settings.videoEnabled && (
                    <div className="lg:col-span-7 lg:pl-8 pt-6 border-t border-white/[0.08] lg:pt-0 lg:border-t-0">
                      <PersonalizadosVideoCard
                        embedded
                        settings={settings}
                        selectedVideoId={selectedVideoId}
                        setSelectedVideoId={setSelectedVideoId}
                        videoPrice={priceDetails.videoPrice}
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* FAIXA 2: Card único unificando Opcionais (esq.) & Briefing (dir.) */}
            <div className={step === 1 ? 'block' : 'hidden lg:block'}>
              <PersonalizadosPreferencesCard
                settings={settings}
                mentionName={mentionName}
                setMentionName={setMentionName}
                express24h={express24h}
                setExpress24h={setExpress24h}
                deliveryChannel={deliveryChannel}
                briefing={briefing}
                setBriefing={setBriefing}
              />
            </div>

            {step < 2 && (
              <MobilePurchaseSteps
                footer
                labels={stepLabels}
                step={step}
                onChange={changeStep}
                summary={priceDetails.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
            )}

            {/* FAIXA 3: Fechamento equilibrado — Identificação (esq.) + Comanda & Diretrizes (dir.) */}
            <div className={step === 2 ? 'block' : 'hidden lg:block'}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                <aside
                  aria-label="Resumo do pedido"
                  className="order-1 lg:order-2 lg:col-span-5 flex flex-col"
                >
                  <PersonalizadosOrderSummaryCard
                    settings={settings}
                    priceDetails={priceDetails}
                    photoCount={photoCount}
                    mentionName={mentionName}
                    express24h={express24h}
                    deliveryChannel={deliveryChannel}
                  />
                </aside>

                <div className="order-2 lg:order-1 lg:col-span-7">
                  <PersonalizadosFinalizationCard
                    totalPrice={priceDetails.total}
                    deliveryChannel={deliveryChannel}
                    clientName={clientName}
                    setClientName={setClientName}
                    clientContact={clientContact}
                    setClientContact={setClientContact}
                    termsAccepted={termsAccepted}
                    setTermsAccepted={setTermsAccepted}
                    submitError={submitError}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmitOrder}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {createdOrder && !checkoutOpen && (
        <aside className="mx-auto w-full max-w-[72rem] px-4 pb-6 sm:px-8" aria-label="Pedido criado">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#90364B]/40 bg-[#140c12] p-4">
            <p className="flex-1 text-sm text-white">Você já iniciou esta encomenda.</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#79283e] px-4 text-sm font-semibold text-white" onClick={() => setCheckoutOpen(true)}>Continuar pagamento</button>
            <a className="inline-flex min-h-11 items-center text-sm text-[#e6b2be] underline" href={personalizadoContext?.accessUrl}>Ver pedido</a>
            <button type="button" className="min-h-11 text-sm text-zinc-300 underline" onClick={() => {
              setCreatedOrder(null);
              changeStep(0);
            }}>Iniciar outra encomenda</button>
          </div>
        </aside>
      )}

      {/* Modal Universal de Checkout Compartilhado (Avulsos, Chamadas e Personalizados) */}
      <LazyCheckoutModal
        isOpen={checkoutOpen && !!createdOrder}
        onClose={() => setCheckoutOpen(false)}
        checkoutContext={personalizadoContext}
      />

      <Footer customFooterData={content.footer} customInstitutionalData={content.institutional} customChannelsData={content.channels} />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} customContactData={content.contact} />
    </div>
  );
}
