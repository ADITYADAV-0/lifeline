import { GoogleGenAI } from '@google/genai';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app';
import { config } from './config';
import { connectDB } from './db';
import {
    acceptCase,
    calculateRendezvousPoint,
    createEmergencyCase,
    getActiveCase,
    getLedgerEntries,
    reserveBlood,
    submitIntake,
    verifyHandover,
} from './services/caseService';
import {
    cancelEmergency,
    getAllEmergencies,
    getEmergency,
} from './services/memoryStore';

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
    const reply = result.text || 'I understand your concern. Please provide more details so I can help better.';

    return res.json({
      reply: reply.trim(),
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

  // ---------------------------------------------------------------------------
  // Unified LifeLine Emergency Case Endpoints
  // ---------------------------------------------------------------------------

  app.get('/api/cases', (_req, res) => {
    const { getAllActiveCases } = require('./services/caseService');
    res.json({
      success: true,
      cases: getAllActiveCases(),
    });
  });

  app.post('/api/sos', (req, res) => {
    const { userId, userName, bloodType, latitude, longitude } = req.body;

    const newCase = createEmergencyCase({
      citizenId: userId || 'USER-101',
      citizenName: userName || 'David K. Miller',
      bloodType: bloodType || 'O-Negative',
      location: {
        latitude: latitude || 37.7749,
        longitude: longitude || -122.4194,
        address: '450 Mission St, Financial District',
      },
    });

    // Broadcast case creation across ALL roles simultaneously
    io.emit('case:created', newCase);
    io.emit('ambulance:emergency', newCase);
    io.emit('government:case_update', newCase);

    return res.json({
      success: true,
      case: newCase,
      ledger: getLedgerEntries(),
    });
  });

  app.post('/api/cases/:id/accept', (req, res) => {
    const { ambulanceId, ambulanceLoc } = req.body;
    try {
      const updatedCase = acceptCase(
        req.params.id,
        ambulanceId || 'AMB-101',
        ambulanceLoc || { latitude: 37.7833, longitude: -122.4167 },
      );

      // Broadcast to Citizen, Ambulance, and Government
      io.emit('case:accepted', updatedCase);
      io.emit('case:live_update', updatedCase);

      return res.json({ success: true, case: updatedCase });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cases/:id/intake', (req, res) => {
    try {
      const updatedCase = submitIntake(req.params.id, req.body);
      io.emit('intake:submitted', updatedCase);
      return res.json({ success: true, case: updatedCase });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cases/:id/reserve-blood', (req, res) => {
    const {
      bloodType,
      units,
      bloodBankId,
      bloodBankName,
      ambulanceLocation,
      bloodBankLocation,
      targetBloodBankLocation,
    } = req.body;

    try {
      const result = reserveBlood({
        caseId: req.params.id,
        bloodType: bloodType || 'O-Negative',
        units: units || 4,
        bloodBankId: bloodBankId || 'BB-CENTRAL',
        bloodBankName: bloodBankName || 'Central Health Regional Blood Bank',
        ambulanceLocation: ambulanceLocation || { latitude: 37.7780, longitude: -122.4180 },
        bloodBankLocation: bloodBankLocation || { latitude: 37.7850, longitude: -122.4100 },
        targetBloodBankLocation: targetBloodBankLocation || { latitude: 37.7900, longitude: -122.4050 },
      });

      // INSTANT BROADCAST TO BLOOD BANK ROLE (Triggers Pop-up Alert on Blood Bank Dashboard)
      io.emit('blood:reservation_alert', {
        reservation: result.reservation,
        case: result.updatedCase,
        rendezvousPoint: result.updatedCase.rendezvousPoint,
      });

      // Broadcast updated rendezvous marker to Citizen & Ambulance maps
      io.emit('case:live_update', result.updatedCase);
      io.emit('ledger:new_block', getLedgerEntries());

      return res.json({
        success: true,
        reservation: result.reservation,
        case: result.updatedCase,
        ledger: getLedgerEntries(),
      });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cases/verify-qr', (req, res) => {
    const { qrToken } = req.body;
    try {
      const result = verifyHandover(qrToken || 'LIFELINE-QR');

      // Simultaneous status update on Ambulance & Blood Bank screens
      io.emit('handover:completed', {
        reservation: result.reservation,
        case: result.updatedCase,
      });
      io.emit('case:live_update', result.updatedCase);
      io.emit('ledger:new_block', getLedgerEntries());

      return res.json({
        success: true,
        verified: true,
        reservation: result.reservation,
        case: result.updatedCase,
        ledger: getLedgerEntries(),
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/cases/:id/close', (req, res) => {
    try {
      const { closeCase } = require('./services/caseService');
      const updatedCase = closeCase(req.params.id, req.body);
      
      io.emit('case:closed', updatedCase);
      io.emit('case:live_update', updatedCase);
      io.emit('ledger:new_block', getLedgerEntries());

      return res.json({ success: true, case: updatedCase, ledger: getLedgerEntries() });
    } catch (err: any) {
      return res.status(404).json({ success: false, error: err.message });
    }
  });

  app.get('/api/cases/ledger', (_req, res) => {
    res.json({ success: true, ledger: getLedgerEntries() });
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

    socket.on('location:update', (data: { caseId: string; ambulanceLoc: any; courierLoc: any }) => {
      const activeCase = getActiveCase(data.caseId);
      if (activeCase && data.ambulanceLoc && data.courierLoc) {
        activeCase.ambulanceLocation = data.ambulanceLoc;
        activeCase.courierLocation = data.courierLoc;
        activeCase.rendezvousPoint = calculateRendezvousPoint(
          data.ambulanceLoc,
          data.courierLoc,
          { latitude: 37.7900, longitude: -122.4050 },
        );
        io.emit('case:live_update', activeCase);
      }
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
