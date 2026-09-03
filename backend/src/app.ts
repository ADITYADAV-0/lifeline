import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import facilitiesRoutes from './routes/facilities.routes';
import ambulanceRoutes from './routes/ambulance.routes';
import bloodbankRoutes from './routes/bloodbank.routes';
import governmentRoutes from './routes/government.routes';
import { getAvailableAmbulances } from './services/ambulanceService';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/facilities', facilitiesRoutes);
  app.use('/api/ambulance', ambulanceRoutes);
  app.use('/api/bloodbank', bloodbankRoutes);
  app.use('/api/government', governmentRoutes);

  app.get('/api/ambulances', (_req, res) => {
    res.json({
      ambulances: getAvailableAmbulances(),
    });
  });

  return app;
}

