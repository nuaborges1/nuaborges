import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const publishedContentFile = path.join(rootDir, 'data', 'published_content.json');

console.log('🔄 Sincronizando e unificando conteúdo canônico (Fotos, Vídeos e Hero)...');

if (!fs.existsSync(publishedContentFile)) {
  console.error('❌ data/published_content.json não encontrado!');
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(publishedContentFile, 'utf-8'));

// 1. Unifica as Fotos do Hero (4 Fotos Oficiais)
content.hero.photos = [
  {
    id: 'hero-1',
    title: 'Nua Borges',
    session: '01',
    imageUrl: '/images/nua/hero/hero-1.jpg'
  },
  {
    id: 'hero-2',
    title: 'Nua Borges',
    session: '02',
    imageUrl: '/images/nua/hero/hero-2.jpg'
  },
  {
    id: 'hero-3',
    title: 'Nua Borges',
    session: '03',
    imageUrl: '/images/nua/gallery/gallery-1.png'
  },
  {
    id: 'hero-4',
    title: 'Nua Borges',
    session: '04',
    imageUrl: '/images/nua/gallery/gallery-2.png'
  }
];

// 2. Unifica a Galeria Autoral (4 Ensaios Oficiais)
content.gallery.photos = [
  {
    id: 'gal-1',
    title: 'Luz & Silhueta',
    active: true,
    caption: 'Estudo autoral sobre contorno e naturalidade',
    linkUrl: 'https://onlyfans.com/nuaborges',
    imageUrl: '/images/nua/gallery/gallery-1.png'
  },
  {
    id: 'gal-2',
    title: 'Sombras Íntimas',
    active: true,
    caption: 'Linhas do corpo sob a penumbra suave',
    linkUrl: 'https://onlyfans.com/nuaborges',
    imageUrl: '/images/nua/gallery/gallery-2.png'
  },
  {
    id: 'gal-3',
    title: 'Pele & Textura',
    active: true,
    caption: 'Composição minimalista e toque',
    linkUrl: 'https://onlyfans.com/nuaborges',
    imageUrl: '/images/nua/gallery/gallery-3.png'
  },
  {
    id: 'gal-4',
    title: 'Presença & Olhar',
    active: true,
    caption: 'Sensualidade desarmada e presença autêntica',
    linkUrl: 'https://onlyfans.com/nuaborges',
    imageUrl: '/images/nua/gallery/gallery-4.png'
  }
];

// 3. Unifica Sobre Mim
if (!content.about) content.about = {};
content.about.photoUrl = '/images/nua/about/about.jpg';

// 4. Corrige os Vídeos dos Itens Avulsos (Substitui .png errados por URLs válidas de vídeo)
if (content.avulsos && Array.isArray(content.avulsos.items)) {
  content.avulsos.items.forEach((item) => {
    if (item.slug === 'video-intimo-madrugada' || item.id === 'avulso-2') {
      item.imageUrl = '/images/nua/gallery/gallery-2.png';
      item.videos = [
        {
          id: 'vid-madrugada-1',
          title: 'Vídeo Autoral Completo — Madrugada & Desejo (4K UHD)',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          posterUrl: '/images/nua/gallery/gallery-2.png',
          duration: '12 Minutos'
        }
      ];
      item.previewImages = [
        '/images/nua/gallery/gallery-2.png',
        '/images/nua/hero/hero-2.jpg',
        '/images/nua/gallery/gallery-1.png',
        '/images/nua/gallery/gallery-3.png',
        '/images/nua/gallery/gallery-4.png'
      ];
    }

    if (item.slug === 'sessao-tantrica' || item.id === 'avulso-3') {
      item.imageUrl = '/images/nua/gallery/gallery-3.png';
      item.videos = [
        {
          id: 'vid-tantrica-1',
          title: 'Sessão Tântrica Imersiva — Prática Guiada (4K UHD)',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          posterUrl: '/images/nua/gallery/gallery-3.png',
          duration: '45 Minutos'
        }
      ];
      item.previewImages = [
        '/images/nua/gallery/gallery-3.png',
        '/images/nua/gallery/gallery-4.png',
        '/images/nua/gallery/gallery-1.png',
        '/images/nua/gallery/gallery-2.png',
        '/images/nua/about/about.jpg'
      ];
    }
  });
}

// 5. Salva localmente em data/published_content.json
fs.writeFileSync(publishedContentFile, JSON.stringify(content, null, 2), 'utf-8');
console.log('✅ data/published_content.json atualizado com fotos e vídeos unificados!');

// 6. Atualiza o Supabase (para manter cloud e localhost idênticos) se configurado
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function updateSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente. Atualização do Supabase ignorada.');
    return;
  }
  try {
    const sb = createClient(supabaseUrl, supabaseKey);
    const nowIso = new Date().toISOString();

    const { error: err1 } = await sb.from('site_content').upsert({
      key: 'published_content',
      content: content,
      version: (content._version || 1) + 1,
      updated_at: nowIso,
      updated_by: 'CanonicalSync'
    });

    if (err1) {
      console.warn('⚠️ Supabase published_content aviso:', err1.message);
    } else {
      console.log('✅ Supabase: published_content sincronizado!');
    }

    const { error: err2 } = await sb.from('site_content').upsert({
      key: 'private_admin_content',
      content: content,
      version: (content._version || 1) + 1,
      updated_at: nowIso,
      updated_by: 'CanonicalSync'
    });

    if (err2) {
      console.warn('⚠️ Supabase private_admin_content aviso:', err2.message);
    } else {
      console.log('✅ Supabase: private_admin_content sincronizado!');
    }
  } catch (e) {
    console.error('❌ Erro ao conectar no Supabase:', e);
  }
}

updateSupabase();
