'use client';

import React, { useState } from 'react';
import { AppointmentsEditor } from './AppointmentsEditor';
import { AppointmentBookingPage } from './AppointmentBookingPage';
import { AppointmentBooking } from '@/lib/appointmentsCanonical';
import { executeAdminAction } from '@/lib/services/nua/appointmentsService';

interface ChamadasModuleProps {
  selectedBookingId?: string | null;
  onSelectBookingId?: (id: string | null) => void;
  searchQuery?: string;
}

export function ChamadasModule({
  selectedBookingId,
  onSelectBookingId,
  searchQuery = '',
}: ChamadasModuleProps) {
  const [activeBooking, setActiveBooking] = useState<AppointmentBooking | null>(null);

  const handleOpenDetails = (booking: AppointmentBooking) => {
    setActiveBooking(booking);
    if (onSelectBookingId) {
      onSelectBookingId(booking.id);
    }
  };

  const handleBackToList = () => {
    setActiveBooking(null);
    if (onSelectBookingId) {
      onSelectBookingId(null);
    }
  };

  const handleUpdateAction = async (bookingId: string, action: string, payload?: any): Promise<boolean> => {
    let actionType = action;
    let params: any = { bookingId, ...payload };

    if (action === 'set_meeting_url') {
      actionType = 'updateMeeting';
      params = {
        bookingId,
        meetingUrl: payload?.meetingUrl,
        instructions: payload?.instructions,
      };
    } else if (action === 'confirm_payment') {
      actionType = 'confirm';
      params = {
        bookingId,
        transactionId: payload?.transactionId || `MANUAL_${Date.now()}`,
      };
    } else if (action === 'mark_complete') {
      actionType = 'complete';
    } else if (action === 'mark_absent') {
      actionType = 'absent';
    } else if (action === 'cancel') {
      actionType = 'cancel';
      params = {
        bookingId,
        reason: payload?.reason || 'Cancelado pelo painel administrativo',
      };
    } else if (action === 'update_status') {
      actionType = 'update_status';
      params = {
        bookingId,
        status: payload?.status,
        reason: payload?.reason,
      };
    }

    const res = await executeAdminAction(actionType as any, params);
    return !!res.success;
  };

  if (activeBooking) {
    return (
      <AppointmentBookingPage
        booking={activeBooking}
        onUpdateAction={handleUpdateAction}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="w-full">
      <AppointmentsEditor
        onOpenBookingDetails={handleOpenDetails}
        searchQuery={searchQuery}
      />
    </div>
  );
}
