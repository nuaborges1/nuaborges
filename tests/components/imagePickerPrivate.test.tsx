import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { invalidateMediaListCache } from '@/lib/media/mediaListCache';
import { deduplicateLibraryItems } from '@/lib/mediaUsage';
import { ImagePickerModal } from '@/components/nua/admin/ImagePickerModal';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@/lib/contentStore', () => ({ optimizeAndStoreImage: upload }));

afterEach(() => {
  invalidateMediaListCache();
  vi.unstubAllGlobals();
  upload.mockReset();
});

it('permite selecionar mídias do acervo diretamente para o pack sem re-upload desnecessário', async () => {
  const storage = (key: string, name: string, extra = {}) => ({
    url: '/' + key, key, name, origin: 'b2_storage', inStorage: true, ...extra,
  });
  const request = vi.fn(async (input: string) => {
    const page = new URL(input, 'http://localhost').searchParams.get('cursor');
    return Response.json(page ? {
      items: [
        storage('media/private/foto-a.jpg', 'Foto privada A'),
        storage('media/private/foto-b.jpg', 'Foto privada B'),
        storage('media/private/thumb.jpg', 'Miniatura', { isThumbnail: true }),
      ],
    } : {
      items: [storage('media/public/preview.jpg', 'Foto pública')],
      nextCursor: 'segunda',
    });
  });
  vi.stubGlobal('fetch', request);
  const onSelectMultiple = vi.fn();
  render(<ImagePickerModal
    isOpen
    library={[{ id: 'publica', url: '/media/public/preview.jpg', name: 'Foto pública', uploadedAt: '2026-11-25T00:00:00Z' }]}
    uploadVisibility="private"
    allowedMediaType="photos"
    onSelect={() => {}}
    onSelectMultiple={onSelectMultiple}
    onClose={() => {}}
    confirmActionLabel="Adicionar ao pack"
  />);

  fireEvent.click(await screen.findByText('Foto privada A'));
  expect(screen.getByText('Foto privada B')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Foto pública'));
  expect(screen.getByText('Foto pública').closest('[role=button]')).toHaveAttribute('aria-disabled', 'false');
  expect(screen.queryByText('Miniatura')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao pack' }));
  expect(onSelectMultiple).toHaveBeenCalledWith(
    ['/media/private/foto-a.jpg', '/media/public/preview.jpg'],
    [expect.objectContaining({ url: '/media/private/foto-a.jpg' }), expect.objectContaining({ url: '/media/public/preview.jpg' })]
  );
  expect(upload).not.toHaveBeenCalled();
});

it('seleciona foto do acervo diretamente sem erro mesmo se a foto for pública', async () => {
  const original = { id: 'original', url: '/images/original.jpg', name: 'Foto original', uploadedAt: '' };
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [] })));
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(<ImagePickerModal isOpen library={[original]} uploadVisibility="private"
    onSelect={onSelect} onClose={onClose} confirmActionLabel="Adicionar ao pack" />);

  fireEvent.click(await screen.findByText('Foto original'));
  const confirm = screen.getByRole('button', { name: 'Adicionar ao pack' });
  fireEvent.click(confirm);
  expect(onSelect).toHaveBeenCalledWith('/images/original.jpg', expect.objectContaining({ url: '/images/original.jpg' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('aguarda o registro no acervo e seleciona o arquivo enviado do dispositivo', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [] })));
  const file = new File(['foto'], 'local.jpg', { type: 'image/jpeg' });
  const url = '/media/private/local.jpg';
  const item = { id: 'local', url, name: file.name, uploadedAt: '' };
  upload.mockResolvedValue(item);
  const onUploadNew = vi.fn(async () => ({ success: true }));
  const onSelect = vi.fn();
  const { baseElement } = render(<ImagePickerModal isOpen library={[]} onUploadNew={onUploadNew}
    uploadVisibility="private" allowedMediaType="photos" onSelect={onSelect}
    onClose={() => {}} confirmActionLabel="Adicionar ao pack" />);

  await screen.findByRole('button', { name: 'Adicionar ao pack' });
  fireEvent.change(baseElement.querySelector('input[type=file]')!, { target: { files: [file] } });
  const confirm = await screen.findByRole('button', { name: 'Adicionar ao pack' });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  expect(onUploadNew).toHaveBeenCalledWith(item);
  expect(onSelect).toHaveBeenCalledWith(url, item);
});

it('preserva as referências pública e protegida quando têm o mesmo hash', () => {
  const common = { name: 'Foto', uploadedAt: '', fileHash: 'sha256:igual' };
  const items = [
    { ...common, id: 'publica', url: '/media/public/foto.jpg' },
    { ...common, id: 'protegida', url: '/media/private/foto.jpg' },
  ];
  expect(deduplicateLibraryItems(items).map((item) => item.url)).toEqual(items.map((item) => item.url));
});
