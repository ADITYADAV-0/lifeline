import { Ambulance } from '../types';

const ambulances: Ambulance[] = [
  {
    id: 'AMB-101',
    name: 'LifeLine Ambulance 101',
    driverName: 'Raj Kumar',
    latitude: 26.8467,
    longitude: 80.9462,
    status: 'AVAILABLE',
    BloodBankName: 'City Emergency BloodBank',
    equipment: [
      'Oxygen',
      'Cardiac Monitor',
      'First Aid',
    ],
  },

  {
    id: 'AMB-102',
    name: 'LifeLine Ambulance 102',
    driverName: 'Amit Singh',
    latitude: 26.8650,
    longitude: 80.9500,
    status: 'AVAILABLE',
    BloodBankName: 'Apollo Emergency Center',
    equipment: [
      'Oxygen',
      'Ventilator',
      'Cardiac Monitor',
    ],
  },

  {
    id: 'AMB-103',
    name: 'LifeLine Ambulance 103',
    driverName: 'Vikas Sharma',
    latitude: 26.8200,
    longitude: 80.9000,
    status: 'BUSY',
    BloodBankName: 'Medanta Emergency',
    equipment: [
      'Oxygen',
      'First Aid',
    ],
  },
];

function distanceInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export function getAvailableAmbulances() {
  return ambulances.filter(
    (ambulance) => ambulance.status === 'AVAILABLE',
  );
}

export function findNearestAmbulance(
  latitude: number,
  longitude: number,
) {
  const available = getAvailableAmbulances();

  if (available.length === 0) {
    return null;
  }

  const [firstAvailable, ...remainingAvailable] = available;

  if (!firstAvailable) {
    return null;
  }

  let nearest = firstAvailable;

  let nearestDistance = distanceInKm(
    latitude,
    longitude,
    nearest.latitude,
    nearest.longitude,
  );

  for (const ambulance of remainingAvailable) {
    const distance = distanceInKm(
      latitude,
      longitude,
      ambulance.latitude,
      ambulance.longitude,
    );

    if (distance < nearestDistance) {
      nearest = ambulance;
      nearestDistance = distance;
    }
  }

  return {
    ambulance: nearest,
    distanceKm: Number(nearestDistance.toFixed(2)),
  };
}

export function dispatchAmbulance(
  ambulanceId: string,
) {
  const ambulance = ambulances.find(
    (item) => item.id === ambulanceId,
  );

  if (!ambulance) {
    return null;
  }

  ambulance.status = 'DISPATCHED';

  return ambulance;
}

export function updateAmbulanceLocation(
  ambulanceId: string,
  latitude: number,
  longitude: number,
) {
  const ambulance = ambulances.find(
    (item) => item.id === ambulanceId,
  );

  if (!ambulance) {
    return null;
  }

  ambulance.latitude = latitude;
  ambulance.longitude = longitude;

  return ambulance;
}
