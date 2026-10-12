import { model, Schema, type HydratedDocument } from 'mongoose';
import { ROLES, type Role } from '../utils/constants';

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned by queries unless explicitly asked for with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<User>;
export const UserModel = model<User>('User', userSchema);
