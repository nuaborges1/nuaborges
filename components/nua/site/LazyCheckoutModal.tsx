'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { CheckoutModalProps } from '@/components/nua/checkout/types';

const CheckoutModal = dynamic(() => import('./CheckoutModal').then(module => module.CheckoutModal), { ssr: false });

export function LazyCheckoutModal(props: CheckoutModalProps) {
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (props.isOpen) setHasOpened(true);
  }, [props.isOpen]);

  return hasOpened || props.isOpen ? <CheckoutModal {...props} /> : null;
}
