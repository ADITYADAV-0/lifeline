import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startSOSLocationTracking,
  stopSOSLocationTracking,
} from '@/services/task/locationService';
import { API_BASE_URL } from '@/services/appData';

const SOS_ACTIVE_KEY = 'lifeline-sos-active';

export async function isSOSActive(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SOS_ACTIVE_KEY);
  return value === 'true';
}

async function setSOSState(active: boolean) {
  await AsyncStorage.setItem(
    SOS_ACTIVE_KEY,
    active ? 'true' : 'false'
  );
}

/**
 * Start SOS location sharing.
 */
export async function enableSOSLocationSharing() {
  await startSOSLocationTracking();

  await setSOSState(true);

  console.log('SOS location sharing ENABLED');
}

/**
 * Stop SOS location sharing.
 */
export async function disableSOSLocationSharing() {
  try {
    await stopSOSLocationTracking();
  } finally {
    await setSOSState(false);
  }

  console.log('SOS location sharing DISABLED');
}