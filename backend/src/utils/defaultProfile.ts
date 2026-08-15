import { MedicalProfile } from '../types';

/**
 * Every new account starts with a blank-ish profile the user fills in later.
 * Kept intentionally minimal (unlike demo/seed data) so real signups don't
 * inherit fake medical info.
 */
export function buildDefaultProfile(): MedicalProfile {
  return {
    avatarUri: '',
    dob: '',
    bloodType: '',
    height: '',
    weight: '',
    organDonor: false,
    conditions: [],
    allergies: [],
    medications: [],
    emergencyContacts: [],
    physician: { name: '', clinic: '', phone: '' },
    vitals: {
      heartRate: 0,
      bloodOxygen: 0,
      status: 'No data yet',
      lastUpdated: 'Never',
    },
    events: [],
  };
}
