import AsyncStorage from '@react-native-async-storage/async-storage';

export type RoleProfileRole = 'ambulance' | 'BloodBank' | 'government';

export interface AmbulanceProfile {
  fullName: string;
  licenseId: string;
  vehicleNumber: string;
  baseBloodBank: string;
  yearsExperience: string;
  phone: string;
}

export interface BloodBankProfile {
  organizationName: string;
  facilityType: string;
  licenseNumber: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string;
  contactPhone: string;
  operatingHours: string;
}

export type HospitalProfile = BloodBankProfile;

export interface GovernmentProfile {
  fullName: string;
  department: string;
  designation: string;
  employeeNumber: string;
  jurisdiction: string;
  phone: string;
}

export type RoleProfile = AmbulanceProfile | BloodBankProfile | GovernmentProfile;

const profileKey = (role: RoleProfileRole, userId: string) => {
  const storageRole = role === 'BloodBank' ? 'hospital' : role;
  return `lifeline-role-profile:${storageRole}:${userId}`;
};

export async function getRoleProfile<T extends RoleProfile>(
  role: RoleProfileRole,
  userId: string,
): Promise<T | null> {
  const stored = await AsyncStorage.getItem(profileKey(role, userId));
  return stored ? (JSON.parse(stored) as T) : null;
}

export async function saveRoleProfile<T extends RoleProfile>(
  role: RoleProfileRole,
  userId: string,
  profile: T,
): Promise<T> {
  await AsyncStorage.setItem(profileKey(role, userId), JSON.stringify(profile));
  return profile;
}

export async function hasRoleProfile(
  role: RoleProfileRole,
  userId: string,
): Promise<boolean> {
  return Boolean(await AsyncStorage.getItem(profileKey(role, userId)));
}
