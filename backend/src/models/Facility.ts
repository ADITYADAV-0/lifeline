import { Schema, model, Document } from 'mongoose';

export interface FacilityDocument extends Document {
  name: string;
  type: 'BloodBank' | 'Pharmacy' | 'Ambulance' | 'Urgent Care';
  distance: string;
  status: string;
  lat: number;
  lng: number;
}

const FacilitySchema = new Schema<FacilityDocument>({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['BloodBank', 'Pharmacy', 'Ambulance', 'Urgent Care'],
  },
  distance: String,
  status: String,
  lat: Number,
  lng: Number,
});

export const FacilityModel = model<FacilityDocument>('Facility', FacilitySchema);
