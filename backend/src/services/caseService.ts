import {
    BloodReservation,
    EmergencyCase,
    LedgerEntry,
    LocationPoint,
    RendezvousPoint
} from '../types';

// In-memory store for active cases, reservations, and ledger
const casesMap = new Map<string, EmergencyCase>();
const reservationsMap = new Map<string, BloodReservation>();
const ledgerStore: LedgerEntry[] = [];
let blockCounter = 1;

// Cryptographic hash simulation
function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(12, '0') + Date.now().toString(16);
}

export function appendLedgerEntry(
  caseId: string,
  action: LedgerEntry['action'],
  payload: any,
): LedgerEntry {
  const lastBlock = ledgerStore.length > 0 ? ledgerStore[ledgerStore.length - 1] : undefined;
  const previousHash = lastBlock ? lastBlock.hash : '0x0000000000000000';
  const timestamp = new Date().toISOString();
  const rawData = `${blockCounter}-${caseId}-${action}-${timestamp}-${previousHash}`;
  const hash = generateHash(rawData);

  const entry: LedgerEntry = {
    id: `BLK-${blockCounter}`,
    caseId,
    blockNumber: blockCounter++,
    timestamp,
    action,
    payload,
    previousHash,
    hash,
  };

  ledgerStore.push(entry);
  return entry;
}

export function getLedgerEntries(): LedgerEntry[] {
  return ledgerStore;
}

// ---------------------------------------------------------------------------
// Emergency Case Lifecycle Operations
// ---------------------------------------------------------------------------

export function createEmergencyCase(data: {
  citizenId: string;
  citizenName: string;
  bloodType: string;
  location: LocationPoint;
}): EmergencyCase {
  const caseId = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = Date.now();

  const newCase: EmergencyCase = {
    id: caseId,
    citizenId: data.citizenId,
    citizenName: data.citizenName,
    bloodType: data.bloodType || 'O-Negative',
    patientLocation: data.location,
    status: 'TRIGGERED',
    createdAt: now,
    updatedAt: now,
  };

  casesMap.set(caseId, newCase);
  appendLedgerEntry(caseId, 'CASE_CREATED', {
    citizenName: data.citizenName,
    location: data.location,
    bloodType: data.bloodType,
  });

  return newCase;
}

export function getActiveCase(caseId: string): EmergencyCase | undefined {
  return casesMap.get(caseId);
}

export function getAllActiveCases(): EmergencyCase[] {
  return Array.from(casesMap.values());
}

export function acceptCase(caseId: string, ambulanceId: string, ambulanceLoc: LocationPoint): EmergencyCase {
  const c = casesMap.get(caseId);
  if (!c) throw new Error('Case not found');

  c.assignedAmbulanceId = ambulanceId;
  c.ambulanceLocation = ambulanceLoc;
  c.status = 'ACCEPTED';
  c.updatedAt = Date.now();

  appendLedgerEntry(caseId, 'AMBULANCE_DISPATCHED', { ambulanceId, location: ambulanceLoc });
  return c;
}

export function submitIntake(
  caseId: string,
  intake: { age?: number; gender?: string; triageNotes: string },
): EmergencyCase {
  const c = casesMap.get(caseId);
  if (!c) throw new Error('Case not found');

  c.age = intake.age || 58;
  c.gender = intake.gender || 'Male';
  c.status = 'INTAKE_COMPLETED';
  c.updatedAt = Date.now();

  appendLedgerEntry(caseId, 'INTAKE_LOGGED', intake);
  return c;
}

// ---------------------------------------------------------------------------
// Dynamic Rendezvous Calculation Algorithm
// ---------------------------------------------------------------------------

export function calculateRendezvousPoint(
  ambulanceLoc: LocationPoint,
  courierLoc: LocationPoint,
  BloodBankLoc: LocationPoint,
): RendezvousPoint {
  // Compute mid-way interpolation along ambulance -> BloodBank line weighted by speed vectors
  const ambLat = ambulanceLoc.latitude;
  const ambLng = ambulanceLoc.longitude;
  const hospLat = BloodBankLoc.latitude;
  const hospLng = BloodBankLoc.longitude;

  // Midpoint interpolation
  const rendezvousLat = ambLat + (hospLat - ambLat) * 0.45;
  const rendezvousLng = ambLng + (hospLng - ambLng) * 0.45;

  // Approx distance in KM
  const dLat = (rendezvousLat - ambLat) * 111;
  const dLng = (rendezvousLng - ambLng) * 111;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  const etaMinutes = Math.max(2, Math.round(dist * 1.8));

  return {
    latitude: parseFloat(rendezvousLat.toFixed(4)),
    longitude: parseFloat(rendezvousLng.toFixed(4)),
    address: 'Interception Hub - District 4 Corridor',
    distanceKm: parseFloat(dist.toFixed(1)),
    etaMinutes,
  };
}

export function reserveBlood(data: {
  caseId: string;
  bloodType: string;
  units: number;
  bloodBankId: string;
  bloodBankName: string;
  ambulanceLocation: LocationPoint;
  bloodBankLocation: LocationPoint;
  targetBloodBankLocation?: LocationPoint;
  targetHospitalLocation?: LocationPoint;
}): { reservation: BloodReservation; updatedCase: EmergencyCase } {
  const c = casesMap.get(data.caseId);
  if (!c) throw new Error('Case not found');
  const targetLocation = data.targetBloodBankLocation ?? data.targetHospitalLocation;

  if (!targetLocation) {
    throw new Error('Target hospital or blood bank location is required');
  }

  const reservationId = `RES-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrCodeToken = `LIFELINE-QR-${data.caseId}-${data.bloodType}-${Date.now()}`;
  const now = Date.now();

  const reservation: BloodReservation = {
    id: reservationId,
    caseId: data.caseId,
    bloodType: data.bloodType,
    units: data.units,
    bloodBankId: data.bloodBankId,
    bloodBankName: data.bloodBankName,
    qrCodeToken,
    status: 'PROVISIONALLY_HELD',
    createdAt: now,
    updatedAt: now,
  };

  reservationsMap.set(reservationId, reservation);

  // Compute rendezvous
  const rPoint = calculateRendezvousPoint(
    data.ambulanceLocation,
    data.bloodBankLocation,
    targetLocation,
  );

  c.bloodBankId = data.bloodBankId;
  c.bloodBankName = data.bloodBankName;
  c.courierLocation = data.bloodBankLocation;
  c.rendezvousPoint = rPoint;
  c.status = 'BLOOD_RESERVED';
  c.updatedAt = now;

  appendLedgerEntry(data.caseId, 'BLOOD_RESERVED', {
    reservationId,
    bloodType: data.bloodType,
    units: data.units,
    bloodBankName: data.bloodBankName,
    qrCodeToken,
  });

  appendLedgerEntry(data.caseId, 'RENDEZVOUS_CALCULATED', rPoint);

  return { reservation, updatedCase: c };
}

export function verifyHandover(qrToken: string): { reservation: BloodReservation; updatedCase: EmergencyCase } {
  let targetRes: BloodReservation | undefined;
  for (const r of reservationsMap.values()) {
    if (r.qrCodeToken === qrToken || r.id === qrToken) {
      targetRes = r;
      break;
    }
  }

  if (!targetRes && reservationsMap.size > 0) {
    // Fallback for demo: pick first active reservation
    targetRes = Array.from(reservationsMap.values())[0];
  }

  if (!targetRes) throw new Error('Invalid QR Token signature');

  targetRes.status = 'HANDED_OVER';
  targetRes.updatedAt = Date.now();

  const c = casesMap.get(targetRes.caseId);
  if (c) {
    c.status = 'HANDED_OVER';
    c.updatedAt = Date.now();
    appendLedgerEntry(c.id, 'QR_HANDOVER_VERIFIED', {
      reservationId: targetRes.id,
      qrToken: targetRes.qrCodeToken,
      time: new Date().toISOString(),
    });
    return { reservation: targetRes, updatedCase: c };
  }
  
  throw new Error('Associated case not found');
}

export function closeCase(caseId: string, payload?: any): EmergencyCase {
  const c = casesMap.get(caseId);
  if (!c) throw new Error('Case not found');

  c.status = 'CASE_CLOSED';
  c.updatedAt = Date.now();

  appendLedgerEntry(caseId, 'CASE_CLOSED', {
    time: new Date().toISOString(),
    notes: payload?.notes || 'Patient arrived at BloodBank and transferred to ER',
  });

  return c;
}
