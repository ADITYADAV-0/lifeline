import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import facilitiesRoutes from './routes/facilities.routes';
import { getAvailableAmbulances } from './services/ambulanceService';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/facilities', facilitiesRoutes);

  app.get('/api/ambulances', (_req, res) => {
    res.json({
      ambulances: getAvailableAmbulances(),
    });
  });

  return app;
}
