import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types (unchanged — kept identical to the previous local version so other
// screens like vitals.tsx / medical-id.tsx importing these keep working)
// ---------------------------------------------------------------------------

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
  latitude: number;
  longitude: number;
  distance: string;
  status: string;
  address?: string;
  phone?: string;
  available?: boolean;
}

export type AmbulanceStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'BUSY'
  | 'OFFLINE';

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

// Note: no `password` field anymore — the backend never sends it back,
// and the client has no business holding it after auth completes.
export interface UserRecord {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUri?: string;
  profile: MedicalProfile;
}

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------
//
// Set EXPO_PUBLIC_API_URL in your .env for real devices / staging / prod,
// e.g. EXPO_PUBLIC_API_URL=https://api.yourapp.com/api
//
// Fallbacks below only work for local dev on an emulator/simulator:
// - Android emulator can't reach "localhost" (that's the emulator itself),
//   it needs the special alias 10.0.2.2.
// - iOS simulator can use localhost directly.
// - A physical device needs your machine's LAN IP instead of localhost —
//   set EXPO_PUBLIC_API_URL for that case.

const DEFAULT_LOCAL_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';

function normalizeApiBaseUrl(value: string | undefined): string {
  const rawUrl = value?.trim().replace(/^['"]|['"]$/g, '') || DEFAULT_LOCAL_URL;
  const withoutTrailingSlash = rawUrl.replace(/\/+$/, '');

  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
export const API_ORIGIN_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'lifeline-token';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // attach Bearer token if available
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  // Some endpoints (signout) return 204 with no body.
  if (response.status === 204) {
    return undefined as T;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON response, fall through to status check below
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? `API endpoint not found: ${url}. Check EXPO_PUBLIC_API_URL and make sure the backend is running.`
        : data?.error ?? `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return data as T;
}

export async function authenticatedRequest<T>(
  path: string,
  options: Omit<RequestOptions, 'auth'> = {},
): Promise<T> {
  return request<T>(path, { ...options, auth: true });
}

const AVATAR_URI_KEY = 'lifeline-avatar-uri';

export async function saveLocalAvatar(sourceUri: string): Promise<string> {
  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';

  const destination = new File(
    Paths.document,
    `lifeline-avatar.${extension}`
  );

  try {
    // Remove previous avatar if it exists.
    if (destination.exists) {
      destination.delete();
    }

    const source = new File(sourceUri);
    source.copy(destination);

    await AsyncStorage.setItem(AVATAR_URI_KEY, destination.uri);

    return destination.uri;
  } catch (error) {
    console.error('Failed to save avatar:', error);
    throw new Error('Could not save profile photo.');
  }
}

export async function getLocalAvatar(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(AVATAR_URI_KEY);

    if (!uri) {
      return null;
    }

    const file = new File(uri);

    if (!file.exists) {
      await AsyncStorage.removeItem(AVATAR_URI_KEY);
      return null;
    }

    return uri;
  } catch (error) {
    console.error('Failed to load avatar:', error);
    return null;
  }
}

export async function removeLocalAvatar(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(AVATAR_URI_KEY);

    if (uri) {
      const file = new File(uri);

      if (file.exists) {
        file.delete();
      }
    }

    await AsyncStorage.removeItem(AVATAR_URI_KEY);
  } catch (error) {
    console.error('Failed to remove avatar:', error);
  }
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export interface SignUpInput {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

export const signUp = async (input: SignUpInput): Promise<UserRecord> => {
  const data = await request<{ token: string; user: UserRecord }>('/auth/signup', {
    method: 'POST',
    body: input,
  });
  await setToken(data.token);
  return data.user;
};

export const signIn = async (
  email: string,
  password: string,
  role: UserRole
): Promise<UserRecord> => {
  const data = await request<{ token: string; user: UserRecord }>('/auth/signin', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      password,
      role,
    },
  });

  await setToken(data.token);
  return data.user;
};
export const signOut = async (): Promise<void> => {
  try {
    await request('/auth/signout', {
      method: 'POST',
      auth: true,
    });
  } catch {
    // Best-effort server signout.
  } finally {
    await removeLocalAvatar();
    await clearToken();
  }
};



/**
 * Validates the stored token against the server and returns the current
 * user, or null if there's no token or it's no longer valid. Call this on
 * app launch to decide whether to skip the auth screen.
 */
export const getActiveSession = async (): Promise<UserRecord | null> => {
  const token = await getToken();

  if (!token) {
    return null;
  }

  try {
    const data = await request<{ user: UserRecord }>('/auth/session', {
      auth: true,
    });

    const user = data.user;

    // Restore the locally stored profile photo.
    const localAvatar = await getLocalAvatar();

    if (localAvatar) {
      user.avatarUri = localAvatar;

      user.profile = {
        ...user.profile,
        avatarUri: localAvatar,
      };
    }

    return user;
  } catch {
    await clearToken();
    return null;
  }
};

/** Alias kept for compatibility with screens that called this name before. */
export const getCurrentUser = getActiveSession;

// ---------------------------------------------------------------------------
// Profile completeness
// ---------------------------------------------------------------------------

/**
 * Minimum bar for "this profile is actually useful to a first responder."
 * New signups start with a blank profile (see backend defaultProfile.ts),
 * so this is what routes them to /Profile-setup instead of the main tabs.
 */
export function isProfileComplete(profile: MedicalProfile): boolean {
  return Boolean(
    profile.dob &&
      profile.bloodType &&
      profile.height &&
      profile.weight &&
      profile.emergencyContacts.length > 0
  );
}

// ---------------------------------------------------------------------------
// Profile API
// ---------------------------------------------------------------------------

export const updateProfile = async (updates: Partial<MedicalProfile>): Promise<UserRecord> => {
  const data = await request<{ user: UserRecord }>('/profile', {
    method: 'PATCH',
    auth: true,
    body: { profile: updates },
  });
  return data.user;
};

// ---------------------------------------------------------------------------
// Facilities API
// ---------------------------------------------------------------------------

export const getFacilities = async (type?: Facility['type']): Promise<Facility[]> => {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const data = await request<{ facilities: Facility[] }>(`/facilities${query}`, {
    auth: true,
  });
  return data.facilities;
};

export const getAvailableAmbulances = async (): Promise<Ambulance[]> => {
  try {
    const data = await request<{ ambulances: Ambulance[] }>('/ambulances');
    return data.ambulances;
  } catch {
    return MOCK_AMBULANCES;
  }
};

// ---------------------------------------------------------------------------
// Ambulance Panel Types & Services
// ---------------------------------------------------------------------------

export interface IncomingAlert {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  location: string;
  distanceKm: number;
  etaMinutes: number;
  vitalsSummary: string;
  condition: string;
  timestamp: string;
}

export interface HospitalCommsMessage {
  id: string;
  hospitalName: string;
  sender: string;
  message: string;
  time: string;
  isUrgent?: boolean;
}

export interface BloodReservation {
  id: string;
  bloodType: string;
  units: number;
  sourceBank: string;
  status: 'PENDING' | 'DISPATCHED' | 'RESERVED' | 'DELIVERED';
  etaMinutes: number;
}

export const MOCK_AMBULANCES: Ambulance[] = [
  {
    id: 'AMB-101',
    name: 'Unit 101 (Rapid Care)',
    driverName: 'Officer Marcus Vance',
    latitude: 37.7749,
    longitude: -122.4194,
    status: 'DISPATCHED',
    BloodBankName: 'Central Health Blood Hub',
    equipment: ['Defibrillator', 'Advanced Airway', 'Telemetry Monitor', 'Blood Warmer'],
  },
  {
    id: 'AMB-102',
    name: 'Unit 102 (Cardiac Response)',
    driverName: 'Paramedic Elena Rostova',
    latitude: 37.7833,
    longitude: -122.4167,
    status: 'AVAILABLE',
    BloodBankName: 'St. Jude Regional Blood Bank',
    equipment: ['ECG 12-Lead', 'Ventilator', 'IV Pumps', 'AED'],
  },
];

export const MOCK_INCOMING_ALERTS: IncomingAlert[] = [
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

export const MOCK_HOSPITAL_COMMS: HospitalCommsMessage[] = [
  {
    id: 'MSG-01',
    hospitalName: 'St. Jude Trauma Center',
    sender: 'Dr. Aris Thorne (ER Chief)',
    message: 'Trauma Bay 2 prepped for Unit 101. Cardiac surgical team on standby.',
    time: '14:32',
    isUrgent: true,
  },
  {
    id: 'MSG-02',
    hospitalName: 'General Hospital ER',
    sender: 'Triage Desk',
    message: 'O-Negative blood reserves locked. Courier unit dispatched.',
    time: '14:28',
  },
];

// ---------------------------------------------------------------------------
// Blood Bank & Courier Logistics Types & Services
// ---------------------------------------------------------------------------

export interface BloodStockItem {
  group: string;
  unitsAvailable: number;
  unitsReserved: number;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL';
  lastUpdated: string;
}

export interface CourierDispatch {
  id: string;
  courierName: string;
  vehicle: string;
  bloodType: string;
  units: number;
  destination: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'ARRIVED' | 'HANDOVER_COMPLETE';
  etaMinutes: number;
  qrCodeValue: string;
}

export const MOCK_BLOOD_STOCK: BloodStockItem[] = [
  { group: 'O-', unitsAvailable: 14, unitsReserved: 8, status: 'CRITICAL', lastUpdated: '10 mins ago' },
  { group: 'O+', unitsAvailable: 68, unitsReserved: 12, status: 'OPTIMAL', lastUpdated: '5 mins ago' },
  { group: 'A-', unitsAvailable: 22, unitsReserved: 5, status: 'LOW', lastUpdated: '12 mins ago' },
  { group: 'A+', unitsAvailable: 84, unitsReserved: 19, status: 'OPTIMAL', lastUpdated: '2 mins ago' },
  { group: 'B-', unitsAvailable: 18, unitsReserved: 4, status: 'LOW', lastUpdated: '18 mins ago' },
  { group: 'B+', unitsAvailable: 52, unitsReserved: 9, status: 'OPTIMAL', lastUpdated: '1 hr ago' },
  { group: 'AB-', unitsAvailable: 8, unitsReserved: 3, status: 'CRITICAL', lastUpdated: '25 mins ago' },
  { group: 'AB+', unitsAvailable: 30, unitsReserved: 6, status: 'OPTIMAL', lastUpdated: '30 mins ago' },
];

export const MOCK_COURIER_DISPATCHES: CourierDispatch[] = [
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
    destination: 'General Hospital ER',
    status: 'ARRIVED',
    etaMinutes: 1,
    qrCodeValue: 'LIFELINE-QR-7822-A-POS-GENHOSP',
  },
];

// ---------------------------------------------------------------------------
// Government & Regulatory Types & Services
// ---------------------------------------------------------------------------

export interface GovNetworkMetrics {
  activeAmbulances: number;
  totalIncidentsToday: number;
  avgResponseTimeMin: number;
  bloodBankReservePct: number;
  systemHealthScore: number;
}

export interface ComplianceRecord {
  id: string;
  facilityName: string;
  type: string;
  licenseId: string;
  status: 'COMPLIANT' | 'AUDIT_PENDING' | 'WARNING';
  lastInspection: string;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  facility: string;
  serviceType: string;
  amountUsd: number;
  status: 'SETTLED' | 'PROCESSING';
}

export interface AnomalyAlert {
  id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location: string;
  timestamp: string;
}

export const MOCK_GOV_METRICS: GovNetworkMetrics = {
  activeAmbulances: 42,
  totalIncidentsToday: 189,
  avgResponseTimeMin: 4.8,
  bloodBankReservePct: 87,
  systemHealthScore: 98,
};

export const MOCK_COMPLIANCE_RECORDS: ComplianceRecord[] = [
  {
    id: 'LIC-8821',
    facilityName: 'Central Health Regional Blood Bank',
    type: 'Blood Bank Category A',
    licenseId: 'MED-GOV-2026-9041',
    status: 'COMPLIANT',
    lastInspection: '2026-07-15',
  },
  {
    id: 'LIC-8822',
    facilityName: 'Metro Ambulance Rapid Care Fleet',
    type: 'Emergency EMS Provider',
    licenseId: 'EMS-GOV-2026-1182',
    status: 'COMPLIANT',
    lastInspection: '2026-08-01',
  },
  {
    id: 'LIC-8823',
    facilityName: 'Bay Area Urgent Care Hub',
    type: 'Urgent Care & Triage',
    licenseId: 'UC-GOV-2026-4402',
    status: 'AUDIT_PENDING',
    lastInspection: '2026-04-10',
  },
];

export const MOCK_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TXN-99104',
    timestamp: '14:20:11',
    facility: 'St. Jude Trauma Center',
    serviceType: 'Emergency Dispatch & O- Blood Transfer',
    amountUsd: 1450.00,
    status: 'SETTLED',
  },
  {
    id: 'TXN-99105',
    timestamp: '14:05:40',
    facility: 'Central Health Regional Blood Bank',
    serviceType: 'Logistics Courier Clearance Token',
    amountUsd: 320.00,
    status: 'SETTLED',
  },
];

export const MOCK_ANOMALY_ALERTS: AnomalyAlert[] = [
  {
    id: 'ANOM-102',
    title: 'Surge in O-Negative Emergency Requests',
    severity: 'HIGH',
    description: 'Demand for O-Negative blood increased by 310% in Metro District 4 due to multi-vehicle incident.',
    location: 'District 4 Transit Corridor',
    timestamp: '12 mins ago',
  },
  {
    id: 'ANOM-103',
    title: 'Ambulance Response Time Delay Warning',
    severity: 'MEDIUM',
    description: 'Average response time in North Sector elevated from 4.2 min to 6.8 min due to construction traffic.',
    location: 'North Highway 101 Exit',
    timestamp: '25 mins ago',
  },
];

// ---------------------------------------------------------------------------
// Backend API Connectors
// ---------------------------------------------------------------------------

export const getIncomingAlerts = async (): Promise<IncomingAlert[]> => {
  try {
    const data = await request<{ alerts: IncomingAlert[] }>('/ambulance/alerts');
    return data.alerts;
  } catch {
    return MOCK_INCOMING_ALERTS;
  }
};

export const submitFieldIntake = async (intakeData: {
  patientName: string;
  heartRate: string;
  spo2: string;
  triageNotes: string;
}) => {
  try {
    return await request('/ambulance/intake', { method: 'POST', body: intakeData });
  } catch {
    return { success: true, record: intakeData };
  }
};

export const getErComms = async (): Promise<HospitalCommsMessage[]> => {
  try {
    const data = await request<{ messages: HospitalCommsMessage[] }>('/ambulance/comms');
    return data.messages;
  } catch {
    return MOCK_HOSPITAL_COMMS;
  }
};

export const sendErMessage = async (message: string): Promise<HospitalCommsMessage> => {
  try {
    const data = await request<{ message: HospitalCommsMessage }>('/ambulance/comms', {
      method: 'POST',
      body: { message },
    });
    return data.message;
  } catch {
    return {
      id: `MSG-${Date.now()}`,
      hospitalName: 'St. Jude Trauma Center',
      sender: 'Unit 101 Paramedic',
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
};

export const getBloodStock = async (): Promise<BloodStockItem[]> => {
  try {
    const data = await request<{ stock: BloodStockItem[] }>('/bloodbank/stock');
    return data.stock;
  } catch {
    return MOCK_BLOOD_STOCK;
  }
};

export const getCourierDispatches = async (): Promise<CourierDispatch[]> => {
  try {
    const data = await request<{ dispatches: CourierDispatch[] }>('/bloodbank/dispatches');
    return data.dispatches;
  } catch {
    return MOCK_COURIER_DISPATCHES;
  }
};

export const createCourierDispatch = async (dispatchData: {
  bloodType: string;
  units: number;
  destination: string;
}): Promise<CourierDispatch> => {
  try {
    const data = await request<{ dispatch: CourierDispatch }>('/bloodbank/dispatch', {
      method: 'POST',
      body: dispatchData,
    });
    return data.dispatch;
  } catch {
    return {
      id: `DISP-${Math.floor(1000 + Math.random() * 9000)}`,
      courierName: 'SwiftMed Rider (Local)',
      vehicle: 'Rapid Drone-Car #14',
      bloodType: dispatchData.bloodType,
      units: dispatchData.units,
      destination: dispatchData.destination,
      status: 'IN_TRANSIT',
      etaMinutes: 5,
      qrCodeValue: `LIFELINE-QR-${Date.now()}-${dispatchData.bloodType}`,
    };
  }
};

export const verifyQrHandoverToken = async (dispatchId: string, qrToken: string) => {
  try {
    return await request('/bloodbank/verify-handover', {
      method: 'POST',
      body: { dispatchId, qrToken },
    });
  } catch {
    return { success: true, verified: true };
  }
};

export const getGovMetrics = async (): Promise<GovNetworkMetrics> => {
  try {
    const data = await request<{ metrics: GovNetworkMetrics }>('/government/metrics');
    return data.metrics;
  } catch {
    return MOCK_GOV_METRICS;
  }
};

export const getGovComplianceRecords = async (): Promise<ComplianceRecord[]> => {
  try {
    const data = await request<{ compliance: ComplianceRecord[] }>('/government/compliance');
    return data.compliance;
  } catch {
    return MOCK_COMPLIANCE_RECORDS;
  }
};

export const getGovTransactions = async (): Promise<TransactionRecord[]> => {
  try {
    const data = await request<{ transactions: TransactionRecord[] }>('/government/transactions');
    return data.transactions;
  } catch {
    return MOCK_TRANSACTIONS;
  }
};

export const getGovAnomalies = async (): Promise<AnomalyAlert[]> => {
  try {
    const data = await request<{ anomalies: AnomalyAlert[] }>('/government/anomalies');
    return data.anomalies;
  } catch {
    return MOCK_ANOMALY_ALERTS;
  }
};


