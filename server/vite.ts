import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer, createLogger } from 'vite';
import { type Server } from 'http';
import viteConfig from '../vite.config';
import { nanoid } from 'nanoid';

const viteLogger = createLogger();

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`${formattedTime} [${source}] ${message}`);
  } else {
    // Reduce noise in production; use info for essential logs only
    console.info(`${formattedTime} [${source}] ${message}`);
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit on Vite errors during development
        console.error('Vite error (non-fatal):', msg);
      },
    },
    server: serverOptions,
    appType: 'custom',
  });

  // Use Vite middleware to handle all requests
  app.use(vite.middlewares);
  
  // Catch-all route for SPA - serve static HTML without SSR
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        'snipshift-next/web/index.html',
      );

      // Serve static HTML without SSR to avoid hydration issues
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), 'dist', 'public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
