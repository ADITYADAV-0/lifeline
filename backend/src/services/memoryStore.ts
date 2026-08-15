import { EmergencyEvent, SensorReading } from '../types';

const previousReadings = new Map<
  string,
  SensorReading
>();

const emergencies = new Map<
  string,
  EmergencyEvent
>();

export function getPreviousReading(userId: string) {
  return previousReadings.get(userId);
}

export function saveReading(
  userId: string,
  reading: SensorReading,
) {
  previousReadings.set(userId, reading);
}

export function createEmergency(
  emergency: EmergencyEvent,
) {
  emergencies.set(emergency.id, emergency);

  return emergency;
}

export function getEmergency(id: string) {
  return emergencies.get(id);
}

export function getAllEmergencies() {
  return Array.from(emergencies.values());
}

export function cancelEmergency(id: string) {
  const emergency = emergencies.get(id);

  if (!emergency) {
    return null;
  }

  emergency.status = 'CANCELLED';

  return emergency;
}