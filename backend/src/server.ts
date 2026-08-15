import { GoogleGenAI } from '@google/genai';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app';
import { config } from './config';
import { connectDB } from './db';
import { detectAccident } from './detection/accidentDetector';
import { createAccidentEmergency } from './services/emergencyService';
import {
  cancelEmergency,
  getAllEmergencies,
  getEmergency,
  getPreviousReading,
  saveReading,
} from './services/memoryStore';
import { SensorReading } from './types';

const ai = new GoogleGenAI({
  apiKey: config.medicaApiKey,
});


async function main() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  

  app.post('/api/medica', async (req, res) => {
  try {
    const { message, userName, medicalProfile } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    const prompt = `
You are Medica AI, a medical triage assistant.

User: ${userName || 'User'}

Medical profile:
${JSON.stringify(medicalProfile || {})}

User message:
${message}

RESPONSE RULES:
- Give a crisp, direct answer.
- Maximum 80 words unless more detail is necessary for safety.
- Usually answer in 2-5 short sentences.
- Do not repeat the user's message.
- Do not give long explanations.
- Use simple language.
- Ask only 1-2 important follow-up questions at a time.
- If the situation sounds like an emergency, say so immediately.
- Never claim a definite diagnosis.
- Give practical next steps.
- Do not add unnecessary disclaimers.

For emergency symptoms, use this format:

🚨 This may be an emergency.
[short reason]
➡️ [what the user should do now]

For normal symptoms:
[short answer]
➡️ [next step]
`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return res.json({
      reply: result.text,
    });
  } catch (error) {
    console.error('Medica Gemini error:', error);

    return res.status(500).json({
      error: 'Unable to connect to Medica AI.',
    });
  }
});


  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'LifeLine Backend',
      status: 'ONLINE',
      timestamp: Date.now(),
    });
  });

  app.get('/api/emergencies', (_req, res) => {
    res.json({
      success: true,
      emergencies: getAllEmergencies(),
    });
  });

  app.get('/api/emergencies/:id', (req, res) => {
    const emergency = getEmergency(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
      });
    }

    return res.json({
      success: true,
      emergency,
    });
  });

  app.post('/api/emergencies/:id/cancel', (req, res) => {
    const emergency = cancelEmergency(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
      });
    }

    io.emit('emergency:cancelled', emergency);

    return res.json({
      success: true,
      emergency,
    });
  });

  app.post('/api/sos', (req, res) => {
    const { userId, latitude, longitude, accuracy, reason } = req.body;

    if (!userId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'userId, latitude and longitude are required',
      });
    }

    const reading: SensorReading = {
      userId,
      timestamp: Date.now(),
      accelerometer: {
        x: 0,
        y: 0,
        z: 9.81,
      },
      gyroscope: {
        x: 0,
        y: 0,
        z: 0,
      },
      gps: {
        latitude,
        longitude,
        accuracy,
        speed: 0,
      },
    };

    const result = createAccidentEmergency(reading, {
      score: 100,
      status: 'EMERGENCY',
      factors: [reason === 'AUTO_ACCIDENT' ? 'AUTO_ACCIDENT' : 'MANUAL_SOS'],
      accelerationMagnitude: 9.81,
      rotationMagnitude: 0,
      speed: 0,
    });

    io.emit('emergency:created', result);
    io.emit('ambulance:emergency', result);

    return res.json({
      success: true,
      ...result,
    });
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('user:join', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined`);
    });

    socket.on('ambulance:join', (ambulanceId: string) => {
      socket.join(`ambulance:${ambulanceId}`);
      console.log(`Ambulance ${ambulanceId} connected`);
    });

    socket.on('sensor:reading', (reading: SensorReading) => {
      try {
        const previous = getPreviousReading(reading.userId);
        const detection = detectAccident(reading, previous);

        saveReading(reading.userId, reading);

        io.to(`user:${reading.userId}`).emit('detection:update', detection);

        if (
          detection.status === 'POSSIBLE_ACCIDENT' ||
          detection.status === 'EMERGENCY'
        ) {
          io.to(`user:${reading.userId}`).emit('accident:warning', {
            message: 'Possible accident detected. Are you okay?',
            countdown: 15,
            detection,
          });
        }
      } catch (error) {
        console.error('Sensor processing error:', error);
        socket.emit('server:error', {
          message: 'Unable to process sensor data',
        });
      }
    });

    socket.on('location:update', (data: { userId: string; latitude: number; longitude: number }) => {
      io.emit('user:location', data);
    });

    socket.on('ambulance:location', (data) => {
      io.emit('ambulance:location', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] LifeLine API listening on http://localhost:${config.port}`);
    console.log('[server] Socket.IO ready');
  });
}

main().catch((error) => {
  console.error('[server] fatal startup error', error);
  process.exit(1);
});
