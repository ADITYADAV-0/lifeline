import { Document, Schema, Types, model } from 'mongoose';
import { MedicalProfile, UserRole } from '../types';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  profile: MedicalProfile;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema(
  { name: String, relation: String, phone: String },
  { _id: false }
);

const ConditionSchema = new Schema(
  { name: String, detail: String, severity: { type: String, enum: ['critical', 'info'] } },
  { _id: false }
);

const AllergySchema = new Schema({ name: String, severity: String }, { _id: false });

const MedicationSchema = new Schema(
  { name: String, dose: String, schedule: String },
  { _id: false }
);

const VitalSnapshotSchema = new Schema(
  {
    heartRate: Number,
    bloodOxygen: Number,
    status: String,
    lastUpdated: String,
  },
  { _id: false }
);

const MedicalEventSchema = new Schema(
  { id: String, title: String, description: String, time: String },
  { _id: false }
);

const MedicalProfileSchema = new Schema(
  {
    avatarUri: String,
    dob: String,
    bloodType: String,
    height: String,
    weight: String,
    organDonor: Boolean,
    conditions: [ConditionSchema],
    allergies: [AllergySchema],
    medications: [MedicationSchema],
    emergencyContacts: [ContactSchema],
    physician: {
      name: String,
      clinic: String,
      phone: String,
    },
    vitals: VitalSnapshotSchema,
    events: [MedicalEventSchema],
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true,   match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['citizen', 'ambulance', 'hospital', 'government'],
    },
    profile: { type: MedicalProfileSchema, required: true },
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>('User', UserSchema);
