export type UserRole = 'citizen' | 'ambulance' | 'hospital' | 'government';

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
  type: 'Hospital' | 'Pharmacy' | 'Ambulance' | 'Urgent Care';
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

  hospitalName: string;

  equipment: string[];
}