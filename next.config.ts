import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function ensureLocalApiServer() {
  if (typeof window !== 'undefined') return;
  try {
    const serverFilePath = path.resolve(process.cwd(), 'tools/localApiServer.mjs');
    let startFn: ((port: number) => void) | undefined;
    try {
      // In transpiled CommonJS runtime (Next.js config parser on Node Windows)
      const m = require(serverFilePath);
      startFn = m.startLocalApiServer;
    } catch {
      // Fallback for native ESM loader
      const fileUrl = pathToFileURL(serverFilePath).href;
      import(fileUrl).then((m) => {
        if (m?.startLocalApiServer) m.startLocalApiServer(3105);
      }).catch((err) => console.error('[LocalApiServer] Init error:', err));
    }
    if (startFn) {
      startFn(3105);
    }
  } catch (err) {
    console.error('[LocalApiServer] Import error:', err);
  }
}

export default function nextConfig(phase: string): NextConfig {
  const isDevServer =
    phase === PHASE_DEVELOPMENT_SERVER || process.argv.some((arg) => arg === 'dev');
  const isProd =
    phase === PHASE_PRODUCTION_BUILD ||
    (!isDevServer && (process.env.NODE_ENV === 'production' || process.argv.some((arg) => arg.includes('build'))));

  if (!isProd && isDevServer) {
    ensureLocalApiServer();
  }

  return {
    ...(isProd ? { output: 'export', distDir: '.next-build' } : {}),
    outputFileTracingRoot: path.resolve(typeof __dirname === 'string' ? __dirname : process.cwd()),
    serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
    generateBuildId: async () => `nua-release-${Date.now()}`,
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    images: {
      unoptimized: true,
    },
    transpilePackages: ['motion'],
    // Em desenvolvimento, as mídias publicadas no bucket Backblaze B2 não existem em
    // public/ — elas são servidas em produção por functions/media e functions/audio.
    // O rewrite delega ao servidor local (127.0.0.1:3105), que baixa e cacheia o objeto.
    // afterFiles: só quando o Next não achou o arquivo em public/, então arquivos
    // locais continuam sendo servidos estaticamente. A chave "rewrites" só existe
    // fora do build: o export de produção não usa (nem precisa) dessas rotas.
    ...(isProd
      ? {}
      : {
          rewrites: async () => ({
            afterFiles: [
              { source: '/conta/:path*', destination: '/conta' },
              { source: '/api/:path*', destination: 'http://127.0.0.1:3105/api/:path*' },
              { source: '/media/:path*', destination: 'http://127.0.0.1:3105/media/:path*' },
              { source: '/audio/:path*', destination: 'http://127.0.0.1:3105/audio/:path*' },
            ],
          }),
        }),
    webpack: (config, { dev }) => {
      if (dev && process.env.DISABLE_HMR === 'true') {
        config.watchOptions = {
          ignored: /.*/,
        };
      }
      return config;
    },
  };
}
