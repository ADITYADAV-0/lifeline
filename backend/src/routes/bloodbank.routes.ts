import { Router } from 'express';

const router = Router();

let stock = [
  { group: 'O-', unitsAvailable: 14, unitsReserved: 8, status: 'CRITICAL', lastUpdated: '10 mins ago' },
  { group: 'O+', unitsAvailable: 68, unitsReserved: 12, status: 'OPTIMAL', lastUpdated: '5 mins ago' },
  { group: 'A-', unitsAvailable: 22, unitsReserved: 5, status: 'LOW', lastUpdated: '12 mins ago' },
  { group: 'A+', unitsAvailable: 84, unitsReserved: 19, status: 'OPTIMAL', lastUpdated: '2 mins ago' },
  { group: 'B-', unitsAvailable: 18, unitsReserved: 4, status: 'LOW', lastUpdated: '18 mins ago' },
  { group: 'B+', unitsAvailable: 52, unitsReserved: 9, status: 'OPTIMAL', lastUpdated: '1 hr ago' },
  { group: 'AB-', unitsAvailable: 8, unitsReserved: 3, status: 'CRITICAL', lastUpdated: '25 mins ago' },
  { group: 'AB+', unitsAvailable: 30, unitsReserved: 6, status: 'OPTIMAL', lastUpdated: '30 mins ago' },
];

let dispatches = [
  {
    id: 'DISP-7821',
    courierName: 'SwiftMed Rider #4 (Kevon)',
    vehicle: 'Rapid Drone-Car #09',
    bloodType: 'O-Negative',
    units: 4,
    destination: 'St. Jude Trauma Bay 2 (En route)',
    status: 'IN_TRANSIT',
    etaMinutes: 6,
    qrCodeValue: 'LIFELINE-QR-7821-O-NEG-STJUDE',
  },
  {
    id: 'DISP-7822',
    courierName: 'Express Courier #12 (Maria)',
    vehicle: 'Medical EV Unit B',
    bloodType: 'A-Positive',
    units: 6,
    destination: 'General BloodBank ER',
    status: 'ARRIVED',
    etaMinutes: 1,
    qrCodeValue: 'LIFELINE-QR-7822-A-POS-GENHOSP',
  },
];

// Fetch live stock
router.get('/stock', (_req, res) => {
  res.json({ success: true, stock });
});

// Fetch courier dispatches
router.get('/dispatches', (_req, res) => {
  res.json({ success: true, dispatches });
});

// Launch new courier dispatch
router.post('/dispatch', (req, res) => {
  const { bloodType, units, destination } = req.body;
  if (!bloodType || !destination) {
    return res.status(400).json({ error: 'bloodType and destination are required' });
  }
  const newDispatch = {
    id: `DISP-${Math.floor(1000 + Math.random() * 9000)}`,
    courierName: 'SwiftMed Rapid Courier Unit',
    vehicle: 'Medical Drone-Car #14',
    bloodType,
    units: parseInt(units, 10) || 2,
    destination,
    status: 'IN_TRANSIT',
    etaMinutes: 5,
    qrCodeValue: `LIFELINE-QR-${Date.now()}-${bloodType}`,
  };

  dispatches.unshift(newDispatch);
  res.json({ success: true, dispatch: newDispatch });
});

// Verify QR handover token
router.post('/verify-handover', (req, res) => {
  const { dispatchId, qrToken } = req.body;
  const dispatch = dispatches.find((d) => d.id === dispatchId || d.qrCodeValue === qrToken);

  if (dispatch) {
    dispatch.status = 'HANDOVER_COMPLETE';
    return res.json({ success: true, verified: true, dispatch });
  }

  res.status(400).json({ success: false, error: 'Invalid QR token signature' });
});

export default router;
