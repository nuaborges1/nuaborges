'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { CheckoutModal, UniversalCheckoutContext } from '@/components/nua/site/CheckoutModal';
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
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { PersonalizadosPhotoCard } from '@/components/nua/personalizados/PersonalizadosPhotoCard';
import { PersonalizadosVideoCard } from '@/components/nua/personalizados/PersonalizadosVideoCard';
import { PersonalizadosPreferencesCard } from '@/components/nua/personalizados/PersonalizadosPreferencesCard';
import { PersonalizadosOrderSummaryCard } from '@/components/nua/personalizados/PersonalizadosOrderSummaryCard';

export function PersonalizadosClientView() {
  const router = useRouter();
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);

  // Carrega configurações
  const settings: PersonalizadosSettings = useMemo(() => {
    return content.personalizados || DEFAULT_PERSONALIZADOS_SETTINGS;
  }, [content.personalizados]);

  // Estados da Calculadora
  const [photoCount, setPhotoCount] = useState<number>(settings.minPhotos || 5);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('vid_none');
  const [mentionName, setMentionName] = useState<boolean>(false);
  const [express24h, setExpress24h] = useState<boolean>(false);
  const [deliveryChannel, setDeliveryChannel] = useState<DeliveryChannel>('telegram');

  // Formulário do Cliente
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [briefing, setBriefing] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Estados de Envio
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PersonalizadoOrder | null>(null);

  // Garante que o canal inicial seja um canal habilitado
  useEffect(() => {
    if (!settings.deliveryMethods[deliveryChannel]) {
      if (settings.deliveryMethods.telegram) setDeliveryChannel('telegram');
      else if (settings.deliveryMethods.vault) setDeliveryChannel('vault');
    }
  }, [settings.deliveryMethods, deliveryChannel]);

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
      details.push({ label: 'Menção Nominal', value: 'Lua falará seu nome' });
    }
    if (createdOrder.express24h) {
      details.push({ label: 'Entrega Prioritária', value: 'Em até 24 horas' });
    }
    details.push({
      label: 'Canal de Entrega',
      value: createdOrder.deliveryChannel.toUpperCase(),
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
        amount: createdOrder.payment.amount || createdOrder.totalPrice,
      } : undefined,
    };
  }, [createdOrder, settings.videoOptions]);

  // Submissão do Pedido
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
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
        settings
      );

      if (res.success && res.order) {
        setCreatedOrder(res.order);
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
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black flex flex-col font-sans">
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="personalizados"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 select-none">
        {/* Header Unificado & Padronizado */}
        <PublicPageHero
          icon={Camera}
          eyebrow={settings.eyebrow || 'PRODUÇÃO AUTORAL SOB MEDIDA'}
          title={settings.title || 'Ateliê Privativo'}
          subtitle={settings.subtitle || 'Encomende uma produção exclusiva de fotos e vídeos feita sob medida para você, com discrição absoluta e entrega personalizada.'}
        />

        {/* Conteúdo Principal: Calculadora & Comanda */}
        <section className="px-4 sm:px-8 md:px-10 lg:px-12 max-w-[72rem] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Coluna Esquerda: Configurador da Produção (7 colunas) */}
            <div className="lg:col-span-7 space-y-6">
              <PersonalizadosPhotoCard
                settings={settings}
                photoCount={photoCount}
                setPhotoCount={setPhotoCount}
                photosPrice={priceDetails.photosPrice}
              />

              <PersonalizadosVideoCard
                settings={settings}
                selectedVideoId={selectedVideoId}
                setSelectedVideoId={setSelectedVideoId}
                videoPrice={priceDetails.videoPrice}
              />

              <PersonalizadosPreferencesCard
                settings={settings}
                mentionName={mentionName}
                setMentionName={setMentionName}
                express24h={express24h}
                setExpress24h={setExpress24h}
                deliveryChannel={deliveryChannel}
                setDeliveryChannel={setDeliveryChannel}
                briefing={briefing}
                setBriefing={setBriefing}
              />
            </div>

            {/* Coluna Direita: Comanda Flutuante & Formulário de Checkout (5 colunas) */}
            <PersonalizadosOrderSummaryCard
              settings={settings}
              priceDetails={priceDetails}
              photoCount={photoCount}
              mentionName={mentionName}
              express24h={express24h}
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
        </section>
      </main>

      {/* Modal Universal de Checkout Compartilhado (Avulsos, Chamadas e Personalizados) */}
      <CheckoutModal
        isOpen={!!createdOrder}
        onClose={() => setCreatedOrder(null)}
        checkoutContext={personalizadoContext}
        onSuccess={() => {
          if (createdOrder?.publicToken) {
            router.push(`/personalizados/pedido?token=${createdOrder.publicToken}`);
          }
        }}
      />

      <Footer />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
