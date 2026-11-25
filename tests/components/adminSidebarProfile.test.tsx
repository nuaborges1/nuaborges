import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminSidebar } from '@/components/nua/admin/AdminSidebar';
import { HelpModalProvider } from '@/components/nua/admin/help/HelpModalContext';

describe('AdminSidebar — Identificação de Perfil (Nua Borges vs PHDEV)', () => {
  const baseProps = {
    activeModule: 'dashboard' as const,
    onSelectModule: vi.fn(),
    onLogout: vi.fn(),
    isMobileOpen: false,
    onToggleMobile: vi.fn(),
    onCloseMobile: vi.fn(),
  };

  it('exibe "Nua Borges" para a sessão da cliente e NÃO mostra Avaliações', () => {
    render(
      <HelpModalProvider>
        <AdminSidebar {...baseProps} adminProfile="nua" />
      </HelpModalProvider>
    );
    expect(screen.getByText('Nua Borges')).toBeInTheDocument();
    expect(screen.getByText('Administradora')).toBeInTheDocument();
    expect(screen.queryByText('PHDEV')).not.toBeInTheDocument();
    expect(screen.queryByText('Avaliações')).not.toBeInTheDocument();
  });

  it('exibe "PHDEV" no canto inferior esquerdo e mostra Avaliações para o desenvolvedor', () => {
    render(
      <HelpModalProvider>
        <AdminSidebar {...baseProps} adminProfile="phdev" />
      </HelpModalProvider>
    );
    expect(screen.getByText('PHDEV')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvedor')).toBeInTheDocument();
    expect(screen.getByText('PH')).toBeInTheDocument();
    expect(screen.getByText('Avaliações')).toBeInTheDocument();
    expect(screen.queryByText('Administradora')).not.toBeInTheDocument();
  });
});
