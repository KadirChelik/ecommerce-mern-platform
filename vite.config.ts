import { defineConfig, loadEnv, type Connect, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SERVER_ENV_KEYS = [
  'MONGODB_URI',
  'DATABASE_URL',
  'MONGO_URI',
  'MONGODB_DB',
  'JWT_SECRET',
  'ALLOW_DEMO_AUTH',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'AWS_S3_BUCKET_NAME',
  'AWS_S3_PUBLIC_BASE_URL',
] as const;

function expressApiPlugin(): Plugin {
  let previewSsrServer: ViteDevServer | null = null;

  const getPreviewServer = async (): Promise<ViteDevServer> => {
    if (!previewSsrServer) {
      const { createServer } = await import('vite');
      previewSsrServer = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
    }
    return previewSsrServer;
  };

  const makeMiddleware =
    (loader: () => Promise<(req: IncomingMessage, res: ServerResponse) => unknown>): Connect.NextHandleFunction =>
    async (req, res, next) => {
      if (!req.url?.startsWith('/api')) {
        next();
        return;
      }
      try {
        const app = await loader();
        app(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'API error' }));
      }
    };

  return {
    name: 'hann-studio-api-middleware',
    configureServer(server) {
      server.middlewares.use(
        makeMiddleware(async () => {
          const mod = await server.ssrLoadModule('/server/app.ts');
          return mod.app;
        }),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        makeMiddleware(async () => {
          const ssr = await getPreviewServer();
          const mod = await ssr.ssrLoadModule('/server/app.ts');
          return mod.app;
        }),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of SERVER_ENV_KEYS) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
  };
});
