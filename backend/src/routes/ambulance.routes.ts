import { Router } from 'express';

const router = Router();

// Mock store in memory
let alerts = [
  {
    id: 'ALT-9041',
    patientName: 'David K. Miller',
    age: 58,
    gender: 'Male',
    priority: 'CRITICAL',
    location: '450 Mission St, Financial District',
    distanceKm: 1.8,
    etaMinutes: 4,
    vitalsSummary: 'HR: 138 bpm | SpO2: 89% | BP: 90/60',
    condition: 'Acute Coronary Syndrome & Severe Dyspnea',
    timestamp: '2 mins ago',
  },
  {
    id: 'ALT-9042',
    patientName: 'Sarah Jenkins',
    age: 34,
    gender: 'Female',
    priority: 'HIGH',
    location: '780 Valencia St, Mission District',
    distanceKm: 3.2,
    etaMinutes: 7,
    vitalsSummary: 'HR: 110 bpm | SpO2: 95% | BP: 118/76',
    condition: 'Multi-Trauma (Motorcycle collision)',
    timestamp: '8 mins ago',
  },
];

let comms = [
  {
    id: 'MSG-01',
    BloodBankName: 'St. Jude Trauma Center',
    sender: 'Dr. Aris Thorne (ER Chief)',
    message: 'Trauma Bay 2 prepped for Unit 101. Cardiac surgical team on standby.',
    time: '14:32',
    isUrgent: true,
  },
  {
    id: 'MSG-02',
    BloodBankName: 'General BloodBank ER',
    sender: 'Triage Desk',
    message: 'O-Negative blood reserves locked. Courier unit dispatched.',
    time: '14:28',
  },
];

let intakes: any[] = [];

// Fetch incoming dispatch alerts
router.get('/alerts', (_req, res) => {
  res.json({ success: true, alerts });
});

// Submit field triage intake record
router.post('/intake', (req, res) => {
  const { patientName, heartRate, spo2, triageNotes } = req.body;
  const record = {
    id: `INT-${Date.now()}`,
    patientName,
    heartRate,
    spo2,
    triageNotes,
    timestamp: new Date().toISOString(),
  };
  intakes.unshift(record);
  res.json({ success: true, record });
});

// Fetch ER comms messages
router.get('/comms', (_req, res) => {
  res.json({ success: true, messages: comms });
});

// Post message to ER comms
router.post('/comms', (req, res) => {
  const { sender, message, BloodBankName } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  const newMsg = {
    id: `MSG-${Date.now()}`,
    BloodBankName: BloodBankName || 'St. Jude Trauma Center',
    sender: sender || 'Unit 101 Paramedic',
    message,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  comms.unshift(newMsg);
  res.json({ success: true, message: newMsg });
});

// Reserve emergency blood
router.post('/reserve-blood', (req, res) => {
  const { bloodType, units, targetBloodBank } = req.body;
  res.json({
    success: true,
    reservation: {
      id: `RES-${Date.now()}`,
      bloodType,
      units: units || 2,
      targetBloodBank: targetBloodBank || 'St. Jude ER',
      status: 'RESERVED_AND_DISPATCHED',
      etaMinutes: 6,
    },
  });
});

export default router;
