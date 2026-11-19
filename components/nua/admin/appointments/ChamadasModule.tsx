'use client';

import React from 'react';
import { AppointmentsEditor } from './AppointmentsEditor';

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
  return (
    <div className="w-full">
      <AppointmentsEditor
        selectedBookingId={selectedBookingId}
        onSelectBookingId={onSelectBookingId}
        searchQuery={searchQuery}
      />
    </div>
  );
}
