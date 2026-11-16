'use client';

import React, { useState, useEffect } from 'react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { PersonalizadoOrder } from '@/lib/personalizadosCanonical';
import {
  fetchPersonalizadosAdmin,
  updatePersonalizadoOrderAdmin,
} from '@/lib/services/nua/personalizadosService';
import { PersonalizadosEditor } from './PersonalizadosEditor';
import { PersonalizadoOrderPage } from './PersonalizadoOrderPage';
import { PersonalizadosSkeleton } from './ui/AdminSkeleton';

interface PersonalizadosModuleProps {
  initialOrderId?: string | null;
  searchQuery?: string;
  content?: SiteContent;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function PersonalizadosModule({
  initialOrderId = null,
  searchQuery = '',
  content,
  onUploadNew,
}: PersonalizadosModuleProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId);
  const [orders, setOrders] = useState<PersonalizadoOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonalizadosAdmin();
      if (data.orders) {
        setOrders(data.orders);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleOpenDetails = async (orderId: string) => {
    if (!orders.some((o) => o.id === orderId)) {
      await loadOrders();
    }
    setSelectedOrderId(orderId);
  };

  const handleUpdateOrder = async (updated: PersonalizadoOrder): Promise<boolean> => {
    const ok = await updatePersonalizadoOrderAdmin(updated.id, {
      status: updated.status,
      adminNotes: updated.adminNotes,
      vaultFiles: updated.vaultFiles,
      payment: updated.payment,
    });

    if (ok && ok.success) {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      return true;
    }
    return false;
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  if (selectedOrderId && selectedOrder) {
    return (
      <PersonalizadoOrderPage
        order={selectedOrder}
        content={content}
        onUploadNew={onUploadNew}
        onUpdateOrder={handleUpdateOrder}
        onBack={() => {
          setSelectedOrderId(null);
          loadOrders();
        }}
      />
    );
  }

  if (loading && orders.length === 0) {
    return <PersonalizadosSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PersonalizadosEditor
        onOpenOrderDetails={handleOpenDetails}
        searchQuery={searchQuery}
        content={content}
        onUploadNew={onUploadNew}
      />
    </div>
  );
}
