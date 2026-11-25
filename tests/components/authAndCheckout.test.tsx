import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    const { fill, priority, ...imgProps } = props;
    return React.createElement('img', { src, alt, ...imgProps });
  },
}));

vi.mock('@/lib/media', () => ({
  resolveMediaUrl: (url: string) => url || '',
}));

vi.mock('motion/react', () => {
  const cache = new Map<string, React.ComponentType<any>>();
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!cache.has(prop)) {
            const Comp = ({ children, ...rest }: any) => {
              const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = rest;
              return React.createElement(prop, domProps, children);
            };
            cache.set(prop, Comp);
          }
          return cache.get(prop);
        },
      }
    ),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('@/lib/contentStore', () => ({
  verifyAdminPassword: vi.fn(),
  setSessionActive: vi.fn(),
}));

vi.mock('@/lib/nuaIdClient', () => ({
  requestLoginCode: vi.fn(),
  verifyLoginCode: vi.fn(),
  claimLegacyOrder: vi.fn(),
  fetchCustomerSession: vi.fn().mockResolvedValue({ ok: true, data: { authenticated: false } }),
  bindOrderToCustomer: vi.fn(),
}));

vi.mock('@/components/nua/account/TurnstileWidget', () => ({
  TURNSTILE_SITE_KEY: '',
  TurnstileWidget: () => null,
}));

import { AdminLogin } from '@/components/nua/admin/AdminLogin';
import { NuaIdLoginView } from '@/components/nua/account/NuaIdLoginView';
import { ClaimOrderBox } from '@/components/nua/account/ClaimOrderBox';
import { BrlCurrencyInput } from '@/components/nua/admin/ui/BrlCurrencyInput';
import { CheckoutModal } from '@/components/nua/site/CheckoutModal';
import { verifyAdminPassword } from '@/lib/contentStore';
import { requestLoginCode, verifyLoginCode, claimLegacyOrder } from '@/lib/nuaIdClient';

describe('COMPONENT — AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps submit disabled when empty, toggles password visibility, shows 401 error without calling onSuccess, and succeeds on 200', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<AdminLogin onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText(/Digite sua senha/i);
    const submit = screen.getByRole('button', { name: /Entrar no Painel/i });
    const toggle = screen.getByRole('button', { name: /Ver senha/i });

    expect(submit).toBeDisabled();
    expect(input).toHaveAttribute('type', 'password');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Ocultar senha/i })).toBeInTheDocument();

    // Failed login
    vi.mocked(verifyAdminPassword).mockResolvedValueOnce({ success: false, error: 'Senha incorreta.' });
    await user.type(input, 'errada');
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(await screen.findByText(/Senha incorreta/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    // Successful login
    vi.mocked(verifyAdminPassword).mockResolvedValueOnce({ success: true });
    await user.clear(input);
    await user.type(input, 'correta');
    await user.click(submit);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

describe('COMPONENT — NuaIdLoginView (OTP Auth Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates email, transitions to 6-digit OTP step, handles wrong code with remaining attempts, and authenticates on valid OTP', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();

    render(<NuaIdLoginView onAuthenticated={onAuthenticated} />);

    const emailInput = screen.getByRole('textbox');
    await user.type(emailInput, 'cliente@qa.test');

    vi.mocked(requestLoginCode).mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { success: true, expiresInMinutes: 10, message: 'Código enviado com sucesso.' },
    } as any);

    await user.click(screen.getByRole('button', { name: /Enviar código|Continuar|Receber/i }));

    expect(await screen.findByText(/Código enviado com sucesso/i)).toBeInTheDocument();
    expect(requestLoginCode).toHaveBeenCalledWith('cliente@qa.test', undefined, 'portal_login');

    // Wrong OTP -> shows remaining attempts and never calls onAuthenticated
    vi.mocked(verifyLoginCode).mockResolvedValueOnce({
      ok: false,
      status: 401,
      data: { success: false, error: 'Código incorreto.', attemptsRemaining: 4 },
    } as any);

    const otpInput = screen.getByRole('textbox');
    await user.type(otpInput, '111111');

    expect(await screen.findByText(/Código incorreto.*4 tentativa/i)).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();

    // Valid OTP -> authenticates
    const profile = { id: 'prof_1', email: 'cliente@qa.test', displayName: 'Cliente QA' };
    vi.mocked(verifyLoginCode).mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { success: true, authenticated: true, profile },
    } as any);

    await user.clear(otpInput);
    await user.type(otpInput, '482910');

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(profile));
  });
});

describe('COMPONENT — ClaimOrderBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts legacy token from pasted URL, displays accessible alert on conflict, and invokes onClaimed on success', async () => {
    const user = userEvent.setup();
    const onClaimed = vi.fn();

    render(<ClaimOrderBox onClaimed={onClaimed} />);
    await user.click(screen.getByRole('button', { name: /Vincular compra anterior/i }));

    const input = screen.getByRole('textbox');
    const submitBtn = screen.getByRole('button', { name: /Vincular|Confirmar/i });

    // Short invalid token
    await user.type(input, '123');
    await user.click(submitBtn);
    expect(screen.getByRole('alert')).toHaveTextContent(/Cole o link completo/i);

    // 409 Conflict from backend
    vi.mocked(claimLegacyOrder).mockResolvedValueOnce({
      ok: false,
      status: 409,
      data: { success: false, error: 'Este pedido já está vinculado a outra conta.' },
    } as any);
    await user.clear(input);
    await user.type(input, 'https://nuaborges.com.br/cofre?token=tok_legado_abcdef1234');
    await user.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/já está vinculado a outra conta/i);
    expect(claimLegacyOrder).toHaveBeenCalledWith('tok_legado_abcdef1234');
    expect(onClaimed).not.toHaveBeenCalled();

    // 200 Success
    vi.mocked(claimLegacyOrder).mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { success: true, message: 'Pedido vinculado à sua conta.' },
    } as any);
    await user.click(submitBtn);

    expect(await screen.findByText(/Pedido vinculado à sua conta/i)).toBeInTheDocument();
    expect(onClaimed).toHaveBeenCalledTimes(1);
  });
});

describe('COMPONENT — BrlCurrencyInput', () => {
  it('blocks non-numeric characters and parses valid BRL decimals accurately', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BrlCurrencyInput value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc129,90xyz');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall[1]).toBeCloseTo(129.9, 2);
  });
});

describe('COMPONENT — CheckoutModal (F-01 e F-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
      };
    }
  });

  it('exhibits real product price from first frame instead of 29.90 and displays canonical photo/video count without preview/duration contradiction', async () => {
    const packProduct: any = {
      id: 'pack_test_1',
      slug: 'serie-autoral-teste',
      title: 'Série Autoral: Sombras & Intimidade',
      description: 'Ensaio íntimo autoral.',
      price: 'R$ 129,00',
      numericPrice: 129,
      imageUrl: '/images/nua/cover.jpg',
      previewImages: ['/images/p1.jpg', '/images/p2.jpg', '/images/p3.jpg'],
      exclusivePhotos: [],
      exclusivePhotosCount: 5,
      videos: [{ id: 'v1', title: 'Vídeo Principal', url: '/v1.mp4', duration: '4 min' }],
      duration: '5 Fotos 4K • 1 Vídeo UHD',
      modality: 'pack',
      badge: 'Coleção Autoral',
      active: true,
    };

    render(<CheckoutModal isOpen={true} onClose={vi.fn()} product={packProduct} />);

    expect(await screen.findByText('R$ 129,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 29,90')).not.toBeInTheDocument();
    expect(screen.getByText('5 fotografias + 1 vídeo')).toBeInTheDocument();
    expect(screen.queryByText(/5 Fotos 4K/i)).not.toBeInTheDocument();
  });
});
