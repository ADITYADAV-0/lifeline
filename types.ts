export type CaseStatus =
  | 'TRIGGERED'
  | 'ACCEPTED'
  | 'AMBULANCE_DISPATCHED'
  | 'INTAKE_COMPLETED'
  | 'BLOOD_RESERVED'
  | 'RENDEZVOUS_COMPLETED'
  | 'CASE_CLOSED';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RendezvousPoint {
  latitude: number;
  longitude: number;
  address: string;
  estimatedTimeArrival: string;
  distanceKm: number;
}

export interface EmergencyCase {
  id: string;
  citizenId: string;
  citizenName: string;
  bloodType: string;
  patientLocation: LocationPoint;
  ambulanceId?: string;
  assignedAmbulanceId?: string;
  ambulanceLocation?: LocationPoint;
  age?: number;
  gender?: string;
  triageNotes?: string;
  rendezvousPoint?: RendezvousPoint;
  status: CaseStatus;
  bloodReservationId?: string;
  createdAt: number;
  updatedAt: number;
}
