import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types (unchanged — kept identical to the previous local version so other
// screens like vitals.tsx / medical-id.tsx importing these keep working)
// ---------------------------------------------------------------------------

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
  hospitalName: string;
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

export const signIn = async (email: string, password: string): Promise<UserRecord> => {
  const data = await request<{ token: string; user: UserRecord }>('/auth/signin', {
    method: 'POST',
    body: { email, password },
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
  const data = await request<{ ambulances: Ambulance[] }>('/ambulances');
  return data.ambulances;
};
