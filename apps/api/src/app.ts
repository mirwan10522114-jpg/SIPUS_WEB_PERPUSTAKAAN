import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error';
import openapiSpec from './docs/openapi.json';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((o) => o.trim()),
      credentials: false,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // Dokumentasi API (Swagger/OpenAPI)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec as object));
  app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));

  app.use('/api', apiRouter);

  // Static: cover buku & lampiran yang diunggah
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  // Production: layani build frontend dalam satu proses
  const webDist = path.resolve(process.cwd(), '../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
