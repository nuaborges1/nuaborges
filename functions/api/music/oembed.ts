/**
 * GET /api/music/oembed?url=...
 * POST /api/music/oembed Body: { url: "..." }
 *
 * Endpoint de OEmbed Sync para busca de metadados em tempo real (1-clique)
 * para links do Spotify, YouTube, Apple Music, SoundCloud e Vimeo.
 */

type PagesContext<T = any> = { request: Request; env: T };

function extractYouTubeId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    const match = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

export const onRequestGet = async (context: PagesContext) => {
  const { request } = context;
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get('url') || '';

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: 'Informe o link da música.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const cleanUrl = targetUrl.trim();

    // A. YouTube Video
    const ytId = extractYouTubeId(cleanUrl);
    if (ytId || cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json() as any;
        const videoId = ytId || extractYouTubeId(cleanUrl);
        const coverUrl = videoId
          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          : data.thumbnail_url || null;

        return new Response(
          JSON.stringify({
            success: true,
            provider: 'youtube',
            type: 'youtube_video',
            title: data.title || 'Vídeo do YouTube',
            artist: data.author_name || 'YouTube',
            coverUrl,
            youtubeVideoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            externalUrl: cleanUrl,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // B. Spotify (Track / Album / Playlist)
    if (cleanUrl.includes('spotify.com')) {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json() as any;
        // OEmbed do Spotify retorna o título no formato "Título - Músico / Artista" ou similar
        const rawTitle = data.title || 'Faixa do Spotify';
        let title = rawTitle;
        let artist = 'Spotify Artist';

        if (rawTitle.includes(' - ')) {
          const parts = rawTitle.split(' - ');
          title = parts[0];
          artist = parts.slice(1).join(' - ');
        }

        return new Response(
          JSON.stringify({
            success: true,
            provider: 'spotify',
            type: 'spotify_track',
            title,
            artist,
            coverUrl: data.thumbnail_url || null,
            url: cleanUrl,
            externalUrl: cleanUrl,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // C. SoundCloud
    if (cleanUrl.includes('soundcloud.com')) {
      const oembedRes = await fetch(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(cleanUrl)}`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json() as any;
        return new Response(
          JSON.stringify({
            success: true,
            provider: 'soundcloud',
            type: 'external_audio',
            title: data.title || 'Faixa do SoundCloud',
            artist: data.author_name || 'SoundCloud',
            coverUrl: data.thumbnail_url || null,
            url: cleanUrl,
            externalUrl: cleanUrl,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // D. Fallback genérico para outras URLs (NUA-AUD-015: apenas HTTPS)
    if (!/^https:\/\//i.test(cleanUrl)) {
      return new Response(
        JSON.stringify({ error: 'Link inválido: informe uma URL HTTPS válida.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'generic',
        type: 'external_audio',
        title: 'Mídia Externa',
        artist: 'Nua Borges',
        coverUrl: null,
        url: cleanUrl,
        externalUrl: cleanUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[MusicOEmbed] Erro:', err);
    return new Response(
      JSON.stringify({ error: 'Não foi possível carregar as informações deste link.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext) => {
  try {
    const body = await context.request.json() as { url?: string };
    const targetUrl = body.url || '';
    const fakeReq = new Request(`https://internal/api/music/oembed?url=${encodeURIComponent(targetUrl)}`);
    return onRequestGet({ ...context, request: fakeReq });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Dados inválidos. Tente novamente.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
export const onRequest = onRequestGet;
