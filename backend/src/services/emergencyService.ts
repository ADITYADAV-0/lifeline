import { randomUUID } from 'crypto';

import {
    createEmergency,
} from './memoryStore';

import {
    dispatchAmbulance,
    findNearestAmbulance,
} from './ambulanceService';

import { DetectionResult, SensorReading } from '../types';

export function createAccidentEmergency(
  reading: SensorReading,
  detection: DetectionResult,
) {
  const nearest = findNearestAmbulance(
    reading.gps.latitude,
    reading.gps.longitude,
  );

  const location = {
    latitude: reading.gps.latitude,
    longitude: reading.gps.longitude,
    ...(reading.gps.accuracy !== undefined
      ? { accuracy: reading.gps.accuracy }
      : {}),
  };

  const emergency = createEmergency({
    id: randomUUID(),

    userId: reading.userId,

    createdAt: Date.now(),

    status: 'DETECTED',

    score: detection.score,

    location,

    factors: detection.factors,

    ...(nearest ? { ambulanceId: nearest.ambulance.id } : {}),
  });

  /*
   * Dispatch the ambulance.
   */

  if (nearest) {
    dispatchAmbulance(nearest.ambulance.id);
  }

  return {
    emergency,

    ambulance: nearest
      ? {
          ...nearest.ambulance,
          distanceKm: nearest.distanceKm,
        }
      : null,
  };
}
