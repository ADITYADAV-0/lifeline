export type UserRole = 'citizen' | 'ambulance' | 'BloodBank' | 'government';

export interface Contact {
  name: string;
  relation: string;
  phone: string;
}

export interface Condition {
  name: string;
  detail: string;
  severity: 'critical' | 'info';
}

export interface Allergy {
  name: string;
  severity: string;
}

export interface Medication {
  name: string;
  dose: string;
  schedule: string;
}

export interface VitalSnapshot {
  heartRate: number;
  bloodOxygen: number;
  status: string;
  lastUpdated: string;
}

export interface MedicalEvent {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'BloodBank' | 'Pharmacy' | 'Ambulance' | 'Urgent Care';
  distance: string;
  status: string;
  lat: number;
  lng: number;
}

export interface MedicalProfile {
  avatarUri?: string;
  dob: string;
  bloodType: string;
  height: string;
  weight: string;
  organDonor: boolean;
  conditions: Condition[];
  allergies: Allergy[];
  medications: Medication[];
  emergencyContacts: Contact[];
  physician: {
    name: string;
    clinic: string;
    phone: string;
  };
  vitals: VitalSnapshot;
  events: MedicalEvent[];
}

export type AccidentStatus =
  | 'NORMAL'
  | 'POSSIBLE_ACCIDENT'
  | 'EMERGENCY';

export type AmbulanceStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'BUSY'
  | 'OFFLINE';

export interface SensorReading {
  userId: string;

  timestamp: number;

  accelerometer: {
    x: number;
    y: number;
    z: number;
  };

  gyroscope: {
    x: number;
    y: number;
    z: number;
  };

  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
  };
}

export interface DetectionResult {
  score: number;

  status: AccidentStatus;

  factors: string[];

  accelerationMagnitude: number;

  rotationMagnitude: number;

  speed: number;
}

export interface EmergencyEvent {
  id: string;

  userId: string;

  createdAt: number;

  status: 'DETECTED' | 'CONFIRMED' | 'CANCELLED';

  score: number;

  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  factors: string[];

  ambulanceId?: string;
}

export interface Ambulance {
  id: string;

  name: string;

  driverName: string;

  latitude: number;

  longitude: number;

  status: AmbulanceStatus;

  BloodBankName: string;

  equipment: string[];
}

export type CaseStatus =
  | 'TRIGGERED'
  | 'ACCEPTED'
  | 'INTAKE_COMPLETED'
  | 'BLOOD_RESERVED'
  | 'EN_ROUTE_RENDEZVOUS'
  | 'HANDED_OVER'
  | 'ARRIVED_BloodBank'
  | 'CASE_CLOSED';

export type ReservationStatus =
  | 'REQUESTED'
  | 'PROVISIONALLY_HELD'
  | 'DISPATCHED'
  | 'RENDEZVOUS_SET'
  | 'HANDED_OVER'
  | 'DELIVERED';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
  speed?: number;
  heading?: number;
}

export interface RendezvousPoint {
  latitude: number;
  longitude: number;
  address: string;
  etaMinutes: number;
  distanceKm: number;
}

export interface EmergencyCase {
  id: string;
  citizenId: string;
  citizenName: string;
  bloodType: string;
  age?: number;
  gender?: string;
  medicalProfile?: MedicalProfile;
  patientLocation: LocationPoint;
  ambulanceLocation?: LocationPoint;
  courierLocation?: LocationPoint;
  rendezvousPoint?: RendezvousPoint;
  assignedAmbulanceId?: string;
  assignedCourierId?: string;
  targetBloodBankId?: string;
  targetBloodBankName?: string;
  bloodBankId?: string;
  bloodBankName?: string;
  status: CaseStatus;
  createdAt: number;
  updatedAt: number;
}

export interface BloodReservation {
  id: string;
  caseId: string;
  bloodType: string;
  units: number;
  bloodBankId: string;
  bloodBankName: string;
  targetBloodBankId?: string;
  targetBloodBankName?: string;
  qrCodeToken: string;
  status: ReservationStatus;
  createdAt: number;
  updatedAt: number;
}

export interface LedgerEntry {
  id: string;
  caseId: string;
  blockNumber: number;
  timestamp: string;
  action:
    | 'CASE_CREATED'
    | 'AMBULANCE_DISPATCHED'
    | 'INTAKE_LOGGED'
    | 'BLOOD_RESERVED'
    | 'RENDEZVOUS_CALCULATED'
    | 'QR_HANDOVER_VERIFIED'
    | 'BloodBank_DELIVERY_COMPLETED'
    | 'CASE_CLOSED';
  payload: any;
  previousHash: string;
  hash: string;
}